package kz.iitu.backend.telegram;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.generics.TelegramClient;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramBotService {

    @Value("${telegram.bot.token}")
    private String botToken;

    private volatile TelegramClient telegramClient;

    private TelegramClient getClient() {
        if (telegramClient == null) {
            synchronized (this) {
                if (telegramClient == null) {
                    telegramClient = new OkHttpTelegramClient(botToken);
                }
            }
        }
        return telegramClient;
    }

    public void sendMessage(Long chatId, String text) {
        try {
            SendMessage message = SendMessage.builder()
                    .chatId(chatId)
                    .text(text)
                    .parseMode("HTML")
                    .build();
            getClient().execute(message);
            log.debug("Telegram message sent to chatId={}", chatId);
        } catch (Exception e) {
            log.error("Failed to send Telegram message to chatId={}: {}", chatId, e.getMessage());
        }
    }
}
