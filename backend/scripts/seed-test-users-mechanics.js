/**
 * Inserts deterministic test customers and mechanics for local/staging QA.
 *
 * Location: SKIT College, Jagatpura, Jaipur, Rajasthan (coordinates ~26.82°N, 75.85°E).
 * Passwords: customers → User@1234, mechanics → Mechanic@1234
 * Emails: user{START}@gmail.com … user{START+COUNT-1}@gmail.com (same for mechanic{N}).
 * Phones: unique +91 numbers in a batch-specific range (see script constants).
 *
 * Deletes **only** the user rows for the emails this run will insert (does not remove user1–user5
 * if you use a higher START index).
 *
 * Usage (from backend/):
 *   npm run db:seed-test-users-mechanics
 *
 * Requires DATABASE_URL in backend/.env (same as other db scripts).
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

/** First index in email (e.g. 6 → user6@gmail.com). Use 6+ if user1–user5 are already taken. */
const USER_START_INDEX = 6;
const MECHANIC_START_INDEX = 6;

const USER_COUNT = 5;
const MECHANIC_COUNT = 5;

/** SKIT (Swami Keshwanand Institute), Jagatpura — small offsets so mechanic pins aren’t identical */
const BASE_LAT = 26.823;
const BASE_LNG = 75.853;
const AREA_LABEL = 'SKIT College, Jagatpura, Jaipur, Rajasthan';

const CUSTOMER_PASSWORD = 'User@1234';
const MECHANIC_PASSWORD = 'Mechanic@1234';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mobile_mechanic',
});

/** 10-digit national part after +91 — batch 6–10 uses 980000060x / 980000070x to avoid clashing with older 980000010x seeds */
function phoneCustomer(index) {
  return `+91${9800000600 + index}`;
}

function phoneMechanic(index) {
  return `+91${9800000700 + index}`;
}

function rangeEmails(prefix, start, count) {
  return Array.from({ length: count }, (_, k) => `${prefix}${start + k}@gmail.com`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const emailsToRefresh = [
      ...rangeEmails('user', USER_START_INDEX, USER_COUNT),
      ...rangeEmails('mechanic', MECHANIC_START_INDEX, MECHANIC_COUNT),
    ];

    const del = await client.query(`DELETE FROM users WHERE email = ANY($1::text[])`, [emailsToRefresh]);
    if (del.rowCount > 0) {
      console.log(`Removed ${del.rowCount} prior row(s) for this email set (and cascaded data).`);
    }

    const userHash = await bcrypt.hash(CUSTOMER_PASSWORD, 10);
    const mechHash = await bcrypt.hash(MECHANIC_PASSWORD, 10);

    for (let k = 0; k < USER_COUNT; k++) {
      const i = USER_START_INDEX + k;
      const email = `user${i}@gmail.com`;
      const phone = phoneCustomer(i);
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role)
         VALUES ($1, $2, $3, $4, 'user')`,
        [email, userHash, `Test Customer ${i}`, phone]
      );
      console.log(`Customer: ${email} / ${phone} / ${CUSTOMER_PASSWORD}`);
    }

    for (let k = 0; k < MECHANIC_COUNT; k++) {
      const i = MECHANIC_START_INDEX + k;
      const email = `mechanic${i}@gmail.com`;
      const phone = phoneMechanic(i);
      const lat = (BASE_LAT + i * 0.0012).toFixed(8);
      const lng = (BASE_LNG + i * 0.0009).toFixed(8);
      const ur = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role)
         VALUES ($1, $2, $3, $4, 'mechanic')
         RETURNING id`,
        [email, mechHash, `Test Mechanic ${i}`, phone]
      );
      const userId = ur.rows[0].id;
      await client.query(
        `INSERT INTO mechanics (
           user_id, latitude, longitude, address, specialization, hourly_rate, is_available
         ) VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [
          userId,
          lat,
          lng,
          `${AREA_LABEL} (test ${i})`,
          i % 2 === 0 ? 'General repair & diagnostics' : 'Oil, brakes & battery',
          450 + i * 25,
        ]
      );
      console.log(`Mechanic: ${email} / ${phone} / ${MECHANIC_PASSWORD} @ (${lat}, ${lng})`);
    }

    await client.query('COMMIT');
    console.log(
      `\nDone: users user${USER_START_INDEX}–user${USER_START_INDEX + USER_COUNT - 1}, ` +
        `mechanics mechanic${MECHANIC_START_INDEX}–mechanic${MECHANIC_START_INDEX + MECHANIC_COUNT - 1}.`
    );
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
