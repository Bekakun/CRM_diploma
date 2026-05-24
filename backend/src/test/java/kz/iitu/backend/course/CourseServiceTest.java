package kz.iitu.backend.course;

import kz.iitu.backend.course.dto.CourseResponse;
import kz.iitu.backend.course.dto.CreateCourseRequest;
import kz.iitu.backend.course.dto.UpdateCourseRequest;
import kz.iitu.backend.shared.exception.BadRequestException;
import kz.iitu.backend.shared.exception.ConflictException;
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
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock private CourseRepository courseRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private CourseService courseService;

    private User instructor;
    private Course existingCourse;

    @BeforeEach
    void setUp() {
        instructor = User.builder()
                .id(UUID.randomUUID())
                .email("instructor@example.com")
                .firstName("Ivan")
                .lastName("Petrov")
                .role(UserRole.INSTRUCTOR)
                .status(UserStatus.ACTIVE)
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        existingCourse = Course.builder()
                .id(UUID.randomUUID())
                .name("Java Basics")
                .description("Course description")
                .instructor(instructor)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .totalLessons(30)
                .enrolledStudents(0)
                .build();
    }

    // ---- createCourse ----

    @Test
    void createCourse_validRequest_returnsCourseResponse() {
        CreateCourseRequest request = new CreateCourseRequest();
        request.setName("Spring Boot");
        request.setDescription("Backend course");
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusMonths(2));
        request.setTotalLessons(20);

        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(courseRepository.existsByNameAndInstructorId("Spring Boot", instructor.getId())).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenAnswer(inv -> {
            Course c = inv.getArgument(0);
            c = Course.builder()
                    .id(UUID.randomUUID())
                    .name(c.getName())
                    .description(c.getDescription())
                    .instructor(c.getInstructor())
                    .startDate(c.getStartDate())
                    .endDate(c.getEndDate())
                    .totalLessons(c.getTotalLessons())
                    .enrolledStudents(0)
                    .build();
            return c;
        });

        CourseResponse response = courseService.createCourse(request, instructor.getId());

        assertThat(response.getName()).isEqualTo("Spring Boot");
        assertThat(response.getInstructor().getId()).isEqualTo(instructor.getId());
        verify(courseRepository).save(any(Course.class));
    }

    @Test
    void createCourse_studentRole_throwsForbiddenException() {
        instructor.setRole(UserRole.STUDENT);

        CreateCourseRequest request = new CreateCourseRequest();
        request.setName("Course");
        request.setStartDate(LocalDate.now());

        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));

        assertThatThrownBy(() -> courseService.createCourse(request, instructor.getId()))
                .isInstanceOf(ForbiddenException.class);
        verify(courseRepository, never()).save(any());
    }

    @Test
    void createCourse_duplicateName_throwsConflictException() {
        CreateCourseRequest request = new CreateCourseRequest();
        request.setName("Java Basics");
        request.setStartDate(LocalDate.now());

        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(courseRepository.existsByNameAndInstructorId("Java Basics", instructor.getId())).thenReturn(true);

        assertThatThrownBy(() -> courseService.createCourse(request, instructor.getId()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void createCourse_endDateBeforeStartDate_throwsBadRequestException() {
        CreateCourseRequest request = new CreateCourseRequest();
        request.setName("Course");
        request.setStartDate(LocalDate.now().plusMonths(1));
        request.setEndDate(LocalDate.now());

        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));

        assertThatThrownBy(() -> courseService.createCourse(request, instructor.getId()))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void createCourse_instructorNotFound_throwsResourceNotFoundException() {
        UUID unknownId = UUID.randomUUID();
        CreateCourseRequest request = new CreateCourseRequest();
        request.setName("Course");
        request.setStartDate(LocalDate.now());

        when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> courseService.createCourse(request, unknownId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- getCourseById ----

    @Test
    void getCourseById_instructorOwner_returnsCourse() {
        when(courseRepository.findByIdWithInstructor(existingCourse.getId()))
                .thenReturn(Optional.of(existingCourse));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));

        CourseResponse response = courseService.getCourseById(existingCourse.getId(), instructor.getId());

        assertThat(response.getName()).isEqualTo("Java Basics");
    }

    @Test
    void getCourseById_notOwner_throwsForbiddenException() {
        User otherUser = User.builder()
                .id(UUID.randomUUID())
                .email("other@example.com")
                .role(UserRole.INSTRUCTOR)
                .status(UserStatus.ACTIVE)
                .firstName("Other")
                .lastName("User")
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        when(courseRepository.findByIdWithInstructor(existingCourse.getId()))
                .thenReturn(Optional.of(existingCourse));
        when(userRepository.findById(otherUser.getId())).thenReturn(Optional.of(otherUser));

        assertThatThrownBy(() -> courseService.getCourseById(existingCourse.getId(), otherUser.getId()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void getCourseById_adminRole_canAccessAnyCourse() {
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

        when(courseRepository.findByIdWithInstructor(existingCourse.getId()))
                .thenReturn(Optional.of(existingCourse));
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));

        CourseResponse response = courseService.getCourseById(existingCourse.getId(), admin.getId());

        assertThat(response.getName()).isEqualTo("Java Basics");
    }

    // ---- deleteCourse ----

    @Test
    void deleteCourse_superAdmin_canDeleteAnyCourse() {
        User superAdmin = User.builder()
                .id(UUID.randomUUID())
                .email("super@example.com")
                .role(UserRole.SUPER_ADMIN)
                .status(UserStatus.ACTIVE)
                .firstName("Super")
                .lastName("Admin")
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        when(courseRepository.findByIdWithInstructor(existingCourse.getId()))
                .thenReturn(Optional.of(existingCourse));
        when(userRepository.findById(superAdmin.getId())).thenReturn(Optional.of(superAdmin));

        courseService.deleteCourse(existingCourse.getId(), superAdmin.getId());

        verify(courseRepository).delete(existingCourse);
    }

    @Test
    void deleteCourse_withEnrolledStudents_throwsConflictException() {
        existingCourse.setEnrolledStudents(5);

        when(courseRepository.findByIdWithInstructor(existingCourse.getId()))
                .thenReturn(Optional.of(existingCourse));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));

        assertThatThrownBy(() -> courseService.deleteCourse(existingCourse.getId(), instructor.getId()))
                .isInstanceOf(ConflictException.class);
        verify(courseRepository, never()).delete(any());
    }

    @Test
    void deleteCourse_notOwnerNotSuperAdmin_throwsForbiddenException() {
        User otherInstructor = User.builder()
                .id(UUID.randomUUID())
                .email("other@example.com")
                .role(UserRole.INSTRUCTOR)
                .status(UserStatus.ACTIVE)
                .firstName("Other")
                .lastName("User")
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();

        when(courseRepository.findByIdWithInstructor(existingCourse.getId()))
                .thenReturn(Optional.of(existingCourse));
        when(userRepository.findById(otherInstructor.getId())).thenReturn(Optional.of(otherInstructor));

        assertThatThrownBy(() -> courseService.deleteCourse(existingCourse.getId(), otherInstructor.getId()))
                .isInstanceOf(ForbiddenException.class);
    }

    // ---- updateCourse ----

    @Test
    void updateCourse_owner_updatesName() {
        UpdateCourseRequest request = new UpdateCourseRequest();
        request.setName("Java Advanced");

        when(courseRepository.findByIdWithInstructor(existingCourse.getId()))
                .thenReturn(Optional.of(existingCourse));
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(courseRepository.existsByNameAndInstructorIdAndIdNot("Java Advanced", instructor.getId(), existingCourse.getId()))
                .thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenAnswer(inv -> inv.getArgument(0));

        CourseResponse response = courseService.updateCourse(existingCourse.getId(), request, instructor.getId());

        assertThat(response.getName()).isEqualTo("Java Advanced");
    }
}
