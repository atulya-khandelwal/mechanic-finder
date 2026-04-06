import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, pool } from '../db.js';
import { config } from '../config.js';
import { sendSignupOtpEmail } from './email.service.js';
import { normalizeToE164 } from './phone.util.js';
import { sendVerificationSms, checkVerificationCode } from './twilio-verify.service.js';
import { usersHasProfilePhotoColumn } from './users-schema.util.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function generateOtp() {
  const len = Math.min(8, Math.max(4, config.otpLength));
  return String(crypto.randomInt(0, 10 ** len)).padStart(len, '0');
}

async function hashOtp(plain) {
  return bcrypt.hash(plain, 10);
}

export async function compareOtp(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function secondsUntilResendAllowed(createdAt) {
  const created = new Date(createdAt).getTime();
  const elapsed = (Date.now() - created) / 1000;
  const wait = config.otpResendCooldownSeconds - elapsed;
  return wait > 0 ? Math.ceil(wait) : 0;
}

/**
 * Starts signup: stores a pending record, sends email OTP, then SMS via Twilio Verify.
 */
export async function requestSignupOtp({ email, password, fullName, phone, role }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !password || !fullName) {
    const err = new Error('Email, password, and full name are required');
    err.status = 400;
    throw err;
  }
  if (password.length < 6) {
    const err = new Error('Password must be at least 6 characters');
    err.status = 400;
    throw err;
  }

  let normalizedPhone;
  try {
    normalizedPhone = normalizeToE164(phone, config.defaultPhoneRegion);
  } catch (e) {
    const err = new Error(e.message || 'Invalid phone number');
    err.status = e.status || 400;
    throw err;
  }

  const safeRole = role === 'mechanic' ? 'mechanic' : 'user';

  const existing = await query('SELECT id FROM users WHERE email = $1', [normalized]);
  if (existing.rows.length) {
    const err = new Error('Email already registered');
    err.status = 400;
    throw err;
  }

  const phoneCheck = await query('SELECT id FROM users WHERE phone = $1', [normalizedPhone]);
  if (phoneCheck.rows.length) {
    const err = new Error('Phone number already registered');
    err.status = 400;
    throw err;
  }

  const pending = await query(
    'SELECT created_at FROM signup_verifications WHERE email = $1',
    [normalized]
  );
  if (pending.rows.length) {
    const retry = secondsUntilResendAllowed(pending.rows[0].created_at);
    if (retry > 0) {
      const err = new Error(`Please wait ${retry} seconds before requesting another code`);
      err.status = 429;
      err.retryAfterSeconds = retry;
      throw err;
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + config.otpTtlMinutes * 60 * 1000);

  await query(
    `INSERT INTO signup_verifications (email, password_hash, full_name, phone, role, otp_hash, expires_at, attempts)
     VALUES ($1, $2, $3, $4, $5::user_role, $6, $7, 0)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       phone = EXCLUDED.phone,
       role = EXCLUDED.role,
       otp_hash = EXCLUDED.otp_hash,
       expires_at = EXCLUDED.expires_at,
       attempts = 0,
       created_at = CURRENT_TIMESTAMP`,
    [normalized, passwordHash, fullName.trim(), normalizedPhone, safeRole, otpHash, expiresAt]
  );

  const devLogOtp = process.env.NODE_ENV !== 'production' && !config.resendApiKey;
  try {
    if (devLogOtp) {
      console.info(`[signup] Email OTP for ${normalized} (dev only, no RESEND_API_KEY): ${otp}`);
    } else {
      await sendSignupOtpEmail({ to: normalized, code: otp, fullName: fullName.trim() });
    }
  } catch (e) {
    await query('DELETE FROM signup_verifications WHERE email = $1', [normalized]);
    throw e;
  }

  try {
    await sendVerificationSms(normalizedPhone);
  } catch (e) {
    await query('DELETE FROM signup_verifications WHERE email = $1', [normalized]);
    throw e;
  }

  return { email: normalized, expiresAt };
}

/**
 * Resends email + SMS codes for an existing pending signup (same cooldown rules as start).
 */
export async function resendSignupOtp(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }

  const row = await query(
    `SELECT email, full_name, password_hash, phone, role, created_at
     FROM signup_verifications WHERE email = $1`,
    [normalized]
  );
  if (!row.rows.length) {
    const err = new Error('No pending signup for this email. Start registration again.');
    err.status = 400;
    throw err;
  }

  const retry = secondsUntilResendAllowed(row.rows[0].created_at);
  if (retry > 0) {
    const err = new Error(`Please wait ${retry} seconds before requesting another code`);
    err.status = 429;
    err.retryAfterSeconds = retry;
    throw err;
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + config.otpTtlMinutes * 60 * 1000);

  await query(
    `UPDATE signup_verifications
     SET otp_hash = $2, expires_at = $3, attempts = 0, created_at = CURRENT_TIMESTAMP
     WHERE email = $1`,
    [normalized, otpHash, expiresAt]
  );

  const devLogOtp = process.env.NODE_ENV !== 'production' && !config.resendApiKey;
  try {
    if (devLogOtp) {
      console.info(`[signup] Email OTP resent for ${normalized} (dev only, no RESEND_API_KEY): ${otp}`);
    } else {
      await sendSignupOtpEmail({ to: normalized, code: otp, fullName: row.rows[0].full_name });
    }
  } catch (e) {
    throw e;
  }

  if (row.rows[0].phone) {
    try {
      await sendVerificationSms(row.rows[0].phone);
    } catch (e) {
      throw e;
    }
  }

  return { email: normalized, expiresAt };
}

