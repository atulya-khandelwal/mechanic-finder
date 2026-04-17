import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { auth, mechanics, bookings, reviews } from '../api';
import BookingsPaginationBar, { BOOKINGS_PAGE_SIZE } from '../components/BookingsPaginationBar';
import MapLocationPicker from '../components/MapLocationPicker';
import NotificationPrompt from '../components/NotificationPrompt';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import ProfilePhotoField from '../components/ProfilePhotoField';
import HeaderProfileAvatar from '../components/HeaderProfileAvatar';
import { useMechanicBookingsPolling } from '../hooks/useBookingsPolling';
import { useMediaQuery } from '../hooks/useMediaQuery';
import MechanicJobDetail from './MechanicJobDetail';
import {
  humanizeBookingStatus,
  isInFlightBooking,
  jobNeedsPayment,
  mechanicJobStatusPresentation,
} from '../utils/bookingStatus';
import {
  validatePhoneInput,
  isIndiaDefaultRegion,
  formatIndianPhoneFieldValue,
  e164ToIndianDisplay,
} from '../utils/phoneValidation';
import useDocumentTitle from '../hooks/useDocumentTitle';

const CURRENCY = '₹';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'profile', label: 'Profile' },
];
const VALID_MECHANIC_TABS = TABS.map((t) => t.id);

function StatCard({ label, value, sub }) {
  return (
    <div className="mws-stat-card">
      <span className="mws-stat-label">{label}</span>
      <span className="mws-stat-value">{value}</span>
      {sub && <span className="mws-stat-sub">{sub}</span>}
    </div>
  );
}

