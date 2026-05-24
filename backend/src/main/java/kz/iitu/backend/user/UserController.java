package kz.iitu.backend.user;

import jakarta.validation.Valid;
import kz.iitu.backend.security.CustomUserDetails;
import kz.iitu.backend.student.StudentService;
import kz.iitu.backend.student.dto.EnrollStudentRequest;
import kz.iitu.backend.student.dto.StudentResponse;
import kz.iitu.backend.user.dto.UpdateUserRequest;
import kz.iitu.backend.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST контроллер для управления пользователями (только для администраторов)
 * Базовый путь: /api/v1/admin/users
 */
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class UserController {

    private final UserService userService;
    private final StudentService studentService;

    /**
     * Получить всех пользователей с пагинацией
     * Доступ: ADMIN, SUPER_ADMIN
     * GET /api/v1/admin/users?page=0&size=20&sort=createdAt,desc
     */
    @GetMapping
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort
    ) {
        log.info("GET /api/v1/admin/users - page: {}, size: {}", page, size);

        // Парсинг сортировки
        Sort.Direction direction = sort.length > 1 && sort[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        String sortBy = sort[0];

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<UserResponse> users = userService.getAllUsers(pageable);

        return ResponseEntity.ok(users);
    }

    /**
     * Получить пользователя по ID
     * Доступ: ADMIN, SUPER_ADMIN
     * GET /api/v1/admin/users/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        log.info("GET /api/v1/admin/users/{}", id);

        UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    /**
     * Обновить информацию о пользователе
     * Доступ: ADMIN, SUPER_ADMIN
     * PATCH /api/v1/admin/users/{id}
     */
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        log.info("PATCH /api/v1/admin/users/{}", id);

        UserResponse updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(updatedUser);
    }

    /**
     * Изменить статус пользователя
     * Доступ: SUPER_ADMIN
     * PATCH /api/v1/admin/users/{id}/status
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserResponse> changeUserStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> request
    ) {
        log.info("PATCH /api/v1/admin/users/{}/status", id);

        String statusStr = request.get("status");
        if (statusStr == null) {
            throw new RuntimeException("Поле 'status' обязательно");
        }

        UserStatus newStatus;
        try {
            newStatus = UserStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Недопустимое значение статуса: " + statusStr);
        }

        UserResponse updatedUser = userService.changeUserStatus(id, newStatus);
        return ResponseEntity.ok(updatedUser);
    }

    /**
     * Удалить пользователя
     * Доступ: SUPER_ADMIN
     * DELETE /api/v1/admin/users/{id}
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> deleteUser(
            @PathVariable UUID id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        log.info("DELETE /api/v1/admin/users/{}", id);

        // Запретить удаление самого себя
        if (id.equals(currentUser.getId())) {
            throw new RuntimeException("Нельзя удалить самого себя");
        }

        userService.deleteUser(id);

        return ResponseEntity.ok(Map.of("message", "Пользователь успешно удален"));
    }

    /**
     * Получить ID курсов, на которые записан студент
     * GET /api/v1/admin/users/{userId}/enrolled-courses
     */
    @GetMapping("/{userId}/enrolled-courses")
    public ResponseEntity<List<UUID>> getEnrolledCourseIds(@PathVariable UUID userId) {
        log.info("GET /api/v1/admin/users/{}/enrolled-courses", userId);
        List<UUID> courseIds = studentService.getEnrolledCourseIds(userId);
        return ResponseEntity.ok(courseIds);
    }

    /**
     * Зачислить студента на курсы
     * Доступ: ADMIN, SUPER_ADMIN
     * POST /api/v1/admin/users/{userId}/enroll
     */
    @PostMapping("/{userId}/enroll")
    public ResponseEntity<List<StudentResponse>> enrollStudent(
            @PathVariable UUID userId,
            @Valid @RequestBody EnrollStudentRequest request
    ) {
        log.info("POST /api/v1/admin/users/{}/enroll - Enrolling student in courses", userId);

        List<StudentResponse> enrollments = studentService.enrollStudent(userId, request);
        return ResponseEntity.ok(enrollments);
    }
}
