-- Миграция для поддержки шифрования персональных данных (AES-256-GCM)
-- Зашифрованные значения хранятся в base64 и длиннее оригинала,
-- поэтому колонки переводятся в TEXT. Добавляются хеш-колонки для поиска.

-- ===================== ТАБЛИЦА users =====================

-- Расширяем колонки под зашифрованный текст
ALTER TABLE users ALTER COLUMN email TYPE TEXT;
ALTER TABLE users ALTER COLUMN first_name TYPE TEXT;
ALTER TABLE users ALTER COLUMN last_name TYPE TEXT;
ALTER TABLE users ALTER COLUMN phone TYPE TEXT;
ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT;

-- Убираем старый UNIQUE на email (уникальность теперь через email_hash)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
DROP INDEX IF EXISTS idx_users_email;

-- Добавляем колонку для детерминированного хеша (HMAC-SHA256, Base64, 44 символа)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);

-- Заполняем email_hash для существующих строк временным значением
-- (настоящий хеш будет проставлен утилитой миграции данных)
UPDATE users SET email_hash = encode(sha256(lower(trim(email))::bytea), 'base64') WHERE email_hash IS NULL;

ALTER TABLE users ALTER COLUMN email_hash SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);

-- ===================== ТАБЛИЦА invitations =====================

ALTER TABLE invitations ALTER COLUMN email TYPE TEXT;
DROP INDEX IF EXISTS idx_invitations_email;

ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);
UPDATE invitations SET email_hash = encode(sha256(lower(trim(email))::bytea), 'base64') WHERE email_hash IS NULL;
ALTER TABLE invitations ALTER COLUMN email_hash SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_email_hash ON invitations(email_hash);

-- ===================== ТАБЛИЦА payments =====================

ALTER TABLE payments ALTER COLUMN transaction_id TYPE TEXT;
ALTER TABLE payments ALTER COLUMN payment_method TYPE TEXT;
-- note уже TEXT, ничего не меняем

-- ===================== ТАБЛИЦА chat_messages =====================
-- content уже TEXT, ничего не меняем структурно

COMMENT ON COLUMN users.email IS 'Email зашифрован AES-256-GCM';
COMMENT ON COLUMN users.email_hash IS 'HMAC-SHA256 хеш email для поиска';
COMMENT ON COLUMN users.first_name IS 'Имя зашифровано AES-256-GCM';
COMMENT ON COLUMN users.last_name IS 'Фамилия зашифрована AES-256-GCM';
COMMENT ON COLUMN users.phone IS 'Телефон зашифрован AES-256-GCM';
COMMENT ON COLUMN invitations.email IS 'Email приглашения зашифрован AES-256-GCM';
COMMENT ON COLUMN invitations.email_hash IS 'HMAC-SHA256 хеш email приглашения';
COMMENT ON COLUMN payments.transaction_id IS 'ID транзакции зашифрован AES-256-GCM';
COMMENT ON COLUMN payments.payment_method IS 'Метод оплаты зашифрован AES-256-GCM';
COMMENT ON COLUMN chat_messages.content IS 'Содержимое сообщения зашифровано AES-256-GCM';
