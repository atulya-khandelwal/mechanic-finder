import express from 'express';
import { query } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/location', authenticate, requireRole('user'), async (req, res) => {
  try {
    const { latitude, longitude, address, isDefault } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude required' });
    }

    if (isDefault) {
      await query('UPDATE user_locations SET is_default = false WHERE user_id = $1', [req.user.id]);
    }

    const r = await query(
      `INSERT INTO user_locations (user_id, latitude, longitude, address, is_default)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, parseFloat(latitude), parseFloat(longitude), address || null, !!isDefault]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

router.get('/location', authenticate, requireRole('user'), async (req, res) => {
  try {
    const r = await query(
      'SELECT * FROM user_locations WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

export default router;
