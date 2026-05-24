package kz.iitu.backend.course;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import kz.iitu.backend.course.dto.CourseResponse;
import kz.iitu.backend.course.dto.CreateCourseRequest;
import kz.iitu.backend.security.CustomUserDetails;
import kz.iitu.backend.shared.exception.ForbiddenException;
import kz.iitu.backend.shared.exception.GlobalExceptionHandler;
import kz.iitu.backend.shared.exception.ResourceNotFoundException;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRole;
import kz.iitu.backend.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CourseControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @Mock
    private CourseService courseService;

    @Mock
    private CourseAnalyticsService courseAnalyticsService;

    @InjectMocks
    private CourseController courseController;

    private User instructorUser;
    private CustomUserDetails instructorDetails;
    private CourseResponse sampleCourseResponse;
    private UUID courseId;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();

        instructorUser = User.builder()
                .id(UUID.randomUUID())
                .email("inst@example.com")
                .firstName("Ivan")
                .lastName("Petrov")
                .role(UserRole.INSTRUCTOR)
                .status(UserStatus.ACTIVE)
                .passwordHash("hash")
                .isEmailVerified(true)
                .build();
        instructorDetails = new CustomUserDetails(instructorUser);

        sampleCourseResponse = CourseResponse.builder()
                .id(courseId)
                .name("Java Basics")
                .description("Java course")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .totalLessons(20)
                .enrolledStudents(0)
                .createdAt(LocalDateTime.now())
                .build();

        mockMvc = MockMvcBuilders
                .standaloneSetup(courseController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(
                        new AuthenticationPrincipalArgumentResolver(),
                        new PageableHandlerMethodArgumentResolver())
                .build();

        // Set authenticated user in SecurityContext for @AuthenticationPrincipal
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(instructorDetails, null, instructorDetails.getAuthorities())
        );
    }

    @Test
    void createCourse_instructor_returns201() throws Exception {
        CreateCourseRequest request = new CreateCourseRequest();
        request.setName("Java Basics");
        request.setDescription("Java course");
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusMonths(3));
        request.setTotalLessons(20);

        when(courseService.createCourse(any(CreateCourseRequest.class), eq(instructorUser.getId())))
                .thenReturn(sampleCourseResponse);

        mockMvc.perform(post("/api/v1/instructor/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Java Basics"))
                .andExpect(jsonPath("$.id").value(courseId.toString()));
    }

    @Test
    void getCourses_instructor_returns200WithList() throws Exception {
        Page<CourseResponse> page = new PageImpl<>(List.of(sampleCourseResponse), PageRequest.of(0, 20), 1);
        when(courseService.getCoursesByInstructor(eq(instructorUser.getId()), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/instructor/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].name").value("Java Basics"));
    }

    @Test
    void getCourseById_instructor_returns200() throws Exception {
        when(courseService.getCourseById(eq(courseId), eq(instructorUser.getId())))
                .thenReturn(sampleCourseResponse);

        mockMvc.perform(get("/api/v1/instructor/courses/{id}", courseId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Java Basics"));
    }

    @Test
    void getCourseById_notFound_returns404() throws Exception {
        when(courseService.getCourseById(any(), any()))
                .thenThrow(new ResourceNotFoundException("Course not found"));

        mockMvc.perform(get("/api/v1/instructor/courses/{id}", courseId))
                .andExpect(status().isNotFound());
    }

    @Test
    void getCourseById_forbidden_returns403() throws Exception {
        when(courseService.getCourseById(any(), any()))
                .thenThrow(new ForbiddenException("No access"));

        mockMvc.perform(get("/api/v1/instructor/courses/{id}", courseId))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteCourse_instructor_returns204() throws Exception {
        mockMvc.perform(delete("/api/v1/instructor/courses/{id}", courseId))
                .andExpect(status().isNoContent());
    }

    @Test
    void createCourse_missingName_returns400() throws Exception {
        CreateCourseRequest request = new CreateCourseRequest();
        request.setStartDate(LocalDate.now());
        // name is missing

        mockMvc.perform(post("/api/v1/instructor/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
