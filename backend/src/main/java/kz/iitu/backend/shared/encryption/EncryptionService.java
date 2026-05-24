package kz.iitu.backend.shared.encryption;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM шифрование полей БД.
 * IV (12 байт) хранится вместе с шифртекстом: base64(iv + ciphertext + authTag).
 */
@Component
@Slf4j
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    @Value("${encryption.secret-key}")
    private String secretKeyBase64;

    private SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    @PostConstruct
    public void init() {
        byte[] keyBytes = Base64.getDecoder().decode(secretKeyBase64);
        if (keyBytes.length != 32) {
            throw new IllegalStateException("Ключ шифрования должен быть 256 бит (32 байта)");
        }
        secretKey = new SecretKeySpec(keyBytes, "AES");
        log.info("EncryptionService инициализирован (AES-256-GCM)");
    }

    public String encrypt(String plaintext) {
        if (plaintext == null) return null;
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            // Сохраняем iv + ciphertext вместе
            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Ошибка шифрования поля", e);
        }
    }

    public String decrypt(String encrypted) {
        if (encrypted == null) return null;
        try {
            byte[] combined = Base64.getDecoder().decode(encrypted);
            if (combined.length <= GCM_IV_LENGTH) {
                // Too short to be a valid encrypted value — treat as plaintext
                return encrypted;
            }

            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] ciphertext = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
            System.arraycopy(combined, GCM_IV_LENGTH, ciphertext, 0, ciphertext.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] plaintext = cipher.doFinal(ciphertext);

            return new String(plaintext, java.nio.charset.StandardCharsets.UTF_8);
        } catch (IllegalArgumentException | javax.crypto.AEADBadTagException e) {
            // Not valid Base64 or wrong auth tag — value is plaintext (pre-encryption data)
            log.warn("Field value is not encrypted, returning as plaintext (run data migration to encrypt)");
            return encrypted;
        } catch (Exception e) {
            if (e.getCause() instanceof javax.crypto.AEADBadTagException) {
                log.warn("Field value is not encrypted, returning as plaintext (run data migration to encrypt)");
                return encrypted;
            }
            throw new RuntimeException("Ошибка расшифровки поля", e);
        }
    }

    /**
     * Детерминированный хеш для поиска по email (HMAC-SHA256).
     * Не раскрывает оригинальное значение, но даёт стабильный идентификатор.
     */
    public String hash(String value) {
        if (value == null) return null;
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(secretKey);
            byte[] hmac = mac.doFinal(value.toLowerCase().trim()
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hmac);
        } catch (Exception e) {
            throw new RuntimeException("Ошибка хеширования значения", e);
        }
    }
}
