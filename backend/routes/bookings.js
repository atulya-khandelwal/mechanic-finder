import express from 'express';
import { query } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, requireRole('user'), async (req, res) => {
  try {
    const {
      categoryId, serviceType, userLatitude, userLongitude, userAddress, scheduledAt,
      description, mechanicId,
      vehicleImage, vehicleNumber, vehicleMake, vehicleModel, vehicleYear, problemDescription,
      serviceLocation
    } = req.body;

    if (!categoryId || !serviceType || !userLatitude || !userLongitude) {
      return res.status(400).json({ error: 'categoryId, serviceType, userLatitude, userLongitude are required' });
    }

    if (!['emergency', 'scheduled'].includes(serviceType)) {
      return res.status(400).json({ error: 'serviceType must be emergency or scheduled' });
    }

    const BASE_CHARGE = 25;
    const HOME_SERVICE_FEE = 15;

    const cat = await query('SELECT base_price FROM service_categories WHERE id = $1', [categoryId]);
    const servicePrice = cat.rows[0]?.base_price ? parseFloat(cat.rows[0].base_price) : 50;
    const isHomeService = serviceLocation === 'home';
    const homeFee = isHomeService ? HOME_SERVICE_FEE : 0;
    const totalPrice = BASE_CHARGE + servicePrice + homeFee;

    const r = await query(
      `INSERT INTO bookings (
        user_id, mechanic_id, category_id, service_type,
        user_latitude, user_longitude, user_address, scheduled_at,
        description, vehicle_image, vehicle_number, vehicle_make, vehicle_model, vehicle_year,
        problem_description, service_location, base_charge, home_service_fee, service_price, total_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        req.user.id, mechanicId || null, categoryId, serviceType,
        parseFloat(userLatitude), parseFloat(userLongitude), userAddress || null,
        serviceType === 'scheduled' && scheduledAt ? scheduledAt : null,
        description || null, vehicleImage || null, vehicleNumber || null,
        vehicleMake || null, vehicleModel || null, vehicleYear ? parseInt(vehicleYear, 10) : null,
        problemDescription || description || null, serviceLocation || 'home',
        BASE_CHARGE, homeFee, servicePrice, totalPrice
      ]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// For mechanics: get unassigned pending bookings within 10km
router.get('/available', authenticate, requireRole('mechanic'), async (req, res) => {
  try {
    const m = await query('SELECT latitude, longitude FROM mechanics WHERE user_id = $1', [req.user.id]);
    const mechanic = m.rows[0];
    if (!mechanic?.latitude || !mechanic?.longitude) {
      return res.json([]);
    }
    const r = await query(
      `SELECT b.*, sc.name as category_name, sc.type as category_type,
              u.full_name as user_name, u.phone as user_phone,
              distance_km(b.user_latitude::decimal, b.user_longitude::decimal, $1, $2) as distance_km
       FROM bookings b
       JOIN service_categories sc ON b.category_id = sc.id
       JOIN users u ON b.user_id = u.id
       WHERE b.mechanic_id IS NULL AND b.status = 'pending'
         AND distance_km(b.user_latitude::decimal, b.user_longitude::decimal, $1, $2) <= 10
       ORDER BY b.created_at DESC`,
      [mechanic.latitude, mechanic.longitude]
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get available bookings' });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    let sql, params;

    if (role === 'user') {
      sql = `SELECT b.*, sc.name as category_name, sc.type as category_type,
                    u.full_name as mechanic_name, u.phone as mechanic_phone,
                    (SELECT 1 FROM reviews r WHERE r.booking_id = b.id) IS NOT NULL as has_review,
                    (SELECT r.rating FROM reviews r WHERE r.booking_id = b.id) as review_rating,
                    (SELECT r.comment FROM reviews r WHERE r.booking_id = b.id) as review_comment,
                    (SELECT r.created_at FROM reviews r WHERE r.booking_id = b.id) as review_date
             FROM bookings b
             JOIN service_categories sc ON b.category_id = sc.id
             LEFT JOIN mechanics m ON b.mechanic_id = m.id
             LEFT JOIN users u ON m.user_id = u.id
             WHERE b.user_id = $1
             ORDER BY b.created_at DESC`;
      params = [req.user.id];
    } else if (role === 'mechanic') {
      sql = `SELECT b.*, sc.name as category_name, sc.type as category_type,
                    u.full_name as user_name, u.phone as user_phone
             FROM bookings b
             JOIN service_categories sc ON b.category_id = sc.id
             JOIN users u ON b.user_id = u.id
             JOIN mechanics m ON m.id = b.mechanic_id AND m.user_id = $1
             ORDER BY b.created_at DESC`;
      params = [req.user.id];
    } else {
      return res.status(400).json({ error: 'Admin should use /admin/bookings' });
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

router.patch('/:id/status', authenticate, requireRole('mechanic', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    let sql = 'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    const params = [status, req.params.id];

    if (req.user.role === 'mechanic') {
      sql += ' AND mechanic_id IN (SELECT id FROM mechanics WHERE user_id = $3)';
      params.push(req.user.id);
    }

    sql += ' RETURNING *';

    const r = await query(sql, params);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.patch('/:id/assign', authenticate, requireRole('user', 'admin'), async (req, res) => {
  try {
    const { mechanicId } = req.body;

    let sql = 'UPDATE bookings SET mechanic_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3';
    const params = [mechanicId, 'accepted', req.params.id];

    if (req.user.role === 'user') {
      sql += ' AND user_id = $4';
      params.push(req.user.id);
    }

    sql += ' RETURNING *';

    const r = await query(sql, params);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign mechanic' });
  }
});

// Chat: get messages (user or mechanic who accepted)
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const r = await query(
      `SELECT b.user_id, b.mechanic_id, b.status, m.user_id as mechanic_user_id
       FROM bookings b
       LEFT JOIN mechanics m ON b.mechanic_id = m.id
       WHERE b.id = $1`,
      [req.params.id]
    );
    const booking = r.rows[0];
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const isUser = booking.user_id === req.user.id;
    const isMechanic = booking.mechanic_user_id === req.user.id;
    if (!isUser && !isMechanic) return res.status(403).json({ error: 'Not authorized to view this chat' });

    const msg = await query(
      `SELECT bm.*, u.full_name as sender_name
       FROM booking_messages bm
       JOIN users u ON bm.sender_id = u.id
       WHERE bm.booking_id = $1
       ORDER BY bm.created_at ASC`,
      [req.params.id]
    );
    res.json(msg.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Chat: send message (user or mechanic, only when accepted/in_progress)
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const r = await query(
      `SELECT b.user_id, b.mechanic_id, b.status, m.user_id as mechanic_user_id
       FROM bookings b
       LEFT JOIN mechanics m ON b.mechanic_id = m.id
       WHERE b.id = $1`,
      [req.params.id]
    );
    const booking = r.rows[0];
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const isUser = booking.user_id === req.user.id;
    const isMechanic = booking.mechanic_user_id === req.user.id;
    if (!isUser && !isMechanic) return res.status(403).json({ error: 'Not authorized' });
    if (!['accepted', 'in_progress'].includes(booking.status)) {
      return res.status(400).json({ error: 'Chat is closed. Booking must be accepted or in progress.' });
    }
    if (!booking.mechanic_id) return res.status(400).json({ error: 'No mechanic assigned yet' });

    const ins = await query(
      `INSERT INTO booking_messages (booking_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, req.user.id, message.trim().slice(0, 2000)]
    );
    const row = ins.rows[0];
    const sender = await query('SELECT full_name FROM users WHERE id = $1', [row.sender_id]);
    row.sender_name = sender.rows[0]?.full_name;
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mechanic claims an unassigned booking
router.post('/:id/claim', authenticate, requireRole('mechanic'), async (req, res) => {
  try {
    const m = await query('SELECT id FROM mechanics WHERE user_id = $1', [req.user.id]);
    const mechanic = m.rows[0];
    if (!mechanic) return res.status(400).json({ error: 'Mechanic profile required' });

    const r = await query(
      `UPDATE bookings SET mechanic_id = $1, status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND mechanic_id IS NULL AND status = 'pending'
       RETURNING *`,
      [mechanic.id, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Booking not found or already claimed' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to claim booking' });
  }
});

export default router;
