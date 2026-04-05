import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  /** Recycle clients before Neon / pooler idle cuts them off (avoids stale sockets). */
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000,
  /** Reduce idle TCP drops through NATs / load balancers. */
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('Postgres pool client error (idle connection dropped or network issue):', err.message);
});

export const query = (text, params) => pool.query(text, params);
