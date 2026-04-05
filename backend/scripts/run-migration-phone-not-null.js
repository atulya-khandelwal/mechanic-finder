/**
 * Applies database/migration-phone-not-null.sql (DATABASE_URL from backend/.env).
 * Usage: from backend/ → npm run db:migrate-phone-not-null
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '../../database/migration-phone-not-null.sql');

async function main() {
  const sql = readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('Applied: database/migration-phone-not-null.sql');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
