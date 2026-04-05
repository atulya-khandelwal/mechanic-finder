import crypto from 'crypto';
import Razorpay from 'razorpay';
import { config } from '../config.js';

function getClient() {
  if (!config.razorpayKeyId || !config.razorpayKeySecret) return null;
  return new Razorpay({
    key_id: config.razorpayKeyId,
    key_secret: config.razorpayKeySecret,
  });
}

export function isRazorpayConfigured() {
  return Boolean(config.razorpayKeyId && config.razorpayKeySecret);
}

/**
 * Amount in INR → paise (Razorpay integer amount)
 * @param {number} totalInr
 */
export function inrToPaise(totalInr) {
  const n = Number(totalInr);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!config.razorpayKeySecret) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', config.razorpayKeySecret).update(body).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * @param {{ amountPaise: number, receipt: string }} opts
 */
/**
 * Normalizes Razorpay SDK / API errors for logging and API responses.
 * @param {unknown} err
 */
export function getRazorpayErrorMessage(err) {
  if (!err || typeof err !== 'object') return 'Payment provider error';
  const any = err;
  const nested = any.error;
  if (nested && typeof nested === 'object') {
    const desc = nested.description || nested.reason || nested.message;
    if (typeof desc === 'string' && desc.trim()) return desc.trim();
  }
  if (typeof any.description === 'string' && any.description.trim()) return any.description.trim();
  if (typeof any.message === 'string' && any.message.trim()) return any.message.trim();
  return 'Payment provider error';
}

export async function createOrder(opts) {
  const client = getClient();
  if (!client) {
    const err = new Error('Razorpay is not configured');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }
  if (opts.amountPaise < 100) {
    const err = new Error('Amount must be at least ₹1');
    err.code = 'AMOUNT';
    throw err;
  }
  try {
    const order = await client.orders.create({
      amount: opts.amountPaise,
      currency: 'INR',
      receipt: opts.receipt.slice(0, 40),
    });
    return order;
  } catch (err) {
    const e = new Error(getRazorpayErrorMessage(err));
    e.code = 'RAZORPAY_API';
    e.cause = err;
    throw e;
  }
}
