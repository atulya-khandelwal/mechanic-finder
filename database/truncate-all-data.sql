-- Wipe all application rows; keeps schema, types, indexes, and functions.
-- Prefer: `cd backend && npm run db:truncate-data` (skips tables that do not exist yet).
-- Manual psql: only if every table below exists, or remove missing names first.

TRUNCATE TABLE
  booking_messages,
  push_subscriptions,
  reviews,
  bookings,
  mechanic_services,
  user_locations,
  mechanics,
  signup_verifications,
  users,
  service_categories
RESTART IDENTITY CASCADE;
