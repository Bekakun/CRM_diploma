package kz.iitu.backend.student;

import kz.iitu.backend.attendance.AttendanceRepository;
import kz.iitu.backend.course.Course;
import kz.iitu.backend.course.CourseRepository;
import kz.iitu.backend.homework.HomeworkRepository;
import kz.iitu.backend.lesson.LessonRepository;
import kz.iitu.backend.payment.PaymentGenerationService;
import kz.iitu.backend.shared.exception.BadRequestException;
import kz.iitu.backend.shared.exception.ConflictException;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.student.dto.EnrollStudentRequest;
import kz.iitu.backend.student.dto.StudentResponse;
import kz.iitu.backend.submission.HomeworkSubmissionRepository;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {

    @Mock private StudentRepository studentRepository;
    @Mock private UserRepository userRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private LessonRepository lessonRepository;
    @Mock private HomeworkRepository homeworkRepository;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private HomeworkSubmissionRepository submissionRepository;
    @Mock private PaymentGenerationService paymentGenerationService;

    @InjectMocks
    private StudentService studentService;

    private User studentUser;
    private Course course;

    @BeforeEach
    void setUp() {
        studentUser = User.builder()
                .id(UUID.randomUUID())
                .email("student@example.com")
                .firstName("Student")
                .lastName("User")
                .role(UserRole.STUDENT)
                .status(UserStatus.ACTIVE)
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        User instructor = User.builder()
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
                .name("Java Basics")
                .instructor(instructor)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .enrolledStudents(0)
                .build();
    }

    // ---- enrollStudent ----

    @Test
    void enrollStudent_validRequest_enrollsAndReturnsResponse() {
        EnrollStudentRequest request = new EnrollStudentRequest();
        request.setCourseIds(List.of(course.getId()));

        Student savedStudent = Student.builder()
                .id(UUID.randomUUID())
                .user(studentUser)
                .course(course)
                .attendanceRate(0.0)
                .homeworkCompletionRate(0.0)
                .build();

        when(userRepository.findById(studentUser.getId())).thenReturn(Optional.of(studentUser));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(studentRepository.existsByUserIdAndCourseId(studentUser.getId(), course.getId())).thenReturn(false);
        when(studentRepository.save(any(Student.class))).thenReturn(savedStudent);
        when(courseRepository.save(any(Course.class))).thenReturn(course);
        when(homeworkRepository.countLessonsByCourseId(course.getId())).thenReturn(0L);
        when(attendanceRepository.countAttendedByStudentAndCourse(any(), any())).thenReturn(0L);
        when(homeworkRepository.countByCourseId(course.getId())).thenReturn(0L);
        when(submissionRepository.countSubmittedByStudentAndCourse(any(), any())).thenReturn(0L);
        when(submissionRepository.findAverageGradeByStudentAndCourse(any(), any())).thenReturn(null);

        List<StudentResponse> responses = studentService.enrollStudent(studentUser.getId(), request);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getCourseId()).isEqualTo(course.getId());
        verify(paymentGenerationService).generatePaymentsForEnrollment(studentUser, course.getId());
    }

    @Test
    void enrollStudent_nonStudentRole_throwsBadRequestException() {
        studentUser.setRole(UserRole.INSTRUCTOR);

        EnrollStudentRequest request = new EnrollStudentRequest();
        request.setCourseIds(List.of(course.getId()));

        when(userRepository.findById(studentUser.getId())).thenReturn(Optional.of(studentUser));

        assertThatThrownBy(() -> studentService.enrollStudent(studentUser.getId(), request))
                .isInstanceOf(BadRequestException.class);
        verify(studentRepository, never()).save(any());
    }

    @Test
    void enrollStudent_alreadyEnrolled_throwsConflictException() {
        EnrollStudentRequest request = new EnrollStudentRequest();
        request.setCourseIds(List.of(course.getId()));

        when(userRepository.findById(studentUser.getId())).thenReturn(Optional.of(studentUser));
        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(studentRepository.existsByUserIdAndCourseId(studentUser.getId(), course.getId())).thenReturn(true);

        assertThatThrownBy(() -> studentService.enrollStudent(studentUser.getId(), request))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void enrollStudent_emptyCourseIds_throwsBadRequestException() {
        EnrollStudentRequest request = new EnrollStudentRequest();
        request.setCourseIds(List.of());

        when(userRepository.findById(studentUser.getId())).thenReturn(Optional.of(studentUser));

        assertThatThrownBy(() -> studentService.enrollStudent(studentUser.getId(), request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void enrollStudent_nullCourseIds_throwsBadRequestException() {
        EnrollStudentRequest request = new EnrollStudentRequest();
        request.setCourseIds(null);

        when(userRepository.findById(studentUser.getId())).thenReturn(Optional.of(studentUser));

        assertThatThrownBy(() -> studentService.enrollStudent(studentUser.getId(), request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void enrollStudent_userNotFound_throwsResourceNotFoundException() {
        UUID unknownId = UUID.randomUUID();
        EnrollStudentRequest request = new EnrollStudentRequest();
        request.setCourseIds(List.of(course.getId()));

        when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studentService.enrollStudent(unknownId, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void enrollStudent_courseNotFound_throwsResourceNotFoundException() {
        UUID unknownCourseId = UUID.randomUUID();
        EnrollStudentRequest request = new EnrollStudentRequest();
        request.setCourseIds(List.of(unknownCourseId));

        when(userRepository.findById(studentUser.getId())).thenReturn(Optional.of(studentUser));
        when(courseRepository.findById(unknownCourseId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> studentService.enrollStudent(studentUser.getId(), request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- getMyEnrollments ----

    @Test
    void getMyEnrollments_returnsEnrolledCourses() {
        Student student = Student.builder()
                .id(UUID.randomUUID())
                .user(studentUser)
                .course(course)
                .attendanceRate(0.0)
                .homeworkCompletionRate(0.0)
                .build();

        when(studentRepository.findAllByUserId(studentUser.getId())).thenReturn(List.of(student));
        when(homeworkRepository.countLessonsByCourseId(any())).thenReturn(0L);
        when(attendanceRepository.countAttendedByStudentAndCourse(any(), any())).thenReturn(0L);
        when(homeworkRepository.countByCourseId(any())).thenReturn(0L);
        when(submissionRepository.countSubmittedByStudentAndCourse(any(), any())).thenReturn(0L);
        when(submissionRepository.findAverageGradeByStudentAndCourse(any(), any())).thenReturn(null);

        List<StudentResponse> responses = studentService.getMyEnrollments(studentUser.getId());

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getCourseName()).isEqualTo("Java Basics");
    }

    @Test
    void getMyEnrollments_noEnrollments_returnsEmptyList() {
        when(studentRepository.findAllByUserId(studentUser.getId())).thenReturn(List.of());

        List<StudentResponse> responses = studentService.getMyEnrollments(studentUser.getId());

        assertThat(responses).isEmpty();
    }

    // ---- getEnrolledCourseIds ----

    @Test
    void getEnrolledCourseIds_returnsCorrectIds() {
        Student student = Student.builder()
                .id(UUID.randomUUID())
                .user(studentUser)
                .course(course)
                .build();

        when(studentRepository.findAllByUserId(studentUser.getId())).thenReturn(List.of(student));

        List<UUID> courseIds = studentService.getEnrolledCourseIds(studentUser.getId());

        assertThat(courseIds).containsExactly(course.getId());
    }
}
