package kz.iitu.backend.user;

import jakarta.validation.Valid;
import kz.iitu.backend.security.CustomUserDetails;
import kz.iitu.backend.shared.email.EmailService;
import kz.iitu.backend.shared.exception.BadRequestException;
import kz.iitu.backend.shared.exception.ConflictException;
import kz.iitu.backend.user.dto.ChangePasswordRequest;
import kz.iitu.backend.user.dto.UpdateUserRequest;
import kz.iitu.backend.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * REST контроллер для управления профилем текущего пользователя
 * Базовый путь: /api/v1/profile
 */
@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
@Slf4j
public class ProfileController {

    private final UserService userService;
    private final EmailChangeService emailChangeService;
    private final EmailService emailService;

    /**
     * Получить профиль текущего пользователя
     * GET /api/v1/profile
     */
    @GetMapping
    public ResponseEntity<UserResponse> getMyProfile(
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        log.info("GET /api/v1/profile - user: {}", currentUser.getEmail());

        UserResponse profile = userService.getUserById(currentUser.getId());
        return ResponseEntity.ok(profile);
    }

    /**
     * Обновить профиль текущего пользователя
     * PATCH /api/v1/profile
     */
    @PatchMapping
    public ResponseEntity<UserResponse> updateProfile(
            @Valid @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        log.info("PATCH /api/v1/profile - user: {}", currentUser.getEmail());

        // Запретить изменение роли и статуса через профиль
        request.setRole(null);
        request.setStatus(null);

        UserResponse updatedProfile = userService.updateUser(currentUser.getId(), request);
        return ResponseEntity.ok(updatedProfile);
    }

    /**
     * Изменить пароль текущего пользователя
     * POST /api/v1/profile/change-password
     */
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        log.info("POST /api/v1/profile/change-password - user: {}", currentUser.getEmail());

        userService.changePassword(currentUser.getId(), request);

        return ResponseEntity.ok(Map.of("message", "Пароль успешно изменен"));
    }

    /**
     * Загрузить фото профиля
     * POST /api/v1/profile/photo
     */
    @PostMapping("/photo")
    public ResponseEntity<UserResponse> uploadProfilePhoto(
            @RequestParam("photo") MultipartFile photo,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        log.info("POST /api/v1/profile/photo - user: {}", currentUser.getEmail());

        if (photo.isEmpty()) {
            throw new RuntimeException("Файл не может быть пустым");
        }

        UserResponse updatedProfile = userService.uploadProfilePhoto(currentUser.getId(), photo);
        return ResponseEntity.ok(updatedProfile);
    }

    /**
     * Запросить смену email — отправляет код на новый адрес
     * POST /api/v1/profile/change-email/request
     */
    @PostMapping("/change-email/request")
    public ResponseEntity<Map<String, String>> requestEmailChange(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        String newEmail = body.get("newEmail");
        if (newEmail == null || !newEmail.contains("@")) {
            throw new BadRequestException("Некорректный email");
        }
        // Check not already taken
        if (userService.emailExists(newEmail) && !newEmail.equalsIgnoreCase(currentUser.getEmail())) {
            throw new ConflictException("Этот email уже используется");
        }
        EmailChangeService.PendingChange change = emailChangeService.createRequest(
                currentUser.getId().toString(), newEmail);
        UserResponse profile = userService.getUserById(currentUser.getId());
        emailService.sendVerificationEmail(newEmail, profile.getFirstName(), change.getCode());
        return ResponseEntity.ok(Map.of("message", "Код отправлен на " + newEmail));
    }

    /**
     * Подтвердить смену email
     * POST /api/v1/profile/change-email/confirm
     */
    @PostMapping("/change-email/confirm")
    public ResponseEntity<Map<String, String>> confirmEmailChange(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        String code = body.get("code");
        EmailChangeService.PendingChange change = emailChangeService
                .getRequest(currentUser.getId().toString())
                .orElseThrow(() -> new BadRequestException("Код устарел или не найден. Запросите новый."));

        if (!change.getCode().equals(code)) {
            throw new BadRequestException("Неверный код подтверждения");
        }

        UpdateUserRequest req = new UpdateUserRequest();
        req.setEmail(change.getNewEmail());
        userService.updateUser(currentUser.getId(), req);
        emailChangeService.remove(currentUser.getId().toString());

        return ResponseEntity.ok(Map.of("newEmail", change.getNewEmail()));
    }

    /**
     * Удалить фото профиля
     * DELETE /api/v1/profile/photo
     */
    @DeleteMapping("/photo")
    public ResponseEntity<Void> deleteProfilePhoto(
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        log.info("DELETE /api/v1/profile/photo - user: {}", currentUser.getEmail());

        userService.deleteProfilePhoto(currentUser.getId());

        return ResponseEntity.noContent().build();
    }
}
