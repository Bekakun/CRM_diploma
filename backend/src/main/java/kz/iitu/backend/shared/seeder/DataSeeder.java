package kz.iitu.backend.shared.seeder;

import kz.iitu.backend.shared.encryption.EmailHashUtil;
import kz.iitu.backend.user.User;
import kz.iitu.backend.user.UserRepository;
import kz.iitu.backend.user.UserRole;
import kz.iitu.backend.user.UserStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Компонент для создания начальных данных в БД
 * Запускается автоматически при старте приложения
 */
@Component
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailHashUtil emailHashUtil;

    @Override
    public void run(String... args) {
        log.info("Running DataSeeder...");
        fixEmailHashes();
        seedSuperAdmin();
    }

    // Пересчитывает email_hash для всех пользователей у которых он был заполнен
    // через PostgreSQL sha256() (не HMAC) — это происходит после миграции V21
    private void fixEmailHashes() {
        userRepository.findAll().forEach(user -> {
            String correctHash = emailHashUtil.hash(user.getEmail());
            if (!correctHash.equals(user.getEmailHash())) {
                user.setEmailHash(correctHash);
                userRepository.save(user);
                log.info("Fixed email_hash for user: {}", user.getEmail());
            }
        });
    }

    private void seedSuperAdmin() {
        boolean superAdminExists = userRepository.findAll().stream()
                .anyMatch(user -> user.getRole() == UserRole.SUPER_ADMIN);

        if (superAdminExists) {
            log.info("SUPER_ADMIN user already exists, skipping seed");
            return;
        }

        String email = "admin@crmlms.kz";
        User superAdmin = User.builder()
                .email(email)
                .emailHash(emailHashUtil.hash(email))
                .passwordHash(passwordEncoder.encode("Admin123!"))
                .firstName("Супер")
                .lastName("Админ")
                .role(UserRole.SUPER_ADMIN)
                .status(UserStatus.ACTIVE)
                .isEmailVerified(true)
                .build();

        userRepository.save(superAdmin);
        log.info("✅ SUPER_ADMIN user created successfully!");
        log.info("   Email: admin@crmlms.kz");
        log.info("   Password: Admin123!");
        log.info("   ⚠️  Пожалуйста, смените пароль после первого входа!");
    }
}

/**
 * Компонент для создания тестовых данных (только в dev профиле)
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
class DevDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("Running DevDataSeeder (dev profile only)...");
        seedTestUsers();
    }

    /**
     * Создать тестовых пользователей для всех ролей
     */
    private void seedTestUsers() {
        // Проверка: если есть более 1 пользователя, пропустить seed
        if (userRepository.count() > 1) {
            log.info("Test users already exist, skipping dev seed");
            return;
        }

        // Создание тестового ADMIN
        User admin = User.builder()
                .email("test.admin@example.com")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .firstName("Тестовый")
                .lastName("Админ")
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .isEmailVerified(true)
                .build();

        // Создание тестового INSTRUCTOR
        User instructor = User.builder()
                .email("test.instructor@example.com")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .firstName("Тестовый")
                .lastName("Инструктор")
                .role(UserRole.INSTRUCTOR)
                .status(UserStatus.ACTIVE)
                .isEmailVerified(true)
                .build();

        // Создание тестового STUDENT
        User student = User.builder()
                .email("test.student@example.com")
                .passwordHash(passwordEncoder.encode("Password123!"))
                .firstName("Тестовый")
                .lastName("Студент")
                .role(UserRole.STUDENT)
                .status(UserStatus.ACTIVE)
                .isEmailVerified(true)
                .build();

        userRepository.save(admin);
        userRepository.save(instructor);
        userRepository.save(student);

        log.info("✅ Test users created successfully!");
        log.info("   ADMIN: test.admin@example.com / Password123!");
        log.info("   INSTRUCTOR: test.instructor@example.com / Password123!");
        log.info("   STUDENT: test.student@example.com / Password123!");
    }
}
