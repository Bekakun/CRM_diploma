package kz.iitu.backend.attendance;

import jakarta.validation.Valid;
import kz.iitu.backend.attendance.dto.AttendanceResponse;
import kz.iitu.backend.attendance.dto.BulkAttendanceResponse;
import kz.iitu.backend.attendance.dto.MarkAttendanceRequest;
import kz.iitu.backend.attendance.dto.UpdateAttendanceRequest;
import kz.iitu.backend.security.CustomUserDetails;
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
@RequestMapping("/api/v1/instructor")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    /**
     * Массовая отметка посещаемости
     * POST /api/v1/instructor/lessons/:lessonId/attendance
     */
    @PostMapping("/lessons/{lessonId}/attendance")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BulkAttendanceResponse> markAttendance(
            @PathVariable UUID lessonId,
            @Valid @RequestBody MarkAttendanceRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("POST /api/v1/instructor/lessons/{}/attendance - Marking attendance by instructor {}",
                lessonId, userDetails.getId());

        BulkAttendanceResponse response = attendanceService.markAttendance(lessonId, request, userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * Получить посещаемость урока
     * GET /api/v1/instructor/lessons/:lessonId/attendance
     */
    @GetMapping("/lessons/{lessonId}/attendance")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'STUDENT')")
    public ResponseEntity<List<AttendanceResponse>> getLessonAttendance(@PathVariable UUID lessonId) {
        log.info("GET /api/v1/instructor/lessons/{}/attendance - Fetching lesson attendance", lessonId);

        List<AttendanceResponse> responses = attendanceService.getLessonAttendance(lessonId);
        return ResponseEntity.ok(responses);
    }

    /**
     * Обновить отметку посещаемости
     * PATCH /api/v1/instructor/attendance/:attendanceId
     */
    @PatchMapping("/attendance/{attendanceId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<AttendanceResponse> updateAttendance(
            @PathVariable UUID attendanceId,
            @Valid @RequestBody UpdateAttendanceRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("PATCH /api/v1/instructor/attendance/{} - Updating attendance by instructor {}",
                attendanceId, userDetails.getId());

        AttendanceResponse response = attendanceService.updateAttendance(attendanceId, request, userDetails.getId());
        return ResponseEntity.ok(response);
    }
}
