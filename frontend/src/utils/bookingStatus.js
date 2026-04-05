/** Bookings that are finished from the customer/mechanic workflow perspective. */
export const TERMINAL_BOOKING_STATUSES = ['completed', 'rejected', 'cancelled'];

/** True while the request is still in play (not completed, rejected, or cancelled). */
export function isInFlightBooking(status) {
  return Boolean(status && !TERMINAL_BOOKING_STATUSES.includes(status));
}

/** Human-readable label for booking status (e.g. in_progress → In Progress). */
export function humanizeBookingStatus(status) {
  if (!status) return '';
  return String(status)
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Completed job where money is not yet recorded (online or COD). */
export function jobNeedsPayment(booking) {
  if (!booking || booking.status !== 'completed') return false;
  return booking.payment_status !== 'paid';
}

/** Completed job with payment settled — mechanic can treat as fully closed. */
export function jobIsSuccessful(booking) {
  if (!booking || booking.status !== 'completed') return false;
  return booking.payment_status === 'paid';
}

/**
 * Mechanic list/detail: completed jobs show Awaiting payment vs Successful instead of raw "Completed".
 */
export function mechanicJobStatusPresentation(booking) {
  if (!booking) return { text: '', className: 'badge' };
  if (booking.status === 'completed') {
    if (jobNeedsPayment(booking)) {
      return { text: 'Awaiting payment', className: 'badge awaiting-payment' };
    }
    return { text: 'Successful', className: 'badge successful' };
  }
  return { text: humanizeBookingStatus(booking.status), className: `badge ${booking.status}` };
}
