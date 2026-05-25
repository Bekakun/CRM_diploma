package kz.iitu.backend.homework;

import kz.iitu.backend.homework.dto.CreateHomeworkRequest;
import kz.iitu.backend.homework.dto.HomeworkResponse;
import kz.iitu.backend.homework.dto.UpdateHomeworkRequest;
import kz.iitu.backend.lesson.Lesson;
import kz.iitu.backend.lesson.LessonRepository;
import kz.iitu.backend.notification.NotificationService;
import kz.iitu.backend.shared.exception.BadRequestException;
import kz.iitu.backend.shared.exception.ConflictException;
import kz.iitu.backend.shared.exception.ForbiddenException;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.student.StudentRepository;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import kz.iitu.backend.user.UserRole;
import kz.iitu.backend.submission.HomeworkSubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class HomeworkService {

    private final HomeworkRepository homeworkRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final S3Client s3Client;
    private final HomeworkSubmissionRepository submissionRepository;
    private final NotificationService notificationService;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Value("${minio.max-file-size:52428800}")
    private long maxFileSize;

    private static final Set<String> ALLOWED_FILE_TYPES = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword"
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "doc", "docx");

    @Transactional
    public HomeworkResponse createHomework(UUID lessonId, CreateHomeworkRequest request,
                                          MultipartFile taskFile, UUID instructorId) {
        log.info("Creating homework for lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findByIdWithCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        validateInstructorAccess(lesson, instructorId);

        if (homeworkRepository.existsByLessonId(lessonId)) {
            throw new ConflictException("This lesson already has a homework assignment");
        }

        if (request.getDeadline().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Deadline cannot be in the past");
        }

        if (request.getDeadline().isBefore(lesson.getScheduledAt())) {
            throw new BadRequestException("Deadline cannot be before the lesson date");
        }

        String taskFileUrl = null;
        if (taskFile != null && !taskFile.isEmpty()) {
            taskFileUrl = uploadTaskFile(lesson, taskFile);
        }

        Homework homework = Homework.builder()
                .lesson(lesson)
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDeadline())
                .taskFileUrl(taskFileUrl)
                .maxGrade(100)
                .build();

        homework = homeworkRepository.save(homework);
        log.info("Homework {} created successfully for lesson {}", homework.getId(), lessonId);

        final Homework savedHomework = homework;
        studentRepository.findAllByCourseIdWithUser(lesson.getCourse().getId()).forEach(s ->
                notificationService.notifyNewHomework(
                        s.getUser(),
                        lesson.getTitle(),
                        savedHomework.getTitle(),
                        lesson.getCourse().getName()
                )
        );

        return mapToResponseWithCounts(homework);
    }

    @Transactional(readOnly = true)
    public HomeworkResponse getHomeworkByLesson(UUID lessonId) {
        log.info("Fetching homework for lesson {}", lessonId);

        Homework homework = homeworkRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Homework not found for this lesson"));

        return mapToResponseWithCounts(homework);
    }

    @Transactional
    public HomeworkResponse updateHomework(UUID homeworkId, UpdateHomeworkRequest request,
                                          MultipartFile taskFile, UUID instructorId) {
        log.info("Updating homework {} by instructor {}", homeworkId, instructorId);

        Homework homework = homeworkRepository.findByIdWithLessonAndCourse(homeworkId)
                .orElseThrow(() -> new ResourceNotFoundException("Homework not found"));

        validateInstructorAccess(homework.getLesson(), instructorId);

        if (request.getTitle() != null) homework.setTitle(request.getTitle());
        if (request.getDescription() != null) homework.setDescription(request.getDescription());

        if (request.getDeadline() != null) {
            if (request.getDeadline().isBefore(LocalDateTime.now())) {
                throw new BadRequestException("Deadline cannot be in the past");
            }
            homework.setDueDate(request.getDeadline());
        }

        if (taskFile != null && !taskFile.isEmpty()) {
            if (homework.getTaskFileUrl() != null) {
                deleteTaskFile(homework.getTaskFileUrl());
            }
            homework.setTaskFileUrl(uploadTaskFile(homework.getLesson(), taskFile));
        }

        homework = homeworkRepository.save(homework);
        log.info("Homework {} updated successfully", homeworkId);
        return mapToResponseWithCounts(homework);
    }

    @Transactional
    public void deleteHomework(UUID homeworkId, UUID instructorId) {
        log.info("Deleting homework {} by instructor {}", homeworkId, instructorId);

        Homework homework = homeworkRepository.findByIdWithLessonAndCourse(homeworkId)
                .orElseThrow(() -> new ResourceNotFoundException("Homework not found"));

        validateInstructorAccess(homework.getLesson(), instructorId);

        if (homework.getTaskFileUrl() != null) {
            deleteTaskFile(homework.getTaskFileUrl());
        }

        homeworkRepository.delete(homework);
        log.info("Homework {} deleted successfully", homeworkId);
    }

    public String getTaskFileDownloadUrl(UUID homeworkId, UUID userId) {
        log.info("Generating download URL for homework task {} by user {}", homeworkId, userId);

        Homework homework = homeworkRepository.findByIdWithLessonAndCourse(homeworkId)
                .orElseThrow(() -> new ResourceNotFoundException("Homework not found"));

        if (homework.getTaskFileUrl() == null) {
            throw new ResourceNotFoundException("Homework task file not found");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UUID courseId = homework.getLesson().getCourse().getId();
        boolean hasAccess = user.getRole() == UserRole.ADMIN
                || user.getRole() == UserRole.SUPER_ADMIN
                || homework.getLesson().getCourse().getInstructor().getId().equals(userId)
                || studentRepository.existsByUserIdAndCourseId(userId, courseId);

        if (!hasAccess) {
            throw new ForbiddenException("You do not have access to this homework task file");
        }

        // Возвращаем URL через прокси бэкенда
        String objectName = homework.getTaskFileUrl();
        if (objectName.startsWith("/api/v1/files/")) {
            return objectName;
        }
        return "/api/v1/files/" + objectName;
    }

    private String uploadTaskFile(Lesson lesson, MultipartFile file) {
        validateFile(file);

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) throw new BadRequestException("File name is missing");

        String fileExtension = getFileExtension(originalFilename);
        String objectName = String.format("homework/%s/%s/%s_%s.%s",
                lesson.getCourse().getId(),
                lesson.getId(),
                UUID.randomUUID(),
                sanitizeFilename(originalFilename),
                fileExtension
        );

        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(objectName)
                            .contentType(file.getContentType())
                            .contentLength(file.getSize())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );
            log.info("Task file uploaded: {}", objectName);
            return objectName;
        } catch (Exception e) {
            log.error("Failed to upload task file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload task file: " + e.getMessage());
        }
    }

    private void deleteTaskFile(String objectName) {
        // Если URL — убираем префикс /api/v1/files/
        if (objectName.startsWith("/api/v1/files/")) {
            objectName = objectName.substring("/api/v1/files/".length());
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectName)
                    .build());
            log.info("Task file deleted: {}", objectName);
        } catch (Exception e) {
            log.error("Failed to delete task file: {}", e.getMessage(), e);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) throw new BadRequestException("File is empty");

        if (file.getSize() > maxFileSize) {
            throw new BadRequestException(
                    String.format("File size exceeds maximum allowed size of %d MB", maxFileSize / 1024 / 1024));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_FILE_TYPES.contains(contentType)) {
            throw new BadRequestException("Invalid file type. Only PDF and DOCX files are allowed");
        }

        String filename = file.getOriginalFilename();
        if (filename == null) throw new BadRequestException("File name is missing");

        if (!ALLOWED_EXTENSIONS.contains(getFileExtension(filename).toLowerCase())) {
            throw new BadRequestException("Invalid file extension. Only .pdf, .doc, .docx files are allowed");
        }
    }

    private void validateInstructorAccess(Lesson lesson, UUID instructorId) {
        User instructor = userRepository.findById(instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (instructor.getRole() != UserRole.ADMIN
                && instructor.getRole() != UserRole.SUPER_ADMIN
                && !lesson.getCourse().getInstructor().getId().equals(instructorId)) {
            throw new ForbiddenException("You do not have permission to modify this lesson's homework");
        }
    }

    private String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1) throw new BadRequestException("File has no extension");
        return filename.substring(lastDotIndex + 1).toLowerCase();
    }

    private String sanitizeFilename(String filename) {
        String nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        return nameWithoutExt.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private HomeworkResponse mapToResponseWithCounts(Homework homework) {
        long submissionsCount = submissionRepository.countByHomeworkId(homework.getId());
        long gradedCount = submissionRepository.countGradedByHomeworkId(homework.getId());
        long pendingCount = submissionRepository.countPendingByHomeworkId(homework.getId());

        return HomeworkResponse.builder()
                .id(homework.getId())
                .lessonId(homework.getLesson().getId())
                .title(homework.getTitle())
                .description(homework.getDescription())
                .taskFileUrl(homework.getTaskFileUrl())
                .deadline(homework.getDueDate())
                .submissionsCount((int) submissionsCount)
                .gradedCount((int) gradedCount)
                .pendingCount((int) pendingCount)
                .createdAt(homework.getCreatedAt())
                .updatedAt(homework.getUpdatedAt())
                .build();
    }
}
