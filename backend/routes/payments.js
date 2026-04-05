import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db.js';
import { config } from '../config.js';
import {
  createOrder,
  getRazorpayErrorMessage,
  inrToPaise,
  isRazorpayConfigured,
  verifyPaymentSignature,
} from '../services/razorpay.service.js';

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    enabled: isRazorpayConfigured(),
    keyId: isRazorpayConfigured() ? config.razorpayKeyId : null,
  });
});

router.post('/razorpay/create-order', authenticate, requireRole('user'), async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ error: 'Payments are not configured', code: 'NOT_CONFIGURED' });
    }

    const { bookingId } = req.body || {};
    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    const br = await query(
      `SELECT id, user_id, status, total_price, payment_status, razorpay_order_id, payment_method
       FROM bookings WHERE id = $1`,
      [bookingId]
    );
    if (br.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const b = br.rows[0];
    if (b.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const blocked = ['cancelled', 'rejected'];
    if (blocked.includes(b.status)) {
      return res.status(400).json({ error: 'This booking cannot be paid' });
    }

    if (b.payment_status === 'paid') {
      return res.status(400).json({ error: 'Already paid' });
    }

    if (b.payment_method !== 'online') {
      return res.status(400).json({
        error: 'This booking is cash on delivery. Pay the mechanic in cash; they will mark it as received.',
        code: 'COD',
      });
    }

    const total = b.total_price != null ? Number(b.total_price) : 0;
    const amountPaise = inrToPaise(total);
    if (amountPaise < 100) {
      return res.status(400).json({ error: 'Nothing to pay for this booking' });
    }

    const receipt = `bk_${String(bookingId).replace(/-/g, '').slice(0, 32)}`;
    const order = await createOrder({ amountPaise, receipt });

    await query(
      `UPDATE bookings SET razorpay_order_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [order.id, bookingId]
    );

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.razorpayKeyId,
    });
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED' || err.code === 'AMOUNT') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    if (err.code === '42703') {
      return res.status(500).json({
        error:
          'Database is missing payment columns. From backend/, run: npm run db:migrate-razorpay',
        code: 'SCHEMA',
      });
    }
    if (err.code === 'RAZORPAY_API') {
      console.error('Razorpay orders.create failed:', err.cause || err);
      return res.status(502).json({
        error: err.message || 'Razorpay rejected the request',
        code: 'RAZORPAY_ERROR',
      });
    }
    console.error('create-order failed:', err);
    const msg =
      typeof err?.message === 'string' && err.message.trim()
        ? err.message
        : getRazorpayErrorMessage(err);
    res.status(500).json({ error: msg || 'Failed to create payment order', code: 'ORDER_FAILED' });
  }
});

router.post('/razorpay/verify', authenticate, requireRole('user'), async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ error: 'Payments are not configured', code: 'NOT_CONFIGURED' });
    }

    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment fields' });
    }

    const ok = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid payment signature', code: 'BAD_SIGNATURE' });
    }

    const br = await query(
      `SELECT id, user_id, razorpay_order_id, payment_status FROM bookings WHERE id = $1`,
      [bookingId]
    );
    if (br.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const b = br.rows[0];
    if (b.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (b.payment_status === 'paid') {
      return res.json({ ok: true, paymentStatus: 'paid' });
    }
    if (b.razorpay_order_id && b.razorpay_order_id !== razorpay_order_id) {
      return res.status(400).json({ error: 'Order mismatch' });
    }

    await query(
      `UPDATE bookings
       SET payment_status = 'paid',
           razorpay_payment_id = $1,
           razorpay_order_id = COALESCE(razorpay_order_id, $2),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [razorpay_payment_id, razorpay_order_id, bookingId]
    );

    res.json({ ok: true, paymentStatus: 'paid' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export default router;
