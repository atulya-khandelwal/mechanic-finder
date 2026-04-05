import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import {
  validatePhoneInput,
  looksLikeEmail,
  formatLoginIdentifierInput,
} from '../utils/phoneValidation';
import { formatLoginError } from '../utils/authErrors';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const id = loginId.trim();
    if (!id) {
      setError('Enter your email or phone number.');
      return;
    }
    let loginValue = id;
    if (!looksLikeEmail(id)) {
      const phoneCheck = validatePhoneInput(id);
      if (!phoneCheck.ok) {
        setError(phoneCheck.error);
        return;
      }
      loginValue = phoneCheck.e164;
    }
    const usedPhone = !looksLikeEmail(id);
    try {
      await login(loginValue, password);
      navigate('/');
    } catch (err) {
      setError(formatLoginError(err, { usedPhone }));
    }
  };

  return (
    <div className="auth-page">
      <ThemeToggle />
      <div className="auth-card">
        <h1>Mobile Mechanic</h1>
        <h2>Sign In</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="login"
            autoComplete="username"
            placeholder="Email or phone number"
            value={loginId}
            onChange={(e) => setLoginId(formatLoginIdentifierInput(e.target.value))}
            required
          />
          <p className="auth-muted" style={{ marginTop: '-0.35rem', fontSize: '0.85rem' }}>
            Email, or your mobile — for Indian numbers we add +91 and spacing as you type.
          </p>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary">Sign In</button>
        </form>
        <p className="auth-link">Don't have an account? <Link to="/register">Register as User or Mechanic</Link></p>
      </div>
    </div>
  );
}
