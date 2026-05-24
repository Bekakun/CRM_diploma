package kz.iitu.backend.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Конфигурация MinIO для хранения файлов
 */
@Configuration
@Slf4j
public class MinioConfig {

    @Value("${minio.url}")
    private String minioUrl;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket-name}")
    private String bucketName;

    /**
     * Создание MinIO клиента
     */
    @Bean
    public MinioClient minioClient() {
        try {
            log.info("Initializing MinIO client...");
            log.info("MinIO URL: {}", minioUrl);
            log.info("Bucket name: {}", bucketName);

            MinioClient minioClient = MinioClient.builder()
                    .endpoint(minioUrl)
                    .credentials(accessKey, secretKey)
                    .build();

            // Проверить существование bucket
            boolean bucketExists = minioClient.bucketExists(
                    BucketExistsArgs.builder()
                            .bucket(bucketName)
                            .build()
            );

            // Создать bucket если не существует
            if (!bucketExists) {
                log.info("Bucket '{}' does not exist. Creating...", bucketName);
                minioClient.makeBucket(
                        MakeBucketArgs.builder()
                                .bucket(bucketName)
                                .build()
                );
                log.info("✅ Bucket '{}' created successfully", bucketName);
            } else {
                log.info("✅ Bucket '{}' already exists", bucketName);
            }

            log.info("✅ MinIO client initialized successfully");
            return minioClient;

        } catch (Exception e) {
            log.error("❌ Failed to initialize MinIO client: {}", e.getMessage(), e);
            throw new RuntimeException("Не удалось инициализировать MinIO: " + e.getMessage(), e);
        }
    }
}
