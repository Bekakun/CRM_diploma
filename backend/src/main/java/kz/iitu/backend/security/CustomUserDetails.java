package kz.iitu.backend.security;

import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRole;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

/**
 * Обертка над User entity для Spring Security
 * Implements UserDetails для интеграции с Spring Security
 */
@AllArgsConstructor
@Getter
public class CustomUserDetails implements UserDetails {

    private final User user;

    /**
     * Получить ID пользователя
     */
    public UUID getId() {
        return user.getId();
    }

    /**
     * Получить email пользователя
     */
    public String getEmail() {
        return user.getEmail();
    }

    public UserRole getRole() {
        return user.getRole();
    }

    /**
     * Authorities (роли) пользователя
     * Возвращаем роль с префиксом ROLE_
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );
    }

    /**
     * Пароль пользователя (hash)
     */
    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    /**
     * Username для Spring Security (используем email)
     */
    @Override
    public String getUsername() {
        return user.getEmail();
    }

    /**
     * Аккаунт не истек
     */
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /**
     * Аккаунт не заблокирован
     */
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    /**
     * Credentials (пароль) не истек
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    /**
     * Аккаунт активен (проверяем UserStatus)
     */
    @Override
    public boolean isEnabled() {
        return user.getStatus().name().equals("ACTIVE");
    }
}
