import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useLocation as useLoc } from '../context/LocationContext';
import { auth, mechanics, services, bookings, upload, reviews, ai, resolvePublicUrl } from '../api';
import BookingChat from '../components/BookingChat';
import BookingsPaginationBar, { BOOKINGS_PAGE_SIZE } from '../components/BookingsPaginationBar';
import NotificationPrompt from '../components/NotificationPrompt';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import ProfilePhotoField from '../components/ProfilePhotoField';
import HeaderProfileAvatar from '../components/HeaderProfileAvatar';
import { useMyBookingsPolling } from '../hooks/useBookingsPolling';
import UserBookingDetail from './UserBookingDetail';
import { formatCoordinates, mapAppChoices, getMapsDeviceHint } from '../utils/mapsLinks';
import { humanizeBookingStatus, isInFlightBooking } from '../utils/bookingStatus';
import {
  validatePhoneInput,
  isIndiaDefaultRegion,
  formatIndianPhoneFieldValue,
  e164ToIndianDisplay,
} from '../utils/phoneValidation';
import useDocumentTitle from '../hooks/useDocumentTitle';

const BASE_CHARGE = 25;
const HOME_SERVICE_FEE = 15;
const CURRENCY = '₹';
const VALID_USER_TABS = ['find', 'bookings', 'profile'];

/** Nearby mechanic cards: first batch + “Show more” to avoid huge lists (e.g. 100+) */
const MECHANICS_INITIAL_VISIBLE = 12;
const MECHANICS_INCREMENT = 12;

