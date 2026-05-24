package kz.iitu.backend.telegram;

import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramLinkService {

    private final TelegramLinkCodeRepository linkCodeRepository;
    private final UserRepository userRepository;
    private final TelegramBotService telegramBotService;

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Генерирует 4-значный код привязки для пользователя.
     * Удаляет предыдущие коды пользователя, создаёт новый.
     */
    @Transactional
    public String generateLinkCode(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        linkCodeRepository.deleteByUserId(userId);

        String code;
        do {
            code = String.format("%04d", RANDOM.nextInt(10_000));
        } while (linkCodeRepository.findByCode(code).isPresent());

        TelegramLinkCode linkCode = TelegramLinkCode.builder()
                .user(user)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build();

        linkCodeRepository.save(linkCode);
        log.info("Generated Telegram link code for user {}", userId);
        return code;
    }

    /**
     * Привязывает Telegram chatId к пользователю по коду.
     * Возвращает пользователя, если код корректен, иначе empty.
     */
    @Transactional
    public Optional<User> linkByCode(String code, Long chatId) {
        Optional<TelegramLinkCode> opt = linkCodeRepository.findByCode(code);
        if (opt.isEmpty()) {
            return Optional.empty();
        }

        TelegramLinkCode linkCode = opt.get();
        if (linkCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            linkCodeRepository.delete(linkCode);
            return Optional.empty();
        }

        User user = linkCode.getUser();
        user.setTelegramChatId(chatId);
        userRepository.save(user);
        linkCodeRepository.delete(linkCode);

        log.info("Linked Telegram chatId={} to user {}", chatId, user.getId());
        return Optional.of(user);
    }

    /**
     * Отвязывает Telegram от пользователя.
     */
    @Transactional
    public void unlinkTelegram(UUID userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setTelegramChatId(null);
            userRepository.save(user);
            linkCodeRepository.deleteByUserId(userId);
            log.info("Unlinked Telegram for user {}", userId);
        });
    }

    /**
     * Возвращает true если у пользователя привязан Telegram.
     */
    @Transactional(readOnly = true)
    public boolean isLinked(UUID userId) {
        return userRepository.findById(userId)
                .map(u -> u.getTelegramChatId() != null)
                .orElse(false);
    }

    /** Очищать просроченные коды каждые 10 минут */
    @Scheduled(fixedDelay = 600_000)
    @Transactional
    public void cleanupExpiredCodes() {
        linkCodeRepository.deleteExpired(LocalDateTime.now());
    }
}