export default function MechanicDashboard() {
  useDocumentTitle('Mechanic Dashboard');
  const narrowTopbar = useMediaQuery('(max-width: 899px)');
  const { user, refreshUser, logout } = useAuth();
  const { tab: tabParam, bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = bookingId ? 'jobs' : VALID_MECHANIC_TABS.includes(tabParam) ? tabParam : 'overview';
  const [profile, setProfile] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ latitude: '', longitude: '', address: '', specialization: '', hourlyRate: '', isAvailable: true });
  const [myReviews, setMyReviews] = useState([]);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountEditing, setAccountEditing] = useState(false);
  const [accountForm, setAccountForm] = useState({ fullName: '', phone: '' });
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [jobsAvailFilter, setJobsAvailFilter] = useState('all');
  const [jobsAvailSort, setJobsAvailSort] = useState('distance_asc');
  const [myJobsServiceFilter, setMyJobsServiceFilter] = useState('all');
  const [myJobsFilter, setMyJobsFilter] = useState('all');
  const [myJobsSort, setMyJobsSort] = useState('date_desc');
  const [availJobsPage, setAvailJobsPage] = useState(1);
  const [myJobsPage, setMyJobsPage] = useState(1);

  const currentSectionLabel = bookingId ? 'Job details' : TABS.find((t) => t.id === activeTab)?.label ?? 'Dashboard';

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPwForm({ current: '', new: '', confirm: '' });
  };

  useEffect(() => {
    if (bookingId) return;
    if (tabParam && !VALID_MECHANIC_TABS.includes(tabParam)) {
      navigate('/mechanic/overview', { replace: true });
    }
  }, [tabParam, bookingId, navigate]);

  const goToTab = (id) => {
    navigate(`/mechanic/${id}`);
    setSidebarOpen(false);
  };

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

  useMechanicBookingsPolling(setMyBookings, setAvailableJobs);

  const loadAnalytics = useCallback(() => {
    mechanics
      .analytics()
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setAnalyticsLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') loadAnalytics();
  }, [activeTab, loadAnalytics]);

  useEffect(() => {
    const id = setInterval(() => {
      if (activeTab === 'overview' && document.visibilityState === 'visible') loadAnalytics();
    }, 30000);
    return () => clearInterval(id);
  }, [activeTab, loadAnalytics]);

  useEffect(() => {
    if (profile?.id) {
      reviews.byMechanic(profile.id).then(setMyReviews).catch(() => setMyReviews([]));
    }
  }, [profile?.id]);

  const refreshBookings = () => {
    bookings.my().then(setMyBookings).catch(() => setMyBookings([]));
    bookings.available().then(setAvailableJobs).catch(() => setAvailableJobs([]));
    loadAnalytics();
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
      const updated = profile ? await mechanics.updateProfile(body) : await mechanics.createProfile(body);
      setProfile(updated);
      setEditing(false);
      await refreshUser();
    } catch (err) {
      alert(err.message);
    }
  };

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

  const updateStatus = async (bookingId, status) => {
    try {
      await bookings.updateStatus(bookingId, status);
      refreshBookings();
    } catch (err) {
      alert(err.message);
    }
  };

  const acceptAvailableJob = async (bookingId) => {
    try {
      await bookings.claim(bookingId);
      refreshBookings();
    } catch (err) {
      alert(err.message);
    }
  };

  const rejectAvailableJob = async (bookingId) => {
    try {
      await bookings.reject(bookingId);
      refreshBookings();
    } catch (err) {
      alert(err.detail ? `${err.message}\n\n${err.detail}` : err.message);
    }
  };

  const filteredReviews = useMemo(() => {
    if (reviewFilter === 'all') return myReviews;
    const n = parseInt(reviewFilter, 10);
    return myReviews.filter((r) => r.rating === n);
  }, [myReviews, reviewFilter]);

  const maxBreakdown = useMemo(() => {
    if (!analytics?.ratingBreakdown) return 1;
    return Math.max(1, ...Object.values(analytics.ratingBreakdown));
  }, [analytics]);

  const fmtMoney = (n) => `${CURRENCY}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const inFlightMyJobs = useMemo(
    () => myBookings.filter((b) => isInFlightBooking(b.status)),
    [myBookings]
  );
  const awaitingPaymentJobs = useMemo(
    () => myBookings.filter((b) => jobNeedsPayment(b)),
    [myBookings]
  );
  const hasCurrentActivity =
    availableJobs.length > 0 || inFlightMyJobs.length > 0 || awaitingPaymentJobs.length > 0;

  const sortedAvailableJobs = useMemo(() => {
    let list = availableJobs.filter((b) => {
      if (jobsAvailFilter === 'all') return true;
      return b.category_type === jobsAvailFilter;
    });
    const dist = (b) => (b.distance_km != null && !Number.isNaN(Number(b.distance_km)) ? Number(b.distance_km) : Infinity);
    const time = (b) => new Date(b.created_at).getTime();
    return [...list].sort((a, b) => {
      switch (jobsAvailSort) {
        case 'distance_asc':
          return dist(a) - dist(b);
        case 'distance_desc':
          return dist(b) - dist(a);
        case 'date_desc':
          return time(b) - time(a);
        case 'date_asc':
          return time(a) - time(b);
        default:
          return dist(a) - dist(b);
      }
    });
  }, [availableJobs, jobsAvailFilter, jobsAvailSort]);

  const processedMyJobs = useMemo(() => {
    let list = [...myBookings];
    if (myJobsServiceFilter !== 'all') {
      list = list.filter((b) => (b.category_type || b.service_type) === myJobsServiceFilter);
    }
    if (myJobsFilter !== 'all') {
      if (myJobsFilter === 'active') {
        list = list.filter((b) => isInFlightBooking(b.status));
      } else {
        list = list.filter((b) => b.status === myJobsFilter);
      }
    }
    const ta = (x) => new Date(x.created_at).getTime();
    const payRank = (b) => (jobNeedsPayment(b) ? 0 : 1);
    list.sort((a, b) => {
      const pr = payRank(a) - payRank(b);
      if (pr !== 0) return pr;
      switch (myJobsSort) {
        case 'date_desc':
          return ta(b) - ta(a);
        case 'date_asc':
          return ta(a) - ta(b);
        case 'status':
          return (a.status || '').localeCompare(b.status || '') || ta(b) - ta(a);
        case 'customer':
          return (a.user_name || '').localeCompare(b.user_name || '', undefined, { sensitivity: 'base' }) || ta(b) - ta(a);
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
  }, [myBookings, myJobsServiceFilter, myJobsFilter, myJobsSort]);

  const availTotalPages = Math.max(1, Math.ceil(sortedAvailableJobs.length / BOOKINGS_PAGE_SIZE));
  const availPage = Math.min(availJobsPage, availTotalPages);
  const pagedAvailableJobs = useMemo(
    () =>
      sortedAvailableJobs.slice((availPage - 1) * BOOKINGS_PAGE_SIZE, availPage * BOOKINGS_PAGE_SIZE),
    [sortedAvailableJobs, availPage]
  );

  const myJobsTotalPages = Math.max(1, Math.ceil(processedMyJobs.length / BOOKINGS_PAGE_SIZE));
  const myJobsPageSafe = Math.min(myJobsPage, myJobsTotalPages);
  const pagedMyJobs = useMemo(
    () => processedMyJobs.slice((myJobsPageSafe - 1) * BOOKINGS_PAGE_SIZE, myJobsPageSafe * BOOKINGS_PAGE_SIZE),
    [processedMyJobs, myJobsPageSafe]
  );

  useEffect(() => {
    setAvailJobsPage((p) => Math.min(p, Math.max(1, Math.ceil(sortedAvailableJobs.length / BOOKINGS_PAGE_SIZE))));
  }, [sortedAvailableJobs.length]);

  useEffect(() => {
    setMyJobsPage((p) => Math.min(p, Math.max(1, Math.ceil(processedMyJobs.length / BOOKINGS_PAGE_SIZE))));
  }, [processedMyJobs.length]);

  return (
    <div className="dashboard mechanic-dashboard mechanic-workspace mws-layout">
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
            <span className="mws-sidebar-brand">Workshop</span>
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
          {TABS.map((t) => (
            <NavLink
              key={t.id}
              to={t.id === 'jobs' ? '/mechanic/jobs' : `/mechanic/${t.id}`}
              role="tab"
              aria-selected={activeTab === t.id}
              className={({ isActive }) => {
                const navActive =
                  t.id === 'jobs'
                    ? location.pathname === '/mechanic/jobs' || location.pathname.startsWith('/mechanic/jobs/')
                    : isActive;
                return `mws-nav-item ${navActive ? 'active' : ''}`;
              }}
              onClick={() => setSidebarOpen(false)}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="mws-sidebar-footer">
          <span className="mws-sidebar-footer-label">Appearance</span>
          <ThemeToggle />
          <button type="button" className="logout-btn mws-sidebar-logout" onClick={logout}>
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
              <p className="mws-topbar-kicker">
                {narrowTopbar ? 'Mechanic' : 'Mechanic console'}
              </p>
              <h1 className="mws-topbar-title">{currentSectionLabel}</h1>
            </div>
          </div>
          {user && (
            <HeaderProfileAvatar
              user={user}
              to="/mechanic/profile"
              onNavigate={() => setSidebarOpen(false)}
            />
          )}
        </header>

        <div className="mws-panel">
        {bookingId ? (
          <MechanicJobDetail bookingId={bookingId} onRefresh={refreshBookings} />
        ) : (
          <>
        {hasCurrentActivity && (activeTab === 'overview' || activeTab === 'jobs') && (
          <section className="mws-section mws-current-strip" aria-label="Current requests">
            <h2 className="mws-block-title">Current requests</h2>
            <p className="mws-muted mws-block-desc mws-current-strip-desc">
              Jobs with payment still due stay at the top. Open pool work and in-progress jobs stay here until finished or cancelled.
            </p>
            {awaitingPaymentJobs.length > 0 && (
              <div className="mws-current-group mws-current-group--payment">
                <h3 className="mws-current-subtitle">Awaiting payment</h3>
                <p className="mws-muted mws-current-payment-hint">
                  These jobs are complete but not paid yet. After the customer pays online or you confirm cash, they move to Successful.
                </p>
                <ul className="mws-current-list">
                  {awaitingPaymentJobs.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className="mws-current-row mws-current-row--payment-due"
                        onClick={() => navigate(`/mechanic/jobs/${b.id}`)}
                      >
                        <div className="mws-current-row-main">
                          <strong>{b.category_name}</strong>
                          <span className="badge awaiting-payment">Awaiting payment</span>
                          <span className="mws-current-dim">{b.user_name}</span>
                          {b.total_price != null && (
                            <span className="mws-current-amount">{fmtMoney(b.total_price)}</span>
                          )}
                        </div>
                        <span className="mws-current-chevron" aria-hidden>
                          Collect / confirm →
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {availableJobs.length > 0 && (
              <div className="mws-current-group">
                <h3 className="mws-current-subtitle">Open near you</h3>
                <ul className="mws-current-list">
                  {availableJobs.map((b) => (
                    <li key={b.id} className="mws-current-row mws-current-row--open">
                      <div className="mws-current-row-main">
                        <strong>{b.category_name}</strong>
                        <span className="mws-bc-meta">{b.distance_km != null ? `${Number(b.distance_km).toFixed(1)} km` : '—'}</span>
                        <span className="mws-current-dim">{b.user_name}</span>
                      </div>
                      <div className="mws-current-row-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/mechanic/jobs/${b.id}`)}>
                          Details
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => acceptAvailableJob(b.id)}>
                          Accept
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => rejectAvailableJob(b.id)}>
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {inFlightMyJobs.length > 0 && (
              <div className="mws-current-group">
                <h3 className="mws-current-subtitle">Your jobs</h3>
                <ul className="mws-current-list">
                  {inFlightMyJobs.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className="mws-current-row mws-current-row--mine"
                        onClick={() => navigate(`/mechanic/jobs/${b.id}`)}
                      >
                        <div className="mws-current-row-main">
                          <strong>{b.category_name}</strong>
                          <span className={`badge ${b.status}`}>{humanizeBookingStatus(b.status)}</span>
                          <span className="mws-current-dim">{b.user_name}</span>
                        </div>
                        <span className="mws-current-chevron" aria-hidden>
                          Details →
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
        {activeTab === 'overview' && (
          <section className="mws-section" aria-label="Analytics">
            {analyticsLoading && !analytics ? (
              <p className="mws-muted">Loading analytics…</p>
            ) : (
              <>
                <div className="mws-stats-grid">
                  <StatCard label="Total earnings (all time)" value={fmtMoney(analytics?.totalEarnings)} sub={`${analytics?.jobsCompleted ?? 0} jobs completed`} />
                  <StatCard label="Today" value={fmtMoney(analytics?.todayEarnings)} sub="Completed today" />
                  <StatCard label="This month" value={fmtMoney(analytics?.monthEarnings)} sub={`${analytics?.jobsCompletedThisMonth ?? 0} jobs this month`} />
                  <StatCard label="Pipeline" value={`${analytics?.pendingJobs ?? 0} / ${analytics?.activeJobs ?? 0}`} sub="Pending · Active" />
                </div>

                <div className="mws-analytics-row">
                  <div className="mws-card mws-rating-card">
                    <h3>Reputation</h3>
                    <div className="mws-rating-big">
                      <span className="mws-rating-num">{analytics?.averageRating != null ? Number(analytics.averageRating).toFixed(1) : '—'}</span>
                      <span className="mws-rating-stars">★</span>
                      <span className="mws-rating-count">{analytics?.totalReviews ?? 0} reviews</span>
                    </div>
                    <div className="mws-breakdown">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const cnt = analytics?.ratingBreakdown?.[star] ?? 0;
                        const pct = maxBreakdown ? Math.round((cnt / maxBreakdown) * 100) : 0;
                        return (
                          <div key={star} className="mws-breakdown-row">
                            <span>{star}★</span>
                            <div className="mws-breakdown-bar">
                              <div className="mws-breakdown-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="mws-breakdown-n">{cnt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mws-card mws-hint-card">
                    <h3>Quick actions</h3>
                    <p className="mws-muted">Switch to <strong>Jobs</strong> to accept or reject nearby requests, update statuses, and chat with customers.</p>
                    <p className="mws-muted">Customer reviews and ratings appear under <strong>Reviews</strong>.</p>
                    <button type="button" className="btn btn-primary mws-inline-btn" onClick={() => goToTab('jobs')}>
                      Go to jobs
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'jobs' && (
          <section className="mws-section" aria-label="Jobs">
            {availableJobs.length > 0 && (
              <div className="mws-jobs-block">
                <h2 className="mws-block-title">Available near you</h2>
                <p className="mws-muted mws-block-desc">Open requests within 10 km. Accept to take the job, or reject to decline it (the customer is notified).</p>
                <div className="mws-jobs-toolbar" role="group" aria-label="Filter and sort open jobs">
                  <div className="mws-jobs-toolbar-field">
                    <label htmlFor="mws-jobs-avail-filter">Service type</label>
                    <select
                      id="mws-jobs-avail-filter"
                      className="mws-jobs-select"
                      value={jobsAvailFilter}
                      onChange={(e) => {
                        setJobsAvailFilter(e.target.value);
                        setAvailJobsPage(1);
                      }}
                    >
                      <option value="all">All types</option>
                      <option value="emergency">Emergency</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                  <div className="mws-jobs-toolbar-field">
                    <label htmlFor="mws-jobs-avail-sort">Sort</label>
                    <select
                      id="mws-jobs-avail-sort"
                      className="mws-jobs-select"
                      value={jobsAvailSort}
                      onChange={(e) => {
                        setJobsAvailSort(e.target.value);
                        setAvailJobsPage(1);
                      }}
                    >
                      <option value="distance_asc">Distance (nearest first)</option>
                      <option value="distance_desc">Distance (farthest first)</option>
                      <option value="date_desc">Newest first</option>
                      <option value="date_asc">Oldest first</option>
                    </select>
                  </div>
                </div>
                <div className="mws-booking-list">
                  {sortedAvailableJobs.length === 0 ? (
                    <p className="mws-muted mws-jobs-empty">No open jobs match your filters.</p>
                  ) : (
                  pagedAvailableJobs.map((b) => (
                    <div key={b.id} className="booking-card available mws-booking-card">
                      <div className="mws-bc-main" onClick={() => navigate(`/mechanic/jobs/${b.id}`)} role="presentation">
                        <strong>{b.category_name}</strong>
                        <span className="mws-bc-meta">{b.category_type}</span>
                        <span>Customer: {b.user_name} · {b.user_phone}</span>
                        <span>{b.distance_km != null ? Number(b.distance_km).toFixed(1) : '—'} km away</span>
                      </div>
                      <div className="mws-bc-actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => acceptAvailableJob(b.id)}>
                          Accept
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => rejectAvailableJob(b.id)}>
                          Reject
                        </button>
                      </div>
                    </div>
                  )))}
                </div>
                {sortedAvailableJobs.length > 0 && (
                  <BookingsPaginationBar
                    page={availJobsPage}
                    totalItems={sortedAvailableJobs.length}
                    pageSize={BOOKINGS_PAGE_SIZE}
                    onPageChange={setAvailJobsPage}
                  />
                )}
              </div>
            )}

            <div className="mws-jobs-block">
              <h2 className="mws-block-title">My jobs</h2>
              {myBookings.length === 0 ? (
                <p className="mws-muted">No assignments yet. Stay available in Profile to receive requests.</p>
              ) : (
                <>
                  <div className="mws-jobs-toolbar" role="group" aria-label="Filter and sort my jobs">
                    <div className="mws-jobs-toolbar-field">
                      <label htmlFor="mws-jobs-my-service-filter">Service type</label>
                      <select
                        id="mws-jobs-my-service-filter"
                        className="mws-jobs-select"
                        value={myJobsServiceFilter}
                        onChange={(e) => {
                          setMyJobsServiceFilter(e.target.value);
                          setMyJobsPage(1);
                        }}
                      >
                        <option value="all">All services</option>
                        <option value="emergency">Emergency</option>
                        <option value="scheduled">Scheduled</option>
                      </select>
                    </div>
                    <div className="mws-jobs-toolbar-field">
                      <label htmlFor="mws-jobs-my-filter">Status</label>
                      <select
                        id="mws-jobs-my-filter"
                        className="mws-jobs-select"
                        value={myJobsFilter}
                        onChange={(e) => {
                          setMyJobsFilter(e.target.value);
                          setMyJobsPage(1);
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
                      <label htmlFor="mws-jobs-my-sort">Sort</label>
                      <select
                        id="mws-jobs-my-sort"
                        className="mws-jobs-select"
                        value={myJobsSort}
                        onChange={(e) => {
                          setMyJobsSort(e.target.value);
                          setMyJobsPage(1);
                        }}
                      >
                        <option value="date_desc">Date (newest first)</option>
                        <option value="date_asc">Date (oldest first)</option>
                        <option value="status">Status (A–Z)</option>
                        <option value="customer">Customer (A–Z)</option>
                        <option value="price_desc">Total (highest first)</option>
                      </select>
                    </div>
                  </div>
                  <p className="mws-muted mws-jobs-sort-hint">Jobs awaiting payment stay at the top until paid.</p>
                  <div className="mws-booking-list">
                    {processedMyJobs.length === 0 ? (
                      <p className="mws-muted mws-jobs-empty">No jobs match your filters.</p>
                    ) : (
                      pagedMyJobs.map((b) => {
                        const st = mechanicJobStatusPresentation(b);
                        return (
                        <div key={b.id} className="booking-card clickable mws-booking-card" onClick={() => navigate(`/mechanic/jobs/${b.id}`)}>
                          <div className="mws-bc-main">
                            <strong>{b.category_name}</strong>
                            <span className={st.className}>{st.text}</span>
                            <span>{b.user_name} · {b.user_phone}</span>
                            <span className="mws-bc-dim">{b.user_address || `${b.user_latitude}, ${b.user_longitude}`}</span>
                            <span className="mws-bc-dim">{new Date(b.created_at).toLocaleString()}</span>
                            {b.status === 'completed' && b.total_price != null && (
                              <span className="mws-bc-price">{fmtMoney(b.total_price)}</span>
                            )}
                          </div>
                          <div className="mws-bc-actions" onClick={(e) => e.stopPropagation()}>
                            {b.status === 'pending' && (
                              <>
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => updateStatus(b.id, 'accepted')}>
                                  Accept
                                </button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateStatus(b.id, 'cancelled')}>
                                  Decline
                                </button>
                              </>
                            )}
                            {b.status === 'accepted' && (
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => updateStatus(b.id, 'in_progress')}>
                                Start
                              </button>
                            )}
                            {b.status === 'in_progress' && (
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => updateStatus(b.id, 'completed')}>
                                Complete
                              </button>
                            )}
                          </div>
                          <span className="tap-hint">{b.status === 'rejected' ? 'Details' : 'Details & chat'}</span>
                        </div>
                        );
                      })
                    )}
                  </div>
                  {processedMyJobs.length > 0 && (
                    <BookingsPaginationBar
                      page={myJobsPage}
                      totalItems={processedMyJobs.length}
                      pageSize={BOOKINGS_PAGE_SIZE}
                      onPageChange={setMyJobsPage}
                    />
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {activeTab === 'reviews' && (
          <section className="mws-section" aria-label="Reviews">
            <div className="mws-review-toolbar">
              <h2 className="mws-block-title mws-inline-title">Customer reviews</h2>
              <div className="mws-filter-chips" role="group" aria-label="Filter by rating">
                {['all', '5', '4', '3', '2', '1'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`mws-chip ${reviewFilter === f ? 'active' : ''}`}
                    onClick={() => setReviewFilter(f)}
                  >
                    {f === 'all' ? 'All' : `${f}★`}
                  </button>
                ))}
              </div>
            </div>
            {filteredReviews.length === 0 ? (
              <p className="mws-muted">{myReviews.length === 0 ? 'No reviews yet.' : 'No reviews match this filter.'}</p>
            ) : (
              <ul className="mws-review-list">
                {filteredReviews.map((r) => (
                  <li key={r.id} className="mws-review-card">
                    <div className="mws-review-top">
                      <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <span className="mws-review-user">{r.user_name}</span>
                      <span className="mws-review-date">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    {r.comment && <p className="review-comment">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="mws-section mws-profile-section" aria-label="Profile">
            <div className="mws-profile-shell">
              <h2 className="mws-profile-page-title mws-profile-hero-title">Profile</h2>
              <p className="mws-profile-intro mws-muted">
                Manage your sign-in details, security, and your public workshop presence for customers.
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

              {!profile && !editing ? (
                <div className="mws-profile-card mws-profile-card--cta">
                  <h3 className="mws-profile-card-title">Workshop on the map</h3>
                  <p className="mws-muted mws-profile-card-hint">
                    Add your service location, rates, and availability so nearby customers can book you and you can receive open requests.
                  </p>
                  <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
                    Create mechanic profile
                  </button>
                </div>
              ) : (
                <form className="mws-profile-form" onSubmit={saveProfile}>
                  {editing && (
                    <>
                      <h3 className="mws-profile-section-heading">Workshop &amp; service area</h3>
                      <div className="mws-profile-card">
                        <h3 className="mws-profile-card-title">Location</h3>
                        <p className="mws-profile-card-hint">Search or use the map, then confirm with “Use This Location”.</p>
                        <div className="mws-profile-map-wrap">
                          <MapLocationPicker
                            key={profile?.id || 'new-mechanic'}
                            initialLat={form.latitude !== '' && !Number.isNaN(parseFloat(form.latitude)) ? parseFloat(form.latitude) : undefined}
                            initialLng={form.longitude !== '' && !Number.isNaN(parseFloat(form.longitude)) ? parseFloat(form.longitude) : undefined}
                            onSelect={(lat, lng, address) =>
                              setForm((f) => ({
                                ...f,
                                latitude: String(lat),
                                longitude: String(lng),
                                address: address || f.address,
                              }))
                            }
                          />
                        </div>
                        <div className="mws-field-row mws-field-row--2">
                          <label className="mws-field">
                            <span className="mws-field-label">Latitude</span>
                            <input type="number" step="any" placeholder="e.g. 12.97" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} />
                          </label>
                          <label className="mws-field">
                            <span className="mws-field-label">Longitude</span>
                            <input type="number" step="any" placeholder="e.g. 77.59" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} />
                          </label>
                        </div>
                        <label className="mws-field">
                          <span className="mws-field-label">Address</span>
                          <input placeholder="Street, area, city" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                        </label>
                      </div>
                      <div className="mws-profile-card">
                        <h3 className="mws-profile-card-title">Work & availability</h3>
                        <label className="mws-field">
                          <span className="mws-field-label">Specialization</span>
                          <input placeholder="e.g. Engine, brakes, general" value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} />
                        </label>
                        <label className="mws-field">
                          <span className="mws-field-label">Hourly rate ({CURRENCY})</span>
                          <input type="number" step="0.01" min="0" placeholder="0" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} />
                        </label>
                        <label className="mws-checkbox mws-checkbox-card">
                          <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} />
                          <span>I’m available for new job requests</span>
                        </label>
                      </div>
                      <div className="mws-form-actions">
                        <button type="submit" className="btn btn-primary">
                          Save workshop profile
                        </button>
                        {profile && (
                          <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  {profile && !editing && (
                    <div className="mws-profile-readonly">
                      <div className="mws-profile-readonly-head">
                        <h3 className="mws-profile-section-heading">Workshop &amp; service area</h3>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
                          Edit
                        </button>
                      </div>
                      <div className="mws-profile-card mws-profile-card--readonly">
                        <dl className="mws-kv-list">
                          <div className="mws-kv">
                            <dt>Location</dt>
                            <dd>{profile.address || `${profile.latitude ?? '—'}, ${profile.longitude ?? '—'}`}</dd>
                          </div>
                          <div className="mws-kv">
                            <dt>Specialization</dt>
                            <dd>{profile.specialization || '—'}</dd>
                          </div>
                          <div className="mws-kv">
                            <dt>Hourly rate</dt>
                            <dd>
                              {CURRENCY}
                              {profile.hourly_rate ?? '—'}/hr
                            </dd>
                          </div>
                          <div className="mws-kv">
                            <dt>Availability</dt>
                            <dd>
                              <span className={`mws-pill ${profile.is_available ? 'mws-pill--on' : 'mws-pill--off'}`}>
                                {profile.is_available ? 'Available' : 'Unavailable'}
                              </span>
                            </dd>
                          </div>
                          <div className="mws-kv">
                            <dt>Rating</dt>
                            <dd>
                              <span className="mws-rating-inline">★ {Number(profile.rating || 0).toFixed(1)}</span>
                              <span className="mws-kv-sub"> ({profile.total_reviews || 0} reviews)</span>
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  )}
                </form>
              )}
              </div>
            </div>
          </section>
        )}
          </>
        )}
        </div>
      </div>

      {passwordModalOpen && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div
            className="modal-content mws-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mws-password-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mws-password-modal-header">
              <h3 id="mws-password-modal-title">Change password</h3>
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
    </div>
  );
}
