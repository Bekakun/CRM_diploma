package kz.iitu.backend.lesson;

import kz.iitu.backend.course.Course;
import kz.iitu.backend.course.CourseRepository;
import kz.iitu.backend.homework.HomeworkRepository;
import kz.iitu.backend.lesson.dto.CreateLessonRequest;
import kz.iitu.backend.lesson.dto.LessonConflictResponse;
import kz.iitu.backend.lesson.dto.LessonResponse;
import kz.iitu.backend.lesson.dto.UpdateLessonRequest;
import kz.iitu.backend.attendance.AttendanceRepository;
import kz.iitu.backend.material.MaterialRepository;
import kz.iitu.backend.notification.NotificationService;
import kz.iitu.backend.shared.exception.BadRequestException;
import kz.iitu.backend.shared.exception.ConflictException;
import kz.iitu.backend.shared.exception.ForbiddenException;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.student.StudentRepository;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import kz.iitu.backend.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final MaterialRepository materialRepository;
    private final HomeworkRepository homeworkRepository;
    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final NotificationService notificationService;

    @Transactional
    public LessonResponse createLesson(UUID courseId, CreateLessonRequest request, UUID instructorId) {
        log.info("Creating lesson '{}' for course {} by instructor {}", request.getTitle(), courseId, instructorId);

        Course course = courseRepository.findByIdWithInstructor(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        validateInstructorAccess(course, instructorId);

        // КРИТИЧЕСКАЯ ПРОВЕРКА КОНФЛИКТОВ (по всем курсам преподавателя)
        checkScheduleConflicts(instructorId, request.getScheduledAt(), request.getDurationMinutes(), null);

        Lesson lesson = Lesson.builder()
                .course(course)
                .title(request.getTitle())
                .description(request.getDescription())
                .scheduledAt(request.getScheduledAt())
                .durationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 120)
                .location(request.getLocation())
                .onlineMeetingUrl(request.getOnlineMeetingUrl())
                .status(LessonStatus.SCHEDULED)
                .build();

        lesson = lessonRepository.save(lesson);
        log.info("Lesson created successfully with ID: {}", lesson.getId());

        // Уведомляем студентов курса о новом уроке
        final Lesson savedLesson = lesson;
        studentRepository.findAllByCourseIdWithUser(course.getId()).forEach(s ->
                notificationService.notifyNewLesson(s.getUser(), savedLesson.getTitle(), course.getName())
        );

        return mapToResponse(lesson);
    }

    @Transactional(readOnly = true)
    public Page<LessonResponse> getLessonsByCourse(UUID courseId, Pageable pageable) {
        log.info("Fetching lessons for course {}", courseId);

        if (!courseRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Course not found");
        }

        return lessonRepository.findByCourseId(courseId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<LessonResponse> getLessonsByInstructor(UUID instructorId, UUID courseId, Pageable pageable) {
        log.info("Fetching lessons for instructor {} (courseId: {})", instructorId, courseId);

        if (!userRepository.existsById(instructorId)) {
            throw new ResourceNotFoundException("Instructor not found");
        }

        if (courseId != null) {
            return lessonRepository.findByInstructorIdAndCourseId(instructorId, courseId, pageable)
                    .map(this::mapToResponse);
        } else {
            return lessonRepository.findByInstructorId(instructorId, pageable)
                    .map(this::mapToResponse);
        }
    }

    @Transactional(readOnly = true)
    public List<LessonResponse> getLessonsByStudentUserId(UUID userId) {
        log.info("Fetching all lessons for student user {}", userId);
        return lessonRepository.findAllByStudentUserId(userId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LessonResponse getLessonById(UUID lessonId, UUID requestingUserId) {
        log.info("Fetching lesson {} for user {}", lessonId, requestingUserId);

        Lesson lesson = lessonRepository.findByIdWithCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        User requestingUser = userRepository.findById(requestingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check permissions: admin, super_admin, instructor of the course, or enrolled student
        boolean hasAccess = requestingUser.getRole() == UserRole.ADMIN
                || requestingUser.getRole() == UserRole.SUPER_ADMIN
                || lesson.getCourse().getInstructor().getId().equals(requestingUserId)
                || studentRepository.existsByUserIdAndCourseId(requestingUserId, lesson.getCourse().getId());

        if (!hasAccess) {
            throw new ForbiddenException("You do not have access to this lesson");
        }

        return mapToResponse(lesson);
    }

    @Transactional
    public LessonResponse updateLesson(UUID lessonId, UpdateLessonRequest request, UUID instructorId) {
        log.info("Updating lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findByIdWithCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        validateInstructorAccess(lesson.getCourse(), instructorId);

        // Проверка конфликтов при изменении времени или продолжительности
        if (request.getScheduledAt() != null || request.getDurationMinutes() != null) {
            LocalDateTime newScheduledAt = request.getScheduledAt() != null
                    ? request.getScheduledAt()
                    : lesson.getScheduledAt();

            Integer newDuration = request.getDurationMinutes() != null
                    ? request.getDurationMinutes()
                    : lesson.getDurationMinutes();

            checkScheduleConflicts(instructorId, newScheduledAt, newDuration, lessonId);

            lesson.setScheduledAt(newScheduledAt);
            lesson.setDurationMinutes(newDuration);
        }

        if (request.getTitle() != null) {
            lesson.setTitle(request.getTitle());
        }

        if (request.getDescription() != null) {
            lesson.setDescription(request.getDescription());
        }

        if (request.getLocation() != null) {
            lesson.setLocation(request.getLocation());
        }

        if (request.getOnlineMeetingUrl() != null) {
            lesson.setOnlineMeetingUrl(request.getOnlineMeetingUrl());
        }

        if (request.getRecordingUrl() != null) {
            lesson.setRecordingUrl(request.getRecordingUrl());
        }

        if (request.getStatus() != null) {
            lesson.setStatus(request.getStatus());
        }

        lesson = lessonRepository.save(lesson);
        log.info("Lesson {} updated successfully", lessonId);

        return mapToResponse(lesson);
    }

    @Transactional
    public void deleteLesson(UUID lessonId, UUID instructorId) {
        log.info("Deleting lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findByIdWithCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        validateInstructorAccess(lesson.getCourse(), instructorId);

        lessonRepository.delete(lesson);
        log.info("Lesson {} deleted successfully", lessonId);
    }

    private void checkScheduleConflicts(UUID instructorId, LocalDateTime scheduledAt, Integer durationMinutes, UUID excludeLessonId) {
        if (scheduledAt == null) {
            throw new BadRequestException("Scheduled time is required");
        }

        if (durationMinutes == null || durationMinutes <= 0) {
            throw new BadRequestException("Duration must be a positive number");
        }

        LocalDateTime newEnd = scheduledAt.plusMinutes(durationMinutes);

        log.debug("Checking conflicts for instructor {} lesson scheduled at {} (duration: {} min, ends at {})",
                instructorId, scheduledAt, durationMinutes, newEnd);

        List<Lesson> conflicts = lessonRepository.findConflictingLessonsByInstructor(
                instructorId, scheduledAt, newEnd, excludeLessonId
        );

        if (!conflicts.isEmpty()) {
            Lesson conflictingLesson = conflicts.get(0);
            LessonConflictResponse conflictInfo = LessonConflictResponse.builder()
                    .id(conflictingLesson.getId())
                    .title(conflictingLesson.getTitle())
                    .scheduledAt(conflictingLesson.getScheduledAt())
                    .durationMinutes(conflictingLesson.getDurationMinutes())
                    .build();

            log.warn("Schedule conflict detected with lesson: {}", conflictInfo);
            throw new ConflictException(
                    String.format("Lesson '%s' (course: %s) is already scheduled at %s",
                            conflictingLesson.getTitle(),
                            conflictingLesson.getCourse().getName(),
                            conflictingLesson.getScheduledAt())
            );
        }
    }

    private void validateInstructorAccess(Course course, UUID instructorId) {
        User instructor = userRepository.findById(instructorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (instructor.getRole() != UserRole.ADMIN
                && instructor.getRole() != UserRole.SUPER_ADMIN
                && !course.getInstructor().getId().equals(instructorId)) {
            throw new ForbiddenException("You do not have permission to modify this course's lessons");
        }
    }

    private LessonResponse mapToResponse(Lesson lesson) {
        long materialsCount = materialRepository.countByLessonId(lesson.getId());
        boolean hasHomework = homeworkRepository.existsByLessonId(lesson.getId());
        long attendanceCount = attendanceRepository.countByLessonId(lesson.getId());

        return LessonResponse.builder()
                .id(lesson.getId())
                .courseId(lesson.getCourse().getId())
                .courseName(lesson.getCourse().getName())
                .title(lesson.getTitle())
                .description(lesson.getDescription())
                .scheduledAt(lesson.getScheduledAt())
                .durationMinutes(lesson.getDurationMinutes())
                .location(lesson.getLocation())
                .onlineMeetingUrl(lesson.getOnlineMeetingUrl())
                .recordingUrl(lesson.getRecordingUrl())
                .status(lesson.getStatus())
                .materialsCount((int) materialsCount)
                .hasHomework(hasHomework)
                .attendanceCount((int) attendanceCount)
                .totalStudents(lesson.getCourse().getEnrolledStudents() != null ? lesson.getCourse().getEnrolledStudents() : 0)
                .createdAt(lesson.getCreatedAt())
                .updatedAt(lesson.getUpdatedAt())
                .build();
    }
}
