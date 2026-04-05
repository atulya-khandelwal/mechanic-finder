import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

/** Order not critical when all are truncated in one CASCADE; list matches schema + migrations. */
const WANTED_TABLES = [
  'booking_messages',
  'push_subscriptions',
  'reviews',
  'bookings',
  'mechanic_services',
  'user_locations',
  'mechanics',
  'signup_verifications',
  'users',
  'service_categories',
];

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mobile_mechanic',
});

async function run() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [WANTED_TABLES]
    );
    const existing = new Set(rows.map((r) => r.tablename));
    const toTruncate = WANTED_TABLES.filter((t) => existing.has(t));

    if (toTruncate.length === 0) {
      console.log('No known tables found in public schema. Run db:init and migrations first.');
      return;
    }

    const missing = WANTED_TABLES.filter((t) => !existing.has(t));
    if (missing.length) {
      console.warn('Skipping missing tables (run migrations if you need them):', missing.join(', '));
    }

    await client.query('BEGIN');
    const list = toTruncate.map(quoteIdent).join(', ');
    await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    await client.query('COMMIT');
    console.log('Truncated:', toTruncate.join(', '));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Truncate failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
