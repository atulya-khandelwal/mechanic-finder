import twilio from 'twilio';
import { config } from '../config.js';

let client;

function getClient() {
  if (!client && config.twilio.accountSid && config.twilio.authToken) {
    client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return client;
}

/** True when Account SID, Auth Token, and Verify Service SID are all set */
export function isTwilioVerifyConfigured() {
  return !!(config.twilio.accountSid && config.twilio.authToken && config.twilio.verifyServiceSid);
}

function allowSkipWithoutTwilio() {
  return config.phoneVerifySkip && process.env.NODE_ENV !== 'production';
}

/**
 * Send SMS verification via Twilio Verify.
 * If Twilio is not configured and PHONE_VERIFY_SKIP is set (non-production), logs only.
 */
export async function sendVerificationSms(e164Phone) {
  if (!isTwilioVerifyConfigured()) {
    if (allowSkipWithoutTwilio()) {
      console.info(`[phone-verify] PHONE_VERIFY_SKIP: skipped SMS to ${e164Phone} (configure TWILIO_* to send real SMS)`);
      return;
    }
    const err = new Error(
      'SMS verification is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID to .env (see backend/TWILIO_SETUP.md).'
    );
    err.status = 503;
    throw err;
  }

  const c = getClient();
  await c.verify.v2.services(config.twilio.verifyServiceSid).verifications.create({
    to: e164Phone,
    channel: 'sms',
  });
}

/**
 * Check the SMS code the user entered.
 * @returns {Promise<boolean>}
 */
export async function checkVerificationCode(e164Phone, code) {
  const raw = String(code || '').trim();
  if (!raw) {
    return false;
  }

  if (!isTwilioVerifyConfigured()) {
    if (allowSkipWithoutTwilio()) {
      const ok = /^\d{4,8}$/.test(raw);
      if (!ok) {
        console.warn('[phone-verify] PHONE_VERIFY_SKIP: code must be 4–8 digits');
      }
      return ok;
    }
    const err = new Error('SMS verification is not configured.');
    err.status = 503;
    throw err;
  }

  const c = getClient();
  const check = await c.verify.v2.services(config.twilio.verifyServiceSid).verificationChecks.create({
    to: e164Phone,
    code: raw,
  });
  return check.status === 'approved';
}
