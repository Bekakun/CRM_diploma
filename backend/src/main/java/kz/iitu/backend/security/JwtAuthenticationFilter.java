package kz.iitu.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Фильтр для аутентификации пользователя по JWT токену
 * Извлекает токен из Authorization header и устанавливает Authentication в SecurityContext
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    /**
     * Основная логика фильтра
     */
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        try {
            // 1. Извлечь JWT токен из Authorization header
            String jwt = extractJwtFromRequest(request);

            // 2. Если токен есть и он валиден
            if (jwt != null && jwtTokenProvider.validateAccessToken(jwt)) {
                // 3. Получить userId из токена
                UUID userId = jwtTokenProvider.getUserIdFromAccessToken(jwt);

                // 4. Загрузить пользователя из БД
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

                // 5. Создать UserDetails
                UserDetails userDetails = new CustomUserDetails(user);

                // 5а. Если аккаунт деактивирован — не аутентифицировать
                if (!userDetails.isEnabled()) {
                    filterChain.doFilter(request, response);
                    return;
                }

                // 6. Создать Authentication объект
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                // 7. Добавить детали запроса (IP адрес, session ID и т.д.)
                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                // 8. Установить Authentication в SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authentication);

                log.debug("User authenticated: {} ({})", user.getEmail(), user.getRole());
            }
        } catch (Exception e) {
            log.error("Не удалось установить аутентификацию пользователя: {}", e.getMessage());
            // Не выбрасываем исключение - просто не устанавливаем аутентификацию
            // Spring Security сам обработает отсутствие аутентификации
        }

        // 9. Продолжить цепочку фильтров
        filterChain.doFilter(request, response);
    }

    /**
     * Извлечь JWT токен из Authorization header или cookies
     * Приоритет: 1) Authorization header, 2) accessToken cookie
     *
     * @param request HTTP запрос
     * @return JWT токен или null
     */
    private String extractJwtFromRequest(HttpServletRequest request) {
        // 1. Попробовать получить из Authorization header
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }

        // 2. Попробовать получить из cookies
        jakarta.servlet.http.Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (jakarta.servlet.http.Cookie cookie : cookies) {
                if ("accessToken".equals(cookie.getName())) {
                    String token = cookie.getValue();
                    if (StringUtils.hasText(token)) {
                        return token;
                    }
                }
            }
        }

        return null;
    }
}
