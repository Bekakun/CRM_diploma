package kz.iitu.backend.user;

import jakarta.validation.Valid;
import kz.iitu.backend.security.CustomUserDetails;
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
