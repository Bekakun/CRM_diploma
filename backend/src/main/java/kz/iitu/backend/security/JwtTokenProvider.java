package kz.iitu.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import kz.iitu.backend.user.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

/**
 * Компонент для генерации и валидации JWT токенов
 */
@Component
@Slf4j
public class JwtTokenProvider {

    private final SecretKey accessTokenSecret;
    private final SecretKey refreshTokenSecret;
    private final long accessTokenExpiration;
    private final long refreshTokenExpiration;

    public JwtTokenProvider(
            @Value("${jwt.secret.access}") String accessSecret,
            @Value("${jwt.secret.refresh}") String refreshSecret,
            @Value("${jwt.expiration.access}") long accessExpiration,
            @Value("${jwt.expiration.refresh}") long refreshExpiration
    ) {
        this.accessTokenSecret = Keys.hmacShaKeyFor(Decoders.BASE64.decode(accessSecret));
        this.refreshTokenSecret = Keys.hmacShaKeyFor(Decoders.BASE64.decode(refreshSecret));
        this.accessTokenExpiration = accessExpiration;
        this.refreshTokenExpiration = refreshExpiration;
    }

    /**
     * Генерация access токена
     * @param user Пользователь
     * @return JWT access token
     */
    public String generateAccessToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpiration);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(accessTokenSecret)
                .compact();
    }

    /**
     * Генерация refresh токена
     * @param user Пользователь
     * @return JWT refresh token
     */
    public String generateRefreshToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpiration);

        return Jwts.builder()
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(refreshTokenSecret)
                .compact();
    }

    /**
     * Получить ID пользователя из access токена
     * @param token JWT токен
     * @return UUID пользователя
     */
    public UUID getUserIdFromAccessToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(accessTokenSecret)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return UUID.fromString(claims.getSubject());
    }

    /**
     * Получить ID пользователя из refresh токена
     * @param token JWT токен
     * @return UUID пользователя
     */
    public UUID getUserIdFromRefreshToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(refreshTokenSecret)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return UUID.fromString(claims.getSubject());
    }

    /**
     * Валидация access токена
     * @param token JWT токен
     * @return true если токен валиден
     */
    public boolean validateAccessToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(accessTokenSecret)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (SecurityException | MalformedJwtException e) {
            log.error("Невалидная JWT подпись: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT токен истек: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT токен не поддерживается: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims пустой: {}", e.getMessage());
        } catch (JwtException e) {
            log.error("Невалидный JWT токен: {}", e.getMessage());
        }
        return false;
    }

    /**
     * Валидация refresh токена
     * @param token JWT токен
     * @return true если токен валиден
     */
    public boolean validateRefreshToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(refreshTokenSecret)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (SecurityException | MalformedJwtException e) {
            log.error("Невалидная JWT подпись refresh токена: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("Refresh токен истек: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("Refresh токен не поддерживается: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("Refresh токен claims пустой: {}", e.getMessage());
        } catch (JwtException e) {
            log.error("Невалидный refresh токен: {}", e.getMessage());
        }
        return false;
    }
}
