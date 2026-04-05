import express from 'express';
import { query } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { notifyMechanicsNearby } from '../services/push.js';
import { sendBookingPush, getCategoryName, payloadForBooking } from '../services/bookingNotifications.js';
import { sendBookingInvoiceEmail } from '../services/email.service.js';

const router = express.Router();

router.post('/', authenticate, requireRole('user'), async (req, res) => {
  try {
    const {
      categoryId, serviceType, userLatitude, userLongitude, userAddress, scheduledAt,
      description, mechanicId,
      vehicleImage, vehicleNumber, vehicleMake, vehicleModel, vehicleYear, problemDescription,
      serviceLocation,
      paymentMethod,
    } = req.body;

    if (!categoryId || !serviceType || !userLatitude || !userLongitude) {
      return res.status(400).json({ error: 'categoryId, serviceType, userLatitude, userLongitude are required' });
    }

    if (!['emergency', 'scheduled'].includes(serviceType)) {
      return res.status(400).json({ error: 'serviceType must be emergency or scheduled' });
    }

    const pm = paymentMethod === 'online' ? 'online' : 'cod';

    const BASE_CHARGE = 25;
    const HOME_SERVICE_FEE = 15;

    const cat = await query('SELECT base_price, name FROM service_categories WHERE id = $1', [categoryId]);
    const servicePrice = cat.rows[0]?.base_price ? parseFloat(cat.rows[0].base_price) : 50;
    const isHomeService = serviceLocation === 'home';
    const homeFee = isHomeService ? HOME_SERVICE_FEE : 0;
    const totalPrice = BASE_CHARGE + servicePrice + homeFee;

    const r = await query(
      `INSERT INTO bookings (
        user_id, mechanic_id, category_id, service_type,
        user_latitude, user_longitude, user_address, scheduled_at,
        description, vehicle_image, vehicle_number, vehicle_make, vehicle_model, vehicle_year,
        problem_description, service_location, base_charge, home_service_fee, service_price, total_price,
        payment_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        req.user.id, mechanicId || null, categoryId, serviceType,
        parseFloat(userLatitude), parseFloat(userLongitude), userAddress || null,
        serviceType === 'scheduled' && scheduledAt ? scheduledAt : null,
        description || null, vehicleImage || null, vehicleNumber || null,
        vehicleMake || null, vehicleModel || null, vehicleYear ? parseInt(vehicleYear, 10) : null,
        problemDescription || description || null, serviceLocation || 'home',
        BASE_CHARGE, homeFee, servicePrice, totalPrice,
        pm,
      ]
    );

    const booking = r.rows[0];
    const catName = cat.rows[0]?.name || 'service';

    sendBookingPush(booking, {
      userPayload: payloadForBooking(
        booking.id,
        'Booking submitted',
        `Your ${catName} request was received. We'll notify you when it's confirmed.`
      ),
      mechanicPayload: mechanicId
        ? payloadForBooking(
            booking.id,
            'New booking',
            `New ${catName} request — assigned to you.`
          )
        : null,
    }).catch(() => {});

    if (!mechanicId) {
      notifyMechanicsNearby(
        parseFloat(userLatitude),
        parseFloat(userLongitude),
        payloadForBooking(
          booking.id,
          'New service request',
          `New ${catName} request nearby. Accept to view details.`
        )
      ).catch(() => {});
    }

    res.status(201).json(booking);
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
             JOIN mechanics m ON m.user_id = $1
             WHERE b.mechanic_id = m.id OR b.rejected_by_mechanic_id = m.id
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

/** Assigned mechanic: mark COD booking as paid after collecting cash (customer UI updates on refresh). */
router.post('/:id/confirm-cash-payment', authenticate, requireRole('mechanic'), async (req, res) => {
  try {
    const bookingId = req.params.id;
    const m = await query('SELECT id FROM mechanics WHERE user_id = $1', [req.user.id]);
    const mechanicRowId = m.rows[0]?.id;
    if (!mechanicRowId) return res.status(403).json({ error: 'Mechanic profile required' });

    const br = await query(
      `SELECT id, mechanic_id, status, payment_method, payment_status FROM bookings WHERE id = $1`,
      [bookingId]
    );
    if (br.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = br.rows[0];
    if (b.mechanic_id !== mechanicRowId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (b.payment_method === 'online') {
      return res.status(400).json({ error: 'This booking is paid online (Razorpay), not cash' });
    }
    if (b.payment_status === 'paid') {
      return res.json({ ok: true, paymentStatus: 'paid' });
    }
    if (b.status !== 'completed') {
      return res.status(400).json({ error: 'Mark the job complete before confirming cash payment' });
    }

    await query(
      `UPDATE bookings SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [bookingId]
    );
    res.json({ ok: true, paymentStatus: 'paid' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Single booking (user: own booking; mechanic: assigned, rejected-by-you, or open pool within 10km)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const r = await query(
      `SELECT b.*, sc.name as category_name, sc.type as category_type,
              u.full_name as user_name, u.phone as user_phone,
              mu.full_name as mechanic_name, mu.phone as mechanic_phone
       FROM bookings b
       JOIN service_categories sc ON b.category_id = sc.id
       JOIN users u ON b.user_id = u.id
       LEFT JOIN mechanics m ON b.mechanic_id = m.id
       LEFT JOIN users mu ON m.user_id = mu.id
       WHERE b.id = $1`,
      [bookingId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = r.rows[0];

    if (req.user.role === 'user') {
      if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
      const rev = await query(
        `SELECT r.rating, r.comment, r.created_at as review_date FROM reviews r WHERE r.booking_id = $1`,
        [bookingId]
      );
      const row = rev.rows[0];
      return res.json({
        ...booking,
        has_review: !!row,
        review_rating: row?.rating ?? null,
        review_comment: row?.comment ?? null,
        review_date: row?.review_date ?? null,
      });
    }

    if (req.user.role === 'mechanic') {
      const m = await query('SELECT id, latitude, longitude FROM mechanics WHERE user_id = $1', [req.user.id]);
      const mechanic = m.rows[0];
      if (!mechanic) return res.status(403).json({ error: 'Mechanic profile required' });

      const isMine =
        booking.mechanic_id === mechanic.id || booking.rejected_by_mechanic_id === mechanic.id;
      let isOpenPool = false;
      if (
        !isMine &&
        booking.mechanic_id == null &&
        booking.status === 'pending' &&
        mechanic.latitude != null &&
        mechanic.longitude != null
      ) {
        const d = await query(
          `SELECT distance_km(b.user_latitude::decimal, b.user_longitude::decimal, $1::decimal, $2::decimal) as d
           FROM bookings b WHERE b.id = $3`,
          [mechanic.latitude, mechanic.longitude, bookingId]
        );
        const dist = d.rows[0]?.d != null ? Number(d.rows[0].d) : null;
        isOpenPool = dist != null && dist <= 10;
      }
      if (!isMine && !isOpenPool) return res.status(403).json({ error: 'Not authorized' });

      const distRow = await query(
        `SELECT distance_km(b.user_latitude::decimal, b.user_longitude::decimal, $1::decimal, $2::decimal) as distance_km
         FROM bookings b WHERE b.id = $3`,
        [mechanic.latitude, mechanic.longitude, bookingId]
      );
      return res.json({
        ...booking,
        distance_km: distRow.rows[0]?.distance_km ?? null,
      });
    }

    if (req.user.role === 'admin') {
      return res.json(booking);
    }

    return res.status(403).json({ error: 'Not authorized' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get booking' });
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
    const booking = r.rows[0];
    const catName = await getCategoryName(booking.category_id);
    const totalStr =
      booking.total_price != null ? `₹${Number(booking.total_price).toFixed(0)}` : '';

    if (status === 'accepted') {
      sendBookingPush(booking, {
        userPayload: payloadForBooking(
          booking.id,
          'Booking confirmed',
          `Your ${catName} booking is confirmed.`
        ),
        mechanicPayload: payloadForBooking(
          booking.id,
          'Booking confirmed',
          `You accepted this ${catName} job.`
        ),
      }).catch(() => {});
    } else if (status === 'in_progress') {
      sendBookingPush(booking, {
        userPayload: payloadForBooking(
          booking.id,
          'Work started',
          `Work has started on your ${catName} booking.`
        ),
        mechanicPayload: payloadForBooking(
          booking.id,
          'Work started',
          `You marked this ${catName} job as in progress.`
        ),
      }).catch(() => {});
    } else if (status === 'completed' && booking.total_price != null) {
      sendBookingPush(booking, {
        userPayload: payloadForBooking(
          booking.id,
          'Service completed',
          `Your service is complete. Total payable: ${totalStr}`
        ),
        mechanicPayload: payloadForBooking(
          booking.id,
          'Job completed',
          `Job completed. Total: ${totalStr}`
        ),
      }).catch(() => {});

      const userRow = await query('SELECT email, full_name FROM users WHERE id = $1', [booking.user_id]);
      const mechanicRow = booking.mechanic_id
        ? await query(
            `SELECT u.full_name FROM mechanics m JOIN users u ON m.user_id = u.id WHERE m.id = $1`,
            [booking.mechanic_id]
          )
        : { rows: [] };

      sendBookingInvoiceEmail({
        to: userRow.rows[0]?.email,
        customerName: userRow.rows[0]?.full_name,
        bookingId: booking.id,
        categoryName: catName,
        mechanicName: mechanicRow.rows[0]?.full_name,
        totalPrice: booking.total_price,
        baseCharge: booking.base_charge,
        servicePrice: booking.service_price,
        homeServiceFee: booking.home_service_fee,
        completedAt: booking.updated_at,
      }).catch((err) => console.error('Invoice email:', err.message));
    } else if (status === 'cancelled') {
      const cancelledPayload = payloadForBooking(
        booking.id,
        'Booking cancelled',
        'This booking has been cancelled.'
      );
      if (req.user.role === 'mechanic') {
        sendBookingPush(booking, {
          userPayload: cancelledPayload,
          mechanicPayload: null,
        }).catch(() => {});
      } else if (req.user.role === 'admin') {
        sendBookingPush(booking, {
          userPayload: cancelledPayload,
          mechanicPayload: cancelledPayload,
        }).catch(() => {});
      }
    }

    res.json(booking);
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
    const booking = r.rows[0];
    const nameRow = await query(
      `SELECT u.full_name FROM mechanics m JOIN users u ON m.user_id = u.id WHERE m.id = $1`,
      [mechanicId]
    );
    const mechanicName = nameRow.rows[0]?.full_name || 'Mechanic';
    const catName = await getCategoryName(booking.category_id);
    sendBookingPush(booking, {
      userPayload: payloadForBooking(
        booking.id,
        'Booking confirmed',
        `Your booking is confirmed with ${mechanicName}. (${catName})`
      ),
      mechanicPayload: payloadForBooking(
        booking.id,
        'New assignment',
        `You have a new ${catName} assignment.`
      ),
    }).catch(() => {});
    res.json(booking);
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

// Mechanic rejects an unassigned open booking (no mechanic_id) — updates status for the customer
router.post('/:id/reject', authenticate, requireRole('mechanic'), async (req, res) => {
  const notifyDeclined = async (booking) => {
    try {
      const catName = await getCategoryName(booking.category_id);
      await sendBookingPush(booking, {
        userPayload: payloadForBooking(
          booking.id,
          'Request declined',
          `No mechanic is taking this ${catName} job right now. You can submit a new request.`
        ),
        mechanicPayload: null,
      });
    } catch (e) {
      console.error('Post-reject notification failed:', e.message);
    }
  };

  try {
    const m = await query('SELECT id FROM mechanics WHERE user_id = $1', [req.user.id]);
    if (!m.rows[0]) return res.status(400).json({ error: 'Mechanic profile required' });

    const mechanicId = m.rows[0].id;
    let r;
    try {
      r = await query(
        `UPDATE bookings SET status = 'rejected', rejected_by_mechanic_id = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND mechanic_id IS NULL AND status = 'pending'
         RETURNING *`,
        [req.params.id, mechanicId]
      );
    } catch (dbErr) {
      const msg = String(dbErr.message || '');
      const missingCol = dbErr.code === '42703' && /rejected_by_mechanic_id/i.test(msg);
      if (missingCol) {
        r = await query(
          `UPDATE bookings SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND mechanic_id IS NULL AND status = 'pending'
           RETURNING *`,
          [req.params.id]
        );
      } else {
        throw dbErr;
      }
    }

    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or cannot be rejected' });
    }
    const booking = r.rows[0];
    void notifyDeclined(booking);
    res.json(booking);
  } catch (err) {
    console.error(err);
    const msg = String(err.message || '');
    const missingRejectedEnum =
      /invalid input value for enum booking_status/i.test(msg) ||
      (err.code === '22P02' && msg.includes('booking_status'));
    if (missingRejectedEnum) {
      return res.status(500).json({
        error:
          'Database is missing the rejected status. From the backend folder run: npm run db:migrate-rejected',
      });
    }
    res.status(500).json({
      error: 'Failed to reject booking',
      detail: process.env.NODE_ENV !== 'production' ? msg : undefined,
    });
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
    const booking = r.rows[0];
    const catName = await getCategoryName(booking.category_id);
    const nameRow = await query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
    const mechanicName = nameRow.rows[0]?.full_name || 'A mechanic';
    sendBookingPush(booking, {
      userPayload: payloadForBooking(
        booking.id,
        'Booking confirmed',
        `${mechanicName} accepted your ${catName} request.`
      ),
      mechanicPayload: null,
    }).catch(() => {});
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to claim booking' });
  }
});

export default router;
