-- Таблица курсов
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    total_lessons INTEGER,
    enrolled_students INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_course_dates CHECK (end_date IS NULL OR start_date <= end_date)
);

-- Индексы
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX idx_courses_start_date ON courses(start_date);

-- Комментарии
COMMENT ON TABLE courses IS 'Курсы (потоки обучения)';
COMMENT ON COLUMN courses.name IS 'Название курса';
COMMENT ON COLUMN courses.total_lessons IS 'Запланированное количество уроков';
COMMENT ON COLUMN courses.enrolled_students IS 'Количество зачисленных студентов';
