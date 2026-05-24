-- Создание enum типа для статуса урока
CREATE TYPE lesson_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- Таблица уроков
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 120,
    location VARCHAR(255),
    online_meeting_url TEXT,
    recording_url TEXT,
    status lesson_status NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_duration CHECK (duration_minutes > 0)
);

-- Индексы
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_scheduled_at ON lessons(scheduled_at);
CREATE INDEX idx_lessons_status ON lessons(status);

-- Комментарии
COMMENT ON TABLE lessons IS 'Занятия (уроки)';
COMMENT ON COLUMN lessons.duration_minutes IS 'Длительность занятия в минутах';
COMMENT ON COLUMN lessons.status IS 'Статус урока: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED';
COMMENT ON COLUMN lessons.recording_url IS 'URL записи урока (например, Zoom recording)';
