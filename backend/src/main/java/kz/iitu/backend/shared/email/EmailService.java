package kz.iitu.backend.shared.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.HashMap;
import java.util.Map;

/**
 * Сервис для отправки email уведомлений
 */
@Service
@Slf4j
@org.springframework.context.annotation.Lazy
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    public EmailService(
            JavaMailSender mailSender,
            @Qualifier("emailTemplateEngine") TemplateEngine templateEngine
    ) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    @Value("${app.email.from}")
    private String fromEmail;

    @Value("${app.email.from-name}")
    private String fromName;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    /**
     * Отправить email с HTML шаблоном (асинхронно)
     *
     * @param to           Email получателя
     * @param subject      Тема письма
     * @param templateName Имя Thymeleaf шаблона (без .html)
     * @param variables    Переменные для шаблона
     */
    @Async
    public void sendTemplatedEmail(String to, String subject, String templateName, Map<String, Object> variables) {
        try {
            log.info("=== Starting email send process ===");
            log.info("To: {}", to);
            log.info("Subject: {}", subject);
            log.info("Template: {}", templateName);
            log.info("From Email: {}", fromEmail);
            log.info("From Name: {}", fromName);

            // Добавить общие переменные
            variables.put("frontendUrl", frontendUrl);
            log.debug("Variables: {}", variables);

            // Обработать Thymeleaf шаблон
            log.info("Processing Thymeleaf template...");
            Context context = new Context();
            context.setVariables(variables);
            String htmlContent = templateEngine.process(templateName, context);
            log.info("Template processed successfully. HTML length: {} chars", htmlContent.length());

            // Создать MIME message
            log.info("Creating MIME message...");
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = HTML
            log.info("MIME message configured successfully");

            // Отправить email
            log.info("Attempting to send email via SMTP...");
            mailSender.send(message);

            log.info("✅ Email sent successfully to: {}", to);
            log.info("=== Email send process completed ===");
        } catch (MessagingException e) {
            log.error("❌ MessagingException while sending email to: {}", to);
            log.error("Error message: {}", e.getMessage());
            log.error("Stack trace:", e);
            // Не выбрасываем исключение в асинхронном методе - просто логируем ошибку
            log.error("Email не был отправлен из-за ошибки подключения к SMTP");
        } catch (Exception e) {
            log.error("❌ Unexpected error sending email to: {}", to);
            log.error("Error type: {}", e.getClass().getName());
            log.error("Error message: {}", e.getMessage());
            log.error("Stack trace:", e);
            // Не выбрасываем исключение в асинхронном методе - просто логируем ошибку
            log.error("Email не был отправлен из-за неожиданной ошибки");
        }
    }

    /**
     * Отправить email верификации пользователю
     */
    @Async
    public void sendVerificationEmail(String to, String firstName, String verificationCode) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("firstName", firstName);
        variables.put("verificationCode", verificationCode);

        sendTemplatedEmail(to, "Подтвердите ваш email", "verification-email", variables);
    }

    /**
     * Отправить приглашение на платформу
     */
    @Async
    public void sendInvitationEmail(String to, String role, String invitationToken, String inviterName) {
        String registrationUrl = frontendUrl + "/register?token=" + invitationToken;

        Map<String, Object> variables = new HashMap<>();
        variables.put("email", to);
        variables.put("role", role);
        variables.put("invitationToken", invitationToken);
        variables.put("registrationUrl", registrationUrl);
        variables.put("inviterName", inviterName);

        sendTemplatedEmail(to, "Приглашение на платформу CRM LMS", "invitation-email", variables);
    }

    /**
     * Отправить уведомление о новом задании
     */
    @Async
    public void sendHomeworkNotification(String to, String studentName, String lessonTitle, String homeworkTitle, String dueDate) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("studentName", studentName);
        variables.put("lessonTitle", lessonTitle);
        variables.put("homeworkTitle", homeworkTitle);
        variables.put("dueDate", dueDate);

        sendTemplatedEmail(to, "Новое домашнее задание: " + homeworkTitle, "homework-notification", variables);
    }

    /**
     * Отправить уведомление о выставленной оценке
     */
    @Async
    public void sendGradeNotification(String to, String studentName, String homeworkTitle, Integer grade, String feedback) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("studentName", studentName);
        variables.put("homeworkTitle", homeworkTitle);
        variables.put("grade", grade);
        variables.put("feedback", feedback != null ? feedback : "Без комментариев");

        sendTemplatedEmail(to, "Оценка за задание: " + homeworkTitle, "grade-notification", variables);
    }

    /**
     * Отправить письмо со ссылкой сброса пароля
     */
    @Async
    public void sendPasswordResetEmail(String to, String firstName, String resetToken) {
        String resetUrl = frontendUrl + "/reset-password?token=" + resetToken;

        Map<String, Object> variables = new HashMap<>();
        variables.put("firstName", firstName);
        variables.put("resetUrl", resetUrl);

        sendTemplatedEmail(to, "Сброс пароля — CRM LMS", "password-reset-email", variables);
    }

    /**
     * Отправить напоминание об оплате
     */
    @Async
    public void sendPaymentReminderEmail(String to, String studentName, Double amount, String dueDate) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("studentName", studentName);
        variables.put("amount", amount);
        variables.put("dueDate", dueDate);

        sendTemplatedEmail(to, "Напоминание об оплате", "payment-reminder", variables);
    }
}
