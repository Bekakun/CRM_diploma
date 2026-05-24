package kz.iitu.backend.material;

import kz.iitu.backend.material.dto.MaterialResponse;
import kz.iitu.backend.material.dto.UploadMaterialsResponse;
import kz.iitu.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/instructor")
@RequiredArgsConstructor
public class MaterialController {

    private final MaterialService materialService;

    /**
     * Загрузить материалы к уроку
     * POST /api/v1/instructor/lessons/:lessonId/materials
     */
    @PostMapping("/lessons/{lessonId}/materials")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<UploadMaterialsResponse> uploadMaterials(
            @PathVariable UUID lessonId,
            @RequestParam("files") List<MultipartFile> files,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("POST /api/v1/instructor/lessons/{}/materials - Uploading {} files by user {}",
                lessonId, files.size(), userDetails.getId());

        UploadMaterialsResponse response = materialService.uploadMaterials(lessonId, files, userDetails.getId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Получить список материалов урока
     * GET /api/v1/instructor/lessons/:lessonId/materials
     */
    @GetMapping("/lessons/{lessonId}/materials")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'STUDENT')")
    public ResponseEntity<List<MaterialResponse>> getMaterialsByLesson(
            @PathVariable UUID lessonId) {

        log.info("GET /api/v1/instructor/lessons/{}/materials - Fetching materials", lessonId);

        List<MaterialResponse> materials = materialService.getMaterialsByLesson(lessonId);
        return ResponseEntity.ok(materials);
    }

    /**
     * Удалить материал
     * DELETE /api/v1/instructor/materials/:materialId
     */
    @DeleteMapping("/materials/{materialId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteMaterial(
            @PathVariable UUID materialId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("DELETE /api/v1/instructor/materials/{} - Deleting material by user {}",
                materialId, userDetails.getId());

        materialService.deleteMaterial(materialId, userDetails.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Получить URL для скачивания материала
     * GET /api/v1/files/materials/:materialId
     */
    @GetMapping("/files/materials/{materialId}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'STUDENT')")
    public ResponseEntity<Map<String, String>> getDownloadUrl(
            @PathVariable UUID materialId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("GET /api/v1/files/materials/{} - Generating download URL for user {}",
                materialId, userDetails.getId());

        String downloadUrl = materialService.getDownloadUrl(materialId, userDetails.getId());
        return ResponseEntity.ok(Map.of("downloadUrl", downloadUrl));
    }
}
