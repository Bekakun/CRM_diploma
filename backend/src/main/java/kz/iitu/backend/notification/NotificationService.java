package kz.iitu.backend.notification;

import kz.iitu.backend.telegram.TelegramBotService;
import kz.iitu.backend.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final TelegramBotService telegramBotService;

    // ── Read ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notificationRepository.markAllReadByUserId(userId);
    }

    @Transactional
    public void markRead(UUID notificationId, UUID userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(userId)) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        });
    }

    // ── Create helpers (called by other services) ─────────────────────────────

    @Async
    public void notifyGrade(User student, String homeworkTitle, int grade) {
        create(student, NotificationType.grade,
                "Новая оценка",
                String.format("Преподаватель оценил вашу работу \"%s\" — %d/100", homeworkTitle, grade));
    }

    @Async
    public void notifyNewHomework(User student, String lessonTitle, String homeworkTitle, String courseName) {
        create(student, NotificationType.deadline,
                "Новое домашнее задание",
                String.format("По уроку \"%s\" (%s) добавлено задание: \"%s\"", lessonTitle, courseName, homeworkTitle));
    }

    @Async
    public void notifyNewLesson(User student, String lessonTitle, String courseName) {
        create(student, NotificationType.lesson,
                "Новый урок",
                String.format("В курс \"%s\" добавлен урок \"%s\"", courseName, lessonTitle));
    }

    @Async
    public void notifyPaymentDue(User student, String courseName, String amount, String dueDate) {
        create(student, NotificationType.payment,
                "Напоминание об оплате",
                String.format("Срок оплаты за курс \"%s\" истекает %s. Сумма: %s", courseName, dueDate, amount));
    }

    @Async
    public void notifyPaymentMarkedPaid(User student, String courseName, String period) {
        create(student, NotificationType.payment,
                "Оплата подтверждена",
                String.format("Ваша оплата за курс \"%s\" (%s) подтверждена администратором", courseName, period));
    }

    @Async
    public void notifyHomeworkSubmitted(User instructor, String studentFirstName, String studentLastName,
                                        String homeworkTitle, String courseName) {
        create(instructor, NotificationType.general,
                "Новое задание на проверку",
                String.format("Студент %s %s сдал работу \"%s\" (%s)", studentFirstName, studentLastName, homeworkTitle, courseName));
    }

    @Async
    public void notifyNewUserRegistered(List<User> admins, String firstName, String lastName, String role) {
        String roleLabel = switch (role) {
            case "INSTRUCTOR" -> "Преподаватель";
            case "STUDENT" -> "Студент";
            case "ADMIN" -> "Администратор";
            default -> role;
        };
        for (User admin : admins) {
            create(admin, NotificationType.general,
                    "Новый пользователь",
                    String.format("%s %s зарегистрировался в системе (роль: %s)", firstName, lastName, roleLabel));
        }
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private void create(User user, NotificationType type, String title, String body) {
        try {
            Notification n = Notification.builder()
                    .user(user)
                    .type(type)
                    .title(title)
                    .body(body)
                    .build();
            notificationRepository.save(n);
            log.debug("Notification created for user {}: [{}] {}", user.getId(), type, title);

            if (user.getTelegramChatId() != null) {
                String emoji = switch (type) {
                    case grade -> "🎓";
                    case lesson -> "📚";
                    case payment -> "💳";
                    case deadline -> "⏰";
                    case general -> "🔔";
                };
                telegramBotService.sendMessage(user.getTelegramChatId(),
                        emoji + " <b>" + title + "</b>\n\n" + body);
            }
        } catch (Exception e) {
            log.error("Failed to create notification for user {}: {}", user.getId(), e.getMessage(), e);
        }
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType().name())
                .title(n.getTitle())
                .body(n.getBody())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
