-- Добавление полей status и recording_url в таблицу lessons

ALTER TABLE lessons
ADD COLUMN status VARCHAR(20) DEFAULT 'SCHEDULED',
ADD COLUMN recording_url TEXT;

-- Комментарии
COMMENT ON COLUMN lessons.status IS 'Статус урока: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED';
COMMENT ON COLUMN lessons.recording_url IS 'URL записи урока (например, Zoom recording)';
