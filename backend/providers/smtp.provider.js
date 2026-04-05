import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter;

/**
 * Lazily creates a shared Nodemailer transport from SMTP_* env vars.
 */
export function getSmtpTransporter() {
  if (!config.smtp.host) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth:
        config.smtp.user != null && config.smtp.user !== ''
          ? { user: config.smtp.user, pass: config.smtp.pass ?? '' }
          : undefined,
    });
  }
  return transporter;
}
