import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { auth as authApi } from '../api';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function ForgotPassword() {
  useDocumentTitle('Forgot Password');
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.forgotPassword(trimmed);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <ThemeToggle />
      <div className="auth-card">
        <h1>Mobile Mechanic</h1>
        <h2>Forgot password</h2>
        {done ? (
          <>
            <p className="auth-muted" style={{ lineHeight: 1.5 }}>
              If an account exists for that email, you will receive a link to reset your password. Check your inbox
              and spam folder.
            </p>
            <p className="auth-link" style={{ marginTop: '1.25rem' }}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="auth-muted" style={{ marginTop: 0, lineHeight: 1.5 }}>
              Enter the email address for your account. We will send a one-time link to choose a new password.
            </p>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        {!done && (
          <p className="auth-link">
            <Link to="/login">Back to sign in</Link>
          </p>
        )}
      </div>
    </main>
  );
}
