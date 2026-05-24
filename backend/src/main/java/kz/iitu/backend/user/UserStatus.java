package kz.iitu.backend.user;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Статус пользователя в системе
 */
public enum UserStatus {
    /**
     * Активный пользователь - может использовать систему
     */
    ACTIVE,

    /**
     * Неактивный пользователь - доступ заблокирован
     */
    INACTIVE;

    /**
     * Десериализация из JSON (case-insensitive)
     */
    @JsonCreator
    public static UserStatus fromString(String value) {
        if (value == null) {
            throw new IllegalArgumentException("UserStatus не может быть null");
        }

        try {
            return UserStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                "Недопустимый статус: " + value + ". Доступные значения: ACTIVE, INACTIVE"
            );
        }
    }

    /**
     * Сериализация в JSON (uppercase)
     */
    @JsonValue
    public String toValue() {
        return this.name();
    }
}
