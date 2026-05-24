-- Обновление структуры таблицы materials для соответствия новой модели

-- Переименовать title в name
ALTER TABLE materials RENAME COLUMN title TO name;

-- Удалить description (не используется)
ALTER TABLE materials DROP COLUMN IF EXISTS description;

-- Переименовать file_size_bytes в file_size
ALTER TABLE materials RENAME COLUMN file_size_bytes TO file_size;

-- Сделать file_size обязательным
ALTER TABLE materials ALTER COLUMN file_size SET NOT NULL;

-- Добавить minio_object_name
ALTER TABLE materials ADD COLUMN IF NOT EXISTS minio_object_name TEXT;

-- Заполнить minio_object_name значением из file_url для существующих записей
UPDATE materials SET minio_object_name = file_url WHERE minio_object_name IS NULL;

-- Сделать minio_object_name обязательным
ALTER TABLE materials ALTER COLUMN minio_object_name SET NOT NULL;

-- Обновить комментарии
COMMENT ON COLUMN materials.name IS 'Оригинальное имя файла';
COMMENT ON COLUMN materials.file_url IS 'Путь к файлу в MinIO';
COMMENT ON COLUMN materials.file_type IS 'Расширение файла (pdf, doc, docx)';
COMMENT ON COLUMN materials.file_size IS 'Размер файла в байтах';
COMMENT ON COLUMN materials.minio_object_name IS 'Полный путь объекта в MinIO';
