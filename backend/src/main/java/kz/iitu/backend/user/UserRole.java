package kz.iitu.backend.user;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Роли пользователей в системе CRM LMS
 */
public enum UserRole {
    /**
     * Супер администратор - полный доступ ко всей системе
     */
    SUPER_ADMIN,

    /**
     * Администратор - управление пользователями и курсами
     */
    ADMIN,

    /**
     * Преподаватель - создание курсов, уроков, проверка заданий
     */
    INSTRUCTOR,

    /**
     * Студент - просмотр курсов, отправка заданий, оплата
     */
    STUDENT;

    /**
     * Десериализация из JSON (case-insensitive)
     */
    @JsonCreator
    public static UserRole fromString(String value) {
        if (value == null) {
            throw new IllegalArgumentException("UserRole не может быть null");
        }

        try {
            return UserRole.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                "Недопустимая роль: " + value + ". Доступные значения: SUPER_ADMIN, ADMIN, INSTRUCTOR, STUDENT"
            );
        }
    }

    /**
     * Сериализация в JSON
     */
    @JsonValue
    public String toValue() {
        return this.name();
    }
}
