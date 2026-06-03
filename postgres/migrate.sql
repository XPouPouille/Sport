-- Migration: decimals + goal_type + password reset tokens + phone/telegram
-- Run only if upgrading an existing installation

ALTER TABLE goals
    ALTER COLUMN target TYPE NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS goal_type VARCHAR(3) NOT NULL DEFAULT 'min'
        CHECK (goal_type IN ('min', 'max'));

ALTER TABLE logs
    ALTER COLUMN quantity TYPE NUMERIC(10,2);

ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_quantity_check;
ALTER TABLE logs ADD CONSTRAINT logs_quantity_check CHECK (quantity >= 0);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
