-- Добавить поле due_day в таблицу payment_rules (день месяца для оплаты, 1-31)
ALTER TABLE payment_rules ADD COLUMN due_day INTEGER NOT NULL DEFAULT 10;

COMMENT ON COLUMN payment_rules.due_day IS 'День месяца, до которого необходимо внести оплату (1-31)';
