package kz.iitu.backend.security;

import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRole;
import kz.iitu.backend.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private static final String ACCESS_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private static final String REFRESH_SECRET = "5367566B59703373367639792F423F4528482B4D6251655468576D5A71347437";

    private JwtTokenProvider jwtTokenProvider;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(ACCESS_SECRET, REFRESH_SECRET, 900000L, 604800000L);

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .firstName("Test")
                .lastName("User")
                .role(UserRole.STUDENT)
                .status(UserStatus.ACTIVE)
                .isEmailVerified(true)
                .passwordHash("hash")
                .build();
    }

    @Test
    void generateAccessToken_returnsNonNullToken() {
        String token = jwtTokenProvider.generateAccessToken(testUser);
        assertThat(token).isNotNull().isNotBlank();
    }

    @Test
    void generateRefreshToken_returnsNonNullToken() {
        String token = jwtTokenProvider.generateRefreshToken(testUser);
        assertThat(token).isNotNull().isNotBlank();
    }

    @Test
    void validateAccessToken_validToken_returnsTrue() {
        String token = jwtTokenProvider.generateAccessToken(testUser);
        assertThat(jwtTokenProvider.validateAccessToken(token)).isTrue();
    }

    @Test
    void validateRefreshToken_validToken_returnsTrue() {
        String token = jwtTokenProvider.generateRefreshToken(testUser);
        assertThat(jwtTokenProvider.validateRefreshToken(token)).isTrue();
    }

    @Test
    void validateAccessToken_invalidToken_returnsFalse() {
        assertThat(jwtTokenProvider.validateAccessToken("invalid.token.here")).isFalse();
    }

    @Test
    void validateRefreshToken_invalidToken_returnsFalse() {
        assertThat(jwtTokenProvider.validateRefreshToken("bad.token")).isFalse();
    }

    @Test
    void validateAccessToken_refreshTokenUsedAsAccess_returnsFalse() {
        // Refresh token signed with different key — must fail access token validation
        String refreshToken = jwtTokenProvider.generateRefreshToken(testUser);
        assertThat(jwtTokenProvider.validateAccessToken(refreshToken)).isFalse();
    }

    @Test
    void getUserIdFromAccessToken_returnsCorrectUserId() {
        String token = jwtTokenProvider.generateAccessToken(testUser);
        UUID userId = jwtTokenProvider.getUserIdFromAccessToken(token);
        assertThat(userId).isEqualTo(testUser.getId());
    }

    @Test
    void getUserIdFromRefreshToken_returnsCorrectUserId() {
        String token = jwtTokenProvider.generateRefreshToken(testUser);
        UUID userId = jwtTokenProvider.getUserIdFromRefreshToken(token);
        assertThat(userId).isEqualTo(testUser.getId());
    }

    @Test
    void generateAccessToken_expiredToken_failsValidation() {
        JwtTokenProvider shortLivedProvider = new JwtTokenProvider(
                ACCESS_SECRET, REFRESH_SECRET, 1L, 604800000L
        );
        String token = shortLivedProvider.generateAccessToken(testUser);

        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        assertThat(shortLivedProvider.validateAccessToken(token)).isFalse();
    }

    @Test
    void accessAndRefreshTokens_areDifferent() {
        String accessToken = jwtTokenProvider.generateAccessToken(testUser);
        String refreshToken = jwtTokenProvider.generateRefreshToken(testUser);
        assertThat(accessToken).isNotEqualTo(refreshToken);
    }
}
