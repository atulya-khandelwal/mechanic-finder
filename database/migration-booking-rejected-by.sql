-- Remember which mechanic rejected an open pool request so it appears in their "My jobs" list.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rejected_by_mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_rejected_by_mechanic ON bookings (rejected_by_mechanic_id) WHERE rejected_by_mechanic_id IS NOT NULL;
