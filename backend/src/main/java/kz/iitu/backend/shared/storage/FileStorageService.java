package kz.iitu.backend.shared.storage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.InputStream;
import java.util.UUID;

/**
 * Сервис для работы с файловым хранилищем (Supabase Storage / S3-compatible)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final S3Client s3Client;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Value("${minio.profile-photos-folder}")
    private String profilePhotosFolder;

    @Value("${minio.chat-files-folder}")
    private String chatFilesFolder;

    @Value("${minio.max-file-size}")
    private long maxFileSize;

    /**
     * Загрузить фото профиля пользователя
     */
    public String uploadProfilePhoto(MultipartFile file, UUID userId) {
        try {
            log.info("Uploading profile photo for user: {}", userId);

            validateFile(file);

            String originalFilename = file.getOriginalFilename();
            String fileExtension = getFileExtension(originalFilename);
            String fileName = String.format("%s/%s_%s%s",
                    profilePhotosFolder,
                    userId,
                    System.currentTimeMillis(),
                    fileExtension
            );

            log.info("Generated filename: {}", fileName);

            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(fileName)
                            .contentType(file.getContentType())
                            .contentLength(file.getSize())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );

            log.info("✅ Profile photo uploaded successfully: {}", fileName);
            return getFileUrl(fileName);

        } catch (Exception e) {
            log.error("❌ Failed to upload profile photo: {}", e.getMessage(), e);
            throw new RuntimeException("Не удалось загрузить файл: " + e.getMessage(), e);
        }
    }

    /**
     * Загрузить файл чата (любой тип, до 20MB)
     */
    public String uploadChatFile(MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) throw new RuntimeException("Файл не может быть пустым");
            if (file.getSize() > 20 * 1024 * 1024) throw new RuntimeException("Максимальный размер файла — 20 МБ");

            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
            String ext = getFileExtension(originalFilename);
            String storedName = chatFilesFolder + "/" + UUID.randomUUID() + ext;
            String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(storedName)
                            .contentType(contentType)
                            .contentLength(file.getSize())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );

            return getFileUrl(storedName);
        } catch (Exception e) {
            log.error("Failed to upload chat file: {}", e.getMessage(), e);
            throw new RuntimeException("Не удалось загрузить файл: " + e.getMessage(), e);
        }
    }

    /**
     * Удалить файл из хранилища
     */
    public void deleteFile(String fileUrl) {
        try {
            String fileName = extractFileNameFromUrl(fileUrl);
            if (fileName == null || fileName.isEmpty()) {
                log.warn("Invalid file URL, skipping deletion: {}", fileUrl);
                return;
            }

            log.info("Deleting file: {}", fileName);
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .build());
            log.info("✅ File deleted successfully: {}", fileName);

        } catch (Exception e) {
            log.error("❌ Failed to delete file: {}", e.getMessage(), e);
            // Не бросаем исключение, чтобы не блокировать операции пользователя
        }
    }

    /**
     * Получить поток данных файла (для проксирования через /api/v1/files/)
     */
    public InputStream getFileStream(String fileName) {
        try {
            return s3Client.getObject(GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .build());
        } catch (Exception e) {
            log.error("❌ Failed to get file stream: {}", e.getMessage(), e);
            throw new RuntimeException("Не удалось получить файл: " + e.getMessage(), e);
        }
    }

    /**
     * Получить URL файла (проксируется через бэкенд)
     */
    private String getFileUrl(String fileName) {
        return "/api/v1/files/" + fileName;
    }

    /**
     * Валидация загружаемого файла
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Файл не может быть пустым");
        }
        if (file.getSize() > maxFileSize) {
            throw new RuntimeException(
                    String.format("Размер файла превышает максимально допустимый (%d MB)",
                            maxFileSize / 1024 / 1024)
            );
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Разрешены только файлы изображений");
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) return "";
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex > 0 && lastDotIndex < filename.length() - 1) {
            return filename.substring(lastDotIndex);
        }
        return "";
    }

    private String extractFileNameFromUrl(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) return null;
        if (fileUrl.startsWith("/api/v1/files/")) {
            return fileUrl.substring("/api/v1/files/".length());
        }
        int lastSlashIndex = fileUrl.lastIndexOf('/');
        if (lastSlashIndex >= 0 && lastSlashIndex < fileUrl.length() - 1) {
            return fileUrl.substring(lastSlashIndex + 1);
        }
        return fileUrl;
    }
}
