package kz.iitu.backend.telegram;

import jakarta.annotation.PostConstruct;
import kz.iitu.backend.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.longpolling.TelegramBotsLongPollingApplication;
import org.telegram.telegrambots.longpolling.interfaces.LongPollingUpdateConsumer;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.message.Message;

import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class CrmTelegramBot implements LongPollingUpdateConsumer {

    @Value("${telegram.bot.token}")
    private String botToken;

    private final TelegramLinkService linkService;
    private final TelegramBotService botService;
    private final TelegramBotsLongPollingApplication botsApplication;

    @PostConstruct
    public void register() {
        try {
            botsApplication.registerBot(botToken, this);
            log.info("Telegram bot registered successfully");
        } catch (Exception e) {
            log.error("Failed to register Telegram bot: {}", e.getMessage(), e);
        }
    }

    @Override
    public void consume(List<Update> updates) {
        updates.forEach(this::handleUpdate);
    }

    private void handleUpdate(Update update) {
        if (!update.hasMessage() || !update.getMessage().hasText()) return;

        Message message = update.getMessage();
        Long chatId = message.getChatId();
        String text = message.getText().trim();

        if (text.startsWith("/start")) {
            handleStart(chatId);
        } else if (text.startsWith("/link")) {
            String[] parts = text.split("\\s+");
            if (parts.length == 2) {
                handleLink(chatId, parts[1]);
            } else {
                botService.sendMessage(chatId,
                        "Используйте: <code>/link XXXX</code>\n\nГде XXXX — 4-значный код из настроек профиля в CRM.");
            }
        } else if (text.equals("/help")) {
            sendHelp(chatId);
        } else {
            botService.sendMessage(chatId,
                    "Неизвестная команда. Введите /help для справки.");
        }
    }

    private void handleStart(Long chatId) {
        botService.sendMessage(chatId,
                "👋 Добро пожаловать в CRM LMS!\n\n" +
                "Этот бот отправляет персональные уведомления:\n" +
                "• Новые уроки и домашние задания\n" +
                "• Оценки за работы\n" +
                "• Подтверждения оплат\n" +
                "• Системные события\n\n" +
                "Чтобы привязать аккаунт:\n" +
                "1. Откройте <b>Настройки профиля</b> в CRM\n" +
                "2. Нажмите <b>«Привязать Telegram»</b>\n" +
                "3. Скопируйте 4-значный код\n" +
                "4. Введите здесь: <code>/link XXXX</code>"
        );
    }

    private void handleLink(Long chatId, String code) {
        Optional<User> userOpt = linkService.linkByCode(code, chatId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            botService.sendMessage(chatId,
                    String.format("✅ Аккаунт успешно привязан!\n\nДобро пожаловать, <b>%s %s</b>!\nТеперь вы будете получать уведомления здесь.",
                            user.getFirstName(), user.getLastName()));
        } else {
            botService.sendMessage(chatId,
                    "❌ Неверный или устаревший код.\n\nПожалуйста, сгенерируйте новый код в настройках CRM и попробуйте снова.");
        }
    }

    private void sendHelp(Long chatId) {
        botService.sendMessage(chatId,
                "<b>Доступные команды:</b>\n\n" +
                "/start — приветствие и инструкция\n" +
                "/link XXXX — привязать аккаунт CRM по 4-значному коду\n" +
                "/help — эта справка");
    }
}
