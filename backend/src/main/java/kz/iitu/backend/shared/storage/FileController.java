package kz.iitu.backend.shared.storage;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;

/**
 * REST контроллер для проксирования файлов из хранилища.
 * Базовый путь: /api/v1/files/**
 * Поддерживает вложенные пути любой глубины:
 *   /api/v1/files/profile-photos/user_123.jpg
 *   /api/v1/files/homework/{courseId}/{lessonId}/uuid_name.pdf
 *   /api/v1/files/materials/{courseId}/{lessonId}/uuid_name.pdf
 */
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    private static final String BASE_PATH = "/api/v1/files/";

    private final FileStorageService fileStorageService;

    @GetMapping("/**")
    public ResponseEntity<InputStreamResource> getFile(HttpServletRequest request) {
        String requestUri = request.getRequestURI();

        // Извлекаем путь файла из URI
        int baseIndex = requestUri.indexOf(BASE_PATH);
        if (baseIndex == -1 || baseIndex + BASE_PATH.length() >= requestUri.length()) {
            return ResponseEntity.badRequest().build();
        }
        String filePath = requestUri.substring(baseIndex + BASE_PATH.length());

        log.info("GET /api/v1/files/{}", filePath);

        try {
            InputStream fileStream = fileStorageService.getFileStream(filePath);
            MediaType mediaType = determineMediaType(filePath);

            String filename = filePath.contains("/")
                    ? filePath.substring(filePath.lastIndexOf('/') + 1)
                    : filePath;

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(new InputStreamResource(fileStream));

        } catch (Exception e) {
            log.error("Failed to retrieve file: {}", filePath, e);
            throw new RuntimeException("Файл не найден: " + filePath);
        }
    }

    private MediaType determineMediaType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (lower.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        if (lower.endsWith(".pdf")) return MediaType.APPLICATION_PDF;
        if (lower.endsWith(".docx")) return MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        if (lower.endsWith(".doc")) return MediaType.parseMediaType("application/msword");
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
