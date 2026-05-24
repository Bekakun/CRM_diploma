package kz.iitu.backend.shared.encryption;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * JPA конвертер: шифрует строку перед записью в БД, расшифровывает при чтении.
 * Используется через @Convert(converter = EncryptedStringConverter.class).
 */
@Converter
@Component
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    // Статический holder нужен потому что JPA создаёт конвертер без Spring-контекста
    private static EncryptionService encryptionService;

    @Autowired
    public void setEncryptionService(EncryptionService service) {
        EncryptedStringConverter.encryptionService = service;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || encryptionService == null) return attribute;
        return encryptionService.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || encryptionService == null) return dbData;
        return encryptionService.decrypt(dbData);
    }
}
