package kz.iitu.backend.homework;

import jakarta.validation.Valid;
import kz.iitu.backend.homework.dto.CreateHomeworkRequest;
import kz.iitu.backend.homework.dto.HomeworkResponse;
import kz.iitu.backend.homework.dto.UpdateHomeworkRequest;
import kz.iitu.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/instructor")
@RequiredArgsConstructor
public class HomeworkController {

    private final HomeworkService homeworkService;

    /**
     * Создать домашнее задание к уроку
     * POST /api/v1/instructor/lessons/:lessonId/homework
     */
    @PostMapping("/lessons/{lessonId}/homework")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<HomeworkResponse> createHomework(
            @PathVariable UUID lessonId,
            @Valid @RequestPart("homework") CreateHomeworkRequest request,
            @RequestPart(value = "taskFile", required = false) MultipartFile taskFile,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("POST /api/v1/instructor/lessons/{}/homework - Creating homework by user {}",
                lessonId, userDetails.getId());

        HomeworkResponse response = homeworkService.createHomework(lessonId, request, taskFile, userDetails.getId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Получить домашнее задание урока
     * GET /api/v1/instructor/lessons/:lessonId/homework
     */
    @GetMapping("/lessons/{lessonId}/homework")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'STUDENT')")
    public ResponseEntity<HomeworkResponse> getHomeworkByLesson(@PathVariable UUID lessonId) {
        log.info("GET /api/v1/instructor/lessons/{}/homework - Fetching homework", lessonId);

        HomeworkResponse response = homeworkService.getHomeworkByLesson(lessonId);
        return ResponseEntity.ok(response);
    }

    /**
     * Обновить домашнее задание
     * PATCH /api/v1/instructor/homework/:homeworkId
     */
    @PatchMapping("/homework/{homeworkId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<HomeworkResponse> updateHomework(
            @PathVariable UUID homeworkId,
            @Valid @RequestPart(value = "homework", required = false) UpdateHomeworkRequest request,
            @RequestPart(value = "taskFile", required = false) MultipartFile taskFile,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("PATCH /api/v1/instructor/homework/{} - Updating homework by user {}",
                homeworkId, userDetails.getId());

        // Если request не предоставлен, создаём пустой
        if (request == null) {
            request = new UpdateHomeworkRequest();
        }

        HomeworkResponse response = homeworkService.updateHomework(homeworkId, request, taskFile, userDetails.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * Удалить домашнее задание
     * DELETE /api/v1/instructor/homework/:homeworkId
     */
    @DeleteMapping("/homework/{homeworkId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteHomework(
            @PathVariable UUID homeworkId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("DELETE /api/v1/instructor/homework/{} - Deleting homework by user {}",
                homeworkId, userDetails.getId());

        homeworkService.deleteHomework(homeworkId, userDetails.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Получить URL для скачивания файла задания
     * GET /api/v1/files/homework/:homeworkId/task
     */
    @GetMapping("/files/homework/{homeworkId}/task")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'STUDENT')")
    public ResponseEntity<Map<String, String>> getTaskFileDownloadUrl(
            @PathVariable UUID homeworkId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/files/homework/{}/task - Generating download URL for user {}",
                homeworkId, userDetails.getId());

        String downloadUrl = homeworkService.getTaskFileDownloadUrl(homeworkId, userDetails.getId());
        return ResponseEntity.ok(Map.of("downloadUrl", downloadUrl));
    }
}
