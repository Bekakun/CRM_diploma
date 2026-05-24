ALTER TABLE chat_messages
    ADD COLUMN file_url    TEXT,
    ADD COLUMN file_name   TEXT,
    ADD COLUMN file_type   VARCHAR(100),
    ADD COLUMN file_size   BIGINT;

ALTER TABLE chat_messages
    ALTER COLUMN content DROP NOT NULL;
