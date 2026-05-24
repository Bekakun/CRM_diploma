package kz.iitu.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Конфигурация для асинхронного выполнения методов
 * Используется для отправки email уведомлений в фоновом режиме
 */
@Configuration
@EnableAsync
@Slf4j
public class AsyncConfig implements AsyncConfigurer {

    /**
     * Настройка Thread Pool для асинхронных задач
     */
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // Минимальное количество потоков
        executor.setCorePoolSize(2);

        // Максимальное количество потоков
        executor.setMaxPoolSize(5);

        // Размер очереди задач
        executor.setQueueCapacity(100);

        // Префикс имени потока
        executor.setThreadNamePrefix("async-email-");

        // Инициализация
        executor.initialize();

        log.info("Async executor configured: corePoolSize={}, maxPoolSize={}, queueCapacity={}",
                executor.getCorePoolSize(),
                executor.getMaxPoolSize(),
                executor.getQueueCapacity());

        return executor;
    }
}
