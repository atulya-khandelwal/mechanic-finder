-- Phone is required and globally unique (same guarantees as email).
-- Run: psql "$DATABASE_URL" -f database/migration-phone-not-null.sql
-- Or: cd backend && npm run db:migrate-phone-not-null

-- 1) If duplicate non-null phones exist, keep the oldest account and clear the rest (same pattern as migration-booking-details)
UPDATE users u
SET phone = NULL
FROM (
  SELECT phone, (array_agg(id ORDER BY created_at))[1] AS keep_id
  FROM users
  WHERE phone IS NOT NULL AND trim(phone) <> ''
  GROUP BY phone
  HAVING COUNT(*) > 1
) dups
WHERE u.phone = dups.phone AND u.id <> dups.keep_id;

-- 2) Backfill any NULL/empty phone with a unique synthetic value (legacy rows; users should set a real number in the app)
UPDATE users
SET phone = '+1' || substr(md5(id::text), 1, 14)
WHERE phone IS NULL OR trim(phone) = '';

-- 3) Enforce NOT NULL + UNIQUE (UNIQUE may already exist from schema)
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4) signup_verifications (if present): require phone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'signup_verifications'
  ) THEN
    UPDATE signup_verifications
    SET phone = '+1' || substr(md5(email), 1, 14)
    WHERE phone IS NULL OR trim(phone) = '';
    ALTER TABLE signup_verifications ALTER COLUMN phone SET NOT NULL;
  END IF;
END $$;
