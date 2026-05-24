-- Обновление таблицы courses для соответствия Course Entity

-- Переименовываем title в name
ALTER TABLE courses RENAME COLUMN title TO name;

-- Удаляем поле is_active (не используется в Entity)
ALTER TABLE courses DROP COLUMN IF EXISTS is_active;

-- Удаляем индекс is_active
DROP INDEX IF EXISTS idx_courses_is_active;

-- Делаем end_date nullable (в Entity он может быть null)
ALTER TABLE courses ALTER COLUMN end_date DROP NOT NULL;

-- Добавляем новые поля
ALTER TABLE courses
ADD COLUMN total_lessons INTEGER,
ADD COLUMN enrolled_students INTEGER DEFAULT 0;

-- Комментарии
COMMENT ON COLUMN courses.name IS 'Название курса';
COMMENT ON COLUMN courses.total_lessons IS 'Запланированное количество уроков';
COMMENT ON COLUMN courses.enrolled_students IS 'Количество зачисленных студентов';
