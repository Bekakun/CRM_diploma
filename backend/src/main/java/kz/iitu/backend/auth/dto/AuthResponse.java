package kz.iitu.backend.auth.dto;

import kz.iitu.backend.user.dto.UserDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для ответа при успешной аутентификации
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    /**
     * Access токен (короткоживущий, 15 минут)
     */
    private String accessToken;

    /**
     * Refresh токен (долгоживущий, 7 дней)
     */
    private String refreshToken;

    /**
     * Тип токена (всегда "Bearer")
     */
    @Builder.Default
    private String tokenType = "Bearer";

    /**
     * Информация о пользователе
     */
    private UserDTO user;
}
