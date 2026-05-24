CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_student_course UNIQUE (user_id, course_id)
);

-- Индексы
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_course_id ON students(course_id);

COMMENT ON TABLE students IS 'Зачисление студентов на курсы';
COMMENT ON CONSTRAINT unique_student_course ON students IS 'Студент не может быть зачислен дважды на один курс';
