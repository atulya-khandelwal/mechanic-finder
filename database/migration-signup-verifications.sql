-- Pending email+SMS signup (OTP) — safe to run if table already exists
-- psql "$DATABASE_URL" -f database/migration-signup-verifications.sql

CREATE TABLE IF NOT EXISTS signup_verifications (
  email VARCHAR(255) PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  role user_role NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signup_verifications_expires ON signup_verifications (expires_at);
