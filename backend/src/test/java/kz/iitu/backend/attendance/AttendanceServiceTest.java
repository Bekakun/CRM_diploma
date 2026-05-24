package kz.iitu.backend.attendance;

import kz.iitu.backend.attendance.dto.AttendanceResponse;
import kz.iitu.backend.attendance.dto.BulkAttendanceResponse;
import kz.iitu.backend.attendance.dto.MarkAttendanceRequest;
import kz.iitu.backend.attendance.dto.UpdateAttendanceRequest;
import kz.iitu.backend.course.Course;
import kz.iitu.backend.lesson.Lesson;
import kz.iitu.backend.lesson.LessonRepository;
import kz.iitu.backend.lesson.LessonStatus;
import kz.iitu.backend.shared.exception.ForbiddenException;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    @Mock private AttendanceRepository attendanceRepository;
    @Mock private LessonRepository lessonRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private AttendanceService attendanceService;

    private User instructor;
    private User student;
    private Course course;
    private Lesson lesson;

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

        student = User.builder()
                .id(UUID.randomUUID())
                .email("student@example.com")
                .firstName("Student")
                .lastName("One")
                .role(UserRole.STUDENT)
                .status(UserStatus.ACTIVE)
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        course = Course.builder()
                .id(UUID.randomUUID())
                .name("Test Course")
                .instructor(instructor)
                .startDate(LocalDate.now())
                .build();

        lesson = Lesson.builder()
                .id(UUID.randomUUID())
                .course(course)
                .title("Lesson 1")
                .scheduledAt(LocalDateTime.now())
                .durationMinutes(90)
                .status(LessonStatus.SCHEDULED)
                .build();
    }

    // ---- markAttendance ----

    @Test
    void markAttendance_instructor_marksPresent() {
        MarkAttendanceRequest.AttendanceItem item = new MarkAttendanceRequest.AttendanceItem();
        item.setStudentId(student.getId());
        item.setStatus(AttendanceStatus.PRESENT);
        item.setNotes("On time");

        MarkAttendanceRequest request = new MarkAttendanceRequest();
        request.setAttendance(List.of(item));

        Attendance savedAttendance = Attendance.builder()
                .id(UUID.randomUUID())
                .lesson(lesson)
                .student(student)
                .status(AttendanceStatus.PRESENT)
                .notes("On time")
                .markedBy(instructor)
                .build();

        when(lessonRepository.findByIdWithCourse(lesson.getId())).thenReturn(Optional.of(lesson));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
        when(attendanceRepository.findByLessonIdAndStudentId(lesson.getId(), student.getId()))
                .thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenReturn(savedAttendance);

        BulkAttendanceResponse response = attendanceService.markAttendance(lesson.getId(), request, instructor.getId());

        assertThat(response.getUpdated()).isEqualTo(1);
        assertThat(response.getAttendance()).hasSize(1);
        assertThat(response.getAttendance().get(0).getStatus()).isEqualTo(AttendanceStatus.PRESENT);
    }

    @Test
    void markAttendance_notInstructor_throwsForbiddenException() {
        User otherInstructor = User.builder()
                .id(UUID.randomUUID())
                .email("other@example.com")
                .role(UserRole.INSTRUCTOR)
                .status(UserStatus.ACTIVE)
                .firstName("O")
                .lastName("P")
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        MarkAttendanceRequest request = new MarkAttendanceRequest();
        request.setAttendance(List.of());

        when(lessonRepository.findByIdWithCourse(lesson.getId())).thenReturn(Optional.of(lesson));
        when(userRepository.findById(otherInstructor.getId())).thenReturn(Optional.of(otherInstructor));

        assertThatThrownBy(() -> attendanceService.markAttendance(lesson.getId(), request, otherInstructor.getId()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void markAttendance_lessonNotFound_throwsResourceNotFoundException() {
        UUID unknownLessonId = UUID.randomUUID();
        MarkAttendanceRequest request = new MarkAttendanceRequest();
        request.setAttendance(List.of());

        when(lessonRepository.findByIdWithCourse(unknownLessonId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attendanceService.markAttendance(unknownLessonId, request, instructor.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void markAttendance_updatesExistingRecord() {
        MarkAttendanceRequest.AttendanceItem item = new MarkAttendanceRequest.AttendanceItem();
        item.setStudentId(student.getId());
        item.setStatus(AttendanceStatus.LATE);

        MarkAttendanceRequest request = new MarkAttendanceRequest();
        request.setAttendance(List.of(item));

        Attendance existing = Attendance.builder()
                .id(UUID.randomUUID())
                .lesson(lesson)
                .student(student)
                .status(AttendanceStatus.PRESENT)
                .build();

        Attendance updated = Attendance.builder()
                .id(existing.getId())
                .lesson(lesson)
                .student(student)
                .status(AttendanceStatus.LATE)
                .markedBy(instructor)
                .build();

        when(lessonRepository.findByIdWithCourse(lesson.getId())).thenReturn(Optional.of(lesson));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
        when(attendanceRepository.findByLessonIdAndStudentId(lesson.getId(), student.getId()))
                .thenReturn(Optional.of(existing));
        when(attendanceRepository.save(any(Attendance.class))).thenReturn(updated);

        BulkAttendanceResponse response = attendanceService.markAttendance(lesson.getId(), request, instructor.getId());

        assertThat(response.getAttendance().get(0).getStatus()).isEqualTo(AttendanceStatus.LATE);
    }

    @Test
    void markAttendance_adminRole_canMarkAnyLesson() {
        User admin = User.builder()
                .id(UUID.randomUUID())
                .email("admin@example.com")
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .firstName("Admin")
                .lastName("User")
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        MarkAttendanceRequest.AttendanceItem item = new MarkAttendanceRequest.AttendanceItem();
        item.setStudentId(student.getId());
        item.setStatus(AttendanceStatus.PRESENT);

        MarkAttendanceRequest request = new MarkAttendanceRequest();
        request.setAttendance(List.of(item));

        Attendance saved = Attendance.builder()
                .id(UUID.randomUUID())
                .lesson(lesson)
                .student(student)
                .status(AttendanceStatus.PRESENT)
                .markedBy(admin)
                .build();

        when(lessonRepository.findByIdWithCourse(lesson.getId())).thenReturn(Optional.of(lesson));
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));
        when(attendanceRepository.findByLessonIdAndStudentId(lesson.getId(), student.getId()))
                .thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenReturn(saved);

        BulkAttendanceResponse response = attendanceService.markAttendance(lesson.getId(), request, admin.getId());

        assertThat(response.getUpdated()).isEqualTo(1);
    }

    // ---- getLessonAttendance ----

    @Test
    void getLessonAttendance_returnsAllRecords() {
        Attendance a1 = Attendance.builder()
                .id(UUID.randomUUID())
                .lesson(lesson)
                .student(student)
                .status(AttendanceStatus.PRESENT)
                .build();

        when(lessonRepository.existsById(lesson.getId())).thenReturn(true);
        when(attendanceRepository.findByLessonId(lesson.getId())).thenReturn(List.of(a1));

        List<AttendanceResponse> responses = attendanceService.getLessonAttendance(lesson.getId());

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getStatus()).isEqualTo(AttendanceStatus.PRESENT);
    }

    @Test
    void getLessonAttendance_lessonNotFound_throwsResourceNotFoundException() {
        UUID unknownId = UUID.randomUUID();
        when(lessonRepository.existsById(unknownId)).thenReturn(false);

        assertThatThrownBy(() -> attendanceService.getLessonAttendance(unknownId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- updateAttendance ----

    @Test
    void updateAttendance_instructor_updatesStatus() {
        Attendance attendance = Attendance.builder()
                .id(UUID.randomUUID())
                .lesson(lesson)
                .student(student)
                .status(AttendanceStatus.ABSENT)
                .build();

        UpdateAttendanceRequest request = new UpdateAttendanceRequest();
        request.setStatus(AttendanceStatus.EXCUSED);
        request.setNotes("Doctor note");

        Attendance saved = Attendance.builder()
                .id(attendance.getId())
                .lesson(lesson)
                .student(student)
                .status(AttendanceStatus.EXCUSED)
                .notes("Doctor note")
                .markedBy(instructor)
                .build();

        when(attendanceRepository.findByIdWithLessonAndCourse(attendance.getId()))
                .thenReturn(Optional.of(attendance));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(attendanceRepository.save(any(Attendance.class))).thenReturn(saved);

        AttendanceResponse response = attendanceService.updateAttendance(attendance.getId(), request, instructor.getId());

        assertThat(response.getStatus()).isEqualTo(AttendanceStatus.EXCUSED);
    }
}
