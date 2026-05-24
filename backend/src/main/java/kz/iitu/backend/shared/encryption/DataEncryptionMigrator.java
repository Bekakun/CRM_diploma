package kz.iitu.backend.shared.encryption;

import kz.iitu.backend.invitation.Invitation;
import kz.iitu.backend.invitation.InvitationRepository;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Одноразовая утилита для шифрования уже существующих данных в БД.
 * Вызывается вручную через /api/admin/encrypt-existing-data (только SUPER_ADMIN).
 *
 * Алгоритм: читает все записи, для каждой проверяет, является ли поле
 * уже зашифрованным (base64 + длина > исходной). Если нет — шифрует и сохраняет.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DataEncryptionMigrator {

    private final UserRepository userRepository;
    private final InvitationRepository invitationRepository;
    private final EncryptionService encryptionService;
    private final EmailHashUtil emailHashUtil;

    @Transactional
    public MigrationResult migrateAll() {
        AtomicInteger usersProcessed = new AtomicInteger();
        AtomicInteger invitationsProcessed = new AtomicInteger();

        log.info("Начало миграции шифрования данных...");

        List<User> users = userRepository.findAll();
        for (User user : users) {
            boolean changed = false;

            // Если email ещё не зашифрован (plaintext короче зашифрованного)
            if (user.getEmail() != null && !isEncrypted(user.getEmail())) {
                String rawEmail = user.getEmail();
                user.setEmailHash(emailHashUtil.hash(rawEmail));
                // email будет зашифрован конвертером при save
                user.setEmail(rawEmail);
                changed = true;
            } else if (user.getEmailHash() == null && user.getEmail() != null) {
                // email уже зашифрован, но hash не проставлен — расшифровываем для хеша
                String decrypted = encryptionService.decrypt(user.getEmail());
                user.setEmailHash(emailHashUtil.hash(decrypted));
                changed = true;
            }

            if (user.getFirstName() != null && !isEncrypted(user.getFirstName())) {
                user.setFirstName(user.getFirstName());
                changed = true;
            }
            if (user.getLastName() != null && !isEncrypted(user.getLastName())) {
                user.setLastName(user.getLastName());
                changed = true;
            }
            if (user.getPhone() != null && !isEncrypted(user.getPhone())) {
                user.setPhone(user.getPhone());
                changed = true;
            }

            if (changed) {
                userRepository.save(user);
                usersProcessed.incrementAndGet();
            }
        }

        List<Invitation> invitations = invitationRepository.findAll();
        for (Invitation invitation : invitations) {
            boolean changed = false;

            if (invitation.getEmail() != null && !isEncrypted(invitation.getEmail())) {
                String rawEmail = invitation.getEmail();
                invitation.setEmailHash(emailHashUtil.hash(rawEmail));
                invitation.setEmail(rawEmail);
                changed = true;
            } else if (invitation.getEmailHash() == null && invitation.getEmail() != null) {
                String decrypted = encryptionService.decrypt(invitation.getEmail());
                invitation.setEmailHash(emailHashUtil.hash(decrypted));
                changed = true;
            }

            if (changed) {
                invitationRepository.save(invitation);
                invitationsProcessed.incrementAndGet();
            }
        }

        log.info("Миграция завершена: пользователей={}, приглашений={}",
                usersProcessed.get(), invitationsProcessed.get());

        return new MigrationResult(usersProcessed.get(), invitationsProcessed.get());
    }

    /**
     * Эвристика: зашифрованные значения — это валидный Base64 длиной > 40 символов.
     * AES-GCM: 12 байт IV + минимум 1 байт данных + 16 байт тег = 29 байт → base64 ~40 символов.
     */
    private boolean isEncrypted(String value) {
        if (value == null || value.length() < 40) return false;
        try {
            byte[] decoded = java.util.Base64.getDecoder().decode(value);
            return decoded.length >= 29;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public record MigrationResult(int usersProcessed, int invitationsProcessed) {}
}
