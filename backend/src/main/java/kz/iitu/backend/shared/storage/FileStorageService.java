package kz.iitu.backend.shared.storage;

import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Сервис для работы с файловым хранилищем MinIO
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final MinioClient minioClient;

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
     *
     * @param file     Файл изображения
     * @param userId   ID пользователя
     * @return URL загруженного файла
     */
    public String uploadProfilePhoto(MultipartFile file, UUID userId) {
        try {
            log.info("Uploading profile photo for user: {}", userId);

            // Валидация файла
            validateFile(file);

            // Генерация имени файла
            String originalFilename = file.getOriginalFilename();
            String fileExtension = getFileExtension(originalFilename);
            String fileName = String.format("%s/%s_%s%s",
                    profilePhotosFolder,
                    userId,
                    System.currentTimeMillis(),
                    fileExtension
            );

            log.info("Generated filename: {}", fileName);

            // Загрузка файла в MinIO
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileName)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            log.info("✅ Profile photo uploaded successfully: {}", fileName);

            // Вернуть публичный URL
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

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(storedName)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                            .build()
            );

            return getFileUrl(storedName);
        } catch (Exception e) {
            log.error("Failed to upload chat file: {}", e.getMessage(), e);
            throw new RuntimeException("Не удалось загрузить файл: " + e.getMessage(), e);
        }
    }

    /**
     * Удалить файл из хранилища
     *
     * @param fileUrl URL файла для удаления
     */
    public void deleteFile(String fileUrl) {
        try {
            // Извлечь имя файла из URL
            String fileName = extractFileNameFromUrl(fileUrl);

            if (fileName == null || fileName.isEmpty()) {
                log.warn("Invalid file URL, skipping deletion: {}", fileUrl);
                return;
            }

            log.info("Deleting file: {}", fileName);

            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileName)
                            .build()
            );

            log.info("✅ File deleted successfully: {}", fileName);

        } catch (Exception e) {
            log.error("❌ Failed to delete file: {}", e.getMessage(), e);
            // Не бросаем исключение, чтобы не блокировать операции пользователя
        }
    }

    /**
     * Получить временный URL для скачивания файла
     *
     * @param fileName Имя файла в MinIO
     * @param expiry   Время жизни ссылки в секундах
     * @return Временный URL
     */
    public String getPresignedUrl(String fileName, int expiry) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(fileName)
                            .expiry(expiry, TimeUnit.SECONDS)
                            .build()
            );
        } catch (Exception e) {
            log.error("❌ Failed to generate presigned URL: {}", e.getMessage(), e);
            throw new RuntimeException("Не удалось создать ссылку на файл: " + e.getMessage(), e);
        }
    }

    /**
     * Получить поток данных файла
     *
     * @param fileName Имя файла в MinIO
     * @return InputStream файла
     */
    public InputStream getFileStream(String fileName) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileName)
                            .build()
            );
        } catch (Exception e) {
            log.error("❌ Failed to get file stream: {}", e.getMessage(), e);
            throw new RuntimeException("Не удалось получить файл: " + e.getMessage(), e);
        }
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

    /**
     * Получить расширение файла
     */
    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }

        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex > 0 && lastDotIndex < filename.length() - 1) {
            return filename.substring(lastDotIndex);
        }

        return "";
    }

    /**
     * Получить публичный URL файла
     * В production используйте CDN или Nginx для проксирования
     */
    private String getFileUrl(String fileName) {
        // Возвращаем путь, который можно использовать с API эндпоинтом
        return "/api/v1/files/" + fileName;
    }

    /**
     * Извлечь имя файла из URL
     */
    private String extractFileNameFromUrl(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return null;
        }

        // Если это наш API URL
        if (fileUrl.startsWith("/api/v1/files/")) {
            return fileUrl.substring("/api/v1/files/".length());
        }

        // Если это полный URL
        int lastSlashIndex = fileUrl.lastIndexOf('/');
        if (lastSlashIndex >= 0 && lastSlashIndex < fileUrl.length() - 1) {
            return fileUrl.substring(lastSlashIndex + 1);
        }

        return fileUrl;
    }
}