export default function UserDashboard() {
  useDocumentTitle('Find Mechanics Near You');
  const mapsDeviceHint = getMapsDeviceHint();
  const { location, clearLocation } = useLoc();
  const { user, refreshUser, logout } = useAuth();
  const [mechanicsList, setMechanicsList] = useState([]);
  /** True while fetching /mechanics/nearby for the current location */
  const [mechanicsNearbyLoading, setMechanicsNearbyLoading] = useState(false);
  const [mechanicsFilter, setMechanicsFilter] = useState('');
  const [mechanicsVisibleCount, setMechanicsVisibleCount] = useState(MECHANICS_INITIAL_VISIBLE);
  const [categories, setCategories] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const { tab: tabParam, bookingId } = useParams();
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const activeTab = bookingId ? 'bookings' : VALID_USER_TABS.includes(tabParam) ? tabParam : 'find';
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
  const [bookingDetailRefreshKey, setBookingDetailRefreshKey] = useState(0);
  const [accountEditing, setAccountEditing] = useState(false);
  const [accountForm, setAccountForm] = useState({ fullName: '', phone: '' });
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [bookingsServiceFilter, setBookingsServiceFilter] = useState('all');
  const [bookingsFilter, setBookingsFilter] = useState('all');
  const [bookingsSort, setBookingsSort] = useState('date_desc');
  const [bookingsPage, setBookingsPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** cod = pay mechanic in cash; online = pay with Razorpay from booking details */
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [triageEnabled, setTriageEnabled] = useState(null);
  const [triageInput, setTriageInput] = useState('');
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState('');
  const [triageResult, setTriageResult] = useState(null);

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPwForm({ current: '', new: '', confirm: '' });
  };

  useEffect(() => {
    if (!location) {
      setMechanicsList([]);
      setMechanicsNearbyLoading(false);
      return;
    }
    setMechanicsNearbyLoading(true);
    mechanics
      .nearby(location.latitude, location.longitude)
      .then(setMechanicsList)
      .catch(() => setMechanicsList([]))
      .finally(() => setMechanicsNearbyLoading(false));
  }, [location]);

  useEffect(() => {
    if (mechanicsNearbyLoading) return;
    if (mechanicsList.length === 0) setSelectedMechanic(null);
  }, [mechanicsList.length, mechanicsNearbyLoading]);

  useEffect(() => {
    setMechanicsFilter('');
    setMechanicsVisibleCount(MECHANICS_INITIAL_VISIBLE);
  }, [selectedService?.id]);

  useEffect(() => {
    setMechanicsVisibleCount(MECHANICS_INITIAL_VISIBLE);
  }, [mechanicsList, mechanicsFilter]);

  const filteredMechanics = useMemo(() => {
    const q = mechanicsFilter.trim().toLowerCase();
    if (!q) return mechanicsList;
    return mechanicsList.filter(
      (m) =>
        (m.full_name && m.full_name.toLowerCase().includes(q)) ||
        String(m.specialization || '')
          .toLowerCase()
          .includes(q) ||
        String(m.address || '')
          .toLowerCase()
          .includes(q)
    );
  }, [mechanicsList, mechanicsFilter]);

  const visibleMechanics = useMemo(
    () => filteredMechanics.slice(0, mechanicsVisibleCount),
    [filteredMechanics, mechanicsVisibleCount]
  );

  useEffect(() => {
    setSelectedMechanic((prev) => {
      if (!prev) return prev;
      return filteredMechanics.some((m) => m.id === prev.id) ? prev : null;
    });
  }, [filteredMechanics]);

  useEffect(() => {
    services.categories().then(setCategories);
  }, []);

  useEffect(() => {
    ai.capabilities().then((d) => setTriageEnabled(!!d.triageEnabled)).catch(() => setTriageEnabled(false));
  }, []);

  useEffect(() => {
    if (bookingId) return;
    if (tabParam && !VALID_USER_TABS.includes(tabParam)) {
      navigate('/user/find', { replace: true });
    }
  }, [tabParam, bookingId, navigate]);

  /** Refreshes `/bookings/my` on an interval (see hook) — no separate mount fetch to avoid duplicate calls */
  useMyBookingsPolling(setMyBookings);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onEsc = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const onChange = () => {
      if (mq.matches) setSidebarOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!passwordModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPasswordModalOpen(false);
        setPwForm({ current: '', new: '', confirm: '' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [passwordModalOpen]);

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
    if (!mechanicsNearbyLoading && mechanicsList.length === 0) {
      alert('No mechanics are available in your area right now. Try again later.');
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
        paymentMethod: paymentMethod === 'online' ? 'online' : 'cod',
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
      navigate('/user/bookings');
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
      const rid = reviewBooking.id;
      await reviews.submit(reviewBooking.id, reviewRating, reviewComment);
      setReviewBooking(null);
      setReviewRating(5);
      setReviewComment('');
      bookings.my().then(setMyBookings);
      if (bookingId === rid) setBookingDetailRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const emergencyCategories = categories.filter((c) => c.type === 'emergency');
  const scheduledCategories = categories.filter((c) => c.type === 'scheduled');

  const handleTriageSuggest = async () => {
    setTriageError('');
    setTriageResult(null);
    const text = triageInput.trim();
    if (text.length < 8) {
      setTriageError('Please describe your issue in a bit more detail (at least 8 characters).');
      return;
    }
    setTriageLoading(true);
    try {
      const out = await ai.suggestTriage({
        problemText: text,
        vehicleMake: vehicleMake.trim() || undefined,
        vehicleModel: vehicleModel.trim() || undefined,
      });
      setTriageResult(out);
    } catch (err) {
      setTriageError(err.message || 'Could not get suggestions');
    } finally {
      setTriageLoading(false);
    }
  };

  const applyTriageSuggestion = () => {
    if (!triageResult?.categoryId) return;
    const cat = categories.find((c) => c.id === triageResult.categoryId);
    if (!cat) {
      setTriageError('That category is no longer available. Please pick a service manually.');
      return;
    }
    setSelectedService(cat);
    setProblemDescription(triageInput.trim());
    setTriageResult(null);
    setTriageError('');
  };

  const inFlightBookings = useMemo(
    () => myBookings.filter((b) => isInFlightBooking(b.status)),
    [myBookings]
  );

  const fmtMoney = (n) => `${CURRENCY}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const processedBookings = useMemo(() => {
    let list = [...myBookings];
    if (bookingsServiceFilter !== 'all') {
      list = list.filter((b) => (b.category_type || b.service_type) === bookingsServiceFilter);
    }
    if (bookingsFilter !== 'all') {
      if (bookingsFilter === 'active') {
        list = list.filter((b) => isInFlightBooking(b.status));
      } else {
        list = list.filter((b) => b.status === bookingsFilter);
      }
    }
    const ta = (x) => new Date(x.created_at).getTime();
    list.sort((a, b) => {
      switch (bookingsSort) {
        case 'date_desc':
          return ta(b) - ta(a);
        case 'date_asc':
          return ta(a) - ta(b);
        case 'status':
          return (a.status || '').localeCompare(b.status || '') || ta(b) - ta(a);
        case 'mechanic':
          return (a.mechanic_name || '').localeCompare(b.mechanic_name || '', undefined, { sensitivity: 'base' }) || ta(b) - ta(a);
        case 'price_desc': {
          const pa = a.total_price != null ? Number(a.total_price) : -Infinity;
          const pb = b.total_price != null ? Number(b.total_price) : -Infinity;
          return pb - pa || ta(b) - ta(a);
        }
        default:
          return ta(b) - ta(a);
      }
    });
    return list;
  }, [myBookings, bookingsServiceFilter, bookingsFilter, bookingsSort]);

  const bookingsTotalPages = Math.max(1, Math.ceil(processedBookings.length / BOOKINGS_PAGE_SIZE));
  const bookingsPageSafe = Math.min(bookingsPage, bookingsTotalPages);
  const pagedBookings = useMemo(
    () => processedBookings.slice((bookingsPageSafe - 1) * BOOKINGS_PAGE_SIZE, bookingsPageSafe * BOOKINGS_PAGE_SIZE),
    [processedBookings, bookingsPageSafe]
  );

  useEffect(() => {
    setBookingsPage((p) => Math.min(p, Math.max(1, Math.ceil(processedBookings.length / BOOKINGS_PAGE_SIZE))));
  }, [processedBookings.length]);

  const sectionTitle = bookingId
    ? 'Booking details'
    : activeTab === 'find'
      ? 'Find a Mechanic'
      : activeTab === 'bookings'
        ? 'My Bookings'
        : activeTab === 'profile'
          ? 'Profile'
          : 'Dashboard';

  const saveAccount = async (e) => {
    e.preventDefault();
    const phoneCheck = validatePhoneInput(accountForm.phone);
    if (!phoneCheck.ok) {
      alert(phoneCheck.error);
      return;
    }
    try {
      await auth.updateProfile({
        fullName: accountForm.fullName.trim(),
        phone: phoneCheck.e164,
      });
      await refreshUser();
      setAccountEditing(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new !== pwForm.confirm) {
      alert('New passwords do not match.');
      return;
    }
    try {
      await auth.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.new });
      closePasswordModal();
      alert('Password updated successfully.');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="dashboard user-dashboard mechanic-workspace mws-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="mws-sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`mws-sidebar ${sidebarOpen ? 'mws-sidebar--open' : ''}`}
        aria-label="Dashboard navigation"
      >
        <div className="mws-sidebar-head">
          <div className="mws-sidebar-brand-block">
            <span className="mws-sidebar-brand">Book service</span>
            <p className="mws-sidebar-user">{user?.full_name}</p>
          </div>
          <button
            type="button"
            className="mws-sidebar-close"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>
        <nav className="mws-sidebar-nav" role="tablist" aria-label="Dashboard sections">
          <NavLink
            to="/user/find"
            end
            role="tab"
            aria-selected={activeTab === 'find' && !bookingId}
            className={({ isActive }) => `mws-nav-item ${isActive && !bookingId ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Find mechanics
          </NavLink>
          <NavLink
            to="/user/bookings"
            role="tab"
            aria-selected={activeTab === 'bookings'}
            className={({ isActive }) => {
              const navActive = isActive || routerLocation.pathname.startsWith('/user/bookings/');
              return `mws-nav-item ${navActive ? 'active' : ''}`;
            }}
            onClick={() => setSidebarOpen(false)}
          >
            My bookings
          </NavLink>
          <NavLink
            to="/user/profile"
            end
            role="tab"
            aria-selected={activeTab === 'profile'}
            className={({ isActive }) => `mws-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Profile
          </NavLink>
        </nav>
        <div className="mws-sidebar-footer">
          <span className="mws-sidebar-footer-label">Appearance</span>
          <ThemeToggle />
          <button
            type="button"
            className="logout-btn mws-sidebar-logout"
            onClick={() => {
              clearLocation();
              setSidebarOpen(false);
            }}
          >
            Change location
          </button>
          <button
            type="button"
            className="logout-btn mws-sidebar-logout"
            onClick={() => {
              logout();
              setSidebarOpen(false);
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="mws-main">
        <NotificationPrompt />
        <header className="mws-topbar">
          <div className="mws-topbar-lead">
            <div className="mws-topbar-toolbar">
              <button
                type="button"
                className="mws-menu-btn"
                aria-label="Open menu"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="mws-menu-icon" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>
            <div className="mws-topbar-heading">
              <p className="mws-topbar-kicker">Customer</p>
              <h1 className="mws-topbar-title">{sectionTitle}</h1>
              <p className="mws-topbar-sub mws-muted">
                {activeTab === 'profile'
                  ? 'Manage your sign-in details and security.'
                  : bookingId
                    ? 'View status, chat, and updates for this booking.'
                    : `Location: ${location?.address || `${location?.latitude?.toFixed(4)}, ${location?.longitude?.toFixed(4)}`}`}
              </p>
            </div>
          </div>
          {user && (
            <HeaderProfileAvatar
              user={user}
              to="/user/profile"
              onNavigate={() => setSidebarOpen(false)}
            />
          )}
        </header>

        <div className="mws-panel">
      {!bookingId &&
        (activeTab === 'find' || activeTab === 'bookings') &&
        inFlightBookings.length > 0 && (
        <section className="user-current-strip" aria-label="Current requests">
          <h3 className="user-current-strip-title">
            Current request{inFlightBookings.length > 1 ? 's' : ''}
          </h3>
          <ul className="user-current-list">
            {inFlightBookings.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className="user-current-item"
                  onClick={() => navigate(`/user/bookings/${b.id}`)}
                >
                  <div className="user-current-item-main">
                    <strong>{b.category_name}</strong>
                    <span className={`badge ${b.status}`}>{humanizeBookingStatus(b.status)}</span>
                  </div>
                  <span className="user-current-item-meta">
                    {b.mechanic_name ? `Mechanic: ${b.mechanic_name}` : 'Finding a mechanic…'}
                    {' · '}
                    {new Date(b.created_at).toLocaleString()}
                  </span>
                  <span className="user-current-item-hint">View details →</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bookingId ? (
        <UserBookingDetail
          key={bookingDetailRefreshKey}
          bookingId={bookingId}
          onLeaveReview={(b) => setReviewBooking(b)}
        />
      ) : (
        <>
      {activeTab === 'find' && (
        <div className="content">
          {!selectedService ? (
            <div className="service-types">
              <section className="ai-triage-card" aria-label="AI service suggestions">
                <h3>Describe your issue</h3>
                <p className="ai-triage-lead">
                  Not sure which service to pick? Describe what is wrong; we will suggest a category and safety tips.
                  {triageEnabled === true && (
                    <span className="ai-triage-disclaimer-inline">
                      {' '}
                      Suggestions are not a professional diagnosis.
                    </span>
                  )}
                </p>
                {triageEnabled === null && (
                  <p className="ai-triage-muted">Checking AI availability…</p>
                )}
                {triageEnabled === false && (
                  <p className="ai-triage-muted">AI suggestions are not configured on this server (set GROQ_API_KEY).</p>
                )}
                {triageEnabled === true && (
                  <>
                    <div className="ai-triage-optional-row">
                      <input
                        className="ai-triage-input-inline"
                        placeholder="Vehicle make (optional)"
                        value={vehicleMake}
                        onChange={(e) => setVehicleMake(e.target.value)}
                        autoComplete="off"
                      />
                      <input
                        className="ai-triage-input-inline"
                        placeholder="Model (optional)"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <textarea
                      className="ai-triage-textarea"
                      placeholder="e.g. Loud grinding when I brake, or car will not start after sitting overnight"
                      value={triageInput}
                      onChange={(e) => setTriageInput(e.target.value)}
                      rows={3}
                    />
                    <div className="ai-triage-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={triageLoading}
                        onClick={handleTriageSuggest}
                      >
                        {triageLoading ? 'Getting suggestions…' : 'Get AI suggestions'}
                      </button>
                    </div>
                    {triageError && <p className="ai-triage-error" role="alert">{triageError}</p>}
                    {triageResult && (
                      <div className="ai-triage-result">
                        <p className="ai-triage-suggestion-title">
                          <strong>Suggested:</strong>{' '}
                          <span className={`ai-triage-badge ai-triage-badge--${triageResult.serviceType}`}>
                            {triageResult.serviceType === 'emergency' ? 'Emergency' : 'Scheduled'}
                          </span>{' '}
                          {triageResult.categoryName}
                          {triageResult.confidence && (
                            <span className="ai-triage-confidence"> ({triageResult.confidence} confidence)</span>
                          )}
                        </p>
                        {triageResult.briefReason && (
                          <p className="ai-triage-reason">{triageResult.briefReason}</p>
                        )}
                        {triageResult.safetyTips?.length > 0 && (
                          <ul className="ai-triage-tips">
                            {triageResult.safetyTips.map((tip, i) => (
                              <li key={i}>{tip}</li>
                            ))}
                          </ul>
                        )}
                        {triageResult.disclaimer && (
                          <p className="ai-triage-footnote">{triageResult.disclaimer}</p>
                        )}
                        <button type="button" className="btn btn-primary" onClick={applyTriageSuggestion}>
                          Apply suggestion &amp; continue
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
              <section>
                <h3>🚨 Emergency Service</h3>
                {emergencyCategories.map((c) => (
                  <button
                    key={c.id}
                    className="service-card emergency"
                    onClick={() => {
                      setSelectedService(c);
                      setTriageResult(null);
                    }}
                  >
                    <strong>{c.name}</strong>
                    <span>{c.description}</span>
                  </button>
                ))}
              </section>
              <section>
                <h3>📅 Scheduled Service</h3>
                {scheduledCategories.map((c) => (
                  <button
                    key={c.id}
                    className="service-card scheduled"
                    onClick={() => {
                      setSelectedService(c);
                      setTriageResult(null);
                    }}
                  >
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

              <h4>
                Nearby mechanics ({mechanicsNearbyLoading ? '…' : mechanicsList.length}){' '}
                <span style={{ fontWeight: 'normal', color: '#94a3b8', fontSize: '0.9rem' }}>
                  — Select one or leave unselected for mechanics to claim
                </span>
              </h4>
              {!mechanicsNearbyLoading && mechanicsList.length > 1 && (
                <label className="mechanics-filter-label">
                  <span className="mechanics-filter-label-text">Search</span>
                  <input
                    type="search"
                    className="mechanics-filter-input"
                    placeholder="Name, specialty, or area…"
                    value={mechanicsFilter}
                    onChange={(e) => setMechanicsFilter(e.target.value)}
                    aria-label="Filter mechanics by name, specialty, or address"
                  />
                </label>
              )}
              {!mechanicsNearbyLoading && mechanicsList.length > 0 && (
                <p className="mechanics-list-summary">
                  {mechanicsFilter.trim()
                    ? `Showing ${visibleMechanics.length} of ${filteredMechanics.length} matching · ${mechanicsList.length} nearby total`
                    : `Showing ${visibleMechanics.length} of ${filteredMechanics.length} (closest first)`}
                </p>
              )}
              <div className="mechanics-list mechanics-list--scroll">
                {mechanicsNearbyLoading ? (
                  <p>Loading nearby mechanics…</p>
                ) : mechanicsList.length === 0 ? (
                  <p>No mechanics found within 10km</p>
                ) : filteredMechanics.length === 0 ? (
                  <p>No mechanics match your search. Clear the search box to see everyone nearby.</p>
                ) : (
                  visibleMechanics.map((m) => {
                    return (
                    <div
                      key={m.id}
                      className={`mechanic-card ${selectedMechanic?.id === m.id ? 'selected' : ''}`}
                      onClick={() => setSelectedMechanic(selectedMechanic?.id === m.id ? null : m)}
                    >
                      <strong>{m.full_name}</strong>
                      <span>{m.specialization || 'General'}</span>
                      {m.phone && (
                        <span className="mechanic-phone">
                          Phone:{' '}
                          <a
                            href={`tel:${String(m.phone).replace(/\s/g, '')}`}
                            className="mechanic-phone-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {e164ToIndianDisplay(m.phone) || m.phone}
                          </a>
                        </span>
                      )}
                      <span>⭐ {Number(m.rating || 0).toFixed(1)} ({m.total_reviews || 0} reviews)</span>
                      <span>{m.distance_km != null ? Number(m.distance_km).toFixed(1) : '-'} km away</span>
                      {m.hourly_rate && <span>{CURRENCY}{m.hourly_rate}/hr</span>}
                      {m.latitude != null && m.longitude != null && (
                        <div className="mechanic-location-block" onClick={(e) => e.stopPropagation()}>
                          <div className="mechanic-location-lines">
                            <span className="mechanic-location-label">Location</span>
                            <span className="mechanic-address">
                              {m.address?.trim() || 'Address not set — coordinates only'}
                            </span>
                            <span className="mechanic-coords" title="Latitude, longitude">
                              {formatCoordinates(m.latitude, m.longitude)}
                            </span>
                          </div>
                          <div className="map-app-choices">
                            <span className="map-app-intro">
                              {mapsDeviceHint === 'android' && 'Open in (Android)'}
                              {mapsDeviceHint === 'ios' && 'Open in (iPhone / iPad)'}
                              {mapsDeviceHint === 'unknown' && 'Open in maps'}
                            </span>
                            <div className="map-app-grid">
                              {mapAppChoices(m.latitude, m.longitude).map((opt) => (
                                <a
                                  key={opt.id}
                                  href={opt.href}
                                  className="map-app-link"
                                  title={opt.title}
                                  {...(opt.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {opt.label}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
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
                    );
                  })
                )}
              </div>
              {!mechanicsNearbyLoading &&
                mechanicsList.length > 0 &&
                filteredMechanics.length > 0 &&
                filteredMechanics.length > mechanicsVisibleCount && (
                  <button
                    type="button"
                    className="btn btn-secondary mechanics-show-more"
                    onClick={() =>
                      setMechanicsVisibleCount((c) => Math.min(c + MECHANICS_INCREMENT, filteredMechanics.length))
                    }
                  >
                    Show more ({filteredMechanics.length - mechanicsVisibleCount} remaining)
                  </button>
                )}

              <form onSubmit={handleBook} className="booking-form">
                <h4>Vehicle Details</h4>
                <label>Vehicle Image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {vehicleImageUrl && (
                  <img src={resolvePublicUrl(vehicleImageUrl)} alt="Vehicle" className="vehicle-preview" loading="lazy" />
                )}
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

                <h4>Payment</h4>
                <div className="radio-group payment-method-group">
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                    />
                    Cash on delivery (pay the mechanic when the job is done)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'online'}
                      onChange={() => setPaymentMethod('online')}
                    />
                    Pay online (Razorpay from booking details after you submit)
                  </label>
                </div>

                <div className="price-breakdown">
                  <h4>Price Breakdown</h4>
                  <p>Base charge: {CURRENCY}{BASE_CHARGE}</p>
                  <p>{selectedService?.name}: {CURRENCY}{servicePrice}</p>
                  {serviceLocation === 'home' && <p>Home service fee: {CURRENCY}{HOME_SERVICE_FEE}</p>}
                  <p className="total">Total: {CURRENCY}{totalPrice}</p>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || mechanicsNearbyLoading || mechanicsList.length === 0}
                >
                  {loading
                    ? 'Booking...'
                    : mechanicsNearbyLoading
                      ? 'Checking mechanics…'
                      : mechanicsList.length === 0
                        ? 'No mechanics in your area'
                        : 'Request Service'}
                </button>
                {!mechanicsNearbyLoading && mechanicsList.length === 0 && (
                  <p className="auth-muted" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
                    There are no available mechanics within 10 km. You cannot place a request until at least one is
                    nearby.
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="content bookings-list">
            <section className="mws-section" aria-label="My bookings">
              <h2 className="mws-block-title">My bookings</h2>
              {myBookings.length === 0 ? (
                <p className="mws-muted">No bookings yet. Request a service from Find Mechanics when you need help.</p>
              ) : (
                <>
                  <div className="mws-jobs-toolbar" role="group" aria-label="Filter and sort bookings">
                    <div className="mws-jobs-toolbar-field">
                      <label htmlFor="user-bookings-service-filter">Service type</label>
                      <select
                        id="user-bookings-service-filter"
                        className="mws-jobs-select"
                        value={bookingsServiceFilter}
                        onChange={(e) => {
                          setBookingsServiceFilter(e.target.value);
                          setBookingsPage(1);
                        }}
                      >
                        <option value="all">All services</option>
                        <option value="emergency">Emergency</option>
                        <option value="scheduled">Scheduled</option>
                      </select>
                    </div>
                    <div className="mws-jobs-toolbar-field">
                      <label htmlFor="user-bookings-filter">Status</label>
                      <select
                        id="user-bookings-filter"
                        className="mws-jobs-select"
                        value={bookingsFilter}
                        onChange={(e) => {
                          setBookingsFilter(e.target.value);
                          setBookingsPage(1);
                        }}
                      >
                        <option value="all">All statuses</option>
                        <option value="active">Active (in progress)</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="mws-jobs-toolbar-field">
                      <label htmlFor="user-bookings-sort">Sort</label>
                      <select
                        id="user-bookings-sort"
                        className="mws-jobs-select"
                        value={bookingsSort}
                        onChange={(e) => {
                          setBookingsSort(e.target.value);
                          setBookingsPage(1);
                        }}
                      >
                        <option value="date_desc">Date (newest first)</option>
                        <option value="date_asc">Date (oldest first)</option>
                        <option value="status">Status (A–Z)</option>
                        <option value="mechanic">Mechanic (A–Z)</option>
                        <option value="price_desc">Total (highest first)</option>
                      </select>
                    </div>
                  </div>
                  <div className="mws-booking-list">
                    {processedBookings.length === 0 ? (
                      <p className="mws-muted mws-jobs-empty">No bookings match your filters.</p>
                    ) : (
                      pagedBookings.map((b) => (
                        <div
                          key={b.id}
                          className="booking-card clickable mws-booking-card"
                          onClick={() => navigate(`/user/bookings/${b.id}`)}
                        >
                          <div className="mws-bc-main">
                            <strong>{b.category_name}</strong>
                            <span className={`badge ${b.status}`}>{humanizeBookingStatus(b.status)}</span>
                            {b.mechanic_name ? (
                              <span>Mechanic: {b.mechanic_name}</span>
                            ) : (
                              <span className="mws-bc-dim">Finding a mechanic…</span>
                            )}
                            <span className="mws-bc-dim">{new Date(b.created_at).toLocaleString()}</span>
                            {b.status === 'completed' && b.total_price != null && (
                              <span className="mws-bc-price">{fmtMoney(b.total_price)}</span>
                            )}
                            {b.has_review && <span className="reviewed-badge">✓ Reviewed</span>}
                          </div>
                          <div className="mws-bc-actions" onClick={(e) => e.stopPropagation()}>
                            {b.status === 'completed' && b.mechanic_id && !b.has_review && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setReviewBooking(b)}
                              >
                                Leave review
                              </button>
                            )}
                          </div>
                          <span className="tap-hint">Tap for details</span>
                        </div>
                      ))
                    )}
                  </div>
                  {processedBookings.length > 0 && (
                    <BookingsPaginationBar
                      page={bookingsPage}
                      totalItems={processedBookings.length}
                      pageSize={BOOKINGS_PAGE_SIZE}
                      onPageChange={setBookingsPage}
                      ariaLabel="Bookings pagination"
                    />
                  )}
                </>
              )}
            </section>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="content">
            <section className="mws-section mws-profile-section" aria-label="Profile">
              <div className="mws-profile-shell">
                <h2 className="mws-profile-page-title mws-profile-hero-title">Profile</h2>
                <p className="mws-profile-intro mws-muted">
                  Manage your sign-in details and security for this account.
                </p>
                <div className="mws-profile-stack">
                  {user && (
                    <>
                      <ProfilePhotoField user={user} onUpdated={refreshUser} />
                      <div className="mws-profile-card">
                        <div className="mws-profile-readonly-head">
                          <h3 className="mws-profile-card-title">Account</h3>
                          {!accountEditing && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setAccountForm({
                                  fullName: user.full_name || '',
                                  phone: isIndiaDefaultRegion()
                                    ? e164ToIndianDisplay(user.phone)
                                    : user.phone || '',
                                });
                                setAccountEditing(true);
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        {accountEditing ? (
                          <form className="mws-account-form" onSubmit={saveAccount}>
                            <label className="mws-field">
                              <span className="mws-field-label">Full name</span>
                              <input
                                value={accountForm.fullName}
                                onChange={(e) => setAccountForm((f) => ({ ...f, fullName: e.target.value }))}
                                required
                                autoComplete="name"
                              />
                            </label>
                            <label className="mws-field">
                              <span className="mws-field-label">Email</span>
                              <input className="mws-input-readonly" value={user.email} readOnly aria-readonly="true" />
                              <span className="mws-field-hint">Used to sign in. It cannot be changed here.</span>
                            </label>
                            <label className="mws-field">
                              <span className="mws-field-label">Phone</span>
                              <input
                                value={accountForm.phone}
                                onChange={(e) =>
                                  setAccountForm((f) => ({
                                    ...f,
                                    phone: isIndiaDefaultRegion()
                                      ? formatIndianPhoneFieldValue(e.target.value)
                                      : e.target.value,
                                  }))
                                }
                                inputMode={isIndiaDefaultRegion() ? 'numeric' : 'tel'}
                                autoComplete="tel"
                                placeholder={isIndiaDefaultRegion() ? '10-digit mobile number' : 'e.g. +91 98765 43210'}
                                required
                              />
                            </label>
                            <div className="mws-form-actions">
                              <button type="submit" className="btn btn-primary">
                                Save account
                              </button>
                              <button type="button" className="btn btn-secondary" onClick={() => setAccountEditing(false)}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <dl className="mws-kv-list mws-kv-list--account">
                            <div className="mws-kv">
                              <dt>Name</dt>
                              <dd>{user.full_name || '—'}</dd>
                            </div>
                            <div className="mws-kv">
                              <dt>Email</dt>
                              <dd>{user.email}</dd>
                            </div>
                            <div className="mws-kv">
                              <dt>Phone</dt>
                              <dd>{user.phone || '—'}</dd>
                            </div>
                            <div className="mws-kv">
                              <dt>Role</dt>
                              <dd className="mws-kv-capitalize">{user.role}</dd>
                            </div>
                            {user.created_at && (
                              <div className="mws-kv">
                                <dt>Member since</dt>
                                <dd>{new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</dd>
                              </div>
                            )}
                          </dl>
                        )}
                      </div>

                      <div className="mws-profile-card mws-profile-card--security">
                        <div className="mws-security-summary">
                          <div>
                            <h3 className="mws-profile-card-title">Security</h3>
                            <p className="mws-profile-card-hint mws-security-hint">Password protects your account. Change it if you suspect someone else knows it.</p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setPwForm({ current: '', new: '', confirm: '' });
                              setPasswordModalOpen(true);
                            }}
                          >
                            Change password
                          </button>
                        </div>
                        <p className="mws-security-footnote mws-muted">
                          <span className="mws-security-mask" aria-hidden>
                            ••••••••
                          </span>
                          <span className="mws-security-footnote-text"> Use a strong password you don’t reuse elsewhere.</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
        </div>
      )}
        </>
      )}
        </div>
      </div>

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

      {passwordModalOpen && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div
            className="modal-content mws-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-password-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mws-password-modal-header">
              <h3 id="user-password-modal-title">Change password</h3>
              <button type="button" className="mws-modal-close-x" aria-label="Close" onClick={closePasswordModal}>
                ×
              </button>
            </div>
            <p className="mws-password-modal-lead mws-muted">Enter your current password, then choose a new one (at least 6 characters).</p>
            <form className="mws-account-form" onSubmit={changePassword}>
              <label className="mws-field">
                <span className="mws-field-label">Current password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={pwForm.current}
                  onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                />
              </label>
              <label className="mws-field">
                <span className="mws-field-label">New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.new}
                  onChange={(e) => setPwForm((f) => ({ ...f, new: e.target.value }))}
                  minLength={6}
                />
              </label>
              <label className="mws-field">
                <span className="mws-field-label">Confirm new password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                  minLength={6}
                />
              </label>
              <div className="mws-form-actions mws-password-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closePasswordModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewBooking && (
        <div className="modal-overlay" onClick={() => setReviewBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Rate your experience</h3>
            <p>Booking: {reviewBooking.category_name}{reviewBooking.mechanic_name ? ` with ${reviewBooking.mechanic_name}` : ''}</p>
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
