import express from 'express';
import bcrypt from 'bcryptjs';
import { query, pool } from '../db.js';
import { config } from '../config.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { normalizeToE164 } from '../services/phone.util.js';

const router = express.Router();

router.use(authenticate, requireRole('admin'));

// Users = app customers only (role 'user'), exclude admin and mechanic
router.get('/users', async (req, res) => {
  try {
    const r = await query(
      "SELECT id, email, full_name, phone, created_at FROM users WHERE role = 'user' ORDER BY created_at DESC"
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName || !phone || !String(phone).trim()) {
      return res.status(400).json({ error: 'Email, password, full name, and phone are required' });
    }
    let normalizedPhone;
    try {
      normalizedPhone = normalizeToE164(phone, config.defaultPhoneRegion);
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Invalid phone number' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const r = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING id, email, full_name, phone, role, created_at`,
      [email, hashed, fullName, normalizedPhone]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const c = String(err.constraint || '');
      const msg =
        c.includes('phone') || String(err.detail || '').includes('(phone)')
          ? 'Phone number already registered'
          : 'Email already registered';
      return res.status(400).json({ error: msg });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/mechanics', async (req, res) => {
  try {
    const r = await query(
      `SELECT m.*, u.email, u.full_name, u.phone
       FROM mechanics m
       JOIN users u ON m.user_id = u.id
       ORDER BY m.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get mechanics' });
  }
});

router.post('/mechanics', async (req, res) => {
  try {
    const { email, password, fullName, phone, latitude, longitude, address, specialization, hourlyRate } = req.body;
    if (!email || !password || !fullName || !phone || !String(phone).trim()) {
      return res.status(400).json({ error: 'Email, password, full name, and phone are required' });
    }
    let normalizedPhone;
    try {
      normalizedPhone = normalizeToE164(phone, config.defaultPhoneRegion);
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Invalid phone number' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role)
         VALUES ($1, $2, $3, $4, 'mechanic')
         RETURNING id`,
        [email, hashed, fullName, normalizedPhone]
      );
      const userId = userResult.rows[0].id;
      await client.query(
        `INSERT INTO mechanics (user_id, latitude, longitude, address, specialization, hourly_rate)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, latitude || null, longitude || null, address || null, specialization || null, hourlyRate ? parseFloat(hourlyRate) : null]
      );
      const m = await client.query(
        `SELECT m.*, u.email, u.full_name, u.phone FROM mechanics m JOIN users u ON m.user_id = u.id WHERE m.user_id = $1`,
        [userId]
      );
      res.status(201).json(m.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23505') {
      const c = String(err.constraint || '');
      const msg =
        c.includes('phone') || String(err.detail || '').includes('(phone)')
          ? 'Phone number already registered'
          : 'Email already registered';
      return res.status(400).json({ error: msg });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create mechanic' });
  }
});

router.get('/bookings', async (req, res) => {
  try {
    const r = await query(
      `SELECT b.*, sc.name as category_name, sc.type as category_type,
              u1.full_name as user_name, u1.email as user_email,
              u2.full_name as mechanic_name
       FROM bookings b
       JOIN service_categories sc ON b.category_id = sc.id
       JOIN users u1 ON b.user_id = u1.id
       LEFT JOIN mechanics m ON b.mechanic_id = m.id
       LEFT JOIN users u2 ON m.user_id = u2.id
       ORDER BY b.created_at DESC`
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [users, mechanics, bookings, pending] = await Promise.all([
      query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']),
      query('SELECT COUNT(*) FROM mechanics'),
      query('SELECT COUNT(*) FROM bookings'),
      query("SELECT COUNT(*) FROM bookings WHERE status = 'pending'"),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count, 10),
      totalMechanics: parseInt(mechanics.rows[0].count, 10),
      totalBookings: parseInt(bookings.rows[0].count, 10),
      pendingBookings: parseInt(pending.rows[0].count, 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
