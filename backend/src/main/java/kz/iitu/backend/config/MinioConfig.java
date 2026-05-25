package kz.iitu.backend.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Конфигурация MinIO / S3-compatible хранилища файлов
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

    @Bean
    public MinioClient minioClient() {
        // Убираем path из URL — MinIO SDK принимает только host
        String endpoint = minioUrl;
        try {
            java.net.URL parsed = new java.net.URL(minioUrl);
            endpoint = parsed.getProtocol() + "://" + parsed.getHost()
                    + (parsed.getPort() != -1 ? ":" + parsed.getPort() : "");
        } catch (Exception e) {
            log.warn("Could not parse minio.url, using as-is: {}", minioUrl);
        }

        log.info("Initializing S3 client with endpoint: {}", endpoint);
        log.info("Bucket name: {}", bucketName);

        MinioClient minioClient = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .region("ap-south-1")
                .build();

        // Проверяем / создаём бакет — нефатально, не роняем приложение
        try {
            boolean bucketExists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucketName).build()
            );
            if (!bucketExists) {
                log.info("Bucket '{}' not found, creating...", bucketName);
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("✅ Bucket '{}' created", bucketName);
            } else {
                log.info("✅ Bucket '{}' exists", bucketName);
            }
        } catch (Exception e) {
            log.warn("⚠️ Could not verify/create bucket '{}': {}. File uploads may not work.", bucketName, e.getMessage());
        }

        log.info("✅ S3 client initialized");
        return minioClient;
    }
}
