import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import useDocumentTitle from '../hooks/useDocumentTitle';

const SERVICES_EMERGENCY = [
  { name: 'Breakdown Assistance', icon: '🚗' },
  { name: 'Flat Tire Repair', icon: '🛞' },
  { name: 'Battery Jump Start', icon: '🔋' },
  { name: 'Towing Service', icon: '🚛' },
  { name: 'Fuel Delivery', icon: '⛽' },
  { name: 'Lockout Assistance', icon: '🔑' },
];

const SERVICES_SCHEDULED = [
  { name: 'Oil Change', icon: '🛢️' },
  { name: 'Brake Service', icon: '🔧' },
  { name: 'Engine Tune-Up', icon: '⚙️' },
  { name: 'AC Service', icon: '❄️' },
  { name: 'Car Wash & Detailing', icon: '✨' },
  { name: 'General Inspection', icon: '🔍' },
];

const STEPS = [
  {
    number: '1',
    title: 'Share Your Location',
    description: 'Allow location access or enter your address to find mechanics within 10 km of you.',
  },
  {
    number: '2',
    title: 'Book a Mechanic',
    description: 'Choose a mechanic, describe your problem, upload vehicle photos, and book instantly.',
  },
  {
    number: '3',
    title: 'Get It Fixed',
    description: 'Track your booking in real-time, chat with your mechanic, and pay securely when done.',
  },
];

const STATS = [
  { value: '24/7', label: 'Availability' },
  { value: '10 km', label: 'Search Radius' },
  { value: '< 5 min', label: 'Avg. Response' },
  { value: '4.5+', label: 'Avg. Rating' },
];

export default function LandingPage() {
  useDocumentTitle('Find Trusted Mobile Mechanics Near You');

  return (
    <div className="landing">
      <ThemeToggle />

      {/* ── Hero ── */}
      <header className="landing-hero">
        <div className="landing-container">
          <h1 className="landing-hero-title">
            Your Mechanic,<br />
            <span className="landing-accent">At Your Doorstep</span>
          </h1>
          <p className="landing-hero-sub">
            Find trusted mobile mechanics near you for emergency breakdowns and
            scheduled vehicle repairs. Book instantly, chat in real-time, and pay
            your way.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-primary landing-btn-lg">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-secondary landing-btn-lg">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* ── Stats bar ── */}
      <section className="landing-stats" aria-label="Key numbers">
        <div className="landing-container landing-stats-grid">
          {STATS.map((s) => (
            <div key={s.label} className="landing-stat">
              <span className="landing-stat-value">{s.value}</span>
              <span className="landing-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-section" aria-labelledby="how-heading">
        <div className="landing-container">
          <h2 id="how-heading" className="landing-section-title">How It Works</h2>
          <p className="landing-section-sub">Three simple steps to get your vehicle fixed</p>
          <div className="landing-steps">
            {STEPS.map((step) => (
              <div key={step.number} className="landing-step">
                <div className="landing-step-number">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="landing-section landing-section-alt" aria-labelledby="services-heading">
        <div className="landing-container">
          <h2 id="services-heading" className="landing-section-title">Services We Offer</h2>
          <p className="landing-section-sub">From roadside emergencies to routine maintenance</p>

          <div className="landing-services-group">
            <h3 className="landing-services-label">Emergency Services</h3>
            <div className="landing-services-grid">
              {SERVICES_EMERGENCY.map((s) => (
                <div key={s.name} className="landing-service-card">
                  <span className="landing-service-icon">{s.icon}</span>
                  <span className="landing-service-name">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-services-group">
            <h3 className="landing-services-label">Scheduled Services</h3>
            <div className="landing-services-grid">
              {SERVICES_SCHEDULED.map((s) => (
                <div key={s.name} className="landing-service-card">
                  <span className="landing-service-icon">{s.icon}</span>
                  <span className="landing-service-name">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why choose us ── */}
      <section className="landing-section" aria-labelledby="why-heading">
        <div className="landing-container">
          <h2 id="why-heading" className="landing-section-title">Why Mobile Mechanic?</h2>
          <div className="landing-features-grid">
            <div className="landing-feature">
              <div className="landing-feature-icon">📍</div>
              <h3>Location-Based</h3>
              <p>Find verified mechanics within 10 km. No more guessing who's nearby.</p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">💬</div>
              <h3>Real-Time Chat</h3>
              <p>Communicate directly with your mechanic about the job, parts, and timing.</p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">💳</div>
              <h3>Flexible Payments</h3>
              <p>Pay online with Razorpay or choose cash on delivery — your choice.</p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">⭐</div>
              <h3>Verified Reviews</h3>
              <p>Read honest reviews from real customers before booking your mechanic.</p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">🔔</div>
              <h3>Live Updates</h3>
              <p>Get push notifications as your booking progresses from accepted to completed.</p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">🤖</div>
              <h3>AI Triage</h3>
              <p>Describe your problem and our AI suggests the right service and safety tips.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Knowledge Base teaser ── */}
      <section className="landing-section" aria-labelledby="kb-heading">
        <div className="landing-container" style={{ textAlign: 'center' }}>
          <h2 id="kb-heading" className="landing-section-title">Learn About Your Vehicle</h2>
          <p className="landing-section-sub">Free guides and expert advice for every situation</p>
          <Link to="/knowledge-base" className="btn btn-primary landing-btn-lg">
            Browse Knowledge Base
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-container">
          <h2>Ready to get started?</h2>
          <p>Join thousands of vehicle owners who trust Mobile Mechanic for fast, reliable repairs.</p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-primary landing-btn-lg">
              Create Free Account
            </Link>
            <Link to="/register" className="btn btn-secondary landing-btn-lg">
              Register as Mechanic
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <p>&copy; {new Date().getFullYear()} Mobile Mechanic. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
