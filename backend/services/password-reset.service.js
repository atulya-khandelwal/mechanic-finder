import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool, query } from '../db.js';
import { config } from '../config.js';
import { sendPasswordResetEmail } from './email.service.js';
import { usersSelectColumnsForAuth } from './users-schema.util.js';

const GENERIC_FORGOT_MESSAGE =
  'If an account exists for that email, you will receive a reset link shortly.';

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw).trim(), 'utf8').digest('hex');
}

function isValidEmailShape(s) {
  const t = String(s || '').trim();
  return t.includes('@') && t.length >= 5 && t.length <= 254;
}

/**
 * Creates a one-time token and emails a magic link (or logs in dev without Resend).
 * Always returns the same message to avoid email enumeration.
 */
export async function requestPasswordReset(email) {
  if (!isValidEmailShape(email)) {
    return { message: GENERIC_FORGOT_MESSAGE };
  }
  const normalized = String(email).trim().toLowerCase();

  const found = await query('SELECT id FROM users WHERE email = $1', [normalized]);
  if (!found.rows.length) {
    return { message: GENERIC_FORGOT_MESSAGE };
  }

  const userId = found.rows[0].id;
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + config.passwordResetTtlMinutes * 60 * 1000);

  await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  const resetUrl = `${config.publicAppUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

  if (!config.resendApiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[password-reset] Dev (no RESEND_API_KEY): ${resetUrl}`);
    } else {
      console.warn('[password-reset] RESEND_API_KEY not set; cannot send reset email');
    }
    return { message: GENERIC_FORGOT_MESSAGE };
  }

  try {
    await sendPasswordResetEmail({ to: normalized, resetUrl });
  } catch (e) {
    console.error('[password-reset] Failed to send email', e);
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    throw e;
  }

  return { message: GENERIC_FORGOT_MESSAGE };
}

/**
 * Validates token, sets new password, removes tokens for user. Returns user row (no password_hash).
 */
export async function completePasswordReset({ token, newPassword }) {
  if (!token || String(token).trim().length < 20) {
    const err = new Error('This reset link is invalid or has expired.');
    err.status = 400;
    throw err;
  }
  if (!newPassword || String(newPassword).length < 6) {
    const err = new Error('Password must be at least 6 characters.');
    err.status = 400;
    throw err;
  }

  const tokenHash = hashToken(token);
  const cols = await usersSelectColumnsForAuth();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const sel = await client.query(
      `SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token_hash = $1 FOR UPDATE`,
      [tokenHash]
    );
    if (!sel.rows.length) {
      await client.query('ROLLBACK');
      const err = new Error('This reset link is invalid or has expired.');
      err.status = 400;
      throw err;
    }
    const { user_id: userId, expires_at: expiresAt } = sel.rows[0];
    if (new Date(expiresAt) < new Date()) {
      await client.query('ROLLBACK');
      const err = new Error('This reset link has expired. Request a new one from the login page.');
      err.status = 400;
      throw err;
    }

    const hash = await bcrypt.hash(String(newPassword), 10);
    await client.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      hash,
      userId,
    ]);
    await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

    const userRes = await client.query(`SELECT ${cols} FROM users WHERE id = $1`, [userId]);
    await client.query('COMMIT');

    const user = userRes.rows[0];
    if (!user) {
      const err = new Error('User not found');
      err.status = 500;
      throw err;
    }
    delete user.password_hash;
    return user;
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}
