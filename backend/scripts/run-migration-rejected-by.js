/**
 * Applies database/migration-booking-rejected-by.sql (rejected_by_mechanic_id column).
 * Usage: from backend/ → npm run db:migrate-rejected-by
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../db.js';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '../../database/migration-booking-rejected-by.sql');

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
  console.log('Using DATABASE_URL:', maskUrl(config.databaseUrl));
  const sql = readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('Applied: database/migration-booking-rejected-by.sql');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
