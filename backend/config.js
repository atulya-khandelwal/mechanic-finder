import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mobile_mechanic',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: '7d',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  /** Resend HTTPS API — https://resend.com/api-keys */
  resendApiKey: (process.env.RESEND_API_KEY || '').trim(),
  /** Outgoing mail identity (From); must use a domain verified in Resend */
  smtpFrom:
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    'Mobile Mechanic <noreply@localhost>',
  otpTtlMinutes: parseInt(process.env.OTP_TTL_MINUTES || '10', 10),
  otpLength: parseInt(process.env.OTP_LENGTH || '6', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  otpResendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10),
  /** ISO 3166-1 alpha-2 when user omits country code (e.g. IN, US) */
  defaultPhoneRegion: process.env.DEFAULT_PHONE_REGION || 'IN',
  /**
   * Non-production only: allow signup without Twilio credentials (accepts any 4–8 digit SMS code).
   * Never enable in production.
   */
  phoneVerifySkip: process.env.PHONE_VERIFY_SKIP === 'true' || process.env.PHONE_VERIFY_SKIP === '1',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
  },
  /** Groq OpenAI-compatible API — vehicle issue triage (see routes/ai.js) */
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  /** Razorpay (INR) — Key ID is public; Key Secret stays on the server only */
  razorpayKeyId: (process.env.RAZORPAY_KEY_ID || '').trim(),
  razorpayKeySecret: (process.env.RAZORPAY_KEY_SECRET || '').trim(),
};
