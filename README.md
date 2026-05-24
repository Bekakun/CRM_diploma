# CRM LMS - API Documentation & Modeling

## Оглавление
1. [Обзор системы](#обзор-системы)
2. [Бизнес-сущности](#бизнес-сущности)
3. [REST API Endpoints](#rest-api-endpoints)
4. [Модели данных](#модели-данных)
5. [Бизнес-логика и правила](#бизнес-логика-и-правила)
6. [Интеграции](#интеграции)

---

## Обзор системы

**CRM для учебных центров** - система управления обучением с поддержкой четырех ролей:
- **Super Admin** - полный доступ к системе
- **Admin** - управление пользователями, платежами, приглашениями
- **Instructor** - управление курсами, занятиями, оценивание студентов
- **Student** - просмотр занятий, сдача домашних заданий, оплата курсов

**Технологии фронтенда**: React 18 + TypeScript + Vite + Zustand + TailwindCSS

**Валюта**: KZT (Казахстанский тенге)

---

## Бизнес-сущности

### 1. User (Пользователь)
Базовая сущность для всех ролей системы.

**Поля**:
```typescript
{
  id: string (UUID)
  email: string (unique)
  passwordHash: string
  firstName: string
  lastName: string
  role: 'super_admin' | 'admin' | 'instructor' | 'student'
  profilePhotoUrl?: string
  phone?: string
  bio?: string
  status: 'active' | 'inactive'
  isEmailVerified: boolean
  lastLoginAt?: string (ISO datetime)
  createdAt: string (ISO datetime)
  updatedAt: string (ISO datetime)
}
```

**Связи**:
- User → Student (1:M) - один пользователь может быть студентом на нескольких курсах
- User → Course (1:M) - один преподаватель ведет несколько курсов

---

### 2. Course (Курс)
Учебный курс, который ведет преподаватель.

**Поля**:
```typescript
{
  id: string (UUID)
  name: string
  description: string
  instructorId: string (FK → User.id)
  startDate: string (ISO date)
  status: 'active' | 'draft' | 'completed'
  studentCount: number (вычисляемое поле)
  lessonCount: number (вычисляемое поле)
  createdAt: string (ISO datetime)
  updatedAt: string (ISO datetime)
}
```

**Связи**:
- Course → Lesson (1:M) - один курс содержит много занятий
- Course → Student (1:M) - студенты записаны на курс
- Course → PaymentRule (1:1) - правило оплаты для курса

**Индексы**:
- `instructorId` - для быстрой выборки курсов преподавателя
- `status` - фильтрация активных курсов

---

### 3. Lesson (Занятие)
Отдельное занятие в рамках курса с расписанием.

**Поля**:
```typescript
{
  id: string (UUID)
  courseId: string (FK → Course.id)
  title: string
  description?: string
  date: string (ISO date, например '2024-03-15')
  time: string (HH:mm формат, например '14:00')
  scheduledAt: string (ISO datetime, для сортировки)
  recordingUrl?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  createdAt: string (ISO datetime)
  updatedAt: string (ISO datetime)
}
```

**Связи**:
- Lesson → Material (1:M) - материалы к занятию
- Lesson → Homework (1:1) - домашнее задание
- Lesson → Attendance (1:M) - посещаемость студентов

**Индексы**:
- `courseId` - занятия курса
- `date` - поиск по дате
- `scheduledAt` - сортировка по времени

---

### 4. Material (Материал)
Учебный материал к занятию (PDF, DOCX).

**Поля**:
```typescript
{
  id: string (UUID)
  lessonId: string (FK → Lesson.id)
  name: string (например, 'Презентация.pdf')
  fileUrl: string (URL файла в хранилище)
  fileType: 'pdf' | 'docx'
  fileSize: number (в байтах)
  uploadedAt: string (ISO datetime)
}
```

**Связи**:
- Material → Lesson (M:1)

---

### 5. Homework (Домашнее задание)
Задание к занятию с дедлайном.

**Поля**:
```typescript
{
  id: string (UUID)
  lessonId: string (FK → Lesson.id)
  title: string
  description: string
  taskFileUrl?: string (URL файла с заданием)
  deadline: string (ISO datetime)
  createdAt: string (ISO datetime)
  updatedAt: string (ISO datetime)
}
```

**Связи**:
- Homework → Lesson (M:1)
- Homework → HomeworkSubmission (1:M)

**Индексы**:
- `lessonId` - задание занятия
- `deadline` - сортировка по дедлайну

---

### 6. HomeworkSubmission (Сдача домашнего задания)
Сданное студентом домашнее задание через GitHub.

**Поля**:
```typescript
{
  id: string (UUID)
  homeworkId: string (FK → Homework.id)
  studentId: string (FK → Student.id)
  githubUrl: string (URL GitHub репозитория)
  submittedAt: string (ISO datetime)
  isLate: boolean (вычисляется: submittedAt > homework.deadline)
  grade?: number (0-100, null если не проверено)
  feedback?: string (текстовый отзыв преподавателя)
  gradedAt?: string (ISO datetime)
  gradedBy?: string (FK → User.id, преподаватель)
  createdAt: string (ISO datetime)
  updatedAt: string (ISO datetime)
}
```

**Связи**:
- HomeworkSubmission → Homework (M:1)
- HomeworkSubmission → Student (M:1)
- HomeworkSubmission → User (M:1) - проверяющий преподаватель

**Индексы**:
- `homeworkId` - все сдачи задания
- `studentId` - работы студента
- `gradedAt IS NULL` - непроверенные работы

---

### 7. Student (Запись на курс)
Связь студента с курсом и преподавателем.

**Поля**:
```typescript
{
  id: string (UUID)
  userId: string (FK → User.id)
  courseId: string (FK → Course.id)
  instructorId: string (FK → User.id)
  enrolledAt: string (ISO datetime)
  status: 'active' | 'inactive'
  averageGrade: number (вычисляемое, среднее по всем оценкам)
  attendanceRate: number (вычисляемое, % посещенных занятий)
  homeworkCompletionRate: number (вычисляемое, % сданных ДЗ)
  createdAt: string (ISO datetime)
  updatedAt: string (ISO datetime)
}
```

**Связи**:
- Student → User (M:1) - данные пользователя
- Student → Course (M:1) - курс
- Student → User (M:1) - преподаватель курса
- Student → HomeworkSubmission (1:M)
- Student → Attendance (1:M)
- Student → Payment (1:M)

**Индексы**:
- `userId` - все курсы студента
- `courseId` - все студенты курса
- `instructorId` - студенты преподавателя

**Уникальность**: (userId, courseId) - студент не может быть записан дважды на один курс

---

### 8. Attendance (Посещаемость)
Отметка посещаемости студента на занятии.

**Поля**:
```typescript
{
  id: string (UUID)
  lessonId: string (FK → Lesson.id)
  studentId: string (FK → Student.id)
  status: 'present' | 'absent'
  markedAt: string (ISO datetime, когда преподаватель поставил отметку)
  markedBy: string (FK → User.id, преподаватель)
  createdAt: string (ISO datetime)
  updatedAt: string (ISO datetime)
}
```

**Связи**:
- Attendance → Lesson (M:1)
- Attendance → Student (M:1)
- Attendance → User (M:1) - кто отметил

**Индексы**:
- `lessonId` - посещаемость занятия
- `studentId` - посещаемость студента

**Уникальность**: (lessonId, studentId) - одна отметка на студента на занятие

---

### 9. Payment (Платеж)
Ежемесячный платеж студента за курс.

**Поля**:
```typescript
{
  id: string (UUID)
  studentId: string (FK → Student.id)
  courseId: string (FK → Course.id)
  amount: number (сумма в KZT)
  month: number (1-12)
  year: number
  dueDate: string (ISO date)
  status: 'pending' | 'paid' | 'overdue'
  paidAt?: string (ISO datetime)
  paymentMethod?: 'kaspi_pay' | 'cash' | 'bank_transfer'
  transactionId?: string (ID транзакции Kaspi Pay)
  createdAt: string (ISO datetime)
  updatedAt: string (ISO datetime)
}
```

**Связи**:
- Payment → Student (M:1)
- Payment → Course (M:1)

**Индексы**:
- `studentId` - платежи студента
- `status` - фильтрация по статусу
- `dueDate` - сортировка по дате

**Уникальность**: (studentId, courseId, month, year) - один платеж за курс в месяц

**Автоматика**:
- Статус 'pending' → 'overdue' если `dueDate < now()`
- При зачислении студента на курс создаются платежи по правилам курса

---

### 10. PaymentRule (Правило оплаты)
Настройка стоимости курса и дня оплаты (устанавливает админ).

**Поля**:
```typescript
{
  id: string (UUID)
  courseId: string (FK → Course.id, unique)
  amount: number (ежемесячная стоимость в KZT)
  dueDay: number (день месяца для оплаты, 1-31)
  isActive: boolean
  createdAt: string (ISO datetime)
  updatedAt: string (ISO datetime)
}
```

**Связи**:
- PaymentRule → Course (1:1)

**Индексы**:
- `courseId` (unique) - одно правило на курс

---

### 11. Invitation (Приглашение)
Приглашение пользователя в систему от админа.

**Поля**:
```typescript
{
  id: string (UUID)
  email: string
  role: 'admin' | 'instructor' | 'student'
  token: string (уникальный код приглашения)
  invitedBy: string (FK → User.id, админ)
  status: 'pending' | 'accepted' | 'expired'
  expiresAt: string (ISO datetime, например +7 дней)
  acceptedAt?: string (ISO datetime)
  createdAt: string (ISO datetime)
  updatedAt: string (ISO datetime)
}
```

**Связи**:
- Invitation → User (M:1) - кто пригласил

**Индексы**:
- `token` (unique) - поиск по коду
- `email` - поиск приглашений пользователя
- `status` - фильтрация активных

**Автоматика**:
- Статус 'pending' → 'expired' если `expiresAt < now()`

---

## REST API Endpoints

### Базовый URL
```
https://api.crm-lms.kz/api/v1
```

### Аутентификация
Все защищенные endpoints требуют JWT токен в заголовке:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Authentication & Authorization

### POST /auth/register
Регистрация нового пользователя по приглашению.

**Request Body**:
```json
{
  "email": "student@example.com",
  "password": "SecurePass123",
  "firstName": "Алия",
  "lastName": "Смагулова",
  "invitationToken": "abc123xyz"
}
```

**Response 201**:
```json
{
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "firstName": "Алия",
    "lastName": "Смагулова",
    "role": "student",
    "isEmailVerified": false,
    "createdAt": "2024-03-15T10:00:00Z"
  },
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

**Errors**:
- 400: Invalid invitation token
- 400: Invitation expired
- 409: Email already exists

---

### POST /auth/login
Вход в систему.

**Request Body**:
```json
{
  "email": "student@example.com",
  "password": "SecurePass123"
}
```

**Response 200**:
```json
{
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "firstName": "Алия",
    "lastName": "Смагулова",
    "role": "student",
    "profilePhotoUrl": "https://cdn.example.com/photos/user123.jpg"
  },
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

**Errors**:
- 401: Invalid credentials
- 403: Account inactive

---

### POST /auth/refresh
Обновление access token.

**Request Body**:
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response 200**:
```json
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

---

### POST /auth/logout
Выход из системы.

**Headers**: Authorization required

**Response 200**:
```json
{
  "message": "Logged out successfully"
}
```

---

### POST /auth/verify-email
Подтверждение email.

**Request Body**:
```json
{
  "token": "email_verification_token"
}
```

**Response 200**:
```json
{
  "message": "Email verified successfully"
}
```

---

## 2. User Management (Admin/Super Admin)

### POST /admin/invitations
Отправка приглашения пользователю.

**Headers**: Authorization required (admin/super_admin only)

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "role": "student"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "email": "newuser@example.com",
  "role": "student",
  "token": "abc123xyz",
  "expiresAt": "2024-03-22T10:00:00Z",
  "status": "pending",
  "createdAt": "2024-03-15T10:00:00Z"
}
```

**Errors**:
- 403: Insufficient permissions
- 409: User already exists

---

### GET /admin/invitations
Список всех приглашений.

**Headers**: Authorization required (admin/super_admin only)

**Query Params**:
- `status` (optional): pending | accepted | expired
- `limit` (optional): number, default 20
- `offset` (optional): number, default 0

**Response 200**:
```json
{
  "invitations": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "student",
      "status": "pending",
      "expiresAt": "2024-03-22T10:00:00Z",
      "invitedBy": {
        "id": "uuid",
        "firstName": "Админ",
        "lastName": "Петров"
      },
      "createdAt": "2024-03-15T10:00:00Z"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

---

### GET /admin/users
Список всех пользователей системы.

**Headers**: Authorization required (admin/super_admin only)

**Query Params**:
- `role` (optional): admin | instructor | student
- `status` (optional): active | inactive
- `search` (optional): string (поиск по имени, email)
- `limit` (optional): number, default 20
- `offset` (optional): number, default 0

**Response 200**:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "student@example.com",
      "firstName": "Алия",
      "lastName": "Смагулова",
      "role": "student",
      "status": "active",
      "isEmailVerified": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "lastLoginAt": "2024-03-15T08:30:00Z"
    }
  ],
  "total": 156,
  "limit": 20,
  "offset": 0
}
```

---

### GET /admin/users/:userId
Детали пользователя.

**Headers**: Authorization required (admin/super_admin only)

**Response 200**:
```json
{
  "id": "uuid",
  "email": "student@example.com",
  "firstName": "Алия",
  "lastName": "Смагулова",
  "role": "student",
  "phone": "+7 777 123 4567",
  "profilePhotoUrl": "https://cdn.example.com/photos/user123.jpg",
  "status": "active",
  "isEmailVerified": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-03-15T10:00:00Z",
  "lastLoginAt": "2024-03-15T08:30:00Z",
  "enrolledCourses": [
    {
      "courseId": "uuid",
      "courseName": "JavaScript Fundamentals",
      "enrolledAt": "2024-01-16T10:00:00Z"
    }
  ]
}
```

---

### PATCH /admin/users/:userId
Обновление данных пользователя.

**Headers**: Authorization required (admin/super_admin only)

**Request Body** (все поля optional):
```json
{
  "status": "inactive",
  "role": "admin"
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "email": "student@example.com",
  "firstName": "Алия",
  "lastName": "Смагулова",
  "role": "admin",
  "status": "inactive",
  "updatedAt": "2024-03-15T10:00:00Z"
}
```

---

### POST /admin/users/:userId/enroll
Запись студента на курсы.

**Headers**: Authorization required (admin/super_admin only)

**Request Body**:
```json
{
  "courseIds": ["course_uuid_1", "course_uuid_2"]
}
```

**Response 201**:
```json
{
  "enrolled": [
    {
      "id": "enrollment_uuid_1",
      "userId": "user_uuid",
      "courseId": "course_uuid_1",
      "courseName": "JavaScript Fundamentals",
      "enrolledAt": "2024-03-15T10:00:00Z"
    },
    {
      "id": "enrollment_uuid_2",
      "userId": "user_uuid",
      "courseId": "course_uuid_2",
      "courseName": "React Advanced",
      "enrolledAt": "2024-03-15T10:00:00Z"
    }
  ],
  "paymentsCreated": 6
}
```

**Errors**:
- 400: User is not a student
- 409: Already enrolled in some courses

---

### GET /admin/dashboard
Статистика для админской панели.

**Headers**: Authorization required (admin/super_admin only)

**Response 200**:
```json
{
  "totalUsers": 156,
  "newUsersThisMonth": 12,
  "activeCourses": 8,
  "totalRevenue": 2450000,
  "usersByRole": {
    "admin": 3,
    "instructor": 5,
    "student": 148
  },
  "recentRegistrations": [
    {
      "id": "uuid",
      "firstName": "Алия",
      "lastName": "Смагулова",
      "email": "aliya@example.com",
      "role": "student",
      "createdAt": "2024-03-15T10:00:00Z"
    }
  ],
  "systemActivity": {
    "activeUsersPercent": 87,
    "courseOccupancyPercent": 92,
    "paidInvoicesPercent": 78
  }
}
```

---

## 3. Payment Management (Admin)

### GET /admin/payment-rules
Список правил оплаты для курсов.

**Headers**: Authorization required (admin/super_admin only)

**Response 200**:
```json
{
  "rules": [
    {
      "id": "uuid",
      "courseId": "uuid",
      "courseName": "JavaScript Fundamentals",
      "amount": 50000,
      "dueDay": 10,
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-03-01T10:00:00Z"
    }
  ]
}
```

---

### POST /admin/payment-rules
Создание правила оплаты для курса.

**Headers**: Authorization required (admin/super_admin only)

**Request Body**:
```json
{
  "courseId": "uuid",
  "amount": 50000,
  "dueDay": 10
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "courseName": "JavaScript Fundamentals",
  "amount": 50000,
  "dueDay": 10,
  "isActive": true,
  "createdAt": "2024-03-15T10:00:00Z"
}
```

**Errors**:
- 404: Course not found
- 409: Payment rule already exists for this course

---

### PATCH /admin/payment-rules/:ruleId
Обновление правила оплаты.

**Headers**: Authorization required (admin/super_admin only)

**Request Body** (все поля optional):
```json
{
  "amount": 55000,
  "dueDay": 15,
  "isActive": false
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "courseName": "JavaScript Fundamentals",
  "amount": 55000,
  "dueDay": 15,
  "isActive": false,
  "updatedAt": "2024-03-15T10:00:00Z"
}
```

---

### DELETE /admin/payment-rules/:ruleId
Удаление правила оплаты.

**Headers**: Authorization required (admin/super_admin only)

**Response 204**: No content

---

### GET /admin/payments
Список всех платежей (для отчетности).

**Headers**: Authorization required (admin/super_admin only)

**Query Params**:
- `status` (optional): pending | paid | overdue
- `courseId` (optional): uuid
- `month` (optional): 1-12
- `year` (optional): number
- `limit` (optional): number, default 50
- `offset` (optional): number, default 0

**Response 200**:
```json
{
  "payments": [
    {
      "id": "uuid",
      "student": {
        "id": "uuid",
        "firstName": "Алия",
        "lastName": "Смагулова",
        "email": "aliya@example.com"
      },
      "course": {
        "id": "uuid",
        "name": "JavaScript Fundamentals"
      },
      "amount": 50000,
      "month": 3,
      "year": 2024,
      "dueDate": "2024-03-10",
      "status": "paid",
      "paidAt": "2024-03-08T14:30:00Z",
      "paymentMethod": "kaspi_pay",
      "createdAt": "2024-03-01T00:00:00Z"
    }
  ],
  "total": 450,
  "totalAmount": 22500000,
  "paidAmount": 17550000,
  "unpaidAmount": 4950000,
  "limit": 50,
  "offset": 0
}
```

---

## 4. Course Management (Instructor)

### GET /instructor/courses
Список курсов преподавателя.

**Headers**: Authorization required (instructor only)

**Response 200**:
```json
{
  "courses": [
    {
      "id": "uuid",
      "name": "JavaScript Fundamentals",
      "description": "Основы JavaScript для начинающих",
      "startDate": "2024-01-15",
      "status": "active",
      "studentCount": 25,
      "lessonCount": 12,
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

---

### POST /instructor/courses
Создание нового курса.

**Headers**: Authorization required (instructor only)

**Request Body**:
```json
{
  "name": "Node.js Backend",
  "description": "Backend разработка на Node.js",
  "startDate": "2024-04-01"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "name": "Node.js Backend",
  "description": "Backend разработка на Node.js",
  "instructorId": "uuid",
  "startDate": "2024-04-01",
  "status": "draft",
  "studentCount": 0,
  "lessonCount": 0,
  "createdAt": "2024-03-15T10:00:00Z"
}
```

---

### GET /instructor/courses/:courseId
Детали курса.

**Headers**: Authorization required (instructor only)

**Response 200**:
```json
{
  "id": "uuid",
  "name": "JavaScript Fundamentals",
  "description": "Основы JavaScript для начинающих",
  "instructorId": "uuid",
  "startDate": "2024-01-15",
  "status": "active",
  "studentCount": 25,
  "lessonCount": 12,
  "createdAt": "2024-01-01T10:00:00Z",
  "students": [
    {
      "id": "student_uuid",
      "userId": "user_uuid",
      "firstName": "Алия",
      "lastName": "Смагулова",
      "email": "aliya@example.com",
      "averageGrade": 87,
      "attendanceRate": 95,
      "homeworkCompletionRate": 80,
      "enrolledAt": "2024-01-16T10:00:00Z"
    }
  ]
}
```

---

### PATCH /instructor/courses/:courseId
Обновление курса.

**Headers**: Authorization required (instructor only)

**Request Body** (все поля optional):
```json
{
  "name": "JavaScript Advanced",
  "description": "Продвинутый JavaScript",
  "status": "active"
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "name": "JavaScript Advanced",
  "description": "Продвинутый JavaScript",
  "status": "active",
  "updatedAt": "2024-03-15T10:00:00Z"
}
```

---

### DELETE /instructor/courses/:courseId
Удаление курса (только если нет студентов).

**Headers**: Authorization required (instructor only)

**Response 204**: No content

**Errors**:
- 400: Cannot delete course with enrolled students

---

## 5. Lesson Management (Instructor)

### GET /instructor/courses/:courseId/lessons
Список занятий курса.

**Headers**: Authorization required (instructor only)

**Query Params**:
- `from` (optional): ISO date, начало периода
- `to` (optional): ISO date, конец периода
- `status` (optional): scheduled | completed | cancelled

**Response 200**:
```json
{
  "lessons": [
    {
      "id": "uuid",
      "courseId": "uuid",
      "title": "Введение в JavaScript",
      "description": "Первое занятие курса",
      "date": "2024-03-15",
      "time": "14:00",
      "scheduledAt": "2024-03-15T14:00:00Z",
      "recordingUrl": null,
      "status": "scheduled",
      "materialsCount": 2,
      "hasHomework": true,
      "attendanceCount": 0,
      "totalStudents": 25,
      "createdAt": "2024-03-10T10:00:00Z"
    }
  ]
}
```

---

### POST /instructor/courses/:courseId/lessons
Создание нового занятия.

**Headers**: Authorization required (instructor only)

**Request Body**:
```json
{
  "title": "Переменные и типы данных",
  "description": "Изучаем let, const, var и типы данных",
  "date": "2024-03-20",
  "time": "14:00"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "title": "Переменные и типы данных",
  "description": "Изучаем let, const, var и типы данных",
  "date": "2024-03-20",
  "time": "14:00",
  "scheduledAt": "2024-03-20T14:00:00Z",
  "status": "scheduled",
  "createdAt": "2024-03-15T10:00:00Z"
}
```

**Errors**:
- 400: Lesson conflicts with another lesson (within 2 hours)

---

### GET /instructor/lessons/:lessonId
Детали занятия с материалами и домашним заданием.

**Headers**: Authorization required (instructor only)

**Response 200**:
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "courseName": "JavaScript Fundamentals",
  "title": "Переменные и типы данных",
  "description": "Изучаем let, const, var и типы данных",
  "date": "2024-03-20",
  "time": "14:00",
  "scheduledAt": "2024-03-20T14:00:00Z",
  "recordingUrl": "https://zoom.us/rec/123456",
  "status": "completed",
  "materials": [
    {
      "id": "uuid",
      "name": "Презентация.pdf",
      "fileUrl": "https://cdn.example.com/materials/lesson1.pdf",
      "fileType": "pdf",
      "fileSize": 2048576,
      "uploadedAt": "2024-03-20T12:00:00Z"
    }
  ],
  "homework": {
    "id": "uuid",
    "title": "ДЗ #1: Калькулятор",
    "description": "Создайте простой калькулятор на JavaScript",
    "taskFileUrl": "https://cdn.example.com/homework/task1.pdf",
    "deadline": "2024-03-23T23:59:59Z",
    "submissionsCount": 20,
    "gradedCount": 15,
    "pendingCount": 5
  },
  "attendance": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "student": {
        "firstName": "Алия",
        "lastName": "Смагулова"
      },
      "status": "present",
      "markedAt": "2024-03-20T15:00:00Z"
    }
  ]
}
```

---

### PATCH /instructor/lessons/:lessonId
Обновление занятия.

**Headers**: Authorization required (instructor only)

**Request Body** (все поля optional):
```json
{
  "title": "Переменные и типы данных (обновлено)",
  "recordingUrl": "https://zoom.us/rec/123456",
  "status": "completed"
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "title": "Переменные и типы данных (обновлено)",
  "recordingUrl": "https://zoom.us/rec/123456",
  "status": "completed",
  "updatedAt": "2024-03-20T16:00:00Z"
}
```

---

### DELETE /instructor/lessons/:lessonId
Отмена занятия.

**Headers**: Authorization required (instructor only)

**Response 204**: No content

---

### POST /instructor/lessons/:lessonId/materials
Загрузка материалов к занятию.

**Headers**: Authorization required (instructor only)

**Content-Type**: multipart/form-data

**Form Fields**:
- `files[]`: File[] (PDF, DOCX)

**Response 201**:
```json
{
  "materials": [
    {
      "id": "uuid",
      "lessonId": "uuid",
      "name": "Презентация.pdf",
      "fileUrl": "https://cdn.example.com/materials/lesson1_presentation.pdf",
      "fileType": "pdf",
      "fileSize": 2048576,
      "uploadedAt": "2024-03-15T10:00:00Z"
    }
  ]
}
```

**Errors**:
- 400: Invalid file type (only PDF, DOCX allowed)
- 413: File too large (max 50MB)

---

### DELETE /instructor/materials/:materialId
Удаление материала.

**Headers**: Authorization required (instructor only)

**Response 204**: No content

---

### POST /instructor/lessons/:lessonId/homework
Создание домашнего задания.

**Headers**: Authorization required (instructor only)

**Content-Type**: multipart/form-data

**Form Fields**:
- `title`: string
- `description`: string
- `deadline`: ISO datetime
- `taskFile` (optional): File (PDF, DOCX)

**Response 201**:
```json
{
  "id": "uuid",
  "lessonId": "uuid",
  "title": "ДЗ #1: Калькулятор",
  "description": "Создайте простой калькулятор на JavaScript",
  "taskFileUrl": "https://cdn.example.com/homework/task1.pdf",
  "deadline": "2024-03-23T23:59:59Z",
  "createdAt": "2024-03-15T10:00:00Z"
}
```

---

### PATCH /instructor/homework/:homeworkId
Обновление домашнего задания.

**Headers**: Authorization required (instructor only)

**Request Body** (все поля optional):
```json
{
  "title": "ДЗ #1: Калькулятор (обновлено)",
  "deadline": "2024-03-24T23:59:59Z"
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "title": "ДЗ #1: Калькулятор (обновлено)",
  "deadline": "2024-03-24T23:59:59Z",
  "updatedAt": "2024-03-15T12:00:00Z"
}
```

---

## 6. Attendance Management (Instructor)

### POST /instructor/lessons/:lessonId/attendance
Массовая отметка посещаемости.

**Headers**: Authorization required (instructor only)

**Request Body**:
```json
{
  "attendance": [
    {
      "studentId": "uuid_1",
      "status": "present"
    },
    {
      "studentId": "uuid_2",
      "status": "absent"
    }
  ]
}
```

**Response 200**:
```json
{
  "updated": 2,
  "attendance": [
    {
      "id": "uuid",
      "lessonId": "uuid",
      "studentId": "uuid_1",
      "status": "present",
      "markedAt": "2024-03-15T15:00:00Z",
      "markedBy": "instructor_uuid"
    }
  ]
}
```

---

### PATCH /instructor/attendance/:attendanceId
Обновление отметки посещаемости.

**Headers**: Authorization required (instructor only)

**Request Body**:
```json
{
  "status": "present"
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "lessonId": "uuid",
  "studentId": "uuid",
  "status": "present",
  "markedAt": "2024-03-15T15:00:00Z",
  "updatedAt": "2024-03-15T15:30:00Z"
}
```

---

## 7. Homework Grading (Instructor)

### GET /instructor/homework/:homeworkId/submissions
Список сданных работ по заданию.

**Headers**: Authorization required (instructor only)

**Query Params**:
- `status` (optional): graded | pending
- `isLate` (optional): boolean

**Response 200**:
```json
{
  "homework": {
    "id": "uuid",
    "title": "ДЗ #1: Калькулятор",
    "deadline": "2024-03-23T23:59:59Z"
  },
  "submissions": [
    {
      "id": "uuid",
      "homeworkId": "uuid",
      "student": {
        "id": "uuid",
        "userId": "uuid",
        "firstName": "Алия",
        "lastName": "Смагулова"
      },
      "githubUrl": "https://github.com/aliya/js-calculator",
      "submittedAt": "2024-03-22T18:30:00Z",
      "isLate": false,
      "grade": 90,
      "feedback": "Отличная работа! Код чистый и читаемый.",
      "gradedAt": "2024-03-23T10:00:00Z",
      "gradedBy": "instructor_uuid"
    }
  ],
  "total": 25,
  "graded": 20,
  "pending": 5
}
```

---

### POST /instructor/submissions/:submissionId/grade
Оценка домашнего задания.

**Headers**: Authorization required (instructor only)

**Request Body**:
```json
{
  "grade": 90,
  "feedback": "Отличная работа! Код чистый и читаемый."
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "homeworkId": "uuid",
  "studentId": "uuid",
  "grade": 90,
  "feedback": "Отличная работа! Код чистый и читаемый.",
  "gradedAt": "2024-03-23T10:00:00Z",
  "gradedBy": "instructor_uuid",
  "updatedAt": "2024-03-23T10:00:00Z"
}
```

**Errors**:
- 400: Grade must be between 0 and 100

---

### PATCH /instructor/submissions/:submissionId/grade
Обновление оценки.

**Headers**: Authorization required (instructor only)

**Request Body** (хотя бы одно поле):
```json
{
  "grade": 95,
  "feedback": "Отличная работа! Исправили все замечания."
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "grade": 95,
  "feedback": "Отличная работа! Исправили все замечания.",
  "gradedAt": "2024-03-23T10:00:00Z",
  "updatedAt": "2024-03-24T09:00:00Z"
}
```

---

## 8. Student Performance (Instructor)

### GET /instructor/students
Список студентов преподавателя.

**Headers**: Authorization required (instructor only)

**Query Params**:
- `courseId` (optional): uuid
- `search` (optional): string (поиск по имени, email)
- `sortBy` (optional): averageGrade | attendanceRate | homeworkCompletionRate
- `order` (optional): asc | desc

**Response 200**:
```json
{
  "students": [
    {
      "id": "student_uuid",
      "userId": "user_uuid",
      "firstName": "Алия",
      "lastName": "Смагулова",
      "email": "aliya@example.com",
      "courseId": "uuid",
      "courseName": "JavaScript Fundamentals",
      "averageGrade": 87,
      "attendanceRate": 95,
      "homeworkCompletionRate": 80,
      "enrolledAt": "2024-01-16T10:00:00Z"
    }
  ],
  "total": 148
}
```

---

### GET /instructor/students/:studentId
Детальная информация о студенте.

**Headers**: Authorization required (instructor only)

**Response 200**:
```json
{
  "id": "student_uuid",
  "userId": "user_uuid",
  "firstName": "Алия",
  "lastName": "Смагулова",
  "email": "aliya@example.com",
  "profilePhotoUrl": "https://cdn.example.com/photos/user123.jpg",
  "courseId": "uuid",
  "courseName": "JavaScript Fundamentals",
  "averageGrade": 87,
  "attendanceRate": 95,
  "homeworkCompletionRate": 80,
  "enrolledAt": "2024-01-16T10:00:00Z",
  "performance": [
    {
      "lessonId": "uuid",
      "lessonTitle": "Введение в JavaScript",
      "lessonDate": "2024-03-15",
      "attendance": {
        "status": "present"
      },
      "homework": {
        "id": "uuid",
        "title": "ДЗ #1: Калькулятор",
        "deadline": "2024-03-18T23:59:59Z",
        "submission": {
          "id": "uuid",
          "githubUrl": "https://github.com/aliya/js-calculator",
          "submittedAt": "2024-03-17T18:30:00Z",
          "isLate": false,
          "grade": 90,
          "feedback": "Отличная работа!",
          "gradedAt": "2024-03-18T10:00:00Z"
        }
      }
    }
  ]
}
```

---

### GET /instructor/dashboard
Дашборд преподавателя.

**Headers**: Authorization required (instructor only)

**Response 200**:
```json
{
  "activeCourses": 3,
  "totalStudents": 75,
  "lessonsThisMonth": 18,
  "gradedHomework": 42,
  "upcomingLessons": [
    {
      "id": "uuid",
      "courseId": "uuid",
      "courseName": "JavaScript Fundamentals",
      "title": "Переменные и типы данных",
      "scheduledAt": "2024-03-20T14:00:00Z",
      "studentCount": 25
    }
  ],
  "pendingHomework": [
    {
      "id": "submission_uuid",
      "homework": {
        "id": "uuid",
        "title": "ДЗ #1: Калькулятор"
      },
      "student": {
        "firstName": "Нуржан",
        "lastName": "Касымов"
      },
      "courseName": "JavaScript Fundamentals",
      "submittedAt": "2024-03-18T20:00:00Z",
      "isLate": true
    }
  ]
}
```

---

## 9. Student Endpoints

### GET /student/dashboard
Дашборд студента.

**Headers**: Authorization required (student only)

**Response 200**:
```json
{
  "enrolledCourses": 2,
  "upcomingLessons": 3,
  "averageGrade": 87,
  "activeHomework": 2,
  "upcomingLessonsList": [
    {
      "id": "uuid",
      "courseId": "uuid",
      "courseName": "JavaScript Fundamentals",
      "title": "Переменные и типы данных",
      "scheduledAt": "2024-03-20T14:00:00Z",
      "hasHomework": true
    }
  ],
  "recentGrades": [
    {
      "homeworkId": "uuid",
      "homeworkTitle": "ДЗ #1: Калькулятор",
      "courseName": "JavaScript Fundamentals",
      "grade": 90,
      "gradedAt": "2024-03-18T10:00:00Z"
    }
  ]
}
```

---

### GET /student/calendar
Календарь занятий студента.

**Headers**: Authorization required (student only)

**Query Params**:
- `from` (optional): ISO date
- `to` (optional): ISO date
- `courseId` (optional): uuid

**Response 200**:
```json
{
  "lessons": [
    {
      "id": "uuid",
      "courseId": "uuid",
      "courseName": "JavaScript Fundamentals",
      "title": "Переменные и типы данных",
      "description": "Изучаем let, const, var",
      "date": "2024-03-20",
      "time": "14:00",
      "scheduledAt": "2024-03-20T14:00:00Z",
      "status": "scheduled",
      "hasHomework": true
    }
  ]
}
```

---

### GET /student/lessons/:lessonId
Детали занятия для студента.

**Headers**: Authorization required (student only)

**Response 200**:
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "courseName": "JavaScript Fundamentals",
  "title": "Переменные и типы данных",
  "description": "Изучаем let, const, var",
  "date": "2024-03-20",
  "time": "14:00",
  "scheduledAt": "2024-03-20T14:00:00Z",
  "recordingUrl": "https://zoom.us/rec/123456",
  "materials": [
    {
      "id": "uuid",
      "name": "Презентация.pdf",
      "fileUrl": "https://cdn.example.com/materials/lesson1.pdf",
      "fileType": "pdf",
      "fileSize": 2048576
    }
  ],
  "homework": {
    "id": "uuid",
    "title": "ДЗ #1: Калькулятор",
    "description": "Создайте простой калькулятор",
    "taskFileUrl": "https://cdn.example.com/homework/task1.pdf",
    "deadline": "2024-03-23T23:59:59Z",
    "mySubmission": {
      "id": "uuid",
      "githubUrl": "https://github.com/aliya/js-calculator",
      "submittedAt": "2024-03-22T18:30:00Z",
      "isLate": false,
      "grade": 90,
      "feedback": "Отличная работа!",
      "gradedAt": "2024-03-23T10:00:00Z"
    }
  },
  "myAttendance": {
    "status": "present"
  }
}
```

---

### POST /student/homework/:homeworkId/submit
Сдача домашнего задания.

**Headers**: Authorization required (student only)

**Request Body**:
```json
{
  "githubUrl": "https://github.com/aliya/js-calculator"
}
```

**Response 201**:
```json
{
  "id": "uuid",
  "homeworkId": "uuid",
  "studentId": "uuid",
  "githubUrl": "https://github.com/aliya/js-calculator",
  "submittedAt": "2024-03-22T18:30:00Z",
  "isLate": false,
  "createdAt": "2024-03-22T18:30:00Z"
}
```

**Errors**:
- 400: Invalid GitHub URL
- 409: Already submitted (use PATCH to update)

---

### PATCH /student/submissions/:submissionId
Обновление сданного задания (до проверки).

**Headers**: Authorization required (student only)

**Request Body**:
```json
{
  "githubUrl": "https://github.com/aliya/js-calculator-v2"
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "githubUrl": "https://github.com/aliya/js-calculator-v2",
  "submittedAt": "2024-03-22T20:00:00Z",
  "isLate": false,
  "updatedAt": "2024-03-22T20:00:00Z"
}
```

**Errors**:
- 403: Cannot update already graded submission

---

### GET /student/grades
Оценки студента.

**Headers**: Authorization required (student only)

**Query Params**:
- `courseId` (optional): uuid

**Response 200**:
```json
{
  "overallAverage": 87,
  "trend": "up",
  "courses": [
    {
      "courseId": "uuid",
      "courseName": "JavaScript Fundamentals",
      "instructor": {
        "firstName": "Нуржан",
        "lastName": "Касымов"
      },
      "averageGrade": 87,
      "totalHomework": 10,
      "gradedHomework": 8,
      "grades": [
        {
          "homeworkId": "uuid",
          "homeworkTitle": "ДЗ #1: Калькулятор",
          "lessonTitle": "Переменные и типы данных",
          "submittedAt": "2024-03-22T18:30:00Z",
          "grade": 90,
          "feedback": "Отличная работа!",
          "gradedAt": "2024-03-23T10:00:00Z"
        }
      ]
    }
  ]
}
```

---

### GET /student/payments
Платежи студента.

**Headers**: Authorization required (student only)

**Query Params**:
- `status` (optional): pending | paid | overdue
- `year` (optional): number

**Response 200**:
```json
{
  "summary": {
    "totalPaid": 150000,
    "totalUnpaid": 50000,
    "totalPayments": 4
  },
  "payments": [
    {
      "id": "uuid",
      "courseId": "uuid",
      "courseName": "JavaScript Fundamentals",
      "amount": 50000,
      "month": 3,
      "year": 2024,
      "monthName": "Март",
      "dueDate": "2024-03-10",
      "status": "paid",
      "paidAt": "2024-03-08T14:30:00Z",
      "paymentMethod": "kaspi_pay"
    }
  ],
  "byYear": {
    "2024": [
      {
        "id": "uuid",
        "courseName": "JavaScript Fundamentals",
        "amount": 50000,
        "monthName": "Январь",
        "dueDate": "2024-01-10",
        "status": "paid",
        "paidAt": "2024-01-08T10:00:00Z"
      }
    ]
  }
}
```

---

### POST /student/payments/:paymentId/pay
Оплата через Kaspi Pay.

**Headers**: Authorization required (student only)

**Response 200**:
```json
{
  "kaspiPayUrl": "https://kaspi.kz/pay?invoice=abc123xyz",
  "invoiceId": "abc123xyz",
  "amount": 50000,
  "expiresAt": "2024-03-15T12:00:00Z"
}
```

**Webhook endpoint для подтверждения оплаты**:
```
POST /webhooks/kaspi-pay/confirm
```

---

## 10. User Profile

### GET /profile
Профиль текущего пользователя.

**Headers**: Authorization required

**Response 200**:
```json
{
  "id": "uuid",
  "email": "student@example.com",
  "firstName": "Алия",
  "lastName": "Смагулова",
  "role": "student",
  "phone": "+7 777 123 4567",
  "bio": "Изучаю программирование",
  "profilePhotoUrl": "https://cdn.example.com/photos/user123.jpg",
  "status": "active",
  "isEmailVerified": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "lastLoginAt": "2024-03-15T08:30:00Z"
}
```

---

### PATCH /profile
Обновление профиля.

**Headers**: Authorization required

**Request Body** (все поля optional):
```json
{
  "firstName": "Алия",
  "lastName": "Смагулова",
  "phone": "+7 777 123 4567",
  "bio": "Изучаю программирование"
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "firstName": "Алия",
  "lastName": "Смагулова",
  "phone": "+7 777 123 4567",
  "bio": "Изучаю программирование",
  "updatedAt": "2024-03-15T10:00:00Z"
}
```

---

### POST /profile/photo
Загрузка фото профиля.

**Headers**: Authorization required

**Content-Type**: multipart/form-data

**Form Fields**:
- `photo`: File (JPG, PNG)

**Response 200**:
```json
{
  "profilePhotoUrl": "https://cdn.example.com/photos/user123_new.jpg",
  "updatedAt": "2024-03-15T10:00:00Z"
}
```

**Errors**:
- 400: Invalid file type (only JPG, PNG allowed)
- 413: File too large (max 5MB)

---

### DELETE /profile/photo
Удаление фото профиля.

**Headers**: Authorization required

**Response 204**: No content

---

## 11. File Downloads

### GET /files/materials/:materialId
Скачивание материала.

**Headers**: Authorization required

**Response 200**:
- Content-Type: application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document
- Content-Disposition: attachment; filename="Презентация.pdf"
- Binary file stream

**Errors**:
- 403: Access denied (not enrolled in course)
- 404: Material not found

---

### GET /files/homework/:homeworkId/task
Скачивание файла задания.

**Headers**: Authorization required

**Response 200**:
- Content-Type: application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document
- Content-Disposition: attachment; filename="task.pdf"
- Binary file stream

**Errors**:
- 403: Access denied
- 404: Homework task file not found

---

## Модели данных

### JWT Payload
```typescript
{
  userId: string
  email: string
  role: 'super_admin' | 'admin' | 'instructor' | 'student'
  iat: number (issued at)
  exp: number (expiration, 24 hours from iat)
}
```

### Refresh Token Payload
```typescript
{
  userId: string
  tokenVersion: number (для инвалидации)
  iat: number
  exp: number (expiration, 7 days from iat)
}
```

---

## Бизнес-логика и правила

### Система оценок
```
90-100: Отлично (зеленый)
75-89:  Хорошо (синий)
60-74:  Удовлетворительно (желтый)
0-59:   Неудовлетворительно (красный)
```

### Сдача домашних заданий
- Студент сдает через **GitHub URL** (не загрузка файла)
- Система фиксирует время сдачи
- **Проверка на опоздание**: `submittedAt > homework.deadline` → `isLate = true`
- Преподаватель может оценить (0-100) и дать текстовый отзыв
- После оценки статус меняется с 'pending' на 'graded'

### Планирование занятий
- **Проверка конфликтов**: занятие не должно пересекаться с другим в пределах 2 часов
- При создании занятия показываются все занятия на выбранную дату
- Календарь поддерживает навигацию по месяцам
- Один курс может иметь несколько занятий в день (если нет конфликтов по времени)

### Система платежей
- Админ создает **правило оплаты** для курса (сумма + день месяца)
- При зачислении студента **автоматически создаются ежемесячные платежи**
- Статусы платежей:
  - `pending` - ожидает оплаты
  - `paid` - оплачен
  - `overdue` - просрочен (если `dueDate < now()`)
- Интеграция с **Kaspi Pay** (платежная система Казахстана)
- Валюта: **KZT** (казахстанский тенге)

### Система приглашений
1. Админ отправляет приглашение (email + роль)
2. Система генерирует токен приглашения
3. Отправляется email пользователю
4. Пользователь регистрируется с токеном
5. Статус приглашения: `pending` → `accepted`
6. Приглашения истекают через 7 дней (статус → `expired`)

### Посещаемость
- Преподаватель отмечает посещаемость после занятия
- Посещаемость влияет на метрики студента (attendance %)
- Отображается в детальном профиле студента

### Запись на курсы
- Админ записывает студентов на курсы через модальное окно
- Можно записать на несколько курсов одновременно
- При записи создается сущность **Student** (связь user + course + instructor)
- Автоматически создаются **платежи** согласно правилам курса

---

## Интеграции

### Kaspi Pay (Платежная система)
**Сценарий оплаты**:
1. Студент нажимает "Оплатить" → `POST /student/payments/:paymentId/pay`
2. Backend создает инвойс в Kaspi Pay
3. Backend возвращает `kaspiPayUrl`
4. Фронтенд перенаправляет на Kaspi Pay
5. Пользователь оплачивает в Kaspi
6. Kaspi отправляет webhook на backend → `POST /webhooks/kaspi-pay/confirm`
7. Backend обновляет статус платежа: `pending` → `paid`, сохраняет `paidAt`
8. Студент видит статус "Оплачено" на фронте

**Webhook для подтверждения**:
```typescript
POST /webhooks/kaspi-pay/confirm

Body:
{
  "invoiceId": "abc123xyz",
  "transactionId": "kaspi_tx_987654",
  "amount": 50000,
  "status": "success",
  "paidAt": "2024-03-08T14:30:00Z"
}

Валидация:
- Проверка подписи запроса (HMAC SHA256)
- Проверка статуса инвойса (не оплачен ранее)
- Сверка суммы

Response 200:
{
  "success": true
}
```

### Email уведомления
**Сценарии отправки**:
1. **Приглашение пользователя**
   - Кому: приглашенный email
   - Содержание: токен приглашения, ссылка на регистрацию

2. **Подтверждение email**
   - Кому: зарегистрированный пользователь
   - Содержание: токен подтверждения, ссылка на верификацию

3. **Напоминание о платеже**
   - Кому: студент
   - Когда: за 3 дня до `dueDate`
   - Содержание: сумма, курс, дедлайн, ссылка на оплату

4. **Уведомление о проверке ДЗ**
   - Кому: студент
   - Когда: преподаватель поставил оценку
   - Содержание: оценка, отзыв, ссылка на результат

5. **Запись на курс**
   - Кому: студент
   - Когда: админ записал на курс
   - Содержание: название курса, преподаватель, расписание

### File Storage (AWS S3 / аналог)
**Типы файлов**:
1. **Материалы занятий** (PDF, DOCX)
   - Путь: `/materials/{courseId}/{lessonId}/{filename}`
   - Max размер: 50 MB

2. **Задания домашних работ** (PDF, DOCX)
   - Путь: `/homework/{courseId}/{homeworkId}/{filename}`
   - Max размер: 50 MB

3. **Фото профиля** (JPG, PNG)
   - Путь: `/profiles/{userId}/{filename}`
   - Max размер: 5 MB

**Политика доступа**:
- Материалы и задания: только зачисленные студенты курса + преподаватель
- Фото профиля: публичный доступ (CDN)

### AI Assistant (будущая интеграция)
**Планируемый функционал**:
- Чат-бот для помощи студентам
- Ответы на вопросы по курсу
- Объяснение концепций программирования
- Подготовка к занятиям

**API endpoint**:
```typescript
POST /student/ai-assistant/chat

Request:
{
  "message": "Объясни разницу между let и const"
}

Response:
{
  "reply": "let и const - это два способа объявления переменных...",
  "timestamp": "2024-03-15T10:00:00Z"
}
```

---

## Приоритеты разработки бэкенда

### Фаза 1: MVP (Минимально работающий продукт)
1. ✅ Аутентификация и авторизация (JWT)
2. ✅ Управление пользователями (CRUD)
3. ✅ Система приглашений
4. ✅ Управление курсами (CRUD)
5. ✅ Создание и планирование занятий
6. ✅ Загрузка материалов (File Storage)
7. ✅ Домашние задания (создание, сдача, оценка)
8. ✅ Посещаемость

### Фаза 2: Платежи
1. ✅ Правила оплаты
2. ✅ Автоматическое создание платежей
3. ✅ Интеграция Kaspi Pay
4. ✅ Webhook обработка платежей

### Фаза 3: Уведомления и расширения
1. Email уведомления
2. Аналитика и отчеты
3. AI Assistant интеграция
4. Push-уведомления (опционально)

---

## Безопасность

### Аутентификация
- **JWT токены** для доступа к API
- Access token: 24 часа
- Refresh token: 7 дней
- Хранение токенов: localStorage (фронт)
- Хеширование паролей: **bcrypt** (cost factor 10)

### Авторизация (RBAC)
- Middleware проверки роли на каждом endpoint
- Ограничение доступа к ресурсам:
  - Студент видит только свои курсы и оценки
  - Преподаватель видит только свои курсы и студентов
  - Админ видит все

### Защита от атак
- **Rate limiting**: 100 запросов/минуту на IP
- **CORS**: только разрешенные домены
- **SQL Injection**: использование ORM (Prisma/TypeORM)
- **XSS**: санитизация всех пользовательских данных
- **CSRF**: CSRF токены для форм
- **File uploads**: валидация типа файла (magic bytes), ограничение размера

### Валидация данных
- Все входные данные валидируются (Joi/Zod схемы)
- GitHub URL: проверка формата `https://github.com/...`
- Email: RFC 5322 валидация
- Даты: ISO 8601 формат
- Оценки: 0-100 range

---

## Метрики и аналитика

### Вычисляемые поля
```sql
-- Средняя оценка студента по курсу
averageGrade = AVG(homework_submissions.grade)
WHERE studentId = ? AND courseId = ?

-- Процент посещаемости
attendanceRate = (COUNT(attendance WHERE status='present') / COUNT(lessons)) * 100
WHERE studentId = ? AND courseId = ?

-- Процент выполнения ДЗ
homeworkCompletionRate = (COUNT(homework_submissions) / COUNT(homework)) * 100
WHERE studentId = ? AND courseId = ?

-- Количество студентов на курсе
studentCount = COUNT(students WHERE courseId = ? AND status = 'active')

-- Количество занятий курса
lessonCount = COUNT(lessons WHERE courseId = ?)
```

---

## Технический стек (рекомендации для бэкенда)

### Backend Framework
- **Node.js + Express** (или NestJS для более структурированного подхода)
- **TypeScript** для типобезопасности

### Database
- **PostgreSQL** (реляционная БД для сложных связей)
- **Redis** для кеширования и rate limiting

### ORM
- **Prisma** или **TypeORM**

### File Storage
- **AWS S3** или **MinIO** (self-hosted аналог)

### Authentication
- **jsonwebtoken** для JWT
- **bcrypt** для хеширования паролей

### Email
- **Nodemailer** + **SMTP провайдер** (SendGrid, Mailgun)

### Validation
- **Zod** или **Joi** для валидации схем

### Websockets (опционально)
- **Socket.io** для real-time чата с AI

---

## Заключение

Данная документация описывает полный REST API для CRM системы управления обучением. Все endpoints разработаны на основе реальных требований фронтенда и покрывают весь функционал системы:

✅ Аутентификация и управление пользователями
✅ Система приглашений
✅ Управление курсами и занятиями
✅ Загрузка и скачивание материалов
✅ Домашние задания и оценивание
✅ Посещаемость и метрики студентов
✅ Платежная система с Kaspi Pay
✅ Профили пользователей

**Следующие шаги**:
1. Выбор технологического стека для бэкенда
2. Настройка базы данных (схема Prisma/TypeORM)
3. Реализация аутентификации и базовых CRUD операций
4. Интеграция файлового хранилища
5. Интеграция Kaspi Pay
6. Развертывание и тестирование

**Автор**: AI-ассистент Claude
**Дата**: 2024-03-15
**Версия**: 1.0
