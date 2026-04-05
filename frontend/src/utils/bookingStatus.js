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
