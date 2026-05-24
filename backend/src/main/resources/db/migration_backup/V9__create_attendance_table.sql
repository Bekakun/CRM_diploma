CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status attendance_status NOT NULL,
    notes TEXT,
    marked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT unique_lesson_student_attendance UNIQUE (lesson_id, student_id)
);

-- Индексы
CREATE INDEX idx_attendance_lesson_id ON attendance(lesson_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_status ON attendance(status);

COMMENT ON TABLE attendance IS 'Посещаемость занятий';
COMMENT ON COLUMN attendance.status IS 'Статус: PRESENT, ABSENT, LATE, EXCUSED';
