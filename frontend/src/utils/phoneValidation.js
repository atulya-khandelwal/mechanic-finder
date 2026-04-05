import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Must match backend `DEFAULT_PHONE_REGION` (backend/.env) for consistent parsing */
const DEFAULT_REGION = import.meta.env.VITE_DEFAULT_PHONE_REGION || 'IN';

export function isIndiaDefaultRegion() {
  return String(DEFAULT_REGION).toUpperCase() === 'IN';
}

const IN_NATIONAL_LEN = 10;

/**
 * Extract up to 10 national digits for India.
 * Must not merge the literal "+91" prefix into the digit string (typing "3" after "+91 " must yield "3", not "913").
 */
export function normalizeIndianNationalDigits(input) {
  const s = String(input || '').trim();
  let national = '';

  if (s.startsWith('+91')) {
    national = s.slice(3).replace(/\D/g, '');
  } else {
    let d = s.replace(/\D/g, '');
    if (d.startsWith('91') && d.length >= 12) {
      d = d.slice(2);
    }
    national = d;
  }

  if (national.length === 11 && national.startsWith('0')) {
    national = national.slice(1);
  }
  return national.slice(0, IN_NATIONAL_LEN);
}

/** Format 10 (or fewer) digits as "98765 43210". */
export function formatIndianNationalDigits(digits) {
  const d = digits.slice(0, IN_NATIONAL_LEN);
  if (d.length === 0) return '';
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

/**
 * Display value for Indian mobile: "+91 " plus spaced national digits.
 * User only thinks about the 10 digits; +91 is always present for IN.
 */
export function formatIndianPhoneFieldValue(raw) {
  const d = normalizeIndianNationalDigits(raw);
  const part = formatIndianNationalDigits(d);
  return part ? `+91 ${part}` : '+91 ';
}

/**
 * Login / email-or-phone field: format as Indian phone unless it looks like email.
 */
export function formatLoginIdentifierInput(value) {
  const v = String(value ?? '');
  if (!isIndiaDefaultRegion()) return v;
  if (v.includes('@')) return v;
  if (/[a-zA-Z]/.test(v.replace(/\+/g, ''))) return v;
  const trimmed = v.trimStart();
  if (trimmed.startsWith('+') && !trimmed.startsWith('+91')) return v;
  return formatIndianPhoneFieldValue(v);
}

/** Prefill profile phone editor from stored E.164 (+91…). */
export function e164ToIndianDisplay(e164) {
  if (!e164) return isIndiaDefaultRegion() ? '+91 ' : '';
  const s = String(e164);
  if (!isIndiaDefaultRegion()) return s;
  if (!s.startsWith('+91')) return s;
  return formatIndianPhoneFieldValue(s);
}

/**
 * @returns {{ ok: true, e164: string } | { ok: false, error: string }}
 */
export function validatePhoneInput(input, defaultRegion = DEFAULT_REGION) {
  const raw = String(input || '').trim();
  if (!raw) {
    return { ok: false, error: 'Phone number is required' };
  }
  if (String(defaultRegion).toUpperCase() === 'IN' && isIndiaDefaultRegion()) {
    const d = normalizeIndianNationalDigits(raw);
    if (d.length > 0 && d.length < IN_NATIONAL_LEN) {
      return { ok: false, error: 'Enter the full 10-digit mobile number.' };
    }
  }
  const parsed = parsePhoneNumberFromString(raw, defaultRegion);
  if (!parsed || !parsed.isValid()) {
    if (!parsed) {
      return {
        ok: false,
        error: `Could not parse phone number. Use international format (+country) or a valid ${defaultRegion} mobile number.`,
      };
    }
    if (!parsed.isPossible()) {
      return {
        ok: false,
        error: 'Phone number length or format is wrong for this country. Check digits and country code.',
      };
    }
    return { ok: false, error: 'This phone number is not valid. Check for typos.' };
  }
  return { ok: true, e164: parsed.format('E.164') };
}

/** True if the login field should be treated as an email address (not phone). */
export function looksLikeEmail(str) {
  return String(str || '').trim().includes('@');
}
