package kz.iitu.backend.shared.email;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.HashMap;
import java.util.Map;

/**
 * Сервис для отправки email уведомлений через Resend API
 */
@Service
@Slf4j
@org.springframework.context.annotation.Lazy
public class EmailService {

    private final TemplateEngine templateEngine;

    @Value("${resend.api.key}")
    private String resendApiKey;

    @Value("${app.email.from}")
    private String fromEmail;

    @Value("${app.email.from-name}")
    private String fromName;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public EmailService(@org.springframework.beans.factory.annotation.Qualifier("emailTemplateEngine") TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
    }

    @Async
    public void sendTemplatedEmail(String to, String subject, String templateName, Map<String, Object> variables) {
        try {
            log.info("=== Starting email send process ===");
            log.info("To: {}", to);
            log.info("Subject: {}", subject);
            log.info("Template: {}", templateName);

            variables.put("frontendUrl", frontendUrl);

            Context context = new Context();
            context.setVariables(variables);
            String htmlContent = templateEngine.process(templateName, context);
            log.info("Template processed successfully. HTML length: {} chars", htmlContent.length());

            Resend resend = new Resend(resendApiKey);

            String from = fromName + " <" + fromEmail + ">";

            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(from)
                    .to(to)
                    .subject(subject)
                    .html(htmlContent)
                    .build();

            resend.emails().send(params);
            log.info("✅ Email sent successfully to: {}", to);

        } catch (ResendException e) {
            log.error("❌ Resend API error sending email to {}: {}", to, e.getMessage());
        } catch (Exception e) {
            log.error("❌ Unexpected error sending email to {}: {}", to, e.getMessage());
        }
    }

    @Async
    public void sendVerificationEmail(String to, String firstName, String verificationCode) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("firstName", firstName);
        variables.put("verificationCode", verificationCode);
        sendTemplatedEmail(to, "Подтвердите ваш email", "verification-email", variables);
    }

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

    @Async
    public void sendHomeworkNotification(String to, String studentName, String lessonTitle, String homeworkTitle, String dueDate) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("studentName", studentName);
        variables.put("lessonTitle", lessonTitle);
        variables.put("homeworkTitle", homeworkTitle);
        variables.put("dueDate", dueDate);
        sendTemplatedEmail(to, "Новое домашнее задание: " + homeworkTitle, "homework-notification", variables);
    }

    @Async
    public void sendGradeNotification(String to, String studentName, String homeworkTitle, Integer grade, String feedback) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("studentName", studentName);
        variables.put("homeworkTitle", homeworkTitle);
        variables.put("grade", grade);
        variables.put("feedback", feedback != null ? feedback : "Без комментариев");
        sendTemplatedEmail(to, "Оценка за задание: " + homeworkTitle, "grade-notification", variables);
    }

    @Async
    public void sendPasswordResetEmail(String to, String firstName, String resetToken) {
        String resetUrl = frontendUrl + "/reset-password?token=" + resetToken;
        Map<String, Object> variables = new HashMap<>();
        variables.put("firstName", firstName);
        variables.put("resetUrl", resetUrl);
        sendTemplatedEmail(to, "Сброс пароля — CRM LMS", "password-reset-email", variables);
    }

    @Async
    public void sendPaymentReminderEmail(String to, String studentName, Double amount, String dueDate) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("studentName", studentName);
        variables.put("amount", amount);
        variables.put("dueDate", dueDate);
        sendTemplatedEmail(to, "Напоминание об оплате", "payment-reminder", variables);
    }
}
