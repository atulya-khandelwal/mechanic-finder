import { useState, useEffect } from 'react';
import { mechanics, bookings, reviews } from '../api';
import BookingChat from '../components/BookingChat';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function MechanicDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ latitude: '', longitude: '', address: '', specialization: '', hourlyRate: '', isAvailable: true });
  const [myReviews, setMyReviews] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    if (user?.mechanicProfile) {
      setProfile(user.mechanicProfile);
      setForm({
        latitude: user.mechanicProfile.latitude || '',
        longitude: user.mechanicProfile.longitude || '',
        address: user.mechanicProfile.address || '',
        specialization: user.mechanicProfile.specialization || '',
        hourlyRate: user.mechanicProfile.hourly_rate || '',
        isAvailable: user.mechanicProfile.is_available ?? true,
      });
    }
  }, [user]);

  useEffect(() => {
    bookings.my().then(setMyBookings).catch(() => setMyBookings([]));
    bookings.available().then(setAvailableJobs).catch(() => setAvailableJobs([]));
  }, []);

  useEffect(() => {
    if (profile?.id) {
      reviews.byMechanic(profile.id).then(setMyReviews).catch(() => setMyReviews([]));
    }
  }, [profile?.id]);

  const refreshBookings = () => {
    bookings.my().then(setMyBookings).catch(() => setMyBookings([]));
    bookings.available().then(setAvailableJobs).catch(() => setAvailableJobs([]));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const body = {
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        address: form.address || null,
        specialization: form.specialization || null,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
        isAvailable: form.isAvailable,
      };
      const updated = profile
        ? await mechanics.updateProfile(body)
        : await mechanics.createProfile(body);
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const updateStatus = async (bookingId, status) => {
    try {
      await bookings.updateStatus(bookingId, status);
      refreshBookings();
    } catch (err) {
      alert(err.message);
    }
  };

  const claimJob = async (bookingId) => {
    try {
      await bookings.claim(bookingId);
      refreshBookings();
    } catch (err) {
      alert(err.message);
    }
  };

  const { logout } = useAuth();

  return (
    <div className="dashboard mechanic-dashboard">
      <header>
        <div>
          <h1>Mechanic Dashboard</h1>
          <p>Welcome, {user?.full_name}</p>
        </div>
        <div>
          <ThemeToggle />
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="profile-section">
        <h2>My Profile</h2>
        {!profile && !editing ? (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>Create Mechanic Profile</button>
        ) : (
          <form onSubmit={saveProfile}>
            {editing && (
              <>
                <input type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} />
                <input type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} />
                <input placeholder="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                <input placeholder="Specialization" value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} />
                <input type="number" step="0.01" placeholder="Hourly Rate (₹)" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} />
                <label><input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} /> Available for jobs</label>
                <button type="submit" className="btn btn-primary">Save</button>
                {profile && <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>}
              </>
            )}
            {profile && !editing && (
              <div className="profile-display">
                <p>📍 {profile.address || `${profile.latitude}, ${profile.longitude}`}</p>
                <p>Specialization: {profile.specialization || '-'}</p>
                <p>Rate: ₹{profile.hourly_rate}/hr</p>
                <p>Status: {profile.is_available ? 'Available' : 'Unavailable'}</p>
                <p>⭐ Rating: {Number(profile.rating || 0).toFixed(1)} ({profile.total_reviews || 0} reviews)</p>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>Edit Profile</button>
              </div>
            )}
          </form>
        )}
      </section>

      {myReviews.length > 0 && (
        <section className="bookings-section">
          <h2>My Reviews</h2>
          {myReviews.slice(0, 5).map((r) => (
            <div key={r.id} className="review-item">
              <div className="review-header">
                <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <span className="review-user">{r.user_name}</span>
                <span className="review-date">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="review-comment">{r.comment}</p>}
            </div>
          ))}
        </section>
      )}

      {availableJobs.length > 0 && (
        <section className="bookings-section">
          <h2>Available Jobs Near You</h2>
          {availableJobs.map((b) => (
            <div key={b.id} className="booking-card available">
              <strong>{b.category_name}</strong>
              <span>{b.category_type}</span>
              <span>Customer: {b.user_name} {b.user_phone}</span>
              <span>{b.distance_km != null ? Number(b.distance_km).toFixed(1) : '-'} km away</span>
              <button className="btn btn-primary" onClick={() => claimJob(b.id)}>Claim Job</button>
            </div>
          ))}
        </section>
      )}

      <section className="bookings-section">
        <h2>My Bookings</h2>
        {myBookings.length === 0 ? (
          <p>No bookings assigned yet</p>
        ) : (
          myBookings.map((b) => (
            <div key={b.id} className="booking-card clickable" onClick={() => setSelectedBooking(b)}>
              <strong>{b.category_name}</strong>
              <span className={`badge ${b.status}`}>{b.status}</span>
              <span>Customer: {b.user_name} {b.user_phone}</span>
              <span>Location: {b.user_address || `${b.user_latitude}, ${b.user_longitude}`}</span>
              <span>{new Date(b.created_at).toLocaleString()}</span>
              {b.status === 'pending' && (
                <div onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-primary" onClick={() => updateStatus(b.id, 'accepted')}>Accept</button>
                  <button className="btn btn-secondary" onClick={() => updateStatus(b.id, 'cancelled')}>Decline</button>
                </div>
              )}
              {b.status === 'accepted' && (
                <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); updateStatus(b.id, 'in_progress'); }}>Start Job</button>
              )}
              {b.status === 'in_progress' && (
                <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); updateStatus(b.id, 'completed'); }}>Mark Complete</button>
              )}
              <span className="tap-hint">Tap for details & chat</span>
            </div>
          ))
        )}
      </section>

      {selectedBooking && (
        <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="modal-content booking-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="booking-detail-header">
              <h3>Booking Details</h3>
              <span className={`badge ${selectedBooking.status}`}>{selectedBooking.status}</span>
            </div>

            <div className="booking-detail-section">
              <h4>Service</h4>
              <p><strong>{selectedBooking.category_name}</strong></p>
              <p>Type: {selectedBooking.category_type}</p>
            </div>

            <div className="booking-detail-section">
              <h4>Customer</h4>
              <p>{selectedBooking.user_name}</p>
              {selectedBooking.user_phone && <p>Phone: {selectedBooking.user_phone}</p>}
              <p>Address: {selectedBooking.user_address || `${selectedBooking.user_latitude}, ${selectedBooking.user_longitude}`}</p>
            </div>

            <div className="booking-detail-section">
              <h4>Problem</h4>
              <p>{selectedBooking.problem_description || selectedBooking.description || '-'}</p>
            </div>

            {selectedBooking.mechanic_id && ['accepted', 'in_progress'].includes(selectedBooking.status) && (
              <div className="booking-detail-section">
                <BookingChat
                  bookingId={selectedBooking.id}
                  otherPartyName={selectedBooking.user_name || 'Customer'}
                />
              </div>
            )}

            <div className="booking-detail-section">
              <h4>Actions</h4>
              {selectedBooking.status === 'pending' && (
                <div>
                  <button className="btn btn-primary" onClick={() => { updateStatus(selectedBooking.id, 'accepted'); setSelectedBooking(null); }}>Accept</button>
                  <button className="btn btn-secondary" onClick={() => { updateStatus(selectedBooking.id, 'cancelled'); setSelectedBooking(null); }}>Decline</button>
                </div>
              )}
              {selectedBooking.status === 'accepted' && (
                <button className="btn btn-primary" onClick={() => { updateStatus(selectedBooking.id, 'in_progress'); refreshBookings(); }}>Start Job</button>
              )}
              {selectedBooking.status === 'in_progress' && (
                <button className="btn btn-primary" onClick={() => { updateStatus(selectedBooking.id, 'completed'); setSelectedBooking(null); }}>Mark Complete</button>
              )}
            </div>

            <button className="btn btn-secondary" onClick={() => setSelectedBooking(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
