package kz.iitu.backend.lesson;

import kz.iitu.backend.lesson.dto.LessonResponse;
import kz.iitu.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/student")
@RequiredArgsConstructor
public class StudentLessonController {

    private final LessonService lessonService;

    /**
     * Получить все занятия студента (по всем курсам, на которые он записан)
     * GET /api/v1/student/lessons
     */
    @GetMapping("/lessons")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<LessonResponse>> getStudentLessons(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/student/lessons - Fetching lessons for student {}", userDetails.getId());
        List<LessonResponse> lessons = lessonService.getLessonsByStudentUserId(userDetails.getId());
        return ResponseEntity.ok(lessons);
    }

    /**
     * Получить одно занятие по ID (для студента)
     * GET /api/v1/student/lessons/{lessonId}
     */
    @GetMapping("/lessons/{lessonId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<LessonResponse> getStudentLesson(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/student/lessons/{} - user {}", lessonId, userDetails.getId());
        LessonResponse lesson = lessonService.getLessonById(lessonId, userDetails.getId());
        return ResponseEntity.ok(lesson);
    }
}
