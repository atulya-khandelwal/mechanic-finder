import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });
const schemaPath = join(__dirname, '../../database/schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mobile_mechanic' });

async function init() {
  try {
    await pool.query(schema);
    console.log('Database schema created successfully');
  } catch (err) {
    console.error('Failed to init database:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();
