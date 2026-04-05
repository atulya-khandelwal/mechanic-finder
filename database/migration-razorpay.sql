-- Razorpay payment tracking for bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);

UPDATE bookings SET payment_status = 'unpaid' WHERE payment_status IS NULL;

COMMENT ON COLUMN bookings.payment_status IS 'unpaid | paid | failed';
