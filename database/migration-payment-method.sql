-- How the customer intends to pay: cash (COD) vs Razorpay online
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cod';

UPDATE bookings SET payment_method = 'cod' WHERE payment_method IS NULL;

COMMENT ON COLUMN bookings.payment_method IS 'cod | online';
