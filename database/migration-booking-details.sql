-- Migration: Add vehicle details, service location, and pricing to bookings
-- Run: psql -d your_database -f database/migration-booking-details.sql

-- Add base_price to service categories (price varies by service type)
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2) DEFAULT 50.00;

-- Add vehicle and booking detail columns to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_image TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_make VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_year INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS problem_description TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_location VARCHAR(20) DEFAULT 'home';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS base_charge DECIMAL(10, 2) DEFAULT 25.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS home_service_fee DECIMAL(10, 2) DEFAULT 15.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_price DECIMAL(10, 2);

-- Update existing service categories with base prices (can be adjusted)
UPDATE service_categories SET base_price = 75.00 WHERE type = 'emergency' AND name LIKE '%Breakdown%';
UPDATE service_categories SET base_price = 50.00 WHERE type = 'emergency' AND name LIKE '%Flat Tire%';
UPDATE service_categories SET base_price = 40.00 WHERE type = 'emergency' AND name LIKE '%Battery%';
UPDATE service_categories SET base_price = 60.00 WHERE type = 'scheduled' AND name LIKE '%Oil%';
UPDATE service_categories SET base_price = 80.00 WHERE type = 'scheduled' AND name LIKE '%Brake%';
UPDATE service_categories SET base_price = 45.00 WHERE type = 'scheduled' AND name LIKE '%Cleaning%';
UPDATE service_categories SET base_price = 70.00 WHERE type = 'scheduled' AND name LIKE '%AC%';
UPDATE service_categories SET base_price = 50.00 WHERE base_price IS NULL;
