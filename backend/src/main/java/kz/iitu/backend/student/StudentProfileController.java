package kz.iitu.backend.student;

import kz.iitu.backend.security.CustomUserDetails;
import kz.iitu.backend.student.dto.DeadlineResponse;
import kz.iitu.backend.student.dto.StudentPerformanceResponse;
import kz.iitu.backend.student.dto.StudentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/student")
@RequiredArgsConstructor
public class StudentProfileController {

    private final StudentService studentService;

    /**
     * Получить все enrollments текущего студента
     * GET /api/v1/student/me/enrollments
     */
    @GetMapping("/me/enrollments")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<StudentResponse>> getMyEnrollments(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/student/me/enrollments - user {}", userDetails.getId());
        List<StudentResponse> enrollments = studentService.getMyEnrollments(userDetails.getId());
        return ResponseEntity.ok(enrollments);
    }

    /**
     * Получить дедлайны текущего студента (все ДЗ по всем курсам)
     * GET /api/v1/student/deadlines
     */
    @GetMapping("/deadlines")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<DeadlineResponse>> getMyDeadlines(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/student/deadlines - user {}", userDetails.getId());
        List<DeadlineResponse> deadlines = studentService.getMyDeadlines(userDetails.getId());
        return ResponseEntity.ok(deadlines);
    }

    /**
     * Получить детальную успеваемость студента по enrollment ID
     * GET /api/v1/student/me/performance/{studentId}
     */
    @GetMapping("/me/performance/{studentId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentPerformanceResponse> getMyPerformance(
            @PathVariable UUID studentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/student/me/performance/{} - user {}", studentId, userDetails.getId());
        StudentPerformanceResponse performance = studentService.getStudentDetails(studentId, userDetails.getId());
        return ResponseEntity.ok(performance);
    }
}
