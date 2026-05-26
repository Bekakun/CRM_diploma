package kz.iitu.backend.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kz.iitu.backend.user.UserRole;
import kz.iitu.backend.user.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для обновления информации о пользователе
 * Все поля опциональны - обновляются только переданные
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserRequest {

    @Email(message = "Некорректный формат email")
    @Size(max = 255, message = "Email не должен превышать 255 символов")
    private String email;

    @Size(min = 2, max = 100, message = "Имя должно быть от 2 до 100 символов")
    private String firstName;

    @Size(min = 2, max = 100, message = "Фамилия должна быть от 2 до 100 символов")
    private String lastName;

    private UserRole role;

    @Pattern(regexp = "^[+]?[0-9\\s\\-().]{7,20}$", message = "Некорректный формат телефона")
    private String phone;

    private String profilePhotoUrl;

    private UserStatus status;
}
