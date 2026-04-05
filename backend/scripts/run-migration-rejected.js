/**
 * Applies database/migration-booking-rejected.sql using DATABASE_URL from backend/.env
 *
 * Usage: from backend/ → npm run db:migrate-rejected
 *
 * Safe to run twice: ignores duplicate enum label errors.
 * Must use the same DATABASE_URL as `node index.js` (check with npm run db:verify-booking-enum).
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../db.js';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '../../database/migration-booking-rejected.sql');

function maskUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '(invalid DATABASE_URL)';
  }
}

function isDuplicateEnum(err) {
  if (!err) return false;
  const msg = String(err.message || '');
  const code = err.code;
  if (code === '42710' || code === '23505') return true;
  if (/enum label .* already exists/i.test(msg)) return true;
  if (/already exists|duplicate/i.test(msg)) return true;
  return false;
}

async function main() {
  console.log('Using DATABASE_URL:', maskUrl(config.databaseUrl));

  const sql = readFileSync(sqlPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('Applied: database/migration-booking-rejected.sql');
  } catch (e) {
    if (isDuplicateEnum(e)) {
      console.log('Enum value rejected already exists — nothing to do.');
    } else {
      throw e;
    }
  }

  const verify = await pool.query(`
    SELECT 1 AS ok
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'booking_status' AND n.nspname = 'public' AND e.enumlabel = 'rejected'
  `);
  if (verify.rows.length === 0) {
    console.error('Migration ran but rejected is still missing from pg_enum. Check permissions and database name.');
    process.exit(1);
  }
  console.log('Verified: booking_status includes rejected.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
