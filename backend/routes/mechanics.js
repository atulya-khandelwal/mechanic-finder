import express from 'express';
import { query } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

/** Earnings & job counts for the logged-in mechanic (must be before /:id) */
router.get('/analytics', authenticate, requireRole('mechanic'), async (req, res) => {
  try {
    const m = await query('SELECT id, rating, total_reviews FROM mechanics WHERE user_id = $1', [req.user.id]);
    const mechanic = m.rows[0];
    if (!mechanic) {
      return res.json({
        totalEarnings: 0,
        todayEarnings: 0,
        monthEarnings: 0,
        jobsCompleted: 0,
        jobsCompletedThisMonth: 0,
        pendingJobs: 0,
        activeJobs: 0,
        averageRating: null,
        totalReviews: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    }

    const mid = mechanic.id;
    const earnings = await query(
      `SELECT
        COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0)::float AS total_lifetime,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'completed' AND updated_at::date = CURRENT_DATE), 0)::float AS total_today,
        COALESCE(SUM(total_price) FILTER (WHERE status = 'completed' AND date_trunc('month', updated_at) = date_trunc('month', CURRENT_TIMESTAMP)), 0)::float AS total_month,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS jobs_completed,
        COUNT(*) FILTER (WHERE status = 'completed' AND date_trunc('month', updated_at) = date_trunc('month', CURRENT_TIMESTAMP))::int AS jobs_month,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status IN ('accepted', 'in_progress'))::int AS active
       FROM bookings WHERE mechanic_id = $1`,
      [mid]
    );

    const reviewStats = await query(
      `SELECT rating, COUNT(*)::int AS cnt FROM reviews WHERE mechanic_id = $1 GROUP BY rating ORDER BY rating`,
      [mid]
    );

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of reviewStats.rows) {
      breakdown[row.rating] = row.cnt;
    }

    const row = earnings.rows[0];
    res.json({
      totalEarnings: row.total_lifetime,
      todayEarnings: row.total_today,
      monthEarnings: row.total_month,
      jobsCompleted: row.jobs_completed,
      jobsCompletedThisMonth: row.jobs_month,
      pendingJobs: row.pending,
      activeJobs: row.active,
      averageRating: mechanic.rating != null ? parseFloat(mechanic.rating) : null,
      totalReviews: mechanic.total_reviews ?? 0,
      ratingBreakdown: breakdown,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// Find mechanics within 10km of given lat/lon
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ error: 'Valid latitude and longitude required' });
    }

    const result = await query(
      `SELECT m.id, m.user_id, m.latitude, m.longitude, m.address, m.specialization,
              m.hourly_rate, m.rating, m.total_reviews, m.is_available,
              u.full_name, u.phone,
              distance_km(m.latitude::decimal, m.longitude::decimal, $1, $2) as distance_km
       FROM mechanics m
       JOIN users u ON m.user_id = u.id
       WHERE m.latitude IS NOT NULL AND m.longitude IS NOT NULL
         AND m.is_available = true
         AND distance_km(m.latitude::decimal, m.longitude::decimal, $1, $2) <= 10
       ORDER BY distance_km ASC`,
      [latNum, lngNum]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to find mechanics' });
  }
});

// Get mechanic by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const r = await query(
      `SELECT m.*, u.full_name, u.phone, u.email
       FROM mechanics m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = $1`,
      [req.params.id]
    );
    const mechanic = r.rows[0];
    if (!mechanic) return res.status(404).json({ error: 'Mechanic not found' });
    res.json(mechanic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get mechanic' });
  }
});

// Update mechanic profile (authenticated mechanic only)
router.put('/profile', authenticate, requireRole('mechanic'), async (req, res) => {
  try {
    const { latitude, longitude, address, specialization, hourlyRate, isAvailable } = req.body;

    const r = await query(
      `UPDATE mechanics
       SET latitude = COALESCE($2, latitude), longitude = COALESCE($3, longitude),
           address = COALESCE($4, address), specialization = COALESCE($5, specialization),
           hourly_rate = COALESCE($6, hourly_rate), is_available = COALESCE($7, is_available),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [req.user.id, latitude, longitude, address, specialization, hourlyRate, isAvailable]
    );

    if (r.rows.length === 0) return res.status(404).json({ error: 'Mechanic profile not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Create mechanic profile (after registration)
router.post('/profile', authenticate, requireRole('mechanic'), async (req, res) => {
  try {
    const { latitude, longitude, address, specialization, hourlyRate } = req.body;

    const r = await query(
      `INSERT INTO mechanics (user_id, latitude, longitude, address, specialization, hourly_rate)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, latitude || null, longitude || null, address || null, specialization || null, hourlyRate || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Mechanic profile already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

export default router;
