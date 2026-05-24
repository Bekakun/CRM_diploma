package kz.iitu.backend;

import io.minio.MinioClient;
import kz.iitu.backend.config.TestH2Config;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.telegram.telegrambots.longpolling.TelegramBotsLongPollingApplication;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestH2Config.class)
class BackendApplicationTests {

    @MockitoBean
    private MinioClient minioClient;

    @MockitoBean
    private TelegramBotsLongPollingApplication telegramBotsApplication;

    @Test
    void contextLoads() {
    }
}
