package kz.iitu.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import org.thymeleaf.templateresolver.ITemplateResolver;

/**
 * Конфигурация Thymeleaf для email шаблонов
 */
@Configuration
public class ThymeleafConfig {

    /**
     * Template resolver для email шаблонов
     */
    @Bean
    public ITemplateResolver emailTemplateResolver() {
        ClassLoaderTemplateResolver templateResolver = new ClassLoaderTemplateResolver();

        // Папка с шаблонами
        templateResolver.setPrefix("templates/email/");

        // Расширение файлов
        templateResolver.setSuffix(".html");

        // Режим шаблонов - HTML
        templateResolver.setTemplateMode(TemplateMode.HTML);

        // Кодировка
        templateResolver.setCharacterEncoding("UTF-8");

        // Кэширование (false для разработки, true для production)
        templateResolver.setCacheable(false);

        // Проверять существование шаблона
        templateResolver.setCheckExistence(true);

        return templateResolver;
    }

    /**
     * Template engine для email
     */
    @Bean
    public SpringTemplateEngine emailTemplateEngine() {
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.addTemplateResolver(emailTemplateResolver());
        return templateEngine;
    }
}
