package kz.iitu.backend.auth;

import kz.iitu.backend.auth.dto.LoginRequest;
import kz.iitu.backend.auth.dto.RegisterRequest;
import kz.iitu.backend.auth.dto.RefreshTokenRequest;
import kz.iitu.backend.auth.dto.VerifyEmailRequest;
import kz.iitu.backend.auth.dto.AuthResponse;
import kz.iitu.backend.invitation.InvitationRepository;
import kz.iitu.backend.notification.NotificationService;
import kz.iitu.backend.security.JwtTokenProvider;
import kz.iitu.backend.shared.email.EmailService;
import kz.iitu.backend.shared.exception.ConflictException;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import kz.iitu.backend.user.UserRole;
import kz.iitu.backend.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private InvitationRepository invitationRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private EmailService emailService;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private AuthService authService;

    private User activeUser;

    @BeforeEach
    void setUp() {
        activeUser = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .passwordHash("$2a$10$hashedpassword")
                .firstName("John")
                .lastName("Doe")
                .role(UserRole.STUDENT)
                .status(UserStatus.ACTIVE)
                .isEmailVerified(true)
                .build();
    }

    // ---- register ----

    @Test
    void register_newUser_savesUserAndSendsVerificationEmail() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@example.com");
        request.setPassword("password123");
        request.setFirstName("Jane");
        request.setLastName("Smith");

        when(userRepository.existsByEmailHash(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findAllAdmins()).thenReturn(List.of());

        var result = authService.register(request);

        assertThat(result).containsKey("email");
        assertThat(result.get("email")).isEqualTo("new@example.com");
        verify(emailService).sendVerificationEmail(eq("new@example.com"), anyString(), anyString());
    }

    @Test
    void register_duplicateEmail_throwsConflictException() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("user@example.com");
        request.setPassword("pass");
        request.setFirstName("John");
        request.setLastName("Doe");

        when(userRepository.existsByEmailHash(anyString())).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ConflictException.class);
        verify(userRepository, never()).save(any());
    }

    // ---- login ----

    @Test
    void login_validCredentials_returnsAuthResponse() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("correctPassword");

        when(userRepository.findByEmailHash(anyString())).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("correctPassword", activeUser.getPasswordHash())).thenReturn(true);
        when(jwtTokenProvider.generateAccessToken(activeUser)).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(activeUser)).thenReturn("refresh-token");

        AuthResponse response = authService.login(request);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(response.getUser().getEmail()).isEqualTo("user@example.com");
    }

    @Test
    void login_wrongPassword_throwsBadCredentialsException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("wrongPassword");

        when(userRepository.findByEmailHash(anyString())).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrongPassword", activeUser.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void login_unknownEmail_throwsBadCredentialsException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("unknown@example.com");
        request.setPassword("any");

        when(userRepository.findByEmailHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void login_inactiveUser_throwsBadCredentialsException() {
        activeUser.setStatus(UserStatus.INACTIVE);

        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("correctPassword");

        when(userRepository.findByEmailHash(anyString())).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("correctPassword", activeUser.getPasswordHash())).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("деактивирован");
    }

    // ---- refresh ----

    @Test
    void refresh_validToken_returnsNewAuthResponse() {
        UUID userId = activeUser.getId();
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("valid-refresh-token");

        when(jwtTokenProvider.validateRefreshToken("valid-refresh-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromRefreshToken("valid-refresh-token")).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(activeUser));
        when(jwtTokenProvider.generateAccessToken(activeUser)).thenReturn("new-access");
        when(jwtTokenProvider.generateRefreshToken(activeUser)).thenReturn("new-refresh");

        AuthResponse response = authService.refresh(request);

        assertThat(response.getAccessToken()).isEqualTo("new-access");
        assertThat(response.getRefreshToken()).isEqualTo("new-refresh");
    }

    @Test
    void refresh_invalidToken_throwsRuntimeException() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("bad-token");

        when(jwtTokenProvider.validateRefreshToken("bad-token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh(request))
                .isInstanceOf(RuntimeException.class);
    }

    // ---- verifyEmail ----

    @Test
    void verifyEmail_correctCode_returnsAuthResponse() {
        User unverifiedUser = User.builder()
                .id(UUID.randomUUID())
                .email("verify@example.com")
                .passwordHash("hash")
                .firstName("A")
                .lastName("B")
                .role(UserRole.STUDENT)
                .status(UserStatus.ACTIVE)
                .isEmailVerified(false)
                .emailVerificationToken("123456")
                .emailVerificationTokenExpiresAt(LocalDateTime.now().plusHours(1))
                .build();

        VerifyEmailRequest request = new VerifyEmailRequest();
        request.setEmail("verify@example.com");
        request.setVerificationCode("123456");

        when(userRepository.findByEmailHash(anyString())).thenReturn(Optional.of(unverifiedUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtTokenProvider.generateAccessToken(any())).thenReturn("access");
        when(jwtTokenProvider.generateRefreshToken(any())).thenReturn("refresh");

        AuthResponse response = authService.verifyEmail(request);

        assertThat(response.getAccessToken()).isEqualTo("access");
        assertThat(unverifiedUser.getIsEmailVerified()).isTrue();
    }

    @Test
    void verifyEmail_wrongCode_throwsRuntimeException() {
        User unverifiedUser = User.builder()
                .id(UUID.randomUUID())
                .email("verify@example.com")
                .passwordHash("hash")
                .firstName("A")
                .lastName("B")
                .role(UserRole.STUDENT)
                .status(UserStatus.ACTIVE)
                .isEmailVerified(false)
                .emailVerificationToken("123456")
                .emailVerificationTokenExpiresAt(LocalDateTime.now().plusHours(1))
                .build();

        VerifyEmailRequest request = new VerifyEmailRequest();
        request.setEmail("verify@example.com");
        request.setVerificationCode("000000");

        when(userRepository.findByEmailHash(anyString())).thenReturn(Optional.of(unverifiedUser));

        assertThatThrownBy(() -> authService.verifyEmail(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Неверный код");
    }

    @Test
    void verifyEmail_expiredCode_throwsRuntimeException() {
        User unverifiedUser = User.builder()
                .id(UUID.randomUUID())
                .email("verify@example.com")
                .passwordHash("hash")
                .firstName("A")
                .lastName("B")
                .role(UserRole.STUDENT)
                .status(UserStatus.ACTIVE)
                .isEmailVerified(false)
                .emailVerificationToken("123456")
                .emailVerificationTokenExpiresAt(LocalDateTime.now().minusHours(1))
                .build();

        VerifyEmailRequest request = new VerifyEmailRequest();
        request.setEmail("verify@example.com");
        request.setVerificationCode("123456");

        when(userRepository.findByEmailHash(anyString())).thenReturn(Optional.of(unverifiedUser));

        assertThatThrownBy(() -> authService.verifyEmail(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("истек");
    }

    @Test
    void verifyEmail_alreadyVerified_throwsRuntimeException() {
        VerifyEmailRequest request = new VerifyEmailRequest();
        request.setEmail("user@example.com");
        request.setVerificationCode("123456");

        when(userRepository.findByEmailHash(anyString())).thenReturn(Optional.of(activeUser));

        assertThatThrownBy(() -> authService.verifyEmail(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("уже верифицирован");
    }
}
