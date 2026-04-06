-- Magic-link password reset tokens (SHA-256 hash of secret only; never store raw token)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
