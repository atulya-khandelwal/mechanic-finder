import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { auth as authApi } from '../api';

export default function ResetPassword() {
  const { user, applyAuthToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!tokenFromUrl) {
      setError('Missing reset token. Open the link from your email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const { token } = await authApi.resetPassword({ token: tokenFromUrl, newPassword: password });
      await applyAuthToken(token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!tokenFromUrl) {
    return (
      <div className="auth-page">
        <ThemeToggle />
        <div className="auth-card">
          <h1>Mobile Mechanic</h1>
          <h2>Invalid link</h2>
          <p className="auth-muted">This page needs a valid reset link from your email.</p>
          <p className="auth-link">
            <Link to="/forgot-password">Request a new link</Link> · <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <ThemeToggle />
      <div className="auth-card">
        <h1>Mobile Mechanic</h1>
        <h2>Set a new password</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <input
            type="password"
            name="confirm"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
        <p className="auth-link">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
