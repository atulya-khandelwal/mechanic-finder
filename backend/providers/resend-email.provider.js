import { Resend } from 'resend';
import { config } from '../config.js';

let client;

export function getResendClient() {
  if (!config.resendApiKey) return null;
  if (!client) client = new Resend(config.resendApiKey);
  return client;
}
