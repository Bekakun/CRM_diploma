# CRM LMS Backend

Бэкенд система для управления обучением и взаимоотношениями с клиентами.

## Технологии

- **Java 21**
- **Spring Boot 4.0.1**
- **PostgreSQL 16** - Основная база данных
- **MinIO** - Объектное хранилище для файлов
- **Flyway** - Миграции базы данных
- **JWT** - Аутентификация
- **JavaMail** - Email уведомления
- **Thymeleaf** - HTML email шаблоны

## Требования

- Java 21+
- Maven 3.9+
- Docker & Docker Compose (для PostgreSQL и MinIO)

## Быстрый старт

### 1. Запустить инфраструктуру

```bash
# Запустить PostgreSQL и MinIO через Docker Compose
docker-compose up -d

# Проверить что контейнеры запущены
docker-compose ps
```

После запуска будут доступны:
- PostgreSQL: `localhost:5432`
- MinIO API: `localhost:9000`
- MinIO Console: `http://localhost:9001` (логин: `minioadmin`, пароль: `minioadmin`)

### 2. Настроить переменные окружения (опционально)

```bash
# Скопировать пример конфигурации
cp .env .env

# Отредактировать .env файл (особенно SMTP настройки)
nano .env
```

### 3. Запустить приложение

**Через Maven:**
```bash
./mvnw spring-boot:run
```

**Через IDE:**
- Откройте проект в IntelliJ IDEA / Eclipse
- Запустите `BackendApplication.java`

**Через JAR:**
```bash
./mvnw clean package -DskipTests
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

### 4. Проверить работу

```bash
# Healthcheck
curl http://localhost:8080/actuator/health

# Должно вернуть: {"status":"UP"}
```

## Учетные данные по умолчанию

После первого запуска автоматически создается SUPER_ADMIN:

- **Email:** `admin@crmlms.kz`
- **Password:** `Admin123!`

## API Документация

### Базовый URL
```
http://localhost:8080/api/v1
```

### Основные эндпоинты

#### Аутентификация
- `POST /auth/register` - Регистрация пользователя (с токеном приглашения)
- `POST /auth/login` - Вход в систему
- `POST /auth/refresh` - Обновление access токена
- `POST /auth/logout` - Выход из системы
- `POST /auth/verify-email` - Верификация email

#### Приглашения (Admin, Super Admin)
- `POST /admin/invitations` - Создать приглашение
- `GET /admin/invitations` - Получить все приглашения
- `GET /admin/invitations/{id}` - Получить приглашение по ID
- `DELETE /admin/invitations/{id}` - Удалить приглашение

#### Пользователи
- `GET /users` - Список всех пользователей (Admin, Super Admin)
- `GET /users/me` - Получить текущего пользователя
- `GET /users/{id}` - Получить пользователя по ID
- `PATCH /users/{id}` - Обновить пользователя
- `PATCH /users/{id}/status` - Изменить статус пользователя (Admin, Super Admin)
- `POST /users/{id}/change-password` - Изменить пароль
- `POST /users/{id}/profile-photo` - Загрузить фото профиля
- `DELETE /users/{id}/profile-photo` - Удалить фото профиля
- `DELETE /users/{id}` - Удалить пользователя (Super Admin)

#### Файлы
- `GET /files/{folder}/{filename}` - Получить файл

### Пример запроса

**Логин:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@crmlms.kz",
    "password": "Admin123!"
  }'
```

**Ответ:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 900000,
  "user": {
    "id": "uuid",
    "email": "admin@crmlms.kz",
    "firstName": "Супер",
    "lastName": "Админ",
    "role": "SUPER_ADMIN"
  }
}
```

**Использование токена:**
```bash
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Структура проекта

```
backend/
├── src/main/java/kz/iitu/backend/
│   ├── auth/              # Аутентификация и авторизация
│   ├── config/            # Конфигурации Spring
│   ├── invitation/        # Система приглашений
│   ├── security/          # JWT, фильтры, UserDetails
│   ├── shared/            # Общие компоненты
│   │   ├── email/         # Email сервис
│   │   ├── seeder/        # Seed данные
│   │   └── storage/       # MinIO файловое хранилище
│   └── user/              # Управление пользователями
├── src/main/resources/
│   ├── db/migration/      # Flyway миграции
│   ├── templates/email/   # HTML email шаблоны
│   └── application.yml    # Конфигурация приложения
├── docker-compose.yml     # Docker Compose конфигурация
├── DOCKER_SETUP.md        # Подробная документация по Docker
└── pom.xml               # Maven зависимости
```

