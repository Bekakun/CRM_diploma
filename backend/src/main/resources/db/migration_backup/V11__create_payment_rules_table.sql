CREATE TYPE payment_frequency AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY');

CREATE TABLE payment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'KZT',
    frequency payment_frequency NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_rule_amount CHECK (amount > 0)
);

-- Индексы
CREATE INDEX idx_payment_rules_course_id ON payment_rules(course_id);
CREATE INDEX idx_payment_rules_is_active ON payment_rules(is_active);

COMMENT ON TABLE payment_rules IS 'Правила автоматической генерации платежей';
COMMENT ON COLUMN payment_rules.frequency IS 'Периодичность: ONE_TIME, MONTHLY, QUARTERLY';
