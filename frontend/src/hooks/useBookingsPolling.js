import { useEffect, useRef } from 'react';
import { bookings } from '../api';

const DEFAULT_INTERVAL_MS = 8000;

/**
 * Refetch `/bookings/my` on an interval while enabled. Pauses when the tab is hidden;
 * runs once when the tab becomes visible again.
 */
export function useMyBookingsPolling(setMyBookings, { enabled = true, intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  const setRef = useRef(setMyBookings);
  setRef.current = setMyBookings;

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      bookings
        .my()
        .then((list) => {
          if (!cancelled) setRef.current(list);
        })
        .catch(() => {
          if (!cancelled) setRef.current([]);
        });
    };

    tick();
    const id = setInterval(tick, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs]);
}

/**
 * Refetch mechanic "my" + "available" lists on an interval while mounted.
 */
export function useMechanicBookingsPolling(setMyBookings, setAvailableJobs, { intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  const myRef = useRef(setMyBookings);
  const availRef = useRef(setAvailableJobs);
  myRef.current = setMyBookings;
  availRef.current = setAvailableJobs;

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      bookings
        .my()
        .then((list) => {
          if (!cancelled) myRef.current(list);
        })
        .catch(() => {
          if (!cancelled) myRef.current([]);
        });
      bookings
        .available()
        .then((list) => {
          if (!cancelled) availRef.current(list);
        })
        .catch(() => {
          if (!cancelled) availRef.current([]);
        });
    };

    tick();
    const id = setInterval(tick, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
}

function bookingRowChanged(prev, next) {
  if (!prev || !next) return true;
  return (
    prev.status !== next.status ||
    prev.mechanic_id !== next.mechanic_id ||
    (prev.mechanic_name || '') !== (next.mechanic_name || '') ||
    String(prev.updated_at || '') !== String(next.updated_at || '') ||
    Boolean(prev.has_review) !== Boolean(next.has_review)
  );
}

/**
 * Keep an open booking detail modal in sync when the parent list is refreshed.
 */
export function useSyncSelectedBookingFromList(setSelectedBooking, list) {
  useEffect(() => {
    setSelectedBooking((prev) => {
      if (!prev) return prev;
      const next = list.find((b) => b.id === prev.id);
      if (!next) return prev;
      return bookingRowChanged(prev, next) ? next : prev;
    });
  }, [list, setSelectedBooking]);
}
