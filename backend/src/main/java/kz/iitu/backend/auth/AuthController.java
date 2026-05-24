package kz.iitu.backend.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import kz.iitu.backend.auth.dto.AuthResponse;
import kz.iitu.backend.auth.dto.ForgotPasswordRequest;
import kz.iitu.backend.auth.dto.LoginRequest;
import kz.iitu.backend.auth.dto.RefreshTokenRequest;
import kz.iitu.backend.auth.dto.RegisterRequest;
import kz.iitu.backend.auth.dto.ResetPasswordRequest;
import kz.iitu.backend.auth.dto.VerifyEmailRequest;
import kz.iitu.backend.user.dto.UserDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST контроллер для аутентификации и регистрации
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    /**
     * Регистрация нового пользователя
     * Создает пользователя и отправляет код верификации на email
     *
     * @param request Данные для регистрации
     * @return Сообщение об отправке кода верификации
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        log.info("POST /api/v1/auth/register - регистрация пользователя: {}", request.getEmail());
        Map<String, String> response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Вход в систему
     *
     * @param request Данные для входа
     * @param httpResponse HTTP response для установки cookies
     * @return AuthResponse с токенами
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse httpResponse
    ) {
        log.info("POST /api/v1/auth/login - вход пользователя: {}", request.getEmail());
        AuthResponse response = authService.login(request);

        // Установить токены в cookies
        setAuthCookies(httpResponse, response.getAccessToken(), response.getRefreshToken());

        return ResponseEntity.ok(response);
    }

    /**
     * Обновление токенов через refresh token
     *
     * @param request Refresh token
     * @param httpResponse HTTP response для установки cookies
     * @return AuthResponse с новыми токенами
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletResponse httpResponse
    ) {
        log.info("POST /api/v1/auth/refresh - обновление токенов");
        AuthResponse response = authService.refresh(request);

        // Установить новые токены в cookies
        setAuthCookies(httpResponse, response.getAccessToken(), response.getRefreshToken());

        return ResponseEntity.ok(response);
    }

    /**
     * Выход из системы
     * Удаляет cookies с токенами
     *
     * @param httpResponse HTTP response для удаления cookies
     * @return Сообщение об успешном выходе
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse httpResponse) {
        log.info("POST /api/v1/auth/logout - выход из системы");

        // Удалить cookies с токенами
        clearAuthCookies(httpResponse);

        // TODO: Добавить токен в черный список (blacklist) в Redis
        return ResponseEntity.ok(Map.of("message", "Успешный выход из системы"));
    }

    /**
     * Верификация email по коду
     *
     * @param request Email и код верификации
     * @param httpResponse HTTP response для установки cookies
     * @return AuthResponse с токенами после успешной верификации
     */
    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request,
            HttpServletResponse httpResponse
    ) {
        log.info("POST /api/v1/auth/verify-email - верификация email: {}", request.getEmail());
        AuthResponse response = authService.verifyEmail(request);

        // Установить токены в cookies после успешной верификации
        setAuthCookies(httpResponse, response.getAccessToken(), response.getRefreshToken());

        return ResponseEntity.ok(response);
    }

    /**
     * Запрос сброса пароля — отправляет письмо с токеном
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("POST /api/v1/auth/forgot-password - запрос сброса пароля: {}", request.getEmail());
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    /**
     * Сброс пароля по токену из письма
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("POST /api/v1/auth/reset-password - сброс пароля по токену");
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    /**
     * Получить информацию о текущем пользователе
     *
     * @return Информация о пользователе
     */
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser() {
        log.info("GET /api/v1/auth/me - получение информации о текущем пользователе");
        UserDTO user = authService.getCurrentUser();
        return ResponseEntity.ok(user);
    }

    /**
     * Установить JWT токены в HTTP-only cookies
     */
    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        // Access token cookie (15 минут)
        Cookie accessTokenCookie = new Cookie("accessToken", accessToken);
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setSecure(false); // Для разработки. В продакшене должно быть true (HTTPS only)
        accessTokenCookie.setPath("/");
        accessTokenCookie.setMaxAge(15 * 60); // 15 минут в секундах
        response.addCookie(accessTokenCookie);

        // Refresh token cookie (7 дней)
        Cookie refreshTokenCookie = new Cookie("refreshToken", refreshToken);
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setSecure(false); // Для разработки. В продакшене должно быть true (HTTPS only)
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(7 * 24 * 60 * 60); // 7 дней в секундах
        response.addCookie(refreshTokenCookie);

        log.debug("JWT токены установлены в cookies");
    }

    /**
     * Удалить JWT токены из cookies
     */
    private void clearAuthCookies(HttpServletResponse response) {
        Cookie accessTokenCookie = new Cookie("accessToken", null);
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setSecure(false);
        accessTokenCookie.setPath("/");
        accessTokenCookie.setMaxAge(0); // Удалить cookie
        response.addCookie(accessTokenCookie);

        Cookie refreshTokenCookie = new Cookie("refreshToken", null);
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setSecure(false);
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(0); // Удалить cookie
        response.addCookie(refreshTokenCookie);

        log.debug("JWT токены удалены из cookies");
    }
}
