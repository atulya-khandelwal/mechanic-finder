-- Add 'rejected' to booking_status (mechanic declines an open pool request).
-- Run via: npm run db:migrate-rejected (from backend/, same DATABASE_URL as the API).
-- Use `public` so it works even if search_path differs.
-- (PG 15+ can use ADD VALUE IF NOT EXISTS; we use plain ADD VALUE in the runner with duplicate handling for older PG.)
ALTER TYPE public.booking_status ADD VALUE 'rejected';
