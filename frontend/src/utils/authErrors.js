/**
 * Map API error messages to clear, consistent copy for auth flows.
 * Login intentionally stays generic on 401 to avoid account enumeration.
 */

const PHONE_TAKEN =
  'This phone number is already registered. Sign in with it or use a different mobile number.';
const EMAIL_TAKEN = 'This email is already registered. Sign in instead.';
const EMAIL_OR_PHONE_TAKEN = 'That email or phone is already registered. Sign in or use different details.';

/**
 * Registration step 1 (send codes) — duplicate email/phone from API.
 * @param {Error & { status?: number }} err
 */
export function formatRegisterStartError(err) {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('phone') && msg.includes('already')) {
    return PHONE_TAKEN;
  }
  if (msg.includes('email') && msg.includes('already')) {
    return EMAIL_TAKEN;
  }
  return err?.message || 'Could not send verification code';
}

/**
 * Registration step 2 (verify codes).
 */
export function formatRegisterVerifyError(err) {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('phone') && msg.includes('already')) {
    return PHONE_TAKEN;
  }
  if (msg.includes('email') && msg.includes('already')) {
    return EMAIL_TAKEN;
  }
  if (msg.includes('email or phone') && msg.includes('already')) {
    return EMAIL_OR_PHONE_TAKEN;
  }
  return err?.message || 'Verification failed';
}

/**
 * Login: same 401 for unknown user vs wrong password (no enumeration).
 * If the server ever returns a duplicate-phone style message, surface it clearly.
 * @param {Error & { status?: number }} err
 * @param {{ usedPhone: boolean }} ctx
 */
export function formatLoginError(err, ctx) {
  const status = err?.status;
  const msg = String(err?.message || '');
  if (/phone.*already registered/i.test(msg)) {
    return PHONE_TAKEN;
  }
  if (status === 400) {
    return msg || 'Invalid request';
  }
  if (status === 401 || status === 403) {
    if (ctx?.usedPhone) {
      return 'Invalid phone number or password.';
    }
    return 'Invalid email or password.';
  }
  return msg || 'Login failed';
}
