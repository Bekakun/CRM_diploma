-- Добавление полей метрик успеваемости в таблицу students

ALTER TABLE students
ADD COLUMN average_grade DOUBLE PRECISION,
ADD COLUMN attendance_rate DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN homework_completion_rate DOUBLE PRECISION DEFAULT 0.0;

-- Комментарии
COMMENT ON COLUMN students.average_grade IS 'Средний балл студента по курсу';
COMMENT ON COLUMN students.attendance_rate IS 'Процент посещаемости (0.0 - 100.0)';
COMMENT ON COLUMN students.homework_completion_rate IS 'Процент выполнения домашних заданий (0.0 - 100.0)';
