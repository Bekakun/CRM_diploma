package kz.iitu.backend.auth;

import kz.iitu.backend.auth.dto.AuthResponse;
import kz.iitu.backend.auth.dto.ForgotPasswordRequest;
import kz.iitu.backend.auth.dto.LoginRequest;
import kz.iitu.backend.auth.dto.RefreshTokenRequest;
import kz.iitu.backend.auth.dto.RegisterRequest;
import kz.iitu.backend.auth.dto.ResetPasswordRequest;
import kz.iitu.backend.auth.dto.VerifyEmailRequest;
import kz.iitu.backend.security.CustomUserDetails;
import kz.iitu.backend.security.JwtTokenProvider;
import kz.iitu.backend.invitation.Invitation;
import kz.iitu.backend.invitation.InvitationRepository;
import kz.iitu.backend.notification.NotificationService;
import kz.iitu.backend.shared.email.EmailService;
import kz.iitu.backend.shared.encryption.EmailHashUtil;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import kz.iitu.backend.user.UserRole;
import kz.iitu.backend.user.UserStatus;
import kz.iitu.backend.user.dto.UserDTO;
import kz.iitu.backend.shared.exception.ConflictException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final InvitationRepository invitationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final EmailHashUtil emailHashUtil;

    @Transactional
    public Map<String, String> register(RegisterRequest request) {
        log.info("Регистрация нового пользователя");

        String emailHash = emailHashUtil.hash(request.getEmail());

        if (userRepository.existsByEmailHash(emailHash)) {
            throw new ConflictException("Пользователь с таким email уже существует");
        }

        String verificationCode = String.format("%06d", new SecureRandom().nextInt(1_000_000));

        UserRole role = UserRole.STUDENT;
        Invitation invitation = null;
        if (request.getInvitationToken() != null && !request.getInvitationToken().isBlank()) {
            invitation = invitationRepository.findByToken(request.getInvitationToken()).orElse(null);
            if (invitation != null && !invitation.getIsUsed()
                    && LocalDateTime.now().isBefore(invitation.getExpiresAt())) {
                role = invitation.getRole();
            }
        } else if (request.getRole() != null) {
            role = request.getRole();
        }

        User user = User.builder()
                .email(request.getEmail())
                .emailHash(emailHash)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .role(role)
                .status(UserStatus.ACTIVE)
                .isEmailVerified(false)
                .emailVerificationToken(verificationCode)
                .emailVerificationTokenExpiresAt(LocalDateTime.now().plusHours(24))
                .build();

        user = userRepository.save(user);
        log.info("Пользователь зарегистрирован с ID: {}", user.getId());

        if (invitation != null) {
            invitation.setIsUsed(true);
            invitationRepository.save(invitation);
        }

        emailService.sendVerificationEmail(user.getEmail(), user.getFirstName(), user.getEmailVerificationToken());

        List<User> admins = userRepository.findAllAdmins();
        notificationService.notifyNewUserRegistered(admins, user.getFirstName(), user.getLastName(), role.name());

        return Map.of(
                "email", user.getEmail(),
                "message", "Код верификации отправлен на ваш email"
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        log.info("Попытка входа пользователя");

        String emailHash = emailHashUtil.hash(request.getEmail());
        User user = userRepository.findByEmailHash(emailHash)
                .orElseThrow(() -> new BadCredentialsException("Неверный email или пароль"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Неверный email или пароль");
        }

        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new BadCredentialsException("Аккаунт деактивирован");
        }

        if (!user.getIsEmailVerified()) {
            throw new BadCredentialsException("EMAIL_NOT_VERIFIED");
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user);

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    @Transactional
    public void resendVerificationEmail(String email) {
        log.info("Повторная отправка кода верификации для: {}", email);

        String emailHash = emailHashUtil.hash(email);
        User user = userRepository.findByEmailHash(emailHash)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (user.getIsEmailVerified()) {
            return; // Уже подтверждён — ничего не делать
        }

        String newCode = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        user.setEmailVerificationToken(newCode);
        user.setEmailVerificationTokenExpiresAt(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        emailService.sendVerificationEmail(user.getEmail(), user.getFirstName(), newCode);
        log.info("Код верификации повторно отправлен: {}", email);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtTokenProvider.validateRefreshToken(refreshToken)) {
            throw new RuntimeException("Невалидный refresh token");
        }

        UUID userId = jwtTokenProvider.getUserIdFromRefreshToken(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new RuntimeException("Аккаунт деактивирован");
        }

        String newAccessToken = jwtTokenProvider.generateAccessToken(user);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(user);

        return buildAuthResponse(user, newAccessToken, newRefreshToken);
    }

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        log.info("Верификация email по коду");

        String emailHash = emailHashUtil.hash(request.getEmail());
        User user = userRepository.findByEmailHash(emailHash)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (user.getIsEmailVerified()) {
            throw new RuntimeException("Email уже верифицирован");
        }

        if (!request.getVerificationCode().equals(user.getEmailVerificationToken())) {
            throw new RuntimeException("Неверный код верификации");
        }

        if (user.getEmailVerificationTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Код верификации истек");
        }

        user.setIsEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationTokenExpiresAt(null);
        user = userRepository.save(user);

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user);

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    @Transactional(readOnly = true)
    public UserDTO getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Пользователь не аутентифицирован");
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            throw new RuntimeException("Неверный тип Principal");
        }

        CustomUserDetails userDetails = (CustomUserDetails) principal;
        return UserDTO.fromEntity(userDetails.getUser());
    }

    @Transactional
    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        log.info("Запрос сброса пароля");

        String emailHash = emailHashUtil.hash(request.getEmail());
        User user = userRepository.findByEmailHash(emailHash).orElse(null);
        if (user == null) {
            return Map.of("message", "Если email зарегистрирован, на него отправлена инструкция");
        }

        String token = UUID.randomUUID().toString();
        user.setPasswordResetToken(token);
        user.setPasswordResetTokenExpiresAt(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(user.getEmail(), user.getFirstName(), token);

        return Map.of("message", "Если email зарегистрирован, на него отправлена инструкция");
    }

    @Transactional
    public Map<String, String> resetPassword(ResetPasswordRequest request) {
        log.info("Сброс пароля по токену");

        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Неверная или устаревшая ссылка сброса пароля"));

        if (user.getPasswordResetTokenExpiresAt() == null ||
                user.getPasswordResetTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Ссылка сброса пароля истекла");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiresAt(null);
        userRepository.save(user);

        return Map.of("message", "Пароль успешно изменён");
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(UserDTO.fromEntity(user))
                .build();
    }
}
