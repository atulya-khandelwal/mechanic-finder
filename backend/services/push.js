import webpush from 'web-push';
import { query } from '../db.js';
import { config } from '../config.js';

function init() {
  if (config.vapidPublicKey && config.vapidPrivateKey) {
    webpush.setVapidDetails(
      'mailto:support@mobilemechanic.app',
      config.vapidPublicKey,
      config.vapidPrivateKey
    );
  }
}

init();

export async function sendToUser(userId, payload, options = {}) {
  if (!config.vapidPrivateKey) return;
  const ttl = typeof options.ttl === 'number' ? options.ttl : 60;
  const r = await query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );
  const results = await Promise.allSettled(
    r.rows.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        { TTL: ttl }
      )
    )
  );
  results.forEach((res, i) => {
    if (res.status === 'rejected') {
      if (res.reason?.statusCode === 410 || res.reason?.statusCode === 404) {
        query('DELETE FROM push_subscriptions WHERE endpoint = $1', [r.rows[i].endpoint]).catch(() => {});
      }
    }
  });
}

export async function notifyMechanicsNearby(lat, lng, payload) {
  if (!config.vapidPrivateKey) return;
  const r = await query(
    `SELECT DISTINCT m.user_id
     FROM mechanics m
     WHERE m.latitude IS NOT NULL AND m.longitude IS NOT NULL
       AND m.is_available = true
       AND distance_km(m.latitude::decimal, m.longitude::decimal, $1, $2) <= 10`,
    [lat, lng]
  );
  for (const row of r.rows) {
    await sendToUser(row.user_id, payload);
  }
}
