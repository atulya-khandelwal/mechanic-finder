import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import { normalizeToE164 } from '../services/phone.util.js';
import {
  requestSignupOtp,
  resendSignupOtp,
  verifySignupOtp,
} from '../services/signup-otp.service.js';
import { isAllowedStoredImageUrl } from '../services/image-url.util.js';
import {
  usersHasProfilePhotoColumn,
  usersSelectColumnsForAuth,
  usersSelectColumnsForMe,
} from '../services/users-schema.util.js';
import {
  requestPasswordReset,
  completePasswordReset,
} from '../services/password-reset.service.js';

const router = express.Router();

/** Step 1: store pending signup + send OTP via email (Resend) */
router.post('/register/start', async (req, res) => {
  try {
    const { email, password, fullName, phone, role = 'user' } = req.body;
    await requestSignupOtp({ email, password, fullName, phone, role });
    res.status(200).json({
      message: 'Verification codes sent to your email and phone (SMS).',
      email: String(email).trim().toLowerCase(),
    });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    const body = { error: err.message || 'Failed to send verification code' };
    if (err.retryAfterSeconds != null) body.retryAfterSeconds = err.retryAfterSeconds;
    return res.status(status).json(body);
  }
});

/** Resend OTP (same cooldown as /register/start) */
router.post('/register/resend', async (req, res) => {
  try {
    const { email } = req.body;
    await resendSignupOtp(email);
    res.status(200).json({ message: 'A new verification code has been sent.' });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    const body = { error: err.message || 'Failed to resend code' };
    if (err.retryAfterSeconds != null) body.retryAfterSeconds = err.retryAfterSeconds;
    return res.status(status).json(body);
  }
});

/** Step 2: verify OTP and create account */
router.post('/register/verify', async (req, res) => {
  try {
    const { email, code, phoneCode } = req.body;
    const user = await verifySignupOtp(email, code, phoneCode);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    res.status(201).json({ user, token });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    return res.status(status).json({ error: err.message || 'Verification failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const rawLogin = req.body.login ?? req.body.email;
    if (!rawLogin || !password) {
      return res.status(400).json({ error: 'Email or phone and password are required' });
    }

    const trimmed = String(rawLogin).trim();
    let result;

    const userCols = await usersSelectColumnsForAuth();
    if (trimmed.includes('@')) {
      result = await query(`SELECT ${userCols} FROM users WHERE email = $1`, [trimmed.toLowerCase()]);
    } else {
      let e164;
      try {
        e164 = normalizeToE164(trimmed, config.defaultPhoneRegion);
      } catch (e) {
        return res.status(400).json({
          error: e.message || 'Invalid phone number. Include country code (e.g. +91 98765 43210).',
        });
      }
      result = await query(`SELECT ${userCols} FROM users WHERE phone = $1`, [e164]);
    }

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/** Request password reset — sends magic link to email (same response whether or not user exists) */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const out = await requestPasswordReset(email);
    res.status(200).json(out);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message || 'Failed to send reset email' });
  }
});

/** Complete password reset from magic link token; returns JWT like login */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await completePasswordReset({ token, newPassword });
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    res.json({ user, token: jwtToken, message: 'Password updated' });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message || 'Password reset failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const cols = await usersSelectColumnsForMe();
    const r = await query(`SELECT ${cols} FROM users WHERE id = $1`, [req.user.id]);
    const user = r.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'mechanic') {
      const m = await query('SELECT * FROM mechanics WHERE user_id = $1', [req.user.id]);
      user.mechanicProfile = m.rows[0] || null;
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/** Update name and phone (email is sign-in identity — change not supported here) */
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const hasProfilePhotoCol = await usersHasProfilePhotoColumn();
    const { fullName, phone } = req.body;
    const profilePhoto = req.body.profilePhoto ?? req.body.profile_photo;
    const updates = [];
    const vals = [];
    let i = 1;

    if (fullName !== undefined) {
      const t = String(fullName).trim();
      if (!t) return res.status(400).json({ error: 'Full name cannot be empty' });
      updates.push(`full_name = $${i++}`);
      vals.push(t);
    }
    if (phone !== undefined) {
      const t = phone ? String(phone).trim() : '';
      if (!t) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      let normalizedPhone;
      try {
        normalizedPhone = normalizeToE164(t, config.defaultPhoneRegion);
      } catch (e) {
        return res.status(400).json({ error: e.message || 'Invalid phone number' });
      }
      const dup = await query('SELECT id FROM users WHERE phone = $1 AND id != $2', [
        normalizedPhone,
        req.user.id,
      ]);
      if (dup.rows.length) {
        return res.status(400).json({ error: 'Phone number already in use' });
      }
      updates.push(`phone = $${i++}`);
      vals.push(normalizedPhone);
    }

    if (profilePhoto !== undefined && hasProfilePhotoCol) {
      const cleared = profilePhoto === null || profilePhoto === '';
      const raw = cleared ? null : String(profilePhoto).trim();
      if (raw !== null && !isAllowedStoredImageUrl(raw)) {
        return res.status(400).json({
          error: 'Profile photo must be a Cloudinary image URL (https://res.cloudinary.com/...)',
        });
      }
      updates.push(`profile_photo = $${i++}`);
      vals.push(raw);
    }

    if (updates.length === 0) {
      if (profilePhoto !== undefined && !hasProfilePhotoCol) {
        return res.status(400).json({
          error:
            'Profile photo requires a one-time database update. From the backend folder run: npm run db:migrate-profile-photo',
        });
      }
      return res.status(400).json({ error: 'Nothing to update' });
    }

    vals.push(req.user.id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`, vals);

    const outCols = await usersSelectColumnsForMe();
    const r = await query(`SELECT ${outCols} FROM users WHERE id = $1`, [req.user.id]);
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.patch('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const found = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const row = found.rows[0];
    if (!row || !(await bcrypt.compare(currentPassword, row.password_hash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(String(newPassword), 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