/**
 * Verifies email OTP + SMS code, then creates the user row.
 */
export async function verifySignupOtp(email, emailCode, phoneCode) {
  const normalized = normalizeEmail(email);
  const rawEmailCode = String(emailCode || '').trim();
  const rawPhoneCode = String(phoneCode || '').trim();

  if (!normalized || !rawEmailCode) {
    const err = new Error('Email and email verification code are required');
    err.status = 400;
    throw err;
  }
  if (!rawPhoneCode) {
    const err = new Error('SMS verification code is required');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  let transactionEnded = false;
  try {
    await client.query('BEGIN');
    const pending = await client.query(
      `SELECT email, password_hash, full_name, phone, role, otp_hash, expires_at, attempts
       FROM signup_verifications WHERE email = $1 FOR UPDATE`,
      [normalized]
    );
    if (!pending.rows.length) {
      await client.query('ROLLBACK');
      transactionEnded = true;
      const err = new Error('No pending signup for this email. Start registration again.');
      err.status = 400;
      throw err;
    }

    const p = pending.rows[0];
    if (!p.phone) {
      await client.query('ROLLBACK');
      transactionEnded = true;
      const err = new Error('No phone on file for this signup. Start registration again.');
      err.status = 400;
      throw err;
    }

    if (new Date(p.expires_at) < new Date()) {
      await client.query('DELETE FROM signup_verifications WHERE email = $1', [normalized]);
      await client.query('COMMIT');
      transactionEnded = true;
      const err = new Error('Verification code expired. Request a new code.');
      err.status = 400;
      throw err;
    }

    if (p.attempts >= config.otpMaxAttempts) {
      await client.query('DELETE FROM signup_verifications WHERE email = $1', [normalized]);
      await client.query('COMMIT');
      transactionEnded = true;
      const err = new Error('Too many incorrect email code attempts. Start registration again.');
      err.status = 400;
      throw err;
    }

    const emailOk = await compareOtp(rawEmailCode, p.otp_hash);
    if (!emailOk) {
      await client.query(
        'UPDATE signup_verifications SET attempts = attempts + 1 WHERE email = $1',
        [normalized]
      );
      await client.query('COMMIT');
      transactionEnded = true;
      const err = new Error('Invalid email verification code');
      err.status = 401;
      throw err;
    }

    let phoneOk;
    try {
      phoneOk = await checkVerificationCode(p.phone, rawPhoneCode);
    } catch (twilioErr) {
      await client.query('ROLLBACK');
      transactionEnded = true;
      throw twilioErr;
    }

    if (!phoneOk) {
      await client.query('ROLLBACK');
      transactionEnded = true;
      const err = new Error('Invalid SMS verification code');
      err.status = 401;
      throw err;
    }

    let userResult;
    try {
      const hasProfilePhoto = await usersHasProfilePhotoColumn();
      const returningCols = hasProfilePhoto
        ? 'id, email, full_name, phone, profile_photo, role, created_at'
        : 'id, email, full_name, phone, role, created_at';
      userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role)
         VALUES ($1, $2, $3, $4, $5::user_role)
         RETURNING ${returningCols}`,
        [p.email, p.password_hash, p.full_name, p.phone, p.role]
      );
    } catch (insertErr) {
      await client.query('ROLLBACK');
      transactionEnded = true;
      if (insertErr.code === '23505') {
        await query('DELETE FROM signup_verifications WHERE email = $1', [normalized]);
        const err = new Error('Email or phone already registered');
        err.status = 400;
        throw err;
      }
      throw insertErr;
    }

    await client.query('DELETE FROM signup_verifications WHERE email = $1', [normalized]);
    await client.query('COMMIT');
    transactionEnded = true;
    return userResult.rows[0];
  } catch (e) {
    if (!transactionEnded) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
    }
    throw e;
  } finally {
    client.release();
  }
}
