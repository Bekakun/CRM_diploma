# CRM LMS - Документация по Backend API

## Содержание

1. [Обзор](#1-обзор)
2. [Реализованные эндпоинты](#2-реализованные-эндпоинты)
   - [Аутентификация](#21-аутентификация-apiv1auth)
   - [Профиль пользователя](#22-профиль-пользователя-apiv1profile)
   - [Управление пользователями (Admin)](#23-управление-пользователями-admin-apiv1adminusers)
   - [Приглашения (Admin)](#24-приглашения-admin-apiv1admininvitations)
   - [Курсы (Instructor)](#25-курсы-instructor-apiv1instructorcourses)
   - [Уроки (Instructor)](#26-уроки-instructor-apiv1instructor)
   - [Материалы](#27-материалы-apiv1instructor)
   - [Студенты](#28-студенты-apiv1instructorstudents)
   - [Файлы](#29-файлы-apiv1files)
3. [Нереализованные модули](#3-нереализованные-модули-таблицы-есть-java-кода-нет)
   - [Домашние задания](#31-домашние-задания-homework--homework_submissions)
   - [Посещаемость](#32-посещаемость-attendance)
   - [Платежи](#33-платежи-payments--payment_rules)
4. [Недостающие эндпоинты для фронтенда](#4-недостающие-эндпоинты-для-полной-работы-фронтенда)
   - [Дашборды](#41-дашборды)
   - [Домашние задания](#42-домашние-задания)
   - [Посещаемость](#43-посещаемость)
   - [Платежи](#44-платежи)
   - [AI-ассистент](#45-ai-ассистент)
   - [Студенческие эндпоинты](#46-студенческие-эндпоинты)
   - [Календарь](#47-календарь)
   - [Поиск и фильтрация](#48-поиск-и-фильтрация-пользователей)
5. [Сопоставление: фронтенд-страницы и API](#5-сопоставление-фронтенд-страницы--api)
6. [Схема базы данных](#6-схема-базы-данных)
7. [Приоритеты реализации](#7-рекомендуемый-порядок-реализации)

---

## 1. Обзор

**Стек:** Spring Boot 4.0.1, Java 21, PostgreSQL 16, MinIO, JWT

**Базовый URL:** `/api/v1`

**Аутентификация:** Bearer JWT токен в заголовке `Authorization`
- Access token: 15 минут
- Refresh token: 7 дней
- Алгоритм: HMAC-SHA256

**Роли:** `SUPER_ADMIN`, `ADMIN`, `INSTRUCTOR`, `STUDENT`

**Формат ошибок:**
```json
{
  "status": 404,
  "message": "Resource not found",
  "timestamp": "2025-03-15T14:30:00"
}
```

**Пагинация (все списковые эндпоинты):**
```
?page=0&size=20&sort=createdAt,desc
```

---

## 2. Реализованные эндпоинты

### 2.1 Аутентификация (`/api/v1/auth`)

Доступ: публичный (без токена)

#### `POST /register` — Регистрация

**Запрос:**
```json
{
  "email": "user@example.com",       // обязательно, @Email
  "password": "Password1!",          // обязательно, мин. 8 символов
  "firstName": "Алия",               // обязательно, 2-100 символов
  "lastName": "Смагулова",           // обязательно, 2-100 символов
  "phone": "+77001234567",           // необязательно, формат: +?[0-9]{10,20}
  "role": "STUDENT",                 // необязательно, по умолчанию STUDENT
  "invitationToken": "abc-def-123"   // необязательно
}
```

**Ответ (200):**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "tokenType": "Bearer",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "fullName": "Алия Смагулова",
  "role": "STUDENT",
  "isEmailVerified": false
}
```

#### `POST /login` — Вход

**Запрос:**
```json
{
  "email": "user@example.com",
  "password": "Password1!"
}
```

**Ответ:** такой же как у `/register` (AuthResponse)

#### `POST /refresh` — Обновление access token

**Запрос:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Ответ:** AuthResponse

#### `POST /logout` — Выход

**Ответ:**
```json
{
  "message": "Successfully logged out"
}
```

> **Примечание:** Текущая реализация — клиентское удаление токена. TODO: добавить blacklist через Redis.

#### `POST /verify-email?token=abc-def-123` — Подтверждение email

**Ответ:**
```json
{
  "message": "Email verified successfully"
}
```

---

### 2.2 Профиль пользователя (`/api/v1/profile`)

Доступ: любой авторизованный пользователь

#### `GET /` — Получить свой профиль

**Ответ (UserResponse):**
```json
{
  "id": "550e8400-...",
  "email": "user@example.com",
  "firstName": "Алия",
  "lastName": "Смагулова",
  "role": "STUDENT",
  "phone": "+77001234567",
  "profilePhotoUrl": "/api/v1/files/photos/abc.jpg",
  "status": "ACTIVE",
  "isEmailVerified": true,
  "createdAt": "2025-01-15T10:30:00",
  "updatedAt": "2025-03-10T14:00:00"
}
```

#### `PATCH /` — Обновить профиль

**Запрос (все поля необязательны):**
```json
{
  "email": "new@example.com",
  "firstName": "Алия",
  "lastName": "Смагулова",
  "phone": "+77001234567"
}
```

> **Важно:** Поля `role` и `status` игнорируются (обнуляются) для предотвращения повышения привилегий.

**Ответ:** UserResponse

#### `POST /change-password` — Смена пароля

**Запрос:**
```json
{
  "currentPassword": "OldPass1!",
  "newPassword": "NewPass1!"
}
```

> Требования к паролю: минимум 8 символов, заглавная и строчная буква, цифра, спецсимвол.

**Ответ:**
```json
{
  "message": "Password changed successfully"
}
```

#### `POST /photo` — Загрузить фото профиля

**Запрос:** `multipart/form-data`, поле `photo` (MultipartFile)

**Ответ:** UserResponse (с обновлённым `profilePhotoUrl`)

#### `DELETE /photo` — Удалить фото профиля

**Ответ:** 204 No Content

---

### 2.3 Управление пользователями — Admin (`/api/v1/admin/users`)

Доступ: `ADMIN`, `SUPER_ADMIN`

#### `GET /` — Список пользователей

**Параметры:** `page`, `size` (по умолчанию 20), `sort` (по умолчанию `createdAt,desc`)

**Ответ:** `Page<UserResponse>`
```json
{
  "content": [ { /* UserResponse */ } ],
  "totalElements": 156,
  "totalPages": 8,
  "number": 0,
  "size": 20
}
```

#### `GET /{id}` — Получить пользователя

**Ответ:** UserResponse

#### `PATCH /{id}` — Обновить пользователя

**Запрос (все поля необязательны):**
```json
{
  "email": "new@example.com",
  "firstName": "Новое имя",
  "lastName": "Новая фамилия",
  "role": "INSTRUCTOR",
  "phone": "+77001234567",
  "status": "ACTIVE"
}
```

**Ответ:** UserResponse

#### `PATCH /{id}/status` — Изменить статус

**Запрос:**
```json
{
  "status": "INACTIVE"
}
```

**Ответ:** UserResponse

#### `DELETE /{id}` — Удалить пользователя

Доступ: только `SUPER_ADMIN`

**Ответ:**
```json
{
  "message": "User deleted successfully"
}
```

#### `POST /{userId}/enroll` — Зачислить студента на курсы

**Запрос:**
```json
{
  "courseIds": [
    "550e8400-...",
    "660e8400-..."
  ]
}
```

**Ответ:** `List<StudentResponse>` — список созданных зачислений

---

### 2.4 Приглашения — Admin (`/api/v1/admin/invitations`)

Доступ: `ADMIN`, `SUPER_ADMIN`

#### `POST /` — Создать приглашение

**Запрос:**
```json
{
  "email": "newuser@example.com",
  "role": "INSTRUCTOR"
}
```

**Ответ (InvitationResponse):**
```json
{
  "id": "550e8400-...",
  "email": "newuser@example.com",
  "role": "INSTRUCTOR",
  "token": "inv-token-abc-123",
  "invitedById": "660e8400-...",
  "invitedByName": "Админ Главный",
  "expiresAt": "2025-03-22T10:00:00",
  "isUsed": false,
  "createdAt": "2025-03-15T10:00:00"
}
```

#### `GET /` — Список приглашений

**Ответ:** `List<InvitationResponse>`

#### `DELETE /{id}` — Удалить приглашение

**Ответ:** 204 No Content

---

### 2.5 Курсы — Instructor (`/api/v1/instructor/courses`)

Доступ: `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

#### `POST /` — Создать курс

**Запрос:**
```json
{
  "name": "JavaScript Fundamentals",
  "description": "Базовый курс по JS",
  "startDate": "2025-04-01",
  "endDate": "2025-07-01",
  "totalLessons": 24
}
```

**Ответ (CourseResponse):**
```json
{
  "id": "550e8400-...",
  "name": "JavaScript Fundamentals",
  "description": "Базовый курс по JS",
  "instructor": {
    "id": "660e8400-...",
    "firstName": "Нуржан",
    "lastName": "Касымов",
    "email": "nurzhan@example.com"
  },
  "startDate": "2025-04-01",
  "endDate": "2025-07-01",
  "totalLessons": 24,
  "enrolledStudents": 0,
  "createdAt": "2025-03-15T10:00:00",
  "updatedAt": "2025-03-15T10:00:00"
}
```

#### `GET /` — Мои курсы (пагинация)

**Ответ:** `Page<CourseResponse>`

#### `GET /{courseId}` — Детали курса

**Ответ:** CourseResponse

#### `PATCH /{courseId}` — Обновить курс

**Запрос (все поля необязательны):**
```json
{
  "name": "JS Advanced",
  "description": "Продвинутый курс",
  "startDate": "2025-04-15",
  "endDate": "2025-08-01",
  "totalLessons": 30
}
```

**Ответ:** CourseResponse

#### `DELETE /{courseId}` — Удалить курс

Доступ: `INSTRUCTOR` (свой курс), `SUPER_ADMIN`

> Нельзя удалить курс, на который зачислены студенты.

**Ответ:** 204 No Content

---

### 2.6 Уроки — Instructor (`/api/v1/instructor`)

Доступ: `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN` (создание/изменение/удаление); `STUDENT` (чтение)

#### `POST /courses/{courseId}/lessons` — Создать урок

**Запрос:**
```json
{
  "title": "Введение в JS",
  "description": "Основные концепции JavaScript",
  "scheduledAt": "2025-04-01T14:00:00",
  "durationMinutes": 120,
  "location": "Аудитория 301",
  "onlineMeetingUrl": "https://zoom.us/j/123456"
}
```

> Система проверяет конфликты расписания: 2-часовое окно до/после урока в рамках курса.

**Ответ (LessonResponse):**
```json
{
  "id": "550e8400-...",
  "courseId": "660e8400-...",
  "courseName": "JavaScript Fundamentals",
  "title": "Введение в JS",
  "description": "Основные концепции JavaScript",
  "scheduledAt": "2025-04-01T14:00:00",
  "durationMinutes": 120,
  "location": "Аудитория 301",
  "onlineMeetingUrl": "https://zoom.us/j/123456",
  "recordingUrl": null,
  "status": "SCHEDULED",
  "materialsCount": 0,
  "hasHomework": false,
  "attendanceCount": 0,
  "totalStudents": 15,
  "createdAt": "2025-03-15T10:00:00",
  "updatedAt": "2025-03-15T10:00:00"
}
```

#### `GET /courses/{courseId}/lessons` — Уроки курса (пагинация)

**Ответ:** `Page<LessonResponse>`

#### `GET /lessons/{lessonId}` — Детали урока

**Ответ:** LessonResponse

#### `PATCH /lessons/{lessonId}` — Обновить урок

**Запрос (все поля необязательны):**
```json
{
  "title": "Введение в JS (обновлено)",
  "scheduledAt": "2025-04-02T14:00:00",
  "durationMinutes": 90,
  "recordingUrl": "https://example.com/recording/1",
  "status": "COMPLETED"
}
```

**Ответ:** LessonResponse

#### `DELETE /lessons/{lessonId}` — Удалить урок

Доступ: `INSTRUCTOR` (свой), `SUPER_ADMIN`

**Ответ:** 204 No Content

---

### 2.7 Материалы (`/api/v1/instructor`)

#### `POST /lessons/{lessonId}/materials` — Загрузить материалы

Доступ: `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

**Запрос:** `multipart/form-data`, поле `files` (несколько файлов)

> Ограничения: PDF, DOC, DOCX; максимум 5 МБ на файл.

**Ответ (UploadMaterialsResponse):**
```json
{
  "materials": [
    {
      "id": "550e8400-...",
      "lessonId": "660e8400-...",
      "name": "Презентация.pdf",
      "fileUrl": "/api/v1/files/materials/abc.pdf",
      "fileType": "application/pdf",
      "fileSize": 2048576,
      "uploadedAt": "2025-03-15T10:00:00"
    }
  ]
}
```

#### `GET /lessons/{lessonId}/materials` — Список материалов

Доступ: все авторизованные

**Ответ:** `List<MaterialResponse>`

#### `DELETE /materials/{materialId}` — Удалить материал

Доступ: `INSTRUCTOR`, `SUPER_ADMIN`

**Ответ:** 204 No Content

#### `GET /files/materials/{materialId}` — Получить ссылку для скачивания

Доступ: все авторизованные

**Ответ:**
```json
{
  "downloadUrl": "https://minio.example.com/presigned-url..."
}
```

> Presigned URL действителен 1 час.

---

### 2.8 Студенты (`/api/v1/instructor/students`)

#### `GET /` — Список студентов преподавателя

Доступ: `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`

**Параметры:** `courseId` (UUID, необязательно), `page`, `size`, `sort`

**Ответ:** `Page<StudentResponse>`
```json
{
  "content": [
    {
      "id": "550e8400-...",
      "userId": "660e8400-...",
      "firstName": "Алия",
      "lastName": "Смагулова",
      "email": "aliya@example.com",
      "profilePhotoUrl": null,
      "courseId": "770e8400-...",
      "courseName": "JavaScript Fundamentals",
      "averageGrade": 87.5,
      "attendanceRate": 95.0,
      "homeworkCompletionRate": 80.0,
      "enrolledAt": "2025-01-15T10:00:00"
    }
  ]
}
```

#### `GET /{studentId}` — Детали студента с успеваемостью

Доступ: `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`, `STUDENT`

**Ответ (StudentPerformanceResponse):**
```json
{
  "id": "550e8400-...",
  "userId": "660e8400-...",
  "firstName": "Алия",
  "lastName": "Смагулова",
  "email": "aliya@example.com",
  "profilePhotoUrl": null,
  "courseId": "770e8400-...",
  "courseName": "JavaScript Fundamentals",
  "averageGrade": 87.5,
  "attendanceRate": 95.0,
  "homeworkCompletionRate": 80.0,
  "enrolledAt": "2025-01-15T10:00:00",
  "performance": [
    {
      "lessonId": "880e8400-...",
      "lessonTitle": "Введение в JS",
      "lessonDate": "2025-02-01",
      "attendance": {
        "status": "PRESENT"
      },
      "homework": {
        "id": "990e8400-...",
        "title": "ДЗ #1: Основы JavaScript",
        "deadline": "2025-02-05",
        "submission": {
          "id": "aa0e8400-...",
          "githubUrl": "https://github.com/aliya/hw1",
          "submittedAt": "2025-02-03",
          "isLate": false,
          "grade": 90,
          "feedback": "Отличная работа!",
          "gradedAt": "2025-02-06"
        }
      }
    }
  ]
}
```

> **Примечание:** DTO `StudentPerformanceResponse` определён, но данные `performance` возвращаются пустыми, так как модули homework и attendance не реализованы в сервисном слое.

---

### 2.9 Файлы (`/api/v1/files`)

#### `GET /{folder}/{filename}` — Получить файл

Доступ: публичный (через прямой URL)

Возвращает файл с корректным `Content-Type` (JPEG, PNG, GIF, WebP, PDF, или `application/octet-stream`).

---

## 3. Нереализованные модули (таблицы есть, Java-кода нет)

### 3.1 Домашние задания (`homework` + `homework_submissions`)

**Таблица `homework`:**
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | UUID | PK |
| lesson_id | UUID | FK → lessons |
| title | VARCHAR(255) | Название задания |
| description | TEXT | Описание |
| task_file_url | TEXT | Ссылка на файл задания |
| due_date | TIMESTAMP | Дедлайн |
| max_grade | INTEGER | Макс. оценка (1-100, по умолчанию 100) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Таблица `homework_submissions`:**
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | UUID | PK |
| homework_id | UUID | FK → homework |
| student_id | UUID | FK → users |
| github_url | TEXT | Ссылка на репозиторий |
| submitted_at | TIMESTAMP | Дата сдачи |
| is_late | BOOLEAN | Просрочено ли |
| grade | INTEGER | Оценка (0-100, nullable) |
| feedback | TEXT | Обратная связь |
| graded_at | TIMESTAMP | Дата оценивания |
| graded_by | UUID | FK → users (кто оценил) |

**Уникальное ограничение:** `(homework_id, student_id)` — один студент = одна сдача.

**Нужно реализовать:** Entity, Repository, Service, Controller.

---

### 3.2 Посещаемость (`attendance`)

**Таблица `attendance`:**
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | UUID | PK |
| lesson_id | UUID | FK → lessons |
| student_id | UUID | FK → users |
| status | ENUM | PRESENT, ABSENT, LATE, EXCUSED |
| notes | TEXT | Примечания |
| marked_at | TIMESTAMP | Когда отмечено |
| marked_by | UUID | FK → users (кто отметил) |

**Уникальное ограничение:** `(lesson_id, student_id)`

**Нужно реализовать:** Entity, Repository, Service, Controller.

---

### 3.3 Платежи (`payments` + `payment_rules`)

**Таблица `payments`:**
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | UUID | PK |
| student_id | UUID | FK → users |
| course_id | UUID | FK → courses |
| amount | DECIMAL(10,2) | Сумма |
| currency | VARCHAR(3) | Валюта (по умолчанию KZT) |
| status | ENUM | PENDING, COMPLETED, FAILED, CANCELLED |
| due_date | DATE | Срок оплаты |
| paid_at | TIMESTAMP | Дата оплаты |
| transaction_id | VARCHAR(255) | ID транзакции |
| payment_method | VARCHAR(50) | Способ оплаты |
| kaspi_payment_url | TEXT | Ссылка Kaspi Pay |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Таблица `payment_rules`:**
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | UUID | PK |
| course_id | UUID | FK → courses |
| amount | DECIMAL(10,2) | Сумма |
| currency | VARCHAR(3) | Валюта (KZT) |
| frequency | ENUM | ONE_TIME, MONTHLY, QUARTERLY |
| description | TEXT | Описание |
| is_active | BOOLEAN | Активно ли правило |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Нужно реализовать:** Entity, Repository, Service, Controller для обеих таблиц + интеграция с Kaspi Pay.

---

## 4. Недостающие эндпоинты для полной работы фронтенда

### 4.1 Дашборды

#### Admin Dashboard (`AdminDashboard.tsx`)

Фронтенд ожидает: статистика (всего пользователей, новые регистрации, активных курсов, рост), список недавних регистраций, метрики системы.

**Нужен эндпоинт:**
```
GET /api/v1/admin/dashboard
```
**Ожидаемый ответ:**
```json
{
  "totalUsers": 156,
  "newRegistrations": 23,
  "activeCourses": 12,
  "monthlyGrowthPercent": 18,
  "recentRegistrations": [
    {
      "id": "...",
      "firstName": "Алия",
      "lastName": "Смагулова",
      "email": "aliya@example.com",
      "role": "STUDENT",
      "createdAt": "2025-03-14T10:00:00"
    }
  ],
  "systemMetrics": {
    "serverLoad": 78,
    "dbUsage": 65,
    "uptime": 92
  }
}
```

---

#### Instructor Dashboard (`InstructorDashboard.tsx`)

Фронтенд ожидает: статистика (активных курсов, всего студентов, занятий в месяце, проверено ДЗ), ближайшие уроки, непроверенные ДЗ.

**Нужен эндпоинт:**
```
GET /api/v1/instructor/dashboard
```
**Ожидаемый ответ:**
```json
{
  "activeCourses": 3,
  "totalStudents": 45,
  "lessonsThisMonth": 12,
  "gradedHomework": 28,
  "upcomingLessons": [
    {
      "id": "...",
      "courseName": "JavaScript Fundamentals",
      "title": "Async/Await",
      "scheduledAt": "2025-03-15T14:00:00",
      "studentsCount": 15
    }
  ],
  "pendingHomework": [
    {
      "id": "...",
      "studentName": "Алия Смагулова",
      "courseName": "JavaScript Fundamentals",
      "homeworkTitle": "ДЗ #5",
      "dueDate": "2025-03-14",
      "isLate": true
    }
  ]
}
```

---

#### Student Dashboard (`StudentDashboard.tsx`)

Фронтенд ожидает: статистика (курсы, ближайшие занятия, средний балл, активные ДЗ), ближайшие уроки, последние оценки.

**Нужен эндпоинт:**
```
GET /api/v1/student/dashboard
```
**Ожидаемый ответ:**
```json
{
  "enrolledCourses": 2,
  "upcomingLessonsCount": 3,
  "averageGrade": 87,
  "activeHomework": 2,
  "upcomingLessons": [
    {
      "id": "...",
      "courseName": "JavaScript Fundamentals",
      "title": "Async/Await",
      "scheduledAt": "2025-03-15T14:00:00"
    }
  ],
  "recentGrades": [
    {
      "id": "...",
      "homeworkTitle": "ДЗ #5: Promises",
      "courseName": "JavaScript Fundamentals",
      "grade": 92,
      "gradedAt": "2025-03-10"
    }
  ]
}
```

---

### 4.2 Домашние задания

#### Для инструктора

**Создание ДЗ (при создании урока):**
```
POST /api/v1/instructor/lessons/{lessonId}/homework
```
**Запрос:**
```json
{
  "title": "ДЗ #1: Основы JavaScript",
  "description": "Создайте калькулятор",
  "dueDate": "2025-04-05T23:59:00",
  "maxGrade": 100,
  "taskFile": "<multipart file>"
}
```

**Список непроверенных сдач:**
```
GET /api/v1/instructor/homework/pending?courseId={courseId}
```

**Оценить работу:**
```
POST /api/v1/instructor/homework/submissions/{submissionId}/grade
```
**Запрос:**
```json
{
  "grade": 90,
  "feedback": "Отличная работа!"
}
```

#### Для студента

**Сдать работу:**
```
POST /api/v1/student/homework/{homeworkId}/submit
```
**Запрос:**
```json
{
  "githubUrl": "https://github.com/student/homework-1"
}
```
**Ожидаемый ответ:**
```json
{
  "id": "...",
  "homeworkId": "...",
  "githubUrl": "https://github.com/student/homework-1",
  "submittedAt": "2025-04-03T15:30:00",
  "isLate": false,
  "grade": null,
  "feedback": null
}
```

**Получить мои ДЗ:**
```
GET /api/v1/student/homework?courseId={courseId}
```

---

### 4.3 Посещаемость

**Отметить посещаемость (инструктор):**
```
POST /api/v1/instructor/lessons/{lessonId}/attendance
```
**Запрос:**
```json
{
  "records": [
    { "studentId": "...", "status": "PRESENT" },
    { "studentId": "...", "status": "ABSENT" },
    { "studentId": "...", "status": "LATE" }
  ]
}
```

**Получить посещаемость урока:**
```
GET /api/v1/instructor/lessons/{lessonId}/attendance
```

---

### 4.4 Платежи

#### Правила оплаты (Admin)

```
GET    /api/v1/admin/payment-rules
POST   /api/v1/admin/payment-rules
PUT    /api/v1/admin/payment-rules/{id}
DELETE /api/v1/admin/payment-rules/{id}
```

**Запрос на создание:**
```json
{
  "courseId": "...",
  "amount": 50000,
  "currency": "KZT",
  "frequency": "MONTHLY",
  "description": "Ежемесячная оплата"
}
```

#### Платежи студента

**Список платежей:**
```
GET /api/v1/student/payments
```
**Ожидаемый ответ:**
```json
[
  {
    "id": "...",
    "courseId": "...",
    "courseName": "JavaScript Fundamentals",
    "amount": 50000,
    "currency": "KZT",
    "status": "COMPLETED",
    "dueDate": "2025-01-10",
    "paidAt": "2025-01-08",
    "month": "Январь",
    "year": 2025
  }
]
```

**Kaspi Pay интеграция:**
```
POST /api/v1/student/payments/{paymentId}/pay
```
**Ответ:**
```json
{
  "kaspiPaymentUrl": "https://kaspi.kz/pay/...",
  "transactionId": "TXN-123"
}
```

**Webhook от Kaspi:**
```
POST /api/v1/webhooks/kaspi/payment-callback
```

---

### 4.5 AI-ассистент

```
POST /api/v1/student/ai-chat
```
**Запрос:**
```json
{
  "message": "Объясни разницу между let и const"
}
```
**Ожидаемый ответ:**
```json
{
  "response": "let позволяет изменять значение переменной...",
  "suggestedQuestions": [
    "А что такое var?",
    "Когда использовать const?"
  ]
}
```

---

### 4.6 Студенческие эндпоинты

#### Оценки студента

Фронтенд (`GradesPage.tsx`) ожидает получить оценки, сгруппированные по курсам.

```
GET /api/v1/student/grades
```
**Ожидаемый ответ:**
```json
{
  "overallAverage": 88,
  "courses": [
    {
      "courseId": "...",
      "courseName": "JavaScript Fundamentals",
      "instructorName": "Нуржан Касымов",
      "averageGrade": 87,
      "homeworks": [
        {
          "id": "...",
          "title": "ДЗ #1: Переменные и типы данных",
          "grade": 90,
          "maxGrade": 100,
          "gradedAt": "2025-02-01",
          "feedback": "Отличная работа!"
        }
      ]
    }
  ]
}
```

#### Уроки студента (Календарь)

```
GET /api/v1/student/lessons?from=2025-03-01&to=2025-03-31
```
**Ожидаемый ответ:**
```json
[
  {
    "id": "...",
    "courseId": "...",
    "courseName": "JavaScript Fundamentals",
    "title": "Введение в JS",
    "scheduledAt": "2025-03-15T14:00:00",
    "durationMinutes": 120,
    "recordingUrl": "https://example.com/recording/1",
    "materials": [
      {
        "id": "...",
        "name": "Презентация.pdf",
        "fileUrl": "/api/v1/files/materials/abc.pdf",
        "fileType": "application/pdf",
        "fileSize": 2048576
      }
    ],
    "homework": {
      "id": "...",
      "title": "ДЗ #1: Основы JS",
      "description": "Создайте калькулятор",
      "deadline": "2025-03-20T23:59:00",
      "taskFileUrl": "...",
      "submission": {
        "githubUrl": "https://github.com/...",
        "submittedAt": "2025-03-18T10:00:00",
        "isLate": false,
        "grade": 90,
        "feedback": "Отлично!"
      }
    }
  }
]
```

---

### 4.7 Календарь

#### Уроки инструктора (Календарь)

Фронтенд (`InstructorCalendarPage.tsx`) ожидает уроки со списком студентов и их ДЗ/посещаемостью.

```
GET /api/v1/instructor/calendar/lessons?from=2025-03-01&to=2025-03-31
```
**Ожидаемый ответ:**
```json
[
  {
    "id": "...",
    "courseId": "...",
    "courseName": "JavaScript Fundamentals",
    "title": "Введение в JS",
    "scheduledAt": "2025-03-15T14:00:00",
    "durationMinutes": 120,
    "recordingUrl": "https://example.com/recording/1",
    "status": "COMPLETED",
    "students": [
      {
        "id": "...",
        "name": "Алия Смагулова",
        "attended": true,
        "homework": {
          "url": "https://github.com/...",
          "isLate": false,
          "grade": 90,
          "feedback": "Отлично!",
          "status": "graded"
        }
      }
    ]
  }
]
```

---

### 4.8 Поиск и фильтрация пользователей

Фронтенд (`ManageUsersPage.tsx`) ожидает поиск по имени/email и фильтрацию по роли.

**Нужно расширить существующий эндпоинт:**
```
GET /api/v1/admin/users?search=алия&role=STUDENT&status=ACTIVE&page=0&size=20
```

> Текущая реализация поддерживает только пагинацию (`page`, `size`, `sort`). Нужно добавить параметры `search`, `role`, `status`.

---

## 5. Сопоставление: фронтенд-страницы → API

| Страница | Статус фронтенда | Бэкенд-эндпоинт | Статус бэкенда |
|----------|------------------|------------------|----------------|
| **Auth** | | | |
| LoginPage | Мок в authStore | `POST /auth/login` | Реализован |
| RegisterPage | Мок в authStore | `POST /auth/register` | Реализован |
| **Admin** | | | |
| AdminDashboard | Полностью моковый | `GET /admin/dashboard` | **Не реализован** |
| ManageUsersPage | Моковые пользователи | `GET /admin/users` | Реализован (без search/role/status фильтров) |
| ManageUsersPage (зачисление) | alert() | `POST /admin/users/{id}/enroll` | Реализован |
| InviteUserPage | setTimeout мок | `POST /admin/invitations` | Реализован |
| InviteUserPage (список) | Моковый | `GET /admin/invitations` | Реализован |
| AdminPaymentsPage | Моковые правила | `CRUD /admin/payment-rules` | **Не реализован** |
| AdminSettingsPage | localStorage | `PATCH /profile` | Реализован |
| **Instructor** | | | |
| InstructorDashboard | Полностью моковый | `GET /instructor/dashboard` | **Не реализован** |
| CoursesPage | Моковые курсы | `GET /instructor/courses` | Реализован |
| CoursesPage (создание) | Форма без сохранения | `POST /instructor/courses` | Реализован |
| CourseManagementPage | Моковые уроки | `GET /courses/{id}/lessons` | Реализован |
| CreateLessonModal | Файлы не грузятся | `POST /courses/{id}/lessons` | Реализован (без ДЗ) |
| StudentsPage | Моковые студенты | `GET /instructor/students` | Реализован (без search) |
| StudentDetailPage | Моковые данные | `GET /instructor/students/{id}` | Реализован (performance пуст) |
| StudentDetailPage (оценки) | Поля без отправки | `POST /homework/submissions/{id}/grade` | **Не реализован** |
| StudentDetailPage (посещаемость) | Кнопки без отправки | `POST /lessons/{id}/attendance` | **Не реализован** |
| InstructorCalendarPage | Моковые уроки | `GET /instructor/calendar/lessons` | **Не реализован** |
| LessonDetailModal | Поля без сохранения | `PATCH /lessons/{id}` | Реализован (recording, status) |
| LessonDetailModal (оценки) | Поля без сохранения | Оценка/посещаемость | **Не реализован** |
| InstructorSettingsPage | alert() | `PATCH /profile` | Реализован |
| **Student** | | | |
| StudentDashboard | Полностью моковый | `GET /student/dashboard` | **Не реализован** |
| CalendarPage | Моковые уроки | `GET /student/lessons` | **Не реализован** (отдельный эндпоинт) |
| StudentLessonDetailModal | Форма без отправки | `POST /student/homework/{id}/submit` | **Не реализован** |
| GradesPage | Моковые оценки | `GET /student/grades` | **Не реализован** |
| PaymentsPage | Моковые платежи | `GET /student/payments` | **Не реализован** |
| PaymentsPage (оплата) | Нет интеграции | `POST /student/payments/{id}/pay` | **Не реализован** |
| AIAssistantPage | Моковый чат | `POST /student/ai-chat` | **Не реализован** |
| SettingsPage | alert() | `PATCH /profile` | Реализован |

---

## 6. Схема базы данных

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users      │     │   courses    │     │   lessons    │
│──────────────│     │──────────────│     │──────────────│
│ id (PK)      │◄────│ instructor_id│     │ id (PK)      │
│ email        │     │ id (PK)      │◄────│ course_id    │
│ password_hash│     │ name         │     │ title        │
│ first_name   │     │ description  │     │ description  │
│ last_name    │     │ start_date   │     │ scheduled_at │
│ role         │     │ end_date     │     │ duration_min │
│ phone        │     │ total_lessons│     │ location     │
│ photo_url    │     │ enrolled_cnt │     │ meeting_url  │
│ status       │     │ created_at   │     │ recording_url│
│ email_verify │     │ updated_at   │     │ status       │
│ created_at   │     └──────────────┘     │ created_at   │
│ updated_at   │                          │ updated_at   │
└──────┬───────┘                          └──────┬───────┘
       │                                         │
       │  ┌──────────────┐               ┌───────┴──────┐
       │  │  students    │               │  materials   │
       │  │──────────────│               │──────────────│
       ├──│ user_id      │               │ id (PK)      │
       │  │ course_id    │──┐            │ lesson_id    │
       │  │ id (PK)      │  │            │ name         │
       │  │ enrolled_at  │  │            │ file_url     │
       │  │ avg_grade    │  │            │ file_type    │
       │  │ attend_rate  │  │            │ file_size    │
       │  │ hw_rate      │  │            │ minio_name   │
       │  └──────────────┘  │            │ uploaded_at  │
       │                    │            └──────────────┘
       │  ┌──────────────┐  │
       │  │ invitations  │  │    ┌──────────────┐
       │  │──────────────│  │    │   homework   │  (schema only)
       ├──│ invited_by   │  │    │──────────────│
       │  │ id (PK)      │  │    │ id (PK)      │
       │  │ email        │  │    │ lesson_id    │──── lessons
       │  │ role         │  │    │ title        │
       │  │ token        │  │    │ description  │
       │  │ expires_at   │  │    │ task_file_url│
       │  │ is_used      │  │    │ due_date     │
       │  │ created_at   │  │    │ max_grade    │
       │  └──────────────┘  │    └──────┬───────┘
       │                    │           │
       │  ┌──────────────┐  │    ┌──────┴───────┐
       │  │  attendance  │  │    │ hw_submissions│ (schema only)
       │  │ (schema only)│  │    │──────────────│
       │  │──────────────│  │    │ id (PK)      │
       ├──│ student_id   │  │    │ homework_id  │
       │  │ lesson_id    │──┘    │ student_id   │──── users
       │  │ status       │       │ github_url   │
       │  │ notes        │       │ submitted_at │
       ├──│ marked_by    │       │ is_late      │
       │  └──────────────┘       │ grade        │
       │                         │ feedback     │
       │  ┌──────────────┐       │ graded_at    │
       │  │   payments   │       │ graded_by    │──── users
       │  │ (schema only)│       └──────────────┘
       │  │──────────────│
       ├──│ student_id   │       ┌──────────────┐
       │  │ course_id    │──┐    │payment_rules │ (schema only)
       │  │ amount       │  │    │──────────────│
       │  │ currency     │  └────│ course_id    │
       │  │ status       │       │ amount       │
       │  │ due_date     │       │ currency     │
       │  │ paid_at      │       │ frequency    │
       │  │ txn_id       │       │ description  │
       │  │ method       │       │ is_active    │
       │  │ kaspi_url    │       └──────────────┘
       │  └──────────────┘
       │
```

---

## 7. Рекомендуемый порядок реализации

### Фаза 1 — Интеграция существующего (фронтенд ↔ бэкенд)

Эти эндпоинты уже реализованы на бэке. Нужно только подключить фронтенд.

| Приоритет | Задача | Затрагиваемые файлы (фронт) |
|-----------|--------|------------------------------|
| 1 | Подключить реальный login/register/logout через authService | `authStore.ts`, `LoginPage.tsx`, `RegisterPage.tsx` |
| 2 | Подключить GET/PATCH профиля, смену пароля, фото | `SettingsPage.tsx`, `InstructorSettingsPage.tsx`, `AdminSettingsPage.tsx` |
| 3 | Подключить список пользователей и управление | `ManageUsersPage.tsx`, `EnrollStudentModal.tsx` |
| 4 | Подключить приглашения | `InviteUserPage.tsx` |
| 5 | Подключить курсы (список, создание, редактирование) | `CoursesPage.tsx`, `CourseManagementPage.tsx` |
| 6 | Подключить уроки (CRUD, материалы) | `CourseManagementPage.tsx`, `CreateLessonModal.tsx` |
| 7 | Подключить список студентов | `StudentsPage.tsx`, `StudentDetailPage.tsx` |

### Фаза 2 — Новые модули бэкенда (нужна реализация Java-кода)

| Приоритет | Модуль | Что нужно реализовать |
|-----------|--------|----------------------|
| 1 | **Homework** (Entity + Repository + Service + Controller) | CRUD домашних заданий, сдача студентами, оценивание инструктором |
| 2 | **Attendance** (Entity + Repository + Service + Controller) | Отметка посещаемости, получение данных по уроку |
| 3 | **Student Dashboard / Grades / Calendar** | Агрегирующие эндпоинты для студента (`/student/dashboard`, `/student/grades`, `/student/lessons`) |
| 4 | **Instructor Dashboard / Calendar** | Агрегирующие эндпоинты для инструктора (`/instructor/dashboard`, `/instructor/calendar/lessons`) |
| 5 | **Admin Dashboard** | Агрегирующий эндпоинт со статистикой (`/admin/dashboard`) |
| 6 | **Search/Filter расширение** | Добавить `search`, `role`, `status` в `GET /admin/users` |
| 7 | **Payments + Payment Rules** | CRUD правил, список платежей, генерация платежей по правилам |
| 8 | **Kaspi Pay интеграция** | Создание платёжной ссылки, webhook для подтверждения |
| 9 | **AI-ассистент** | Интеграция с LLM API (`/student/ai-chat`) |

### Фаза 3 — Улучшения

| Задача | Описание |
|--------|----------|
| Token blacklist (Redis) | Инвалидация токенов при logout |
| WebSocket уведомления | Реалтайм-уведомления об оценках, ДЗ |
| Пересчёт метрик студента | Автоматический пересчёт `averageGrade`, `attendanceRate`, `homeworkCompletionRate` при изменении данных |
| Кэширование | Кэш для дашбордов и частых запросов |
| Rate limiting | Ограничение запросов для AI-чата |