## База данных

### Миграции Flyway

Миграции автоматически применяются при запуске приложения.

Расположение: `src/main/resources/db/migration/`

**Таблицы:**
- `users` - Пользователи
- `invitations` - Приглашения на платформу
- `courses` - Курсы
- `lessons` - Уроки
- `homework_assignments` - Домашние задания
- `homework_submissions` - Отправленные работы
- `student_enrollments` - Зачисления студентов
- `attendance` - Посещаемость
- `payments` - Платежи
- `notification_preferences` - Настройки уведомлений
- `refresh_tokens` - Refresh токены

### Подключение к БД

```bash
# Через psql
docker exec -it crm-lms-postgres psql -U postgres -d crm_lms

# Через любой SQL клиент
Host: localhost
Port: 5432
Database: crm_lms
User: postgres
Password: postgres
```

## MinIO (Файловое хранилище)

### Доступ к MinIO Console

1. Открыть в браузере: http://localhost:9001
2. Логин: `minioadmin`
3. Пароль: `minioadmin`

### Buckets

- `crm-lms-files` - Основной bucket (создается автоматически)
  - `profile-photos/` - Фото профилей пользователей

### Загрузка файлов

```bash
# Загрузить фото профиля
curl -X POST http://localhost:8080/api/v1/users/{userId}/profile-photo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@photo.jpg"
```

## Email уведомления

### Настройка SMTP

В файле `application.yml` или через переменные окружения:

```yaml
spring:
  mail:
    host: smtp.mail.ru
    port: 465
    username: your-email@mail.ru
    password: your-password
    protocol: smtps
```

### Типы email:

1. **Верификация email** - После регистрации
2. **Приглашение на платформу** - Создание приглашения
3. **Уведомление о домашнем задании** - Новое ДЗ
4. **Оценка за задание** - Выставлена оценка
5. **Напоминание об оплате** - Напоминание о платеже

Email отправляются асинхронно в фоновом режиме.

## Роли пользователей

- **SUPER_ADMIN** - Полный доступ ко всей системе
- **ADMIN** - Управление пользователями и курсами
- **INSTRUCTOR** - Создание курсов, проверка заданий
- **STUDENT** - Просмотр курсов, отправка заданий, оплата

## Разработка

### Запуск в dev режиме

```bash
# С live reload
./mvnw spring-boot:run

# С debug
./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
```

### Тесты

```bash
# Запустить все тесты
./mvnw test

# Пропустить тесты при сборке
./mvnw clean package -DskipTests
```

### Логирование

Уровень логирования настраивается в `application.yml`:

```yaml
logging:
  level:
    kz.iitu.backend: DEBUG
    org.hibernate.SQL: DEBUG
```

## Production

Для production окружения:

1. **Измените секреты:**
   - JWT секреты (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
   - Пароли БД (`POSTGRES_PASSWORD`)
   - MinIO ключи (`MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`)

2. **Настройте SSL:**
   - PostgreSQL SSL
   - MinIO HTTPS
   - Spring Boot HTTPS

3. **Используйте внешние сервисы:**
   - Managed PostgreSQL (AWS RDS, Azure Database)
   - Managed S3 вместо MinIO
   - Облачный SMTP (SendGrid, AWS SES)

4. **Настройте reverse proxy:**
   - Nginx для статических файлов
   - Load balancer для масштабирования

См. `DOCKER_SETUP.md` для подробностей о production конфигурации.

## Troubleshooting

### Приложение не запускается

```bash
# Проверить доступность PostgreSQL
docker-compose ps postgres
telnet localhost 5432

# Проверить доступность MinIO
docker-compose ps minio
curl http://localhost:9000/minio/health/live

# Посмотреть логи Docker
docker-compose logs -f
```

### Ошибки миграций Flyway

```bash
# Посмотреть статус миграций
docker exec -it crm-lms-postgres psql -U postgres -d crm_lms -c "SELECT * FROM flyway_schema_history;"

# Если нужно пересоздать БД
docker-compose down -v
docker-compose up -d
```

### Email не отправляются

1. Проверить SMTP настройки в `application.yml`
2. Проверить логи приложения (уровень DEBUG для `org.springframework.mail`)
3. Убедиться что SMTP порт не заблокирован firewall
4. Для Mail.ru использовать app password вместо основного пароля

## API Коллекция

Импортируйте Postman коллекцию из `postman/` для тестирования API.

## Лицензия

Proprietary - Attractor School

## Контакты

- **Проект:** CRM LMS System
- **Организация:** Attractor School
