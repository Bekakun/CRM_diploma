package kz.iitu.backend.material;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.http.Method;
import kz.iitu.backend.lesson.Lesson;
import kz.iitu.backend.lesson.LessonRepository;
import kz.iitu.backend.material.dto.MaterialResponse;
import kz.iitu.backend.material.dto.UploadMaterialsResponse;
import kz.iitu.backend.shared.exception.BadRequestException;
import kz.iitu.backend.shared.exception.ForbiddenException;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.student.StudentRepository;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import kz.iitu.backend.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MaterialService {

    private final MaterialRepository materialRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Value("${minio.max-file-size:52428800}") // 50MB по умолчанию
    private long maxFileSize;

    private static final Set<String> ALLOWED_FILE_TYPES = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
            "application/msword" // DOC
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "doc", "docx");

    @Transactional
    public UploadMaterialsResponse uploadMaterials(UUID lessonId, List<MultipartFile> files, UUID instructorId) {
        log.info("Uploading {} materials for lesson {} by instructor {}", files.size(), lessonId, instructorId);

        Lesson lesson = lessonRepository.findByIdWithCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        validateInstructorAccess(lesson, instructorId);

        if (files == null || files.isEmpty()) {
            throw new BadRequestException("No files provided");
        }

        List<MaterialResponse> uploadedMaterials = new ArrayList<>();

        for (MultipartFile file : files) {
            validateFile(file);
            Material material = uploadSingleFile(lesson, file);
            uploadedMaterials.add(mapToResponse(material));
        }

        log.info("Successfully uploaded {} materials for lesson {}", uploadedMaterials.size(), lessonId);

        return UploadMaterialsResponse.builder()
                .materials(uploadedMaterials)
                .build();
    }

    @Transactional(readOnly = true)
    public List<MaterialResponse> getMaterialsByLesson(UUID lessonId) {
        log.info("Fetching materials for lesson {}", lessonId);

        if (!lessonRepository.existsById(lessonId)) {
            throw new ResourceNotFoundException("Lesson not found");
        }

        return materialRepository.findByLessonId(lessonId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public void deleteMaterial(UUID materialId, UUID instructorId) {
        log.info("Deleting material {} by instructor {}", materialId, instructorId);

        Material material = materialRepository.findByIdWithLesson(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found"));

        validateInstructorAccess(material.getLesson(), instructorId);

        try {
            // Удалить файл из MinIO
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(material.getMinioObjectName())
                            .build()
            );

            log.info("File deleted from MinIO: {}", material.getMinioObjectName());
        } catch (Exception e) {
            log.error("Failed to delete file from MinIO: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to delete file from storage");
        }

        materialRepository.delete(material);
        log.info("Material {} deleted successfully", materialId);
    }

    @Transactional(readOnly = true)
    public String getDownloadUrl(UUID materialId, UUID userId) {
        log.info("Generating download URL for material {} by user {}", materialId, userId);

        Material material = materialRepository.findByIdWithLesson(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found"));

        // Проверка доступа: админы, преподаватель курса или студенты курса
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UUID courseId = material.getLesson().getCourse().getId();
        boolean hasAccess = user.getRole() == UserRole.ADMIN
                || user.getRole() == UserRole.SUPER_ADMIN
                || material.getLesson().getCourse().getInstructor().getId().equals(userId)
                || studentRepository.existsByUserIdAndCourseId(userId, courseId);

        if (!hasAccess) {
            throw new ForbiddenException("You do not have access to this material");
        }

        try {
            // Создать presigned URL на 1 час
            String url = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(material.getMinioObjectName())
                            .expiry(3600) // 1 час
                            .build()
            );

            log.info("Generated download URL for material {}", materialId);
            return url;

        } catch (Exception e) {
            log.error("Failed to generate download URL: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate download URL");
        }
    }

    private Material uploadSingleFile(Lesson lesson, MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new BadRequestException("File name is missing");
        }

        // Генерация уникального имени файла
        String fileExtension = getFileExtension(originalFilename);
        String minioObjectName = String.format("materials/%s/%s/%s_%s.%s",
                lesson.getCourse().getId(),
                lesson.getId(),
                UUID.randomUUID(),
                sanitizeFilename(originalFilename),
                fileExtension
        );

        try (InputStream inputStream = file.getInputStream()) {
            // Загрузка в MinIO
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(minioObjectName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            log.info("File uploaded to MinIO: {}", minioObjectName);

            // Генерация URL для доступа
            String fileUrl = String.format("%s/%s/%s",
                    minioClient.getPresignedObjectUrl(
                            GetPresignedObjectUrlArgs.builder()
                                    .method(Method.GET)
                                    .bucket(bucketName)
                                    .object(minioObjectName)
                                    .expiry(3600)
                                    .build()
                    ).split("\\?")[0], "", ""); // Убираем query параметры

            // Сохранить запись в БД
            Material material = Material.builder()
                    .lesson(lesson)
                    .name(originalFilename)
                    .fileUrl(minioObjectName) // Храним путь в MinIO
                    .fileType(fileExtension)
                    .fileSize(file.getSize())
                    .minioObjectName(minioObjectName)
                    .build();

            return materialRepository.save(material);

        } catch (Exception e) {
            log.error("Failed to upload file to MinIO: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file: " + e.getMessage());
        }
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        if (file.getSize() > maxFileSize) {
            throw new BadRequestException(
                    String.format("File size exceeds maximum allowed size of %d MB", maxFileSize / 1024 / 1024)
            );
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_FILE_TYPES.contains(contentType)) {
            throw new BadRequestException("Invalid file type. Only PDF and DOCX files are allowed");
        }

        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new BadRequestException("File name is missing");
        }

        String extension = getFileExtension(filename);
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new BadRequestException("Invalid file extension. Only .pdf, .doc, .docx files are allowed");
        }
    }

    private void validateInstructorAccess(Lesson lesson, UUID instructorId) {
        User instructor = userRepository.findById(instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (instructor.getRole() != UserRole.ADMIN
                && instructor.getRole() != UserRole.SUPER_ADMIN
                && !lesson.getCourse().getInstructor().getId().equals(instructorId)) {
            throw new ForbiddenException("You do not have permission to modify this lesson's materials");
        }
    }

    private String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1) {
            throw new BadRequestException("File has no extension");
        }
        return filename.substring(lastDotIndex + 1).toLowerCase();
    }

    private String sanitizeFilename(String filename) {
        // Удалить расширение
        String nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        // Оставить только безопасные символы
        return nameWithoutExt.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private MaterialResponse mapToResponse(Material material) {
        return MaterialResponse.builder()
                .id(material.getId())
                .lessonId(material.getLesson().getId())
                .name(material.getName())
                .fileUrl(material.getFileUrl())
                .fileType(material.getFileType())
                .fileSize(material.getFileSize())
                .uploadedAt(material.getUploadedAt())
                .build();
    }
}
