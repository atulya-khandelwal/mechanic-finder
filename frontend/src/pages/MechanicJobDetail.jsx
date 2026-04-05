import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookings, resolvePublicUrl } from '../api';
import BookingChat from '../components/BookingChat';
import { mechanicJobStatusPresentation } from '../utils/bookingStatus';

const CURRENCY = '₹';

export default function MechanicJobDetail({ bookingId, onRefresh }) {
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cashConfirmBusy, setCashConfirmBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    bookings
      .getOne(bookingId)
      .then(setBooking)
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const fmtMoney = (n) => `${CURRENCY}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const updateStatus = async (status) => {
    try {
      await bookings.updateStatus(bookingId, status);
      onRefresh?.();
      if (status === 'cancelled' || status === 'completed') navigate('/mechanic/jobs');
      else load();
    } catch (err) {
      alert(err.message);
    }
  };

  const claim = async () => {
    try {
      await bookings.claim(bookingId);
      onRefresh?.();
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const rejectOpen = async () => {
    try {
      await bookings.reject(bookingId);
      onRefresh?.();
      navigate('/mechanic/jobs');
    } catch (err) {
      alert(err.detail ? `${err.message}\n\n${err.detail}` : err.message);
    }
  };

  const confirmCashPayment = async () => {
    try {
      setCashConfirmBusy(true);
      await bookings.confirmCashPayment(bookingId);
      onRefresh?.();
      load();
    } catch (err) {
      alert(err.message || 'Could not confirm payment');
    } finally {
      setCashConfirmBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="booking-detail-page" aria-busy="true">
        <p className="mws-muted">Loading job…</p>
      </section>
    );
  }

  if (error || !booking) {
    return (
      <section className="booking-detail-page booking-detail-page--error">
        <p className="mws-muted">{error || 'Booking not found.'}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/mechanic/jobs')}>
          Back to jobs
        </button>
      </section>
    );
  }

  const isOpenPool = !booking.mechanic_id && booking.status === 'pending';
  const statusBadge = mechanicJobStatusPresentation(booking);

  return (
    <section className="booking-detail-page booking-detail-page--mechanic" aria-label="Job details">
      <div className="booking-detail-page-toolbar">
        <button type="button" className="btn btn-secondary booking-detail-back" onClick={() => navigate('/mechanic/jobs')}>
          ← Back to jobs
        </button>
      </div>

      <header className="booking-detail-page-header">
        <div>
          <p className="booking-detail-kicker">Job request</p>
          <h2 className="booking-detail-title">{booking.category_name || 'Booking'}</h2>
          {booking.category_type && <p className="booking-detail-sub">{booking.category_type}</p>}
        </div>
        <div className="booking-detail-header-aside">
          <span className={statusBadge.className}>{statusBadge.text}</span>
          {booking.distance_km != null && (
            <span className="booking-detail-pill">{Number(booking.distance_km).toFixed(1)} km</span>
          )}
        </div>
      </header>

      {booking.total_price != null && (
        <div className="booking-detail-price-strip">
          <span className="booking-detail-price-label">Total</span>
          <span className="booking-detail-price-value">{fmtMoney(booking.total_price)}</span>
        </div>
      )}

      {booking.payment_method && (
        <p className="mws-muted mechanic-payment-intent">
          Payment:{' '}
          {booking.payment_method === 'online'
            ? 'Customer pays online (Razorpay)'
            : 'Cash on delivery (customer pays you in cash)'}
          {booking.payment_status === 'paid' ? ' — received / recorded.' : ' — not marked paid yet.'}
        </p>
      )}

      {booking.status === 'completed' &&
        booking.payment_method !== 'online' &&
        booking.payment_status !== 'paid' && (
          <div className="mws-detail-card mechanic-cod-confirm">
            <h3 className="mws-detail-card-title">Cash payment</h3>
            <p className="mws-muted">If the customer paid you in cash for this job, confirm below so their app shows Paid.</p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={cashConfirmBusy}
              onClick={confirmCashPayment}
            >
              {cashConfirmBusy ? 'Saving…' : 'Confirm cash received'}
            </button>
          </div>
        )}

      {isOpenPool && (
        <div className="mws-detail-card mws-detail-card--actions booking-detail-open-actions">
          <h3 className="mws-detail-card-title">Open request</h3>
          <p className="mws-muted">Accept to assign this job to you, or reject if you cannot take it.</p>
          <div className="mws-modal-action-row">
            <button type="button" className="btn btn-primary mws-modal-action-primary" onClick={claim}>
              Accept job
            </button>
            <button type="button" className="btn btn-secondary mws-modal-action-secondary" onClick={rejectOpen}>
              Reject
            </button>
          </div>
        </div>
      )}

      <div className="booking-detail-grid">
        <div className="mws-detail-card" aria-labelledby="bd-customer">
          <h3 id="bd-customer" className="mws-detail-card-title">
            Customer
          </h3>
          <dl className="mws-detail-dl">
            <div className="mws-detail-row">
              <dt>Name</dt>
              <dd>{booking.user_name || '—'}</dd>
            </div>
            {booking.user_phone && (
              <div className="mws-detail-row">
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${booking.user_phone}`} className="mws-detail-link">
                    {booking.user_phone}
                  </a>
                </dd>
              </div>
            )}
            <div className="mws-detail-row mws-detail-row--block">
              <dt>Service address</dt>
              <dd>{booking.user_address || `${booking.user_latitude ?? '—'}, ${booking.user_longitude ?? '—'}`}</dd>
            </div>
          </dl>
        </div>

        {(booking.vehicle_number || booking.vehicle_make || booking.vehicle_model || booking.vehicle_image) && (
          <div className="mws-detail-card" aria-labelledby="bd-vehicle">
            <h3 id="bd-vehicle" className="mws-detail-card-title">
              Vehicle
            </h3>
            <dl className="mws-detail-dl">
              {booking.vehicle_number && (
                <div className="mws-detail-row">
                  <dt>Registration</dt>
                  <dd>{booking.vehicle_number}</dd>
                </div>
              )}
              {(booking.vehicle_make || booking.vehicle_model || booking.vehicle_year) && (
                <div className="mws-detail-row">
                  <dt>Vehicle</dt>
                  <dd>{[booking.vehicle_make, booking.vehicle_model, booking.vehicle_year].filter(Boolean).join(' ')}</dd>
                </div>
              )}
            </dl>
            {booking.vehicle_image && (
              <img src={resolvePublicUrl(booking.vehicle_image)} alt="Customer vehicle" className="booking-detail-vehicle-img" />
            )}
          </div>
        )}

        <div className="mws-detail-card mws-detail-card--wide" aria-labelledby="bd-problem">
          <h3 id="bd-problem" className="mws-detail-card-title">
            Problem description
          </h3>
          <div className="mws-problem-box">{booking.problem_description || booking.description || 'No description provided.'}</div>
        </div>

        {!isOpenPool && (
          <div className="mws-detail-card mws-detail-card--actions" aria-label="Next step">
            <h3 className="mws-detail-card-title">Next step</h3>
            {booking.status === 'pending' && booking.mechanic_id && (
              <div className="mws-modal-action-row">
                <button type="button" className="btn btn-primary mws-modal-action-primary" onClick={() => updateStatus('accepted')}>
                  Accept job
                </button>
                <button type="button" className="btn btn-secondary mws-modal-action-secondary" onClick={() => updateStatus('cancelled')}>
                  Decline
                </button>
              </div>
            )}
            {booking.status === 'accepted' && (
              <div className="mws-modal-action-row">
                <button type="button" className="btn btn-primary mws-modal-action-primary" onClick={() => updateStatus('in_progress')}>
                  Start job
                </button>
              </div>
            )}
            {booking.status === 'in_progress' && (
              <div className="mws-modal-action-row">
                <button type="button" className="btn btn-primary mws-modal-action-primary" onClick={() => updateStatus('completed')}>
                  Mark complete
                </button>
              </div>
            )}
            {!['pending', 'accepted', 'in_progress'].includes(booking.status) && (
              <p className="mws-muted mws-detail-no-actions">
                {booking.status === 'rejected'
                  ? 'You declined this request when it was open. The customer has been notified.'
                  : 'No actions for this status.'}
              </p>
            )}
          </div>
        )}

        {booking.mechanic_id && (
          <div className="mws-detail-card mws-detail-card--chat mws-detail-card--wide" aria-label="Messages">
            <BookingChat bookingId={booking.id} otherPartyName={booking.user_name || 'Customer'} status={booking.status} viewerRole="mechanic" />
          </div>
        )}
      </div>
    </section>
  );
}
