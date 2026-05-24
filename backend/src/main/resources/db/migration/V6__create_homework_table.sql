-- Таблица домашних заданий
CREATE TABLE homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    task_file_url TEXT,
    due_date TIMESTAMP NOT NULL,
    max_grade INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_max_grade CHECK (max_grade > 0 AND max_grade <= 100)
);

-- Индексы
CREATE INDEX idx_homework_lesson_id ON homework(lesson_id);
CREATE INDEX idx_homework_due_date ON homework(due_date);

-- Комментарии
COMMENT ON TABLE homework IS 'Домашние задания';
COMMENT ON COLUMN homework.task_file_url IS 'URL файла задания в MinIO';
