package kz.iitu.backend.lesson;

import jakarta.validation.Valid;
import kz.iitu.backend.lesson.dto.CreateLessonRequest;
import kz.iitu.backend.lesson.dto.LessonResponse;
import kz.iitu.backend.lesson.dto.UpdateLessonRequest;
import kz.iitu.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/instructor")
@RequiredArgsConstructor
public class LessonController {

    private final LessonService lessonService;

    /**
     * Создать урок для курса
     * POST /api/v1/instructor/courses/:courseId/lessons
     */
    @PostMapping("/courses/{courseId}/lessons")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<LessonResponse> createLesson(
            @PathVariable UUID courseId,
            @Valid @RequestBody CreateLessonRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("POST /api/v1/instructor/courses/{}/lessons - Creating lesson by user {}", courseId, userDetails.getId());
        LessonResponse response = lessonService.createLesson(courseId, request, userDetails.getId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Получить все уроки инструктора (по всем курсам)
     * GET /api/v1/instructor/lessons
     */
    @GetMapping("/lessons")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<LessonResponse>> getAllInstructorLessons(
            @RequestParam(required = false) UUID courseId,
            @PageableDefault(size = 100, sort = "scheduledAt", direction = Sort.Direction.ASC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/instructor/lessons - Fetching all lessons for instructor {}", userDetails.getId());
        Page<LessonResponse> lessons = lessonService.getLessonsByInstructor(userDetails.getId(), courseId, pageable);
        return ResponseEntity.ok(lessons);
    }

    /**
     * Получить список уроков курса
     * GET /api/v1/instructor/courses/:courseId/lessons
     */
    @GetMapping("/courses/{courseId}/lessons")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'STUDENT')")
    public ResponseEntity<Page<LessonResponse>> getLessonsByCourse(
            @PathVariable UUID courseId,
            @PageableDefault(size = 20, sort = "scheduledAt", direction = Sort.Direction.ASC) Pageable pageable) {

        log.info("GET /api/v1/instructor/courses/{}/lessons - Fetching lessons", courseId);
        Page<LessonResponse> lessons = lessonService.getLessonsByCourse(courseId, pageable);
        return ResponseEntity.ok(lessons);
    }

    /**
     * Получить детали урока
     * GET /api/v1/instructor/lessons/:lessonId
     */
    @GetMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'STUDENT')")
    public ResponseEntity<LessonResponse> getLessonById(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/instructor/lessons/{} - Fetching lesson by user {}", lessonId, userDetails.getId());
        LessonResponse response = lessonService.getLessonById(lessonId, userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * Обновить урок
     * PATCH /api/v1/instructor/lessons/:lessonId
     */
    @PatchMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<LessonResponse> updateLesson(
            @PathVariable UUID lessonId,
            @Valid @RequestBody UpdateLessonRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("PATCH /api/v1/instructor/lessons/{} - Updating lesson by user {}", lessonId, userDetails.getId());
        LessonResponse response = lessonService.updateLesson(lessonId, request, userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * Удалить урок
     * DELETE /api/v1/instructor/lessons/:lessonId
     */
    @DeleteMapping("/lessons/{lessonId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteLesson(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("DELETE /api/v1/instructor/lessons/{} - Deleting lesson by user {}", lessonId, userDetails.getId());
        lessonService.deleteLesson(lessonId, userDetails.getId());
        return ResponseEntity.noContent().build();
    }
}
