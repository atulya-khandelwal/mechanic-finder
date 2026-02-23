import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const migration = `
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;
UPDATE users u SET phone = NULL FROM (SELECT phone, (array_agg(id ORDER BY created_at))[1] AS keep_id FROM users WHERE phone IS NOT NULL GROUP BY phone HAVING COUNT(*) > 1) dups WHERE u.phone = dups.phone AND u.id != dups.keep_id;
ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2) DEFAULT 50.00;
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
UPDATE service_categories SET base_price = 75 WHERE type = 'emergency' AND name LIKE '%Breakdown%';
UPDATE service_categories SET base_price = 50 WHERE type = 'emergency' AND name LIKE '%Flat Tire%';
UPDATE service_categories SET base_price = 40 WHERE type = 'emergency' AND name LIKE '%Battery%';
UPDATE service_categories SET base_price = 60 WHERE type = 'scheduled' AND name LIKE '%Oil%';
UPDATE service_categories SET base_price = 80 WHERE type = 'scheduled' AND name LIKE '%Brake%';
UPDATE service_categories SET base_price = 45 WHERE type = 'scheduled' AND name LIKE '%Cleaning%';
UPDATE service_categories SET base_price = 70 WHERE type = 'scheduled' AND name LIKE '%AC%';
UPDATE service_categories SET base_price = 50 WHERE base_price IS NULL;
`;

async function run() {
  try {
    const statements = migration.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) await pool.query(stmt);
    }
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
