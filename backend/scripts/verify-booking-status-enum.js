/**
 * Prints how `bookings.status` is stored and which labels exist on `booking_status`.
 * Use this when reject fails with "missing rejected status" — confirms the API and migration use the same DB.
 *
 * Usage: from backend/ → npm run db:verify-booking-enum
 */
import { pool } from '../db.js';
import { config } from '../config.js';

function maskUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '(invalid DATABASE_URL)';
  }
}

async function main() {
  console.log('DATABASE_URL (masked):', maskUrl(config.databaseUrl));

  const col = await pool.query(`
    SELECT table_schema, udt_name::text AS enum_or_type, data_type
    FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'status'
  `);
  if (col.rows.length === 0) {
    console.error('No column bookings.status found. Wrong database or schema?');
    process.exit(1);
  }
  console.log('bookings.status column:', col.rows[0]);

  const udt = col.rows[0]?.enum_or_type ?? col.rows[0]?.udt_name;
  if (udt === 'booking_status' || col.rows[0]?.data_type === 'USER-DEFINED') {
    const labels = await pool.query(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'booking_status' AND n.nspname = 'public'
      ORDER BY e.enumsortorder
    `);
    console.log('booking_status enum labels:', labels.rows.map((r) => r.enumlabel).join(', '));
    const has = labels.rows.some((r) => r.enumlabel === 'rejected');
    console.log(has ? 'OK: rejected is present.' : 'MISSING: run npm run db:migrate-rejected against this database.');
    process.exit(has ? 0 : 1);
  }

  console.log('Column is not PostgreSQL enum booking_status — migration ALTER TYPE does not apply. Check your schema.');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => pool.end());
