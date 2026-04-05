import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookings, payments, resolvePublicUrl } from '../api';
import BookingChat from '../components/BookingChat';
import { humanizeBookingStatus } from '../utils/bookingStatus';
import { useAuth } from '../context/AuthContext';

function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });
}

const CURRENCY = '₹';

export default function UserBookingDetail({ bookingId, onLeaveReview }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [payKeyId, setPayKeyId] = useState(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payMessage, setPayMessage] = useState('');

  const load = useCallback((silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    bookings
      .getOne(bookingId)
      .then(setBooking)
      .catch((err) => {
        if (!silent) setError(err.message || 'Failed to load');
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [bookingId]);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    payments
      .config()
      .then((c) => {
        setPaymentsEnabled(!!c.enabled);
        setPayKeyId(c.keyId || null);
      })
      .catch(() => {
        setPaymentsEnabled(false);
        setPayKeyId(null);
      });
  }, []);

  useEffect(() => {
    if (loading || error || !booking) return undefined;
    const isCod = booking.payment_method !== 'online';
    if (!isCod || booking.payment_status === 'paid' || booking.status !== 'completed') {
      return undefined;
    }
    const t = setInterval(() => load(true), 12000);
    return () => clearInterval(t);
  }, [loading, error, booking, load]);

  if (loading) {
    return (
      <section className="booking-detail-page" aria-busy="true">
        <p className="mws-muted">Loading booking…</p>
      </section>
    );
  }

  if (error || !booking) {
    return (
      <section className="booking-detail-page booking-detail-page--error">
        <p className="mws-muted">{error || 'Booking not found.'}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/user/bookings')}>
          Back to my bookings
        </button>
      </section>
    );
  }

  const isPaid = booking.payment_status === 'paid';
  const totalNum = booking.total_price != null ? Number(booking.total_price) : 0;
  const payOnline = booking.payment_method === 'online';
  const canPay =
    paymentsEnabled &&
    payKeyId &&
    !isPaid &&
    payOnline &&
    !['cancelled', 'rejected'].includes(booking.status) &&
    totalNum >= 1;

  const handlePay = async () => {
    if (!canPay) return;
    setPayMessage('');
    setPayBusy(true);
    try {
      await loadRazorpayScript();
      const order = await payments.createRazorpayOrder(booking.id);
      const key = order.keyId || payKeyId;
      const options = {
        key,
        order_id: order.orderId,
        currency: order.currency || 'INR',
        name: 'Mobile Mechanic',
        description: `Service — ${booking.category_name || 'booking'}`,
        handler: async (response) => {
          try {
            await payments.verifyRazorpay({
              bookingId: booking.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPayMessage('Payment successful.');
            setPayBusy(false);
            load(true);
          } catch (e) {
            setPayMessage(e.message || 'Verification failed');
            setPayBusy(false);
          }
        },
        prefill: {
          name: user?.full_name || '',
          email: user?.email || '',
        },
        theme: { color: '#4f46e5' },
        modal: { ondismiss: () => setPayBusy(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (ev) => {
        const desc = ev?.error?.description || ev?.error?.reason || 'Payment failed';
        setPayMessage(desc);
        setPayBusy(false);
      });
      rzp.open();
      setPayBusy(false);
    } catch (e) {
      setPayMessage(e.message || 'Could not start payment');
      setPayBusy(false);
    }
  };

  return (
    <section className="booking-detail-page booking-detail-page--user" aria-label="Booking details">
      <div className="booking-detail-page-toolbar">
        <button type="button" className="btn btn-secondary booking-detail-back" onClick={() => navigate('/user/bookings')}>
          ← Back to my bookings
        </button>
      </div>

      <header className="booking-detail-page-header">
        <div>
          <p className="booking-detail-kicker">Booking</p>
          <h2 className="booking-detail-title">{booking.category_name}</h2>
        </div>
        <span className={`badge ${booking.status}`}>{humanizeBookingStatus(booking.status)}</span>
      </header>

      {booking.status === 'rejected' && (
        <div className="booking-detail-notice">
          <p>No mechanic accepted this request. You can submit a new service request when you are ready.</p>
        </div>
      )}

      <div className="booking-detail-grid">
        <div className="booking-detail-card">
          <h3 className="booking-detail-card-title">Service</h3>
          <p className="booking-detail-lead">
            <strong>{booking.category_name}</strong>
          </p>
          <p className="mws-muted">Type: {booking.service_type || booking.category_type || '—'}</p>
        </div>

        {booking.mechanic_name && (
          <div className="booking-detail-card">
            <h3 className="booking-detail-card-title">Mechanic</h3>
            <p>{booking.mechanic_name}</p>
            {booking.mechanic_phone && (
              <p>
                Phone:{' '}
                <a href={`tel:${booking.mechanic_phone}`} className="mws-detail-link">
                  {booking.mechanic_phone}
                </a>
              </p>
            )}
          </div>
        )}

        <div className="booking-detail-card">
          <h3 className="booking-detail-card-title">Vehicle</h3>
          <p>Number: {booking.vehicle_number || '—'}</p>
          {(booking.vehicle_make || booking.vehicle_model) && (
            <p>{[booking.vehicle_make, booking.vehicle_model, booking.vehicle_year].filter(Boolean).join(' ')}</p>
          )}
          {booking.vehicle_image && (
            <img src={resolvePublicUrl(booking.vehicle_image)} alt="Vehicle" className="booking-detail-vehicle-img" />
          )}
        </div>

        <div className="booking-detail-card booking-detail-card--wide">
          <h3 className="booking-detail-card-title">Problem / issue</h3>
          <p className="booking-detail-body">{booking.problem_description || booking.description || '—'}</p>
        </div>

        <div className="booking-detail-card booking-detail-card--wide">
          <h3 className="booking-detail-card-title">Location & time</h3>
          <p>Service at: {booking.service_location === 'home' ? 'Home' : 'Mechanic location'}</p>
          <p>Address: {booking.user_address || `${booking.user_latitude}, ${booking.user_longitude}`}</p>
          <p>Booked: {new Date(booking.created_at).toLocaleString()}</p>
          {booking.scheduled_at && <p>Scheduled: {new Date(booking.scheduled_at).toLocaleString()}</p>}
        </div>

        <div className="booking-detail-card booking-detail-card--payment">
          <h3 className="booking-detail-card-title">Pricing</h3>
          <p>Base: {CURRENCY}{booking.base_charge}</p>
          <p>Service: {CURRENCY}{booking.service_price}</p>
          {booking.home_service_fee > 0 && <p>Home fee: {CURRENCY}{booking.home_service_fee}</p>}
          <p className="booking-detail-total">Total: {CURRENCY}{booking.total_price}</p>
          <p className="booking-payment-status">
            Payment:{' '}
            {isPaid ? (
              <span className="booking-payment-badge booking-payment-badge--paid">Paid</span>
            ) : (
              <span className="booking-payment-badge booking-payment-badge--unpaid">Not paid</span>
            )}
            {isPaid && (
              <span className="booking-pay-method-label">
                {' '}
                ({booking.razorpay_payment_id ? 'online' : 'cash'})
              </span>
            )}
          </p>
          {!isPaid && payOnline && (
            <p className="booking-pay-intent mws-muted">You chose to pay online (Razorpay).</p>
          )}
          {!isPaid && !payOnline && (
            <p className="booking-cod-copy">
              Cash on delivery: pay the mechanic when the service is done. After they confirm they received cash, this page will show <strong>Paid</strong> (refresh if needed).
            </p>
          )}
          {canPay && (
            <button
              type="button"
              className="btn btn-primary booking-pay-btn"
              disabled={payBusy}
              onClick={handlePay}
            >
              {payBusy ? 'Opening…' : `Pay ${CURRENCY}${totalNum.toFixed(0)} with Razorpay`}
            </button>
          )}
          {payMessage && (
            <p className={`booking-pay-message ${payMessage.includes('successful') ? 'booking-pay-message--ok' : ''}`}>
              {payMessage}
            </p>
          )}
          {!paymentsEnabled && payOnline && !isPaid && (
            <p className="mws-muted booking-pay-hint">Online payment is not configured on this server.</p>
          )}
        </div>

        {booking.mechanic_id && (
          <div className="booking-detail-card booking-detail-card--wide">
            <BookingChat
              bookingId={booking.id}
              otherPartyName={booking.mechanic_name || 'Mechanic'}
              status={booking.status}
              viewerRole="user"
            />
          </div>
        )}

        {booking.has_review && booking.review_rating && (
          <div className="booking-detail-card booking-detail-card--wide your-review">
            <h3 className="booking-detail-card-title">Your review</h3>
            <div className="review-item">
              <span className="review-stars">{'★'.repeat(booking.review_rating)}{'☆'.repeat(5 - booking.review_rating)}</span>
              {booking.review_comment && <p className="review-comment">{booking.review_comment}</p>}
              {booking.review_date && (
                <span className="review-date">Reviewed {new Date(booking.review_date).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="booking-detail-footer-actions">
        {booking.status === 'completed' && booking.mechanic_id && !booking.has_review && (
          <button type="button" className="btn btn-primary" onClick={() => onLeaveReview?.(booking)}>
            Leave review
          </button>
        )}
      </div>
    </section>
  );
}
