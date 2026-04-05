/**
 * Applies database/migration-push.sql using DATABASE_URL from backend/.env
 * (no need to export DATABASE_URL in your shell).
 *
 * Usage: from backend/ → npm run db:migrate-push
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '../../database/migration-push.sql');

async function main() {
  const sql = readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('Applied: database/migration-push.sql');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
