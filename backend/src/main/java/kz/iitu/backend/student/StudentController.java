package kz.iitu.backend.student;

import kz.iitu.backend.security.CustomUserDetails;
import kz.iitu.backend.student.dto.StudentPerformanceResponse;
import kz.iitu.backend.student.dto.StudentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/instructor/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;

    /**
     * Получить список студентов инструктора
     * Доступ: INSTRUCTOR, ADMIN, SUPER_ADMIN
     * GET /api/v1/instructor/students?courseId={courseId}&page=0&size=20
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<StudentResponse>> getStudents(
            @RequestParam(required = false) UUID courseId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20, sort = "enrolledAt", direction = Sort.Direction.DESC) Pageable pageable) {

        log.info("GET /api/v1/instructor/students - instructor: {}, courseId: {}", userDetails.getId(), courseId);
        Page<StudentResponse> students = studentService.getStudentsByInstructor(userDetails.getId(), courseId, pageable);
        return ResponseEntity.ok(students);
    }

    /**
     * Получить детальную информацию о студенте
     * Доступ: INSTRUCTOR, ADMIN, SUPER_ADMIN, STUDENT (сам)
     * GET /api/v1/instructor/students/{studentId}
     */
    @GetMapping("/{studentId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'STUDENT')")
    public ResponseEntity<StudentPerformanceResponse> getStudentDetails(
            @PathVariable UUID studentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/instructor/students/{} - requesting user: {}", studentId, userDetails.getId());
        StudentPerformanceResponse student = studentService.getStudentDetails(studentId, userDetails.getId());
        return ResponseEntity.ok(student);
    }

    /**
     * Получить детальную информацию о студенте по userId
     * GET /api/v1/instructor/students/by-user/{userId}
     */
    @GetMapping("/by-user/{userId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<StudentPerformanceResponse> getStudentDetailsByUserId(
            @PathVariable UUID userId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/instructor/students/by-user/{} - requesting user: {}", userId, userDetails.getId());
        StudentPerformanceResponse student = studentService.getStudentDetailsByUserId(userId, userDetails.getId());
        return ResponseEntity.ok(student);
    }
}
