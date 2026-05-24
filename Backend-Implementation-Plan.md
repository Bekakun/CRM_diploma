# План реализации Backend для CRM LMS

## Общая стратегия

Реализация бэкенда будет происходить **итеративно**, от базовых компонентов к сложным функциям. Каждый этап должен быть протестирован перед переходом к следующему.

---

## Этап 1: Настройка инфраструктуры и базовых компонентов (Приоритет: КРИТИЧЕСКИЙ)

### 1.1 Инициализация проекта
- [ ] Создание Spring Boot проекта (Spring Initializr: https://start.spring.io/)
  - Java 17 или 21 (LTS версии)
  - Maven или Gradle (рекомендуется Gradle)
  - Зависимости: Spring Web, Spring Data JPA, Spring Security, PostgreSQL Driver, Lombok, Validation
- [ ] Настройка структуры пакетов проекта (Package by Feature)
  ```
  src/main/java/com/crmlms/
  ├── auth/                          # Аутентификация и авторизация
  │   ├── AuthController.java
  │   ├── AuthService.java
  │   ├── dto/
  │   │   ├── LoginRequest.java
  │   │   ├── RegisterRequest.java
  │   │   ├── AuthResponse.java
  │   │   └── RefreshTokenRequest.java
  │   └── exception/
  │       ├── InvalidTokenException.java
  │       └── EmailAlreadyExistsException.java
  ├── user/                          # Управление пользователями
  │   ├── User.java                  # Entity
  │   ├── UserRepository.java
  │   ├── UserService.java
  │   ├── UserController.java
  │   ├── dto/
  │   │   ├── UserResponse.java
  │   │   ├── UpdateUserRequest.java
  │   │   └── UserProfileResponse.java
  │   └── UserRole.java              # Enum
  ├── invitation/                    # Система приглашений
  │   ├── Invitation.java
  │   ├── InvitationRepository.java
  │   ├── InvitationService.java
  │   ├── InvitationController.java
  │   └── dto/
  │       ├── CreateInvitationRequest.java
  │       └── InvitationResponse.java
  ├── course/                        # Курсы
  │   ├── Course.java
  │   ├── CourseRepository.java
  │   ├── CourseService.java
  │   ├── CourseController.java
  │   └── dto/
  │       ├── CreateCourseRequest.java
  │       ├── UpdateCourseRequest.java
  │       └── CourseResponse.java
  ├── lesson/                        # Уроки
  │   ├── Lesson.java
  │   ├── LessonRepository.java
  │   ├── LessonService.java
  │   ├── LessonController.java
  │   ├── dto/
  │   │   ├── CreateLessonRequest.java
  │   │   ├── UpdateLessonRequest.java
  │   │   └── LessonResponse.java
  │   └── exception/
  │       └── LessonConflictException.java
  ├── material/                      # Материалы для уроков
  │   ├── Material.java
  │   ├── MaterialRepository.java
  │   ├── MaterialService.java
  │   ├── MaterialController.java
  │   └── dto/
  │       └── MaterialResponse.java
  ├── homework/                      # Домашние задания
  │   ├── Homework.java
  │   ├── HomeworkSubmission.java
  │   ├── HomeworkRepository.java
  │   ├── HomeworkSubmissionRepository.java
  │   ├── HomeworkService.java
  │   ├── HomeworkController.java
  │   └── dto/
  │       ├── CreateHomeworkRequest.java
  │       ├── SubmitHomeworkRequest.java
  │       ├── GradeHomeworkRequest.java
  │       └── HomeworkSubmissionResponse.java
  ├── attendance/                    # Посещаемость
  │   ├── Attendance.java
  │   ├── AttendanceRepository.java
  │   ├── AttendanceService.java
  │   ├── AttendanceController.java
  │   ├── AttendanceStatus.java      # Enum
  │   └── dto/
  │       ├── MarkAttendanceRequest.java
  │       └── AttendanceResponse.java
  ├── student/                       # Зачисление студентов
  │   ├── Student.java
  │   ├── StudentRepository.java
  │   ├── StudentService.java
  │   ├── StudentController.java
  │   └── dto/
  │       ├── EnrollStudentRequest.java
  │       ├── StudentResponse.java
  │       └── StudentPerformanceResponse.java
  ├── payment/                       # Платежи
  │   ├── Payment.java
  │   ├── PaymentRule.java
  │   ├── PaymentRepository.java
  │   ├── PaymentRuleRepository.java
  │   ├── PaymentService.java
  │   ├── PaymentController.java
  │   ├── PaymentStatus.java         # Enum
  │   └── dto/
  │       ├── CreatePaymentRuleRequest.java
  │       ├── PaymentResponse.java
  │       └── KaspiPaymentResponse.java
  ├── dashboard/                     # Dashboard endpoints
  │   ├── DashboardController.java
  │   ├── DashboardService.java
  │   └── dto/
  │       ├── AdminDashboardResponse.java
  │       ├── InstructorDashboardResponse.java
  │       └── StudentDashboardResponse.java
  ├── security/                      # Security компоненты (общие для всех)
  │   ├── JwtTokenProvider.java
  │   ├── JwtAuthenticationFilter.java
  │   ├── CustomUserDetailsService.java
  │   └── SecurityConfig.java
  ├── config/                        # Глобальные конфигурации
  │   ├── CorsConfig.java
  │   ├── S3Config.java
  │   ├── MailConfig.java
  │   └── WebConfig.java
  ├── shared/                        # Общие компоненты
  │   ├── exception/
  │   │   ├── GlobalExceptionHandler.java
  │   │   ├── ResourceNotFoundException.java
  │   │   ├── ConflictException.java
  │   │   ├── ForbiddenException.java
  │   │   └── ErrorResponse.java
  │   ├── storage/
  │   │   ├── S3Service.java
  │   │   └── FileStorageService.java
  │   ├── email/
  │   │   └── EmailService.java
  │   └── util/
  │       ├── DateUtils.java
  │       └── ValidationUtils.java
  └── CrmLmsApplication.java         # Main класс

  src/main/resources/
  ├── application.yml                # Основная конфигурация
  ├── application-dev.yml            # Dev конфигурация
  ├── application-prod.yml           # Production конфигурация
  ├── db/migration/                  # Flyway миграции
  │   ├── V1__create_users_table.sql
  │   ├── V2__create_invitations_table.sql
  │   ├── V3__create_courses_table.sql
  │   └── ...
  └── templates/email/               # Email шаблоны (Thymeleaf)
      ├── verification-email.html
      └── invitation-email.html
  ```

### 1.2 Настройка базы данных PostgreSQL
- [ ] Установка PostgreSQL
- [ ] Добавление зависимости Flyway или Liquibase для миграций (рекомендуется Flyway)
- [ ] Настройка Spring Data JPA в `application.yml`
  ```yaml
  spring:
    datasource:
      url: jdbc:postgresql://localhost:5432/crm_lms
      username: postgres
      password: password
      driver-class-name: org.postgresql.Driver
    jpa:
      hibernate:
        ddl-auto: validate  # НЕ использовать create/update в production!
      properties:
        hibernate:
          dialect: org.hibernate.dialect.PostgreSQLDialect
          format_sql: true
      show-sql: true
    flyway:
      enabled: true
      baseline-on-migrate: true
      locations: classpath:db/migration
  ```
- [ ] Создание Flyway миграций для всех таблиц (в `src/main/resources/db/migration/`)
  - `V1__create_users_table.sql`
  - `V2__create_invitations_table.sql`
  - `V3__create_courses_table.sql`
  - и т.д.
- [ ] Настройка HikariCP connection pool (встроен в Spring Boot по умолчанию)
- [ ] Создание индексов для оптимизации запросов в миграциях

**Сущности для миграций:**
1. `users` (базовая таблица)
2. `invitations`
3. `courses`
4. `lessons`
5. `materials`
6. `homework`
7. `homework_submissions`
8. `students` (связь многие-ко-многим между users и courses)
9. `attendance`
10. `payments`
11. `payment_rules`

### 1.3 Настройка переменных окружения
Создать файл `application.yml` (или использовать переменные окружения для production):
```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/crm_lms
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:password}

jwt:
  secret:
    access: ${JWT_ACCESS_SECRET:your-256-bit-secret-key-for-access-tokens}
    refresh: ${JWT_REFRESH_SECRET:your-256-bit-secret-key-for-refresh-tokens}
  expiration:
    access: 900000        # 15 минут в миллисекундах
    refresh: 604800000    # 7 дней в миллисекундах

aws:
  s3:
    bucket: ${AWS_S3_BUCKET:crm-lms-files}
    region: ${AWS_REGION:us-east-1}
    access-key: ${AWS_ACCESS_KEY_ID:}
    secret-key: ${AWS_SECRET_ACCESS_KEY:}

kaspi:
  pay:
    api-key: ${KASPI_PAY_API_KEY:}
    webhook-secret: ${KASPI_PAY_WEBHOOK_SECRET:}
    base-url: https://api.kaspi.kz/payments

mail:
  host: ${SMTP_HOST:smtp.gmail.com}
  port: ${SMTP_PORT:587}
  username: ${SMTP_USER:}
  password: ${SMTP_PASSWORD:}
  properties:
    mail:
      smtp:
        auth: true
        starttls:
          enable: true

app:
  frontend-url: ${FRONTEND_URL:http://localhost:5173}
  cors:
    allowed-origins: ${CORS_ORIGINS:http://localhost:5173}
```

### 1.4 Базовые компоненты и конфигурация
- [ ] **GlobalExceptionHandler** - централизованная обработка ошибок
  - Использовать `@ControllerAdvice` и `@ExceptionHandler`
  - Обработка ResourceNotFoundException, ValidationException, AccessDeniedException
  - Единый формат ответов об ошибках (ErrorResponse DTO)
- [ ] **Request Validation** - встроенная валидация Spring
  - Использовать аннотации `@Valid`, `@NotNull`, `@Email`, `@Size` и т.д.
  - Создать custom validators при необходимости
- [ ] **Logging** - SLF4J с Logback (встроен в Spring Boot)
  - Настройка уровней логирования в `application.yml`
  - Логирование запросов/ответов через Filter или Interceptor
- [ ] **CORS Configuration** - создать `CorsConfig` класс
  - Настроить разрешенные origins, методы, headers
- [ ] **Rate Limiting** - интеграция Bucket4j или Spring Cloud Gateway
  - Защита от brute-force атак на endpoints аутентификации

**Время выполнения:** 2-3 дня

---

## Этап 2: Аутентификация и авторизация (Приоритет: КРИТИЧЕСКИЙ)

### 2.1 Система аутентификации
- [ ] **Создание User Entity** с полями из API документации
  - Использовать аннотации JPA: `@Entity`, `@Table`, `@Id`, `@GeneratedValue`
  - Enum для Role: `SUPER_ADMIN`, `ADMIN`, `INSTRUCTOR`, `STUDENT`
  - Enum для Status: `ACTIVE`, `INACTIVE`
- [ ] **UserRepository** интерфейс (extends JpaRepository)
  - `Optional<User> findByEmail(String email)`
  - `boolean existsByEmail(String email)`
- [ ] **Хеширование паролей** - Spring Security BCryptPasswordEncoder
  - Настроить Bean в SecurityConfig
  - Использовать strength factor минимум 10
- [ ] **JWT Token Provider** - создать компонент для работы с JWT
  - Библиотека: io.jsonwebtoken (jjwt)
  - Методы: generateAccessToken(), generateRefreshToken(), validateToken(), getUserIdFromToken()
- [ ] **Email verification система**
  - Генерация verification token (UUID)
  - Отправка email через JavaMailSender
- [ ] **Реализация AuthController** с endpoints:
  - `POST /api/v1/auth/register` - Регистрация
  - `POST /api/v1/auth/login` - Вход (возврат access + refresh tokens)
  - `POST /api/v1/auth/refresh` - Обновление токенов
  - `POST /api/v1/auth/logout` - Выход (инвалидация refresh token)
  - `POST /api/v1/auth/verify-email` - Верификация email

### 2.2 Spring Security конфигурация
- [ ] **JwtAuthenticationFilter** - фильтр для проверки JWT
  - Extends OncePerRequestFilter
  - Извлечение токена из Authorization header
  - Валидация токена и установка Authentication в SecurityContext
- [ ] **CustomUserDetailsService** - implements UserDetailsService
  - Загрузка пользователя по email для Spring Security
- [ ] **SecurityConfig** - основная конфигурация безопасности
  - Отключить CSRF (для REST API)
  - Настроить stateless session management
  - Настроить authorize requests (публичные vs защищенные endpoints)
  - Добавить JwtAuthenticationFilter в цепочку фильтров
- [ ] **Аннотация для проверки ролей** - `@PreAuthorize("hasRole('ADMIN')")`
  - Использовать на уровне методов контроллера
  - Обработка AccessDeniedException в GlobalExceptionHandler

### 2.3 Система приглашений
- [ ] **Создание Invitation Entity**
- [ ] **InvitationRepository** (extends JpaRepository)
- [ ] **InvitationService** - бизнес-логика
  - Генерация уникальных invitation tokens (UUID)
  - Отправка email через JavaMailSender
  - Проверка срока действия токена
- [ ] **InvitationController** с endpoints:
  - `POST /api/v1/admin/invitations` - Создание приглашения
  - `GET /api/v1/admin/invitations` - Список приглашений
  - `DELETE /api/v1/admin/invitations/:id` - Удаление приглашения
- [ ] Использовать `@PreAuthorize("hasRole('ADMIN')")` на контроллере

### 2.4 Seed данные для тестирования
- [ ] Создать `DataSeeder` компонент (implements CommandLineRunner)
- [ ] Seed super_admin пользователя при первом запуске
- [ ] Опционально: создать тестовых пользователей для каждой роли (только в dev профиле)

**Время выполнения:** 3-4 дня

---

## Этап 3: Управление пользователями (Приоритет: ВЫСОКИЙ)

### 3.1 CRUD операции для пользователей
- [ ] `GET /admin/users` - Список пользователей (с пагинацией и фильтрами)
- [ ] `GET /admin/users/:id` - Детали пользователя
- [ ] `PATCH /admin/users/:id` - Обновление пользователя
- [ ] `DELETE /admin/users/:id` - Удаление пользователя

### 3.2 Управление профилем
- [ ] `GET /profile` - Получение своего профиля
- [ ] `PATCH /profile` - Обновление профиля

### 3.3 Загрузка файлов (S3/MinIO)
- [ ] Добавить зависимость AWS SDK for Java v2 (`software.amazon.awssdk:s3`)
- [ ] **S3Service** - сервис для работы с файлами
  - Методы: uploadFile(), deleteFile(), generatePresignedUrl()
  - Валидация типов файлов (MIME type) и размера
  - Генерация уникальных имен файлов (UUID + расширение)
- [ ] **FileStorageConfig** - конфигурация S3Client Bean
- [ ] **ProfileController** endpoints:
  - `POST /api/v1/profile/photo` - Загрузка фото профиля (MultipartFile)
  - `DELETE /api/v1/profile/photo` - Удаление фото профиля
- [ ] Валидация: только JPG/PNG, максимум 5MB

### 3.4 Админ панель - Dashboard
- [ ] `GET /admin/dashboard` - Статистика (общее количество пользователей, курсов, активных студентов)

**Время выполнения:** 2-3 дня

---

## Этап 4: Управление курсами (Приоритет: ВЫСОКИЙ)

### 4.1 CRUD операции для курсов
- [ ] `POST /instructor/courses` - Создание курса
- [ ] `GET /instructor/courses` - Список курсов инструктора
- [ ] `PATCH /instructor/courses/:id` - Обновление курса
- [ ] `DELETE /instructor/courses/:id` - Удаление курса

### 4.2 Бизнес-логика
- [ ] Проверка прав доступа (только instructor или admin)
- [ ] Валидация дат (startDate < endDate)
- [ ] Проверка уникальности названий курсов

### 4.3 Dashboard инструктора
- [ ] `GET /instructor/dashboard` - Статистика по курсам инструктора

**Время выполнения:** 2 дня

---

## Этап 5: Управление уроками (Приоритет: ВЫСОКИЙ)

### 5.1 CRUD операции для уроков
- [ ] `POST /instructor/lessons` - Создание урока
- [ ] `GET /instructor/lessons` - Список уроков (фильтр по курсу)
- [ ] `GET /instructor/lessons/:id` - Детали урока
- [ ] `PATCH /instructor/lessons/:id` - Обновление урока
- [ ] `DELETE /instructor/lessons/:id` - Удаление урока

### 5.2 Бизнес-логика для конфликтов
- [ ] **Проверка конфликтов уроков** (критично!)
  - При создании/обновлении урока проверять, нет ли другого урока в пределах 2 часов
  - Учитывать `scheduledAt` и `durationMinutes`
  - Вернуть 409 Conflict, если конфликт найден

### 5.3 Управление материалами
- [ ] `POST /instructor/lessons/:id/materials` - Загрузка материалов (S3)
- [ ] `GET /materials/:id/download` - Скачивание материала
- [ ] Проверка прав доступа (студенты курса + инструктор)

**Время выполнения:** 3 дня

---

## Этап 6: Система домашних заданий (Приоритет: СРЕДНИЙ)

### 6.1 Создание и управление заданиями
- [ ] `POST /instructor/lessons/:id/homework` - Создание задания
- [ ] Загрузка файла задания на S3
- [ ] `GET /homework/:id/task/download` - Скачивание задания

### 6.2 Отправка решений студентами
- [ ] `POST /student/homework/:id/submit` - Отправка GitHub URL
- [ ] Автоматическая проверка `isLate` (сравнение с `dueDate`)
- [ ] Валидация GitHub URL формата

### 6.3 Проверка и выставление оценок
- [ ] `POST /instructor/homework/:id/submissions/:submissionId/grade` - Выставление оценки
- [ ] Валидация оценки (0-100)
- [ ] Сохранение `gradedBy` и `gradedAt`

### 6.4 Просмотр оценок студентом
- [ ] `GET /student/grades` - История оценок студента

**Время выполнения:** 3-4 дня

---

## Этап 7: Посещаемость (Приоритет: СРЕДНИЙ)

### 7.1 Отметка посещаемости
- [ ] `POST /instructor/lessons/:id/attendance` - Массовая отметка посещаемости
  - Принимает массив `[{ studentId, status }]`
  - Создает записи в таблице `attendance`

### 7.2 Просмотр посещаемости
- [ ] `GET /instructor/students/:id` - Детали студента (включая посещаемость)
- [ ] Подсчет процента посещаемости

**Время выполнения:** 1-2 дня

---

## Этап 8: Управление студентами и зачисление (Приоритет: СРЕДНИЙ)

### 8.1 Зачисление студентов на курсы
- [ ] `POST /admin/courses/:id/enroll` - Зачисление студента на курс
  - Создание записи в таблице `students`
  - Валидация: студент не зачислен дважды на один курс

### 8.2 Просмотр студентов инструктором
- [ ] `GET /instructor/students` - Список всех студентов инструктора (с фильтрами по курсу)
- [ ] `GET /instructor/students/:id` - Детали студента с успеваемостью
  - Средний балл
  - Процент посещаемости
  - Статус оплаты

**Время выполнения:** 2 дня

---

## Этап 9: Календарь и Dashboard студента (Приоритет: СРЕДНИЙ)

### 9.1 Dashboard студента
- [ ] `GET /student/dashboard` - Статистика студента
  - Количество активных курсов
  - Непроверенные задания
  - Средний балл
  - Процент посещаемости

### 9.2 Календарь событий
- [ ] `GET /student/calendar` - Расписание уроков
  - Фильтрация по диапазону дат
  - Возврат только будущих и недавних уроков
- [ ] `GET /student/lessons/:id` - Детали конкретного урока для студента

**Время выполнения:** 1-2 дня

---

## Этап 10: Система оплаты (Приоритет: НИЗКИЙ, но важный)

### 10.1 Правила оплаты
- [ ] `POST /admin/payment-rules` - Создание правила оплаты
- [ ] `GET /admin/payment-rules` - Список правил
- [ ] `PATCH /admin/payment-rules/:id` - Обновление правила
- [ ] `DELETE /admin/payment-rules/:id` - Удаление правила

### 10.2 Автоматическая генерация платежей
- [ ] **Scheduled task** для автоматической генерации платежей
  - Использовать `@Scheduled` аннотацию Spring
  - Включить `@EnableScheduling` в main классе
  - Проверка периодичности (monthly, quarterly, one_time)
  - Создание записей в таблице `payments` со статусом `pending`

### 10.3 Просмотр платежей
- [ ] `GET /student/payments` - История платежей студента
- [ ] `GET /admin/payments` - Все платежи в системе (с фильтрами)

**Время выполнения:** 2-3 дня

---

## Этап 11: Интеграция Kaspi Pay (Приоритет: НИЗКИЙ)

### 11.1 Инициация оплаты
- [ ] **KaspiPayService** - сервис для интеграции
  - Использовать RestTemplate или WebClient для HTTP запросов
  - Создание уникального `transactionId`
  - Генерация ссылки для оплаты
- [ ] **PaymentController** endpoint:
  - `POST /api/v1/student/payments/{id}/pay-kaspi` - Генерация ссылки для оплаты
  - Возврат `paymentUrl` в ответе

### 11.2 Webhook для подтверждения оплаты
- [ ] **WebhookController** endpoint:
  - `POST /api/v1/webhooks/kaspi-pay` - Обработка webhook от Kaspi
  - Аннотация `@RequestHeader("X-Kaspi-Signature")` для получения подписи
  - Обновление статуса платежа на `completed`
  - Сохранение `paidAt`
- [ ] Отключить CSRF и JWT фильтр для webhook endpoint в SecurityConfig

### 11.3 Безопасность
- [ ] **WebhookSignatureValidator** - компонент для проверки подписи
  - Верификация HMAC SHA-256 подписи
  - Использовать `KASPI_PAY_WEBHOOK_SECRET` из конфигурации
- [ ] Идемпотентность обработки
  - Проверка, не обработан ли уже webhook (по transactionId)
  - Использовать `@Transactional` для атомарности операций

**Время выполнения:** 3-4 дня

---

## Этап 12: Email уведомления (Приоритет: НИЗКИЙ)

### 12.1 Настройка SMTP
- [ ] Настройка JavaMailSender (встроен в Spring Boot)
- [ ] Добавить зависимость `spring-boot-starter-mail`
- [ ] Конфигурация в `application.yml` (Gmail, Mailgun, SendGrid и т.д.)
- [ ] **EmailService** - сервис для отправки email
- [ ] Создание email шаблонов (HTML) с использованием Thymeleaf
  - Шаблоны в `src/main/resources/templates/email/`
  - verification-email.html, invitation-email.html, и т.д.

### 12.2 Отправка уведомлений
- [ ] Email верификация при регистрации
- [ ] Приглашения на платформу
- [ ] Уведомления о новых заданиях (опционально - async с `@Async`)
- [ ] Уведомления о выставленных оценках
- [ ] Напоминания об оплате
- [ ] Использовать `@Async` для асинхронной отправки (не блокировать основной поток)

**Время выполнения:** 2-3 дня

---

## Этап 13: Тестирование и оптимизация (Приоритет: КРИТИЧЕСКИЙ)

### 13.1 Unit тесты
- [ ] Использовать **JUnit 5** и **Mockito**
- [ ] Тесты для Service слоя
  - Бизнес-логика: проверка конфликтов уроков, isLate для заданий
  - Мокирование Repository с `@Mock` и `@InjectMocks`
- [ ] Тесты для утилит (JwtTokenProvider, S3Service, и т.д.)
- [ ] Аннотация `@SpringBootTest` не нужна для unit тестов

### 13.2 Integration тесты
- [ ] Использовать `@SpringBootTest` и `@AutoConfigureMockMvc`
- [ ] Тесты для каждого endpoint из Postman коллекции
  - MockMvc для HTTP запросов
  - Проверка статус кодов и тела ответа
- [ ] Использование тестовой БД
  - `@TestContainers` с PostgreSQL контейнером (рекомендуется)
  - Или H2 in-memory база для простоты
- [ ] `@Transactional` на тестах для rollback после каждого теста

### 13.3 E2E тесты
- [ ] Полные пользовательские сценарии:
  - Регистрация → Создание курса → Зачисление студента → Создание урока → Отправка ДЗ → Выставление оценки
- [ ] Использовать TestContainers для реальной БД
- [ ] Профиль `test` в application-test.yml

### 13.4 Оптимизация производительности
- [ ] Добавление индексов в БД через Flyway миграции
  - Индексы на email, role, courseId, studentId, lessonId
- [ ] Оптимизация N+1 запросов
  - Использовать `@EntityGraph` или JOIN FETCH в JPQL
- [ ] Кэширование часто запрашиваемых данных
  - Добавить `spring-boot-starter-cache` и Redis
  - Использовать `@Cacheable` на методах
- [ ] Pagination для больших списков
  - Использовать `Pageable` параметр в Repository методах
  - Возвращать `Page<T>` из контроллеров

### 13.5 Документация API
- [ ] **Swagger/OpenAPI** документация
  - Добавить зависимость `springdoc-openapi-starter-webmvc-ui`
  - Аннотации: `@Operation`, `@ApiResponse`, `@Parameter`, `@Schema`
  - Доступно по `/swagger-ui.html` и `/v3/api-docs`
- [ ] README.md с инструкциями
  - Требования (Java 17+, PostgreSQL, Maven/Gradle)
  - Команды для запуска
  - Переменные окружения
  - Ссылка на Swagger UI

**Время выполнения:** 5-7 дней

---

## Этап 14: Deployment и DevOps (Приоритет: СРЕДНИЙ)

### 14.1 Docker
- [ ] **Dockerfile** для Spring Boot приложения
  ```dockerfile
  FROM eclipse-temurin:17-jdk-alpine AS build
  WORKDIR /app
  COPY . .
  RUN ./gradlew bootJar  # или ./mvnw package

  FROM eclipse-temurin:17-jre-alpine
  COPY --from=build /app/build/libs/*.jar app.jar
  EXPOSE 8080
  ENTRYPOINT ["java", "-jar", "app.jar"]
  ```
- [ ] **docker-compose.yml** для локальной разработки
  - Services: backend, PostgreSQL, Redis (опционально)
  - Volumes для персистентности данных БД
  - Networks для связи между контейнерами

### 14.2 CI/CD
- [ ] **GitHub Actions** для автоматического тестирования
  - Workflow: `.github/workflows/ci.yml`
  - Триггеры: push, pull_request
  - Шаги: checkout, setup Java, build, run tests
- [ ] Автоматический deploy
  - AWS Elastic Beanstalk, ECS, или EC2
  - Railway, Render (более простые варианты)
  - Heroku (устаревший, но простой)
- [ ] Environment variables через GitHub Secrets

### 14.3 Мониторинг
- [ ] **Spring Boot Actuator** - метрики приложения
  - Endpoints: `/actuator/health`, `/actuator/metrics`, `/actuator/info`
  - Экспорт метрик в Prometheus (опционально)
- [ ] Логирование ошибок
  - Sentry SDK для Spring Boot
  - Настройка через `application.yml`
- [ ] Мониторинг производительности
  - Spring Boot Admin (бесплатный)
  - New Relic или Datadog (платные, но мощные)
  - Grafana + Prometheus (self-hosted)

**Время выполнения:** 3-4 дня

---

## Общая последовательность разработки (Summary)

### Фаза 1: Фундамент (7-10 дней)
1. Инфраструктура
2. Аутентификация
3. Управление пользователями

### Фаза 2: Основная бизнес-логика (10-12 дней)
4. Курсы
5. Уроки
6. Домашние задания
7. Посещаемость
8. Зачисление студентов
9. Календарь и Dashboard

### Фаза 3: Финансы и интеграции (8-10 дней)
10. Система оплаты
11. Kaspi Pay
12. Email уведомления

### Фаза 4: Качество и запуск (8-11 дней)
13. Тестирование и оптимизация
14. Deployment

---

## Приоритеты реализации

### Критично (Must Have)
- Этап 1: Инфраструктура
- Этап 2: Аутентификация
- Этап 13: Тестирование

### Высокий приоритет (Should Have)
- Этап 3: Пользователи
- Этап 4: Курсы
- Этап 5: Уроки

### Средний приоритет (Could Have)
- Этап 6: Домашние задания
- Этап 7: Посещаемость
- Этап 8: Зачисление
- Этап 9: Dashboard студента

### Низкий приоритет (Nice to Have)
- Этап 10: Оплата
- Этап 11: Kaspi Pay
- Этап 12: Email

---

## Технологический стек (рекомендации)

### Backend
- **Language:** Java 17 или 21 (LTS)
- **Framework:** Spring Boot 3.x
- **Build Tool:** Gradle 8.x (или Maven 3.9+)
- **Key Dependencies:**
  - `spring-boot-starter-web` - REST API
  - `spring-boot-starter-data-jpa` - ORM
  - `spring-boot-starter-security` - Security + JWT
  - `spring-boot-starter-validation` - Bean Validation
  - `spring-boot-starter-mail` - Email
  - `spring-boot-starter-cache` - Кэширование
  - `spring-boot-starter-actuator` - Мониторинг
  - `postgresql` - PostgreSQL driver
  - `lombok` - Boilerplate reduction
  - `flyway-core` - Database migrations
  - `jjwt-api`, `jjwt-impl`, `jjwt-jackson` - JWT tokens
  - `aws-java-sdk-s3` - AWS S3 integration
  - `springdoc-openapi-starter-webmvc-ui` - Swagger/OpenAPI
  - `spring-boot-starter-test` - Testing (JUnit 5, Mockito)
  - `testcontainers` - Integration testing

### Database
- **Primary:** PostgreSQL 14+
- **Migrations:** Flyway (или Liquibase)
- **Connection Pool:** HikariCP (встроен в Spring Boot)

### Cache (опционально)
- **Redis** - для кэширования и session storage
- Библиотека: `spring-boot-starter-data-redis`

### DevOps
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Hosting:**
  - AWS (Elastic Beanstalk, ECS, EC2)
  - Railway, Render
  - DigitalOcean App Platform
  - Google Cloud Run

---

## Критические моменты при реализации

### 1. Безопасность (Spring Security)
- ✅ Всегда хешировать пароли (BCryptPasswordEncoder с strength 10+)
- ✅ Использовать HTTPS в production
- ✅ Валидировать все входящие данные (`@Valid` + Bean Validation аннотации)
- ✅ Защита от SQL injection (Spring Data JPA автоматически использует prepared statements)
- ✅ Rate limiting для предотвращения brute-force атак (Bucket4j)
- ✅ Проверка JWT подписей (JwtTokenProvider)
- ✅ Проверка webhook подписей от Kaspi Pay (HMAC SHA-256)
- ✅ CORS настройка - разрешить только trusted origins
- ✅ Отключить CSRF для REST API (stateless)
- ✅ Использовать `@PreAuthorize` для role-based access control

### 2. Производительность
- ✅ Использовать индексы в БД для часто запрашиваемых полей
  - `CREATE INDEX idx_users_email ON users(email)`
  - `CREATE INDEX idx_users_role ON users(role)`
  - `CREATE INDEX idx_lessons_course_id ON lessons(course_id)`
- ✅ Pagination для всех списков
  - Использовать `Pageable` в Repository методах
  - Возвращать `Page<T>` из контроллеров
- ✅ Избегать N+1 запросов
  - `@EntityGraph(attributePaths = {"course", "instructor"})`
  - Или использовать `JOIN FETCH` в JPQL
- ✅ Кэширование статических данных
  - `@Cacheable("courses")` на методах
  - Redis для distributed caching
- ✅ Connection pooling (HikariCP настроен по умолчанию)
- ✅ Lazy loading для коллекций JPA (но осторожно с LazyInitializationException)

### 3. Бизнес-логика
- ✅ **Проверка конфликтов уроков** - критично!
  - JPQL запрос для поиска пересекающихся уроков
  - Учитывать `scheduledAt` + `durationMinutes`
  - Выбросить `ConflictException` (409 статус)
- ✅ Автоматическое определение `isLate` для ДЗ
  - Логика в Service: `LocalDateTime.now().isAfter(homework.getDueDate())`
- ✅ Автоматическая генерация платежей
  - `@Scheduled(cron = "0 0 0 * * ?")` - каждый день в полночь
  - Проверка периодичности и создание Payment entities
- ✅ Проверка прав доступа на каждом endpoint
  - `@PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id")`
- ✅ Использовать `@Transactional` для атомарности операций

### 4. Тестирование
- ✅ Покрытие тестами минимум 70% (измерять через JaCoCo plugin)
- ✅ Unit тесты для Service слоя (Mockito)
- ✅ Integration тесты для Controllers (MockMvc + TestContainers)
- ✅ Тестирование всех edge cases:
  - Конфликты уроков
  - Просроченные задания
  - Дубликаты при зачислении
  - Различные роли и права доступа
- ✅ Использовать `@Transactional` на тестах для rollback

---

## Итоговая оценка времени

**Минимальная реализация (MVP):** 25-30 дней
**Полная реализация:** 35-45 дней
**С учетом тестирования и оптимизации:** 45-60 дней

---

Этот план обеспечивает последовательную разработку, где каждый следующий этап опирается на предыдущий. Начните с фундамента (инфраструктура + аутентификация), затем постепенно добавляйте функционал, двигаясь от критичных компонентов к дополнительным.
