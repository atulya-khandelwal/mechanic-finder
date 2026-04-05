import { query } from '../db.js';
import { sendToUser } from './push.js';

const URL = '/';

/**
 * Send push to the customer and/or the mechanic (by mechanics.id) when payloads are set.
 */
const TTL = 3600;

export async function sendBookingPush(booking, { userPayload, mechanicPayload }) {
  if (userPayload && booking.user_id) {
    sendToUser(booking.user_id, userPayload, { ttl: TTL }).catch(() => {});
  }
  if (mechanicPayload && booking.mechanic_id) {
    const mu = await query('SELECT user_id FROM mechanics WHERE id = $1', [booking.mechanic_id]);
    if (mu.rows[0]?.user_id) {
      sendToUser(mu.rows[0].user_id, mechanicPayload, { ttl: TTL }).catch(() => {});
    }
  }
}

export async function getCategoryName(categoryId) {
  const r = await query('SELECT name FROM service_categories WHERE id = $1', [categoryId]);
  return r.rows[0]?.name || 'Service';
}

export function payloadForBooking(bookingId, title, body) {
  return {
    title,
    body,
    url: URL,
    tag: `booking-${bookingId}`,
  };
}
