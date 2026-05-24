package kz.iitu.backend.submission;

import jakarta.validation.Valid;
import kz.iitu.backend.security.CustomUserDetails;
import kz.iitu.backend.submission.dto.GradeSubmissionRequest;
import kz.iitu.backend.submission.dto.PendingSubmissionResponse;
import kz.iitu.backend.submission.dto.SubmissionListResponse;
import kz.iitu.backend.submission.dto.SubmissionResponse;
import kz.iitu.backend.submission.dto.SubmitHomeworkRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class HomeworkSubmissionController {

    private final HomeworkSubmissionService submissionService;

    /**
     * Сдача домашнего задания студентом
     * POST /api/v1/student/homework/:homeworkId/submit
     */
    @PostMapping("/student/homework/{homeworkId}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<SubmissionResponse> submitHomework(
            @PathVariable UUID homeworkId,
            @Valid @RequestBody SubmitHomeworkRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("POST /api/v1/student/homework/{}/submit - Student {} submitting homework",
                homeworkId, userDetails.getId());

        SubmissionResponse response = submissionService.submitHomework(homeworkId, request, userDetails.getId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Получить свою сданную работу по заданию (для студента)
     * GET /api/v1/student/homework/:homeworkId/my-submission
     */
    @GetMapping("/student/homework/{homeworkId}/my-submission")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<SubmissionResponse> getMySubmission(
            @PathVariable UUID homeworkId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/student/homework/{}/my-submission - Student {} fetching own submission",
                homeworkId, userDetails.getId());

        SubmissionResponse response = submissionService.getMySubmission(homeworkId, userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * Непроверенные работы преподавателя
     * GET /api/v1/instructor/pending-submissions
     */
    @GetMapping("/instructor/pending-submissions")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<PendingSubmissionResponse>> getPendingSubmissions(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/instructor/pending-submissions - instructor {}", userDetails.getId());
        List<PendingSubmissionResponse> response = submissionService.getPendingSubmissions(userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * Список сданных работ по заданию
     * GET /api/v1/instructor/homework/:homeworkId/submissions
     */
    @GetMapping("/instructor/homework/{homeworkId}/submissions")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<SubmissionListResponse> getHomeworkSubmissions(
            @PathVariable UUID homeworkId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/instructor/homework/{}/submissions - Fetching submissions by instructor {}",
                homeworkId, userDetails.getId());

        SubmissionListResponse response = submissionService.getHomeworkSubmissions(homeworkId, userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * Оценить работу студента
     * PATCH /api/v1/instructor/submissions/:submissionId/grade
     */
    @PatchMapping("/instructor/submissions/{submissionId}/grade")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<SubmissionResponse> gradeSubmission(
            @PathVariable UUID submissionId,
            @Valid @RequestBody GradeSubmissionRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("PATCH /api/v1/instructor/submissions/{}/grade - Grading submission by instructor {}",
                submissionId, userDetails.getId());

        SubmissionResponse response = submissionService.gradeSubmission(submissionId, request, userDetails.getId());
        return ResponseEntity.ok(response);
    }
}
