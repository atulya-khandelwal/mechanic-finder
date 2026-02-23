import express from 'express';
import { query } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Submit review (user only, for completed bookings)
router.post('/', authenticate, requireRole('user'), async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'bookingId and rating (1-5) are required' });
    }

    const booking = await query(
      `SELECT id, user_id, mechanic_id, status FROM bookings WHERE id = $1`,
      [bookingId]
    );
    const b = booking.rows[0];
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    if (b.user_id !== req.user.id) return res.status(403).json({ error: 'Not your booking' });
    if (b.status !== 'completed') return res.status(400).json({ error: 'Can only review completed bookings' });
    if (!b.mechanic_id) return res.status(400).json({ error: 'Booking has no assigned mechanic' });

    const existing = await query('SELECT id FROM reviews WHERE booking_id = $1', [bookingId]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Already reviewed this booking' });

    await query(
      `INSERT INTO reviews (booking_id, user_id, mechanic_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [bookingId, req.user.id, b.mechanic_id, parseInt(rating, 10), comment || null]
    );

    // Update mechanic's average rating and total_reviews
    const stats = await query(
      `SELECT AVG(rating)::decimal(3,2) as avg_rating, COUNT(*)::int as total
       FROM reviews WHERE mechanic_id = $1`,
      [b.mechanic_id]
    );
    const { avg_rating, total } = stats.rows[0];
    await query(
      `UPDATE mechanics SET rating = $1, total_reviews = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [parseFloat(avg_rating) || 0, total, b.mechanic_id]
    );

    const review = await query(
      `SELECT r.*, u.full_name as user_name FROM reviews r
       JOIN users u ON r.user_id = u.id WHERE r.booking_id = $1`,
      [bookingId]
    );

    res.status(201).json(review.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Get reviews for a mechanic (public)
router.get('/mechanic/:mechanicId', async (req, res) => {
  try {
    const r = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.full_name as user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.mechanic_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.params.mechanicId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// Check if user has reviewed a booking
router.get('/booking/:bookingId', authenticate, async (req, res) => {
  try {
    const r = await query(
      'SELECT id, rating, comment, created_at FROM reviews WHERE booking_id = $1 AND user_id = $2',
      [req.params.bookingId, req.user.id]
    );
    if (r.rows.length === 0) return res.json(null);
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check review' });
  }
});

export default router;
