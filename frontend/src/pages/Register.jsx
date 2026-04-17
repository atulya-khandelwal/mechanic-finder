import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import {
  validatePhoneInput,
  isIndiaDefaultRegion,
  formatIndianPhoneFieldValue,
} from '../utils/phoneValidation';
import { formatRegisterStartError, formatRegisterVerifyError } from '../utils/authErrors';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function Register() {
  useDocumentTitle('Create Account');
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: isIndiaDefaultRegion() ? '+91 ' : '',
    role: 'user',
  });
  const [code, setCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { registerStart, registerResend, registerVerify } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone' && isIndiaDefaultRegion()) {
      setForm((f) => ({ ...f, phone: formatIndianPhoneFieldValue(value) }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleStart = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const phoneCheck = validatePhoneInput(form.phone);
    if (!phoneCheck.ok) {
      setError(phoneCheck.error);
      return;
    }
    setSubmitting(true);
    try {
      await registerStart({ ...form, phone: phoneCheck.e164 });
      setStep(2);
      setInfo('Enter the code from your email and the SMS code sent to your phone.');
    } catch (err) {
      setError(formatRegisterStartError(err));
      if (err.retryAfterSeconds != null) {
        setInfo(`You can request another code in ${err.retryAfterSeconds} seconds.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      await registerVerify({
        email: form.email.trim(),
        code: code.trim(),
        phoneCode: phoneCode.trim(),
      });
      navigate('/');
    } catch (err) {
      setError(formatRegisterVerifyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      await registerResend(form.email.trim());
      setInfo('A new code has been sent.');
    } catch (err) {
      setError(formatRegisterStartError(err));
      if (err.retryAfterSeconds != null) {
        setInfo(`Try again in ${err.retryAfterSeconds} seconds.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <ThemeToggle />
      <div className="auth-card">
        <h1>Mobile Mechanic</h1>
        <h2>Create Account</h2>

        {step === 1 && (
          <form onSubmit={handleStart}>
            <input name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleChange} required />
            <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder={isIndiaDefaultRegion() ? '10-digit mobile number' : 'Mobile number'}
              value={form.phone}
              onChange={handleChange}
              required
            />
            <p className="auth-muted" style={{ marginTop: '-0.25rem', fontSize: '0.85rem' }}>
              {isIndiaDefaultRegion()
                ? '+91 is added for you. Type your 10-digit number — we’ll format it. SMS verification follows.'
                : 'Include country code. We’ll send an SMS to verify this number.'}
            </p>
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="user">I need a mechanic</option>
              <option value="mechanic">I am a mechanic</option>
            </select>
            {error && <p className="error">{error}</p>}
            {info && <p className="auth-info">{info}</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending code…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerify}>
            <p className="auth-muted">
              Email code sent to <strong>{form.email.trim()}</strong>. SMS code sent to{' '}
              <strong>{form.phone.trim() || 'your phone'}</strong>.
            </p>
            <label className="auth-field-label" htmlFor="reg-email-code">
              Email code
            </label>
            <input
              id="reg-email-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Code from email"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              required
            />
            <label className="auth-field-label" htmlFor="reg-sms-code">
              SMS code
            </label>
            <input
              id="reg-sms-code"
              name="phoneCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Code from SMS"
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              required
            />
            {error && <p className="error">{error}</p>}
            {info && <p className="auth-info">{info}</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Verifying…' : 'Verify & create account'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleResend} disabled={submitting}>
              Resend code
            </button>
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setStep(1);
                setCode('');
                setPhoneCode('');
                setError('');
                setInfo('');
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="auth-link">Already have an account? <Link to="/login">Sign In</Link></p>
      </div>
    </main>
  );
}
