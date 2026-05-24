CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 120,
    location VARCHAR(255),
    online_meeting_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_duration CHECK (duration_minutes > 0)
);

-- Индексы
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_scheduled_at ON lessons(scheduled_at);

COMMENT ON TABLE lessons IS 'Занятия (уроки)';
COMMENT ON COLUMN lessons.duration_minutes IS 'Длительность занятия в минутах';
