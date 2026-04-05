-- Profile image URL (served from /uploads/...)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT;
