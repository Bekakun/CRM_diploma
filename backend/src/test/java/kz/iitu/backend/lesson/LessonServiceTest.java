package kz.iitu.backend.lesson;

import kz.iitu.backend.attendance.AttendanceRepository;
import kz.iitu.backend.course.Course;
import kz.iitu.backend.course.CourseRepository;
import kz.iitu.backend.homework.HomeworkRepository;
import kz.iitu.backend.lesson.dto.CreateLessonRequest;
import kz.iitu.backend.lesson.dto.LessonResponse;
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
import kz.iitu.backend.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LessonServiceTest {

    @Mock private LessonRepository lessonRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private UserRepository userRepository;
    @Mock private MaterialRepository materialRepository;
    @Mock private HomeworkRepository homeworkRepository;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private LessonService lessonService;

    private User instructor;
    private Course course;
    private Lesson existingLesson;
    private LocalDateTime futureTime;

    @BeforeEach
    void setUp() {
        instructor = User.builder()
                .id(UUID.randomUUID())
                .email("inst@example.com")
                .firstName("Inst")
                .lastName("Ructor")
                .role(UserRole.INSTRUCTOR)
                .status(UserStatus.ACTIVE)
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        course = Course.builder()
                .id(UUID.randomUUID())
                .name("Test Course")
                .instructor(instructor)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .enrolledStudents(0)
                .build();

        futureTime = LocalDateTime.now().plusDays(1);

        existingLesson = Lesson.builder()
                .id(UUID.randomUUID())
                .course(course)
                .title("Lesson 1")
                .scheduledAt(futureTime)
                .durationMinutes(90)
                .status(LessonStatus.SCHEDULED)
                .build();
    }

    // ---- createLesson ----

    @Test
    void createLesson_validRequest_returnsLessonResponse() {
        CreateLessonRequest request = new CreateLessonRequest();
        request.setTitle("New Lesson");
        request.setScheduledAt(futureTime);
        request.setDurationMinutes(120);

        when(courseRepository.findByIdWithInstructor(course.getId())).thenReturn(Optional.of(course));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(lessonRepository.findConflictingLessonsByInstructor(
                eq(instructor.getId()), eq(futureTime), any(LocalDateTime.class), isNull()
        )).thenReturn(List.of());
        when(lessonRepository.save(any(Lesson.class))).thenAnswer(inv -> {
            Lesson l = inv.getArgument(0);
            return Lesson.builder()
                    .id(UUID.randomUUID())
                    .course(l.getCourse())
                    .title(l.getTitle())
                    .scheduledAt(l.getScheduledAt())
                    .durationMinutes(l.getDurationMinutes())
                    .status(LessonStatus.SCHEDULED)
                    .build();
        });
        when(studentRepository.findAllByCourseIdWithUser(course.getId())).thenReturn(List.of());
        when(materialRepository.countByLessonId(any())).thenReturn(0L);
        when(homeworkRepository.existsByLessonId(any())).thenReturn(false);
        when(attendanceRepository.countByLessonId(any())).thenReturn(0L);

        LessonResponse response = lessonService.createLesson(course.getId(), request, instructor.getId());

        assertThat(response.getTitle()).isEqualTo("New Lesson");
        assertThat(response.getCourseId()).isEqualTo(course.getId());
        verify(lessonRepository).save(any(Lesson.class));
    }

    @Test
    void createLesson_scheduleConflict_throwsConflictException() {
        CreateLessonRequest request = new CreateLessonRequest();
        request.setTitle("Conflicting Lesson");
        request.setScheduledAt(futureTime);
        request.setDurationMinutes(90);

        when(courseRepository.findByIdWithInstructor(course.getId())).thenReturn(Optional.of(course));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(lessonRepository.findConflictingLessonsByInstructor(
                eq(instructor.getId()), eq(futureTime), any(LocalDateTime.class), isNull()
        )).thenReturn(List.of(existingLesson));

        assertThatThrownBy(() -> lessonService.createLesson(course.getId(), request, instructor.getId()))
                .isInstanceOf(ConflictException.class);
        verify(lessonRepository, never()).save(any());
    }

    @Test
    void createLesson_notOwnerInstructor_throwsForbiddenException() {
        User otherInstructor = User.builder()
                .id(UUID.randomUUID())
                .email("other@example.com")
                .role(UserRole.INSTRUCTOR)
                .status(UserStatus.ACTIVE)
                .firstName("Other")
                .lastName("Inst")
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        CreateLessonRequest request = new CreateLessonRequest();
        request.setTitle("Lesson");
        request.setScheduledAt(futureTime);
        request.setDurationMinutes(60);

        when(courseRepository.findByIdWithInstructor(course.getId())).thenReturn(Optional.of(course));
        when(userRepository.findById(otherInstructor.getId())).thenReturn(Optional.of(otherInstructor));

        assertThatThrownBy(() -> lessonService.createLesson(course.getId(), request, otherInstructor.getId()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void createLesson_nullScheduledAt_throwsBadRequestException() {
        CreateLessonRequest request = new CreateLessonRequest();
        request.setTitle("Lesson");
        request.setScheduledAt(null);
        request.setDurationMinutes(60);

        when(courseRepository.findByIdWithInstructor(course.getId())).thenReturn(Optional.of(course));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));

        assertThatThrownBy(() -> lessonService.createLesson(course.getId(), request, instructor.getId()))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void createLesson_zeroDuration_throwsBadRequestException() {
        CreateLessonRequest request = new CreateLessonRequest();
        request.setTitle("Lesson");
        request.setScheduledAt(futureTime);
        request.setDurationMinutes(0);

        when(courseRepository.findByIdWithInstructor(course.getId())).thenReturn(Optional.of(course));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));

        assertThatThrownBy(() -> lessonService.createLesson(course.getId(), request, instructor.getId()))
                .isInstanceOf(BadRequestException.class);
    }

    // ---- getLessonById ----

    @Test
    void getLessonById_instructorOwner_returnsLesson() {
        when(lessonRepository.findByIdWithCourse(existingLesson.getId())).thenReturn(Optional.of(existingLesson));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(materialRepository.countByLessonId(any())).thenReturn(0L);
        when(homeworkRepository.existsByLessonId(any())).thenReturn(false);
        when(attendanceRepository.countByLessonId(any())).thenReturn(0L);

        LessonResponse response = lessonService.getLessonById(existingLesson.getId(), instructor.getId());

        assertThat(response.getTitle()).isEqualTo("Lesson 1");
    }

    @Test
    void getLessonById_unauthorizedUser_throwsForbiddenException() {
        User student = User.builder()
                .id(UUID.randomUUID())
                .email("student@example.com")
                .role(UserRole.STUDENT)
                .status(UserStatus.ACTIVE)
                .firstName("S")
                .lastName("T")
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        when(lessonRepository.findByIdWithCourse(existingLesson.getId())).thenReturn(Optional.of(existingLesson));
        when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
        when(studentRepository.existsByUserIdAndCourseId(student.getId(), course.getId())).thenReturn(false);

        assertThatThrownBy(() -> lessonService.getLessonById(existingLesson.getId(), student.getId()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void getLessonById_enrolledStudent_returnsLesson() {
        User student = User.builder()
                .id(UUID.randomUUID())
                .email("student@example.com")
                .role(UserRole.STUDENT)
                .status(UserStatus.ACTIVE)
                .firstName("S")
                .lastName("T")
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        when(lessonRepository.findByIdWithCourse(existingLesson.getId())).thenReturn(Optional.of(existingLesson));
        when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
        when(studentRepository.existsByUserIdAndCourseId(student.getId(), course.getId())).thenReturn(true);
        when(materialRepository.countByLessonId(any())).thenReturn(0L);
        when(homeworkRepository.existsByLessonId(any())).thenReturn(false);
        when(attendanceRepository.countByLessonId(any())).thenReturn(0L);

        LessonResponse response = lessonService.getLessonById(existingLesson.getId(), student.getId());

        assertThat(response.getTitle()).isEqualTo("Lesson 1");
    }

    @Test
    void getLessonById_courseNotFound_throwsResourceNotFoundException() {
        when(lessonRepository.findByIdWithCourse(existingLesson.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lessonService.getLessonById(existingLesson.getId(), instructor.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- deleteLesson ----

    @Test
    void deleteLesson_owner_deletesLesson() {
        when(lessonRepository.findByIdWithCourse(existingLesson.getId())).thenReturn(Optional.of(existingLesson));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));

        lessonService.deleteLesson(existingLesson.getId(), instructor.getId());

        verify(lessonRepository).delete(existingLesson);
    }

    @Test
    void deleteLesson_notOwner_throwsForbiddenException() {
        User other = User.builder()
                .id(UUID.randomUUID())
                .email("other@example.com")
                .role(UserRole.INSTRUCTOR)
                .status(UserStatus.ACTIVE)
                .firstName("O")
                .lastName("P")
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        when(lessonRepository.findByIdWithCourse(existingLesson.getId())).thenReturn(Optional.of(existingLesson));
        when(userRepository.findById(other.getId())).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> lessonService.deleteLesson(existingLesson.getId(), other.getId()))
                .isInstanceOf(ForbiddenException.class);
        verify(lessonRepository, never()).delete(any());
    }
}
