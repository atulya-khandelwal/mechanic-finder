import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const seedPath = join(__dirname, '../../database/seed.sql');
const seed = readFileSync(seedPath, 'utf-8');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mobile_mechanic' });

async function seedDb() {
  try {
    await pool.query(seed);
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role)
       VALUES ('admin@mobilemechanic.com', $1, 'Admin User', '+1234567890', 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [hash]
    );
    console.log('Seed data inserted successfully');
  } catch (err) {
    console.error('Failed to seed database:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDb();
