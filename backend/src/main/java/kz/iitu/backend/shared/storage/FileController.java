package kz.iitu.backend.shared.storage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;

/**
 * REST контроллер для работы с файлами
 * Базовый путь: /api/v1/files
 */
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    private final FileStorageService fileStorageService;

    /**
     * Получить файл по пути
     * GET /api/v1/files/{folder}/{filename}
     */
    @GetMapping("/{folder}/{filename:.+}")
    public ResponseEntity<InputStreamResource> getFile(
            @PathVariable String folder,
            @PathVariable String filename
    ) {
        String filePath = folder + "/" + filename;
        log.info("GET /api/v1/files/{}", filePath);

        try {
            InputStream fileStream = fileStorageService.getFileStream(filePath);

            // Определить MIME тип
            MediaType mediaType = determineMediaType(filename);

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(new InputStreamResource(fileStream));

        } catch (Exception e) {
            log.error("Failed to retrieve file: {}", filePath, e);
            throw new RuntimeException("Файл не найден: " + filePath);
        }
    }

    /**
     * Определить MIME тип файла по расширению
     */
    private MediaType determineMediaType(String filename) {
        String lowerFilename = filename.toLowerCase();

        if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        } else if (lowerFilename.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        } else if (lowerFilename.endsWith(".gif")) {
            return MediaType.IMAGE_GIF;
        } else if (lowerFilename.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        } else if (lowerFilename.endsWith(".pdf")) {
            return MediaType.APPLICATION_PDF;
        } else {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
