import { useState, useEffect } from 'react';
import { useLocation as useLoc } from '../context/LocationContext';
import { mechanics, services, bookings, upload, reviews } from '../api';
import BookingChat from '../components/BookingChat';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const BASE_CHARGE = 25;
const HOME_SERVICE_FEE = 15;
const CURRENCY = '₹';

export default function UserDashboard() {
  const { location, clearLocation } = useLoc();
  const { user } = useAuth();
  const [mechanicsList, setMechanicsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('find');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicleImage, setVehicleImage] = useState(null);
  const [vehicleImageUrl, setVehicleImageUrl] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [serviceLocation, setServiceLocation] = useState('home');
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [mechanicReviews, setMechanicReviews] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    if (location) {
      mechanics.nearby(location.latitude, location.longitude).then(setMechanicsList).catch(() => setMechanicsList([]));
    }
  }, [location]);

  useEffect(() => {
    services.categories().then(setCategories);
  }, []);

  useEffect(() => {
    bookings.my().then(setMyBookings).catch(() => setMyBookings([]));
  }, [activeTab]);

  useEffect(() => {
    if (mechanicReviews?.mechanicId) {
      const id = mechanicReviews.mechanicId;
      reviews.byMechanic(id).then((list) => setMechanicReviews((prev) => prev?.mechanicId === id ? { ...prev, list } : prev)).catch(() => setMechanicReviews(null));
    }
  }, [mechanicReviews?.mechanicId]);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVehicleImage(file);
    try {
      const url = await upload.vehicleImage(file);
      setVehicleImageUrl(url);
    } catch (err) {
      alert(err.message);
      setVehicleImage(null);
    }
  };

  const servicePrice = selectedService?.base_price ? Number(selectedService.base_price) : 50;
  const homeFee = serviceLocation === 'home' ? HOME_SERVICE_FEE : 0;
  const totalPrice = BASE_CHARGE + servicePrice + homeFee;

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedService || !location) return;
    if (!vehicleNumber.trim() || !problemDescription.trim()) {
      alert('Please fill vehicle number and problem description');
      return;
    }
    setLoading(true);
    try {
      await bookings.create({
        categoryId: selectedService.id,
        serviceType: selectedService.type,
        userLatitude: location.latitude,
        userLongitude: location.longitude,
        userAddress: location.address,
        mechanicId: selectedMechanic?.id,
        description: problemDescription,
        problemDescription,
        scheduledAt: selectedService.type === 'scheduled' ? scheduledAt : undefined,
        vehicleImage: vehicleImageUrl || undefined,
        vehicleNumber: vehicleNumber.trim(),
        vehicleMake: vehicleMake.trim() || undefined,
        vehicleModel: vehicleModel.trim() || undefined,
        vehicleYear: vehicleYear ? parseInt(vehicleYear, 10) : undefined,
        serviceLocation,
      });
      setSelectedService(null);
      setSelectedMechanic(null);
      setDescription('');
      setProblemDescription('');
      setVehicleImage(null);
      setVehicleImageUrl('');
      setVehicleNumber('');
      setVehicleMake('');
      setVehicleModel('');
      setVehicleYear('');
      setActiveTab('bookings');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setLoading(true);
    try {
      await reviews.submit(reviewBooking.id, reviewRating, reviewComment);
      setReviewBooking(null);
      setReviewRating(5);
      setReviewComment('');
      bookings.my().then(setMyBookings);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const emergencyCategories = categories.filter((c) => c.type === 'emergency');
  const scheduledCategories = categories.filter((c) => c.type === 'scheduled');

  const { logout } = useAuth();

  return (
    <div className="dashboard user-dashboard">
      <header>
        <div>
          <h1>Find a Mechanic</h1>
          <p>Location: {location?.address || `${location?.latitude?.toFixed(4)}, ${location?.longitude?.toFixed(4)}`}</p>
        </div>
        <div>
          <ThemeToggle />
          <button className="logout-btn" onClick={clearLocation} style={{ marginRight: '0.5rem' }}>Change location</button>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={activeTab === 'find' ? 'active' : ''} onClick={() => setActiveTab('find')}>Find Mechanics</button>
        <button className={activeTab === 'bookings' ? 'active' : ''} onClick={() => setActiveTab('bookings')}>My Bookings</button>
      </nav>

      {activeTab === 'find' && (
        <div className="content">
          {!selectedService ? (
            <div className="service-types">
              <section>
                <h3>🚨 Emergency Service</h3>
                {emergencyCategories.map((c) => (
                  <button key={c.id} className="service-card emergency" onClick={() => setSelectedService(c)}>
                    <strong>{c.name}</strong>
                    <span>{c.description}</span>
                  </button>
                ))}
              </section>
              <section>
                <h3>📅 Scheduled Service</h3>
                {scheduledCategories.map((c) => (
                  <button key={c.id} className="service-card scheduled" onClick={() => setSelectedService(c)}>
                    <strong>{c.name}</strong>
                    <span>{c.description}</span>
                  </button>
                ))}
              </section>
            </div>
          ) : (
            <div className="booking-flow">
              <button className="back" onClick={() => setSelectedService(null)}>← Back</button>
              <h3>Book: {selectedService.name}</h3>

              <h4>Nearby Mechanics ({mechanicsList.length}) <span style={{ fontWeight: 'normal', color: '#94a3b8', fontSize: '0.9rem' }}>— Select one or leave unselected for mechanics to claim</span></h4>
              <div className="mechanics-list">
                {mechanicsList.length === 0 ? (
                  <p>No mechanics found within 10km</p>
                ) : (
                  mechanicsList.map((m) => (
                    <div
                      key={m.id}
                      className={`mechanic-card ${selectedMechanic?.id === m.id ? 'selected' : ''}`}
                      onClick={() => setSelectedMechanic(selectedMechanic?.id === m.id ? null : m)}
                    >
                      <strong>{m.full_name}</strong>
                      <span>{m.specialization || 'General'}</span>
                      <span>⭐ {Number(m.rating || 0).toFixed(1)} ({m.total_reviews || 0} reviews)</span>
                      <span>{m.distance_km != null ? Number(m.distance_km).toFixed(1) : '-'} km away</span>
                      {m.hourly_rate && <span>{CURRENCY}{m.hourly_rate}/hr</span>}
                      {(m.total_reviews || 0) > 0 && (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={(e) => { e.stopPropagation(); setMechanicReviews(mechanicReviews?.mechanicId === m.id ? null : { mechanicId: m.id, mechanicName: m.full_name }); }}
                        >
                          View reviews
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleBook} className="booking-form">
                <h4>Vehicle Details</h4>
                <label>Vehicle Image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {vehicleImageUrl && <img src={vehicleImageUrl} alt="Vehicle" className="vehicle-preview" />}
                <input placeholder="Vehicle Number (Plate)" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} required />
                <input placeholder="Make (e.g. Honda, Toyota)" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} />
                <input placeholder="Model (e.g. Civic, Camry)" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
                <input type="number" placeholder="Year (e.g. 2020)" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} min="1990" max="2030" />

                <h4>Problem / Issue</h4>
                <textarea placeholder="Describe the problem with your vehicle" value={problemDescription} onChange={(e) => setProblemDescription(e.target.value)} required rows={3} />

                <h4>Service Location</h4>
                <div className="radio-group">
                  <label>
                    <input type="radio" name="location" checked={serviceLocation === 'home'} onChange={() => setServiceLocation('home')} />
                    Home Service (+{CURRENCY}{HOME_SERVICE_FEE})
                  </label>
                  <label>
                    <input type="radio" name="location" checked={serviceLocation === 'mechanic_location'} onChange={() => setServiceLocation('mechanic_location')} />
                    At Mechanic Location
                  </label>
                </div>

                {selectedService.type === 'scheduled' && (
                  <>
                    <h4>Preferred Date & Time</h4>
                    <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
                  </>
                )}

                <div className="price-breakdown">
                  <h4>Price Breakdown</h4>
                  <p>Base charge: {CURRENCY}{BASE_CHARGE}</p>
                  <p>{selectedService?.name}: {CURRENCY}{servicePrice}</p>
                  {serviceLocation === 'home' && <p>Home service fee: {CURRENCY}{HOME_SERVICE_FEE}</p>}
                  <p className="total">Total: {CURRENCY}{totalPrice}</p>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Booking...' : 'Request Service'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="content bookings-list">
          {myBookings.length === 0 ? (
            <p>No bookings yet</p>
          ) : (
            myBookings.map((b) => (
              <div key={b.id} className="booking-card clickable" onClick={() => setSelectedBooking(b)}>
                <strong>{b.category_name}</strong>
                <span className={`badge ${b.status}`}>{b.status}</span>
                {b.mechanic_name && <span>Mechanic: {b.mechanic_name}</span>}
                <span>{new Date(b.created_at).toLocaleString()}</span>
                {b.has_review && <span className="reviewed-badge">✓ Reviewed</span>}
                {b.status === 'completed' && b.mechanic_id && !b.has_review && (
                  <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); setReviewBooking(b); }} style={{ marginTop: '0.5rem' }}>
                    ⭐ Leave Review
                  </button>
                )}
                <span className="tap-hint">Tap for details</span>
              </div>
            ))
          )}
        </div>
      )}

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
              <p>Type: {selectedBooking.service_type}</p>
            </div>

            {selectedBooking.mechanic_name && (
              <div className="booking-detail-section">
                <h4>Mechanic</h4>
                <p>{selectedBooking.mechanic_name}</p>
                {selectedBooking.mechanic_phone && <p>Phone: {selectedBooking.mechanic_phone}</p>}
              </div>
            )}

            <div className="booking-detail-section">
              <h4>Vehicle</h4>
              <p>Number: {selectedBooking.vehicle_number || '-'}</p>
              {(selectedBooking.vehicle_make || selectedBooking.vehicle_model) && (
                <p>{[selectedBooking.vehicle_make, selectedBooking.vehicle_model, selectedBooking.vehicle_year].filter(Boolean).join(' ')}</p>
              )}
              {selectedBooking.vehicle_image && <img src={selectedBooking.vehicle_image} alt="Vehicle" className="booking-detail-image" />}
            </div>

            <div className="booking-detail-section">
              <h4>Problem / Issue</h4>
              <p>{selectedBooking.problem_description || selectedBooking.description || '-'}</p>
            </div>

            <div className="booking-detail-section">
              <h4>Location & Time</h4>
              <p>Service at: {selectedBooking.service_location === 'home' ? 'Home' : 'Mechanic Location'}</p>
              <p>Address: {selectedBooking.user_address || `${selectedBooking.user_latitude}, ${selectedBooking.user_longitude}`}</p>
              <p>Booked: {new Date(selectedBooking.created_at).toLocaleString()}</p>
              {selectedBooking.scheduled_at && <p>Scheduled: {new Date(selectedBooking.scheduled_at).toLocaleString()}</p>}
            </div>

            <div className="booking-detail-section">
              <h4>Pricing</h4>
              <p>Base: {CURRENCY}{selectedBooking.base_charge}</p>
              <p>Service: {CURRENCY}{selectedBooking.service_price}</p>
              {selectedBooking.home_service_fee > 0 && <p>Home fee: {CURRENCY}{selectedBooking.home_service_fee}</p>}
              <p className="total">Total: {CURRENCY}{selectedBooking.total_price}</p>
            </div>

            {selectedBooking.mechanic_id &&
              ['accepted', 'in_progress'].includes(selectedBooking.status) && (
              <div className="booking-detail-section">
                <BookingChat
                  bookingId={selectedBooking.id}
                  otherPartyName={selectedBooking.mechanic_name || 'Mechanic'}
                />
              </div>
            )}

            {selectedBooking.has_review && selectedBooking.review_rating && (
              <div className="booking-detail-section your-review">
                <h4>Your Review</h4>
                <div className="review-item">
                  <span className="review-stars">{'★'.repeat(selectedBooking.review_rating)}{'☆'.repeat(5 - selectedBooking.review_rating)}</span>
                  {selectedBooking.review_comment && <p className="review-comment">{selectedBooking.review_comment}</p>}
                  {selectedBooking.review_date && <span className="review-date">Reviewed {new Date(selectedBooking.review_date).toLocaleDateString()}</span>}
                </div>
              </div>
            )}

            <div className="modal-actions">
              {selectedBooking.status === 'completed' && selectedBooking.mechanic_id && !selectedBooking.has_review && (
                <button className="btn btn-primary" onClick={() => { setSelectedBooking(null); setReviewBooking(selectedBooking); }}>⭐ Leave Review</button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedBooking(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {mechanicReviews && (
        <div className="modal-overlay" onClick={() => setMechanicReviews(null)}>
          <div className="modal-content reviews-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reviews for {mechanicReviews.mechanicName}</h3>
            {mechanicReviews.list ? (
              mechanicReviews.list.length === 0 ? (
                <p>No reviews yet</p>
              ) : (
                <div className="reviews-list">
                  {mechanicReviews.list.map((r) => (
                    <div key={r.id} className="review-item">
                      <div className="review-header">
                        <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        <span className="review-user">{r.user_name}</span>
                        <span className="review-date">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {r.comment && <p className="review-comment">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p>Loading reviews...</p>
            )}
            <button className="btn btn-secondary" onClick={() => setMechanicReviews(null)}>Close</button>
          </div>
        </div>
      )}

      {reviewBooking && (
        <div className="modal-overlay" onClick={() => setReviewBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Rate your experience</h3>
            <p>Booking: {reviewBooking.category_name} with {reviewBooking.mechanic_name}</p>
            <form onSubmit={handleReviewSubmit}>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" className={`star ${reviewRating >= star ? 'filled' : ''}`} onClick={() => setReviewRating(star)}>
                    ★
                  </button>
                ))}
              </div>
              <textarea placeholder="Your review (optional)" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} />
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setReviewBooking(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit Review'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
