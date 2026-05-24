-- Таблица записи студентов на курсы
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    average_grade DOUBLE PRECISION,
    attendance_rate DOUBLE PRECISION DEFAULT 0.0,
    homework_completion_rate DOUBLE PRECISION DEFAULT 0.0,

    CONSTRAINT unique_student_course UNIQUE (user_id, course_id)
);

-- Индексы
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_course_id ON students(course_id);

-- Комментарии
COMMENT ON TABLE students IS 'Зачисление студентов на курсы';
COMMENT ON CONSTRAINT unique_student_course ON students IS 'Студент не может быть зачислен дважды на один курс';
COMMENT ON COLUMN students.average_grade IS 'Средний балл студента по курсу';
COMMENT ON COLUMN students.attendance_rate IS 'Процент посещаемости (0.0 - 100.0)';
COMMENT ON COLUMN students.homework_completion_rate IS 'Процент выполнения домашних заданий (0.0 - 100.0)';
