-- Таблица материалов к урокам
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    minio_object_name TEXT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_materials_lesson_id ON materials(lesson_id);
CREATE INDEX idx_materials_uploaded_at ON materials(uploaded_at DESC);

-- Комментарии
COMMENT ON TABLE materials IS 'Материалы для занятий (PDF, DOCX файлы)';
COMMENT ON COLUMN materials.name IS 'Оригинальное имя файла';
COMMENT ON COLUMN materials.file_url IS 'Путь к файлу в MinIO';
COMMENT ON COLUMN materials.file_type IS 'Расширение файла (pdf, doc, docx)';
COMMENT ON COLUMN materials.file_size IS 'Размер файла в байтах';
COMMENT ON COLUMN materials.minio_object_name IS 'Полный путь объекта в MinIO';
