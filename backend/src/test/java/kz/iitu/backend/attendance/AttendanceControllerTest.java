package kz.iitu.backend.attendance;

import com.fasterxml.jackson.databind.ObjectMapper;
import kz.iitu.backend.attendance.dto.AttendanceResponse;
import kz.iitu.backend.attendance.dto.BulkAttendanceResponse;
import kz.iitu.backend.attendance.dto.MarkAttendanceRequest;
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
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AttendanceControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AttendanceService attendanceService;

    @InjectMocks
    private AttendanceController attendanceController;

    private CustomUserDetails instructorDetails;
    private UUID lessonId;
    private UUID studentId;

    @BeforeEach
    void setUp() {
        lessonId = UUID.randomUUID();
        studentId = UUID.randomUUID();

        User instructorUser = User.builder()
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

        mockMvc = MockMvcBuilders
                .standaloneSetup(attendanceController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(instructorDetails, null, instructorDetails.getAuthorities())
        );
    }

    @Test
    void markAttendance_instructor_returns200() throws Exception {
        MarkAttendanceRequest.AttendanceItem item = new MarkAttendanceRequest.AttendanceItem();
        item.setStudentId(studentId);
        item.setStatus(AttendanceStatus.PRESENT);

        MarkAttendanceRequest request = new MarkAttendanceRequest();
        request.setAttendance(List.of(item));

        AttendanceResponse attResponse = AttendanceResponse.builder()
                .id(UUID.randomUUID())
                .lessonId(lessonId)
                .studentId(studentId)
                .status(AttendanceStatus.PRESENT)
                .markedAt(LocalDateTime.now())
                .build();

        BulkAttendanceResponse bulkResponse = BulkAttendanceResponse.builder()
                .updated(1)
                .attendance(List.of(attResponse))
                .build();

        when(attendanceService.markAttendance(eq(lessonId), any(MarkAttendanceRequest.class), any()))
                .thenReturn(bulkResponse);

        mockMvc.perform(post("/api/v1/instructor/lessons/{lessonId}/attendance", lessonId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updated").value(1))
                .andExpect(jsonPath("$.attendance[0].status").value("PRESENT"));
    }

    @Test
    void markAttendance_lessonNotFound_returns404() throws Exception {
        MarkAttendanceRequest.AttendanceItem item = new MarkAttendanceRequest.AttendanceItem();
        item.setStudentId(studentId);
        item.setStatus(AttendanceStatus.PRESENT);

        MarkAttendanceRequest request = new MarkAttendanceRequest();
        request.setAttendance(List.of(item));

        when(attendanceService.markAttendance(any(), any(), any()))
                .thenThrow(new ResourceNotFoundException("Lesson not found"));

        mockMvc.perform(post("/api/v1/instructor/lessons/{lessonId}/attendance", lessonId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void markAttendance_forbidden_returns403() throws Exception {
        MarkAttendanceRequest.AttendanceItem item = new MarkAttendanceRequest.AttendanceItem();
        item.setStudentId(studentId);
        item.setStatus(AttendanceStatus.PRESENT);

        MarkAttendanceRequest request = new MarkAttendanceRequest();
        request.setAttendance(List.of(item));

        when(attendanceService.markAttendance(any(), any(), any()))
                .thenThrow(new ForbiddenException("No access"));

        mockMvc.perform(post("/api/v1/instructor/lessons/{lessonId}/attendance", lessonId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getLessonAttendance_returns200() throws Exception {
        AttendanceResponse attResponse = AttendanceResponse.builder()
                .id(UUID.randomUUID())
                .lessonId(lessonId)
                .studentId(studentId)
                .status(AttendanceStatus.PRESENT)
                .build();

        when(attendanceService.getLessonAttendance(lessonId)).thenReturn(List.of(attResponse));

        mockMvc.perform(get("/api/v1/instructor/lessons/{lessonId}/attendance", lessonId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PRESENT"))
                .andExpect(jsonPath("$[0].lessonId").value(lessonId.toString()));
    }

    @Test
    void getLessonAttendance_lessonNotFound_returns404() throws Exception {
        when(attendanceService.getLessonAttendance(lessonId))
                .thenThrow(new ResourceNotFoundException("Lesson not found"));

        mockMvc.perform(get("/api/v1/instructor/lessons/{lessonId}/attendance", lessonId))
                .andExpect(status().isNotFound());
    }

    @Test
    void getLessonAttendance_emptyList_returns200() throws Exception {
        when(attendanceService.getLessonAttendance(lessonId)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/instructor/lessons/{lessonId}/attendance", lessonId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }
}
