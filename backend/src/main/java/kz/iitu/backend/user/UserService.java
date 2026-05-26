package kz.iitu.backend.user;

import kz.iitu.backend.shared.encryption.EmailHashUtil;
import kz.iitu.backend.shared.storage.FileStorageService;
import kz.iitu.backend.student.StudentRepository;
import kz.iitu.backend.user.dto.ChangePasswordRequest;
import kz.iitu.backend.user.dto.UpdateUserRequest;
import kz.iitu.backend.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;
    private final EmailHashUtil emailHashUtil;
    private final StudentRepository studentRepository;

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден с ID: " + userId));
        return mapToResponse(user);
    }

    @Transactional
    public UserResponse updateUser(UUID userId, UpdateUserRequest request) {
        log.info("Updating user with ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден с ID: " + userId));

        if (request.getEmail() != null) {
            String newEmailHash = emailHashUtil.hash(request.getEmail());
            if (!newEmailHash.equals(user.getEmailHash()) && userRepository.existsByEmailHash(newEmailHash)) {
                throw new RuntimeException("Email уже используется");
            }
            user.setEmail(request.getEmail());
            user.setEmailHash(newEmailHash);
        }

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());

        // Если роль меняется с STUDENT на другую — удалить все зачисления
        if (request.getRole() != null && request.getRole() != user.getRole()) {
            if (user.getRole() == UserRole.STUDENT && request.getRole() != UserRole.STUDENT) {
                log.info("Role changed from STUDENT to {} for user {}, removing all enrollments", request.getRole(), userId);
                studentRepository.deleteAllByUserId(userId);
            }
            user.setRole(request.getRole());
        }
        if (request.getProfilePhotoUrl() != null) user.setProfilePhotoUrl(request.getProfilePhotoUrl());
        if (request.getStatus() != null) user.setStatus(request.getStatus());

        user = userRepository.save(user);
        log.info("User updated successfully: {}", userId);
        return mapToResponse(user);
    }

    @Transactional
    public UserResponse changeUserStatus(UUID userId, UserStatus newStatus) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден с ID: " + userId));
        user.setStatus(newStatus);
        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден с ID: " + userId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Неверный текущий пароль");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public UserResponse uploadProfilePhoto(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден с ID: " + userId));

        if (user.getProfilePhotoUrl() != null && !user.getProfilePhotoUrl().isEmpty()) {
            try {
                fileStorageService.deleteFile(user.getProfilePhotoUrl());
            } catch (Exception e) {
                log.warn("Failed to delete old profile photo: {}", e.getMessage());
            }
        }

        user.setProfilePhotoUrl(fileStorageService.uploadProfilePhoto(file, userId));
        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse deleteProfilePhoto(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден с ID: " + userId));

        if (user.getProfilePhotoUrl() != null && !user.getProfilePhotoUrl().isEmpty()) {
            fileStorageService.deleteFile(user.getProfilePhotoUrl());
            user.setProfilePhotoUrl(null);
            user = userRepository.save(user);
        }

        return mapToResponse(user);
    }

    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден с ID: " + userId));

        if (user.getProfilePhotoUrl() != null && !user.getProfilePhotoUrl().isEmpty()) {
            try {
                fileStorageService.deleteFile(user.getProfilePhotoUrl());
            } catch (Exception e) {
                log.warn("Failed to delete profile photo during user deletion: {}", e.getMessage());
            }
        }

        userRepository.deleteById(userId);
    }

    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .phone(user.getPhone())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .status(user.getStatus())
                .isEmailVerified(user.getIsEmailVerified())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
