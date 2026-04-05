import { getSmtpTransporter } from '../providers/smtp.provider.js';
import { config } from '../config.js';

export async function sendEmail({ to, subject, html }) {
  if (!config.smtp.host) {
    throw new Error('Email is not configured (set SMTP_HOST and related SMTP_* variables)');
  }
  const transport = getSmtpTransporter();
  if (!transport) {
    throw new Error('SMTP transport is not available');
  }
  const info = await transport.sendMail({
    from: config.smtpFrom,
    to,
    subject,
    html,
  });
  return info;
}

/**
 * Transactional signup OTP — short-lived code, clear branding, no sensitive data in subject.
 */
export async function sendSignupOtpEmail({ to, code, fullName }) {
  const greeting = fullName ? `Hi ${escapeHtml(fullName)},` : 'Hi,';
  const subject = `${code} is your Mobile Mechanic verification code`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f4f4f5;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#fff;border-radius:12px;padding:32px 28px;border:1px solid #e4e4e7;">
        <tr><td style="font-size:15px;line-height:1.6;color:#3f3f46;">
          <p style="margin:0 0 16px;">${greeting}</p>
          <p style="margin:0 0 20px;">Use this code to finish creating your Mobile Mechanic account. It expires in ${config.otpTtlMinutes} minutes.</p>
          <p style="margin:0 0 24px;font-size:28px;font-weight:700;letter-spacing:0.25em;text-align:center;color:#0ea5e9;">${escapeHtml(code)}</p>
          <p style="margin:0;font-size:13px;color:#71717a;">If you did not request this, you can ignore this email.</p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">Mobile Mechanic</p>
    </td></tr>
  </table>
</body>
</html>`;
  return sendEmail({ to, subject, html });
}

/**
 * Invoice-style summary emailed to the customer when a booking is marked completed.
 * No-ops when SMTP is not configured or `to` is missing (logs a warning).
 */
export async function sendBookingInvoiceEmail({
  to,
  customerName,
  bookingId,
  categoryName,
  mechanicName,
  totalPrice,
  baseCharge,
  servicePrice,
  homeServiceFee,
  completedAt,
}) {
  if (!to || !String(to).trim()) {
    console.warn('Invoice email skipped: no recipient email');
    return;
  }
  if (!config.smtp.host) {
    console.warn('Invoice email skipped: SMTP not configured');
    return;
  }

  const total = Number(totalPrice);
  const base = Number(baseCharge);
  const svc = Number(servicePrice);
  const home = Number(homeServiceFee || 0);
  const when = completedAt
    ? new Date(completedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const greeting = customerName ? `Hi ${escapeHtml(customerName)},` : 'Hi,';
  const mech = escapeHtml(mechanicName || 'Mechanic');
  const cat = escapeHtml(categoryName || 'Service');
  const idEsc = escapeHtml(String(bookingId));

  const homeRow =
    home > 0
      ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e4e4e7;">Home service fee</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e4e4e7;">₹${escapeHtml(String(home.toFixed(0)))}</td></tr>`
      : '';

  const subject = `Invoice — Job complete · ₹${Number.isFinite(total) ? total.toFixed(0) : '0'} due`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f4f4f5;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;padding:32px 28px;border:1px solid #e4e4e7;">
        <tr><td style="font-size:15px;line-height:1.6;color:#3f3f46;">
          <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;">Invoice / receipt</p>
          <p style="margin:0 0 16px;">${greeting}</p>
          <p style="margin:0 0 20px;">Your service is complete. Below is a summary of charges for booking <strong style="word-break:break-all;">#${idEsc}</strong> (${cat}) with ${mech}.</p>
          <table role="presentation" width="100%" cellspacing="0" style="margin:0 0 20px;font-size:14px;">
            <tr><td style="padding:8px 0;border-bottom:1px solid #e4e4e7;">Base charge</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e4e4e7;">₹${escapeHtml(String(Number.isFinite(base) ? base.toFixed(0) : '0'))}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #e4e4e7;">Service</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e4e4e7;">₹${escapeHtml(String(Number.isFinite(svc) ? svc.toFixed(0) : '0'))}</td></tr>
            ${homeRow}
            <tr><td style="padding:12px 0 0;font-weight:700;">Total due</td><td align="right" style="padding:12px 0 0;font-weight:700;font-size:18px;color:#0ea5e9;">₹${escapeHtml(String(Number.isFinite(total) ? total.toFixed(0) : '0'))}</td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#71717a;">Completed: ${escapeHtml(when)}</p>
          <p style="margin:16px 0 0;font-size:13px;color:#71717a;">Thank you for using Mobile Mechanic. If you have questions about this invoice, reply to this email or contact support through the app.</p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">Mobile Mechanic</p>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: String(to).trim(), subject, html });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
