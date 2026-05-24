CREATE TABLE homework_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_url TEXT NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    grade INTEGER,
    feedback TEXT,
    graded_at TIMESTAMP,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT check_grade CHECK (grade IS NULL OR (grade >= 0 AND grade <= 100)),
    CONSTRAINT unique_homework_student UNIQUE (homework_id, student_id)
);

-- Индексы
CREATE INDEX idx_homework_submissions_homework_id ON homework_submissions(homework_id);
CREATE INDEX idx_homework_submissions_student_id ON homework_submissions(student_id);
CREATE INDEX idx_homework_submissions_graded_by ON homework_submissions(graded_by);
CREATE INDEX idx_homework_submissions_is_late ON homework_submissions(is_late);

COMMENT ON TABLE homework_submissions IS 'Отправленные решения домашних заданий';
COMMENT ON COLUMN homework_submissions.github_url IS 'URL репозитория на GitHub';
COMMENT ON COLUMN homework_submissions.is_late IS 'Флаг просроченной отправки';
