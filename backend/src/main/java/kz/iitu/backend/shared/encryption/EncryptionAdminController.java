package kz.iitu.backend.shared.encryption;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class EncryptionAdminController {

    private final DataEncryptionMigrator migrator;

    /**
     * Одноразовый endpoint: шифрует все существующие plaintext-данные в БД.
     * Вызывать один раз после деплоя. Повторный вызов безопасен (идемпотентен).
     */
    @PostMapping("/encrypt-existing-data")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> encryptExistingData() {
        log.warn("Запущена миграция шифрования данных");
        DataEncryptionMigrator.MigrationResult result = migrator.migrateAll();
        return ResponseEntity.ok(Map.of(
                "status", "completed",
                "usersProcessed", result.usersProcessed(),
                "invitationsProcessed", result.invitationsProcessed()
        ));
    }
}
