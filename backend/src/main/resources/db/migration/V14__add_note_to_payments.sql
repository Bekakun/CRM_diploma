ALTER TABLE payments ADD COLUMN IF NOT EXISTS note TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_course_status ON payments(course_id, status);
