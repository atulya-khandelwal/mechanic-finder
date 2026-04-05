import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { config } from '../config.js';

function invalidPhoneError(parsed, defaultRegion) {
  let message =
    'Invalid phone number. Include country code (e.g. +91 98765 43210) or a valid local number.';
  if (!parsed) {
    message = `Could not parse phone number. Use international format with + and country code, or a valid ${defaultRegion} mobile number.`;
  } else if (!parsed.isPossible()) {
    message = 'Phone number length or format is wrong for this country. Check digits and country code.';
  } else if (!parsed.isValid()) {
    message = 'This phone number is not valid. Check for typos or use a different number.';
  }
  const err = new Error(message);
  err.status = 400;
  return err;
}

/**
 * Parse and validate a phone string to E.164 (e.g. +919876543210).
 * @param {string} input - Raw user input (may include spaces, local format)
 * @param {string} [defaultRegion] - ISO country code (default from config, e.g. IN)
 * @returns {string} E.164 number
 */
export function normalizeToE164(input, defaultRegion = config.defaultPhoneRegion) {
  const raw = String(input || '').trim();
  if (!raw) {
    const err = new Error('Phone number is required');
    err.status = 400;
    throw err;
  }
  const parsed = parsePhoneNumberFromString(raw, defaultRegion);
  if (!parsed || !parsed.isValid()) {
    throw invalidPhoneError(parsed, defaultRegion);
  }
  return parsed.format('E.164');
}
