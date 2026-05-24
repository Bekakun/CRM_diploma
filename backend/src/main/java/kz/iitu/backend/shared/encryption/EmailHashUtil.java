package kz.iitu.backend.shared.encryption;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Утилита для получения детерминированного хеша email.
 * Используется при поиске пользователя по email без расшифровки всей таблицы.
 */
@Component
@RequiredArgsConstructor
public class EmailHashUtil {

    private final EncryptionService encryptionService;

    public String hash(String email) {
        if (email == null) return null;
        return encryptionService.hash(email.toLowerCase().trim());
    }
}
