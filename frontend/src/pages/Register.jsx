import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', role: 'user' });
  const [error, setError] = useState('');
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-page">
      <ThemeToggle />
      <div className="auth-card">
        <h1>Mobile Mechanic</h1>
        <h2>Create Account</h2>
        <form onSubmit={handleSubmit}>
          <input name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <input name="phone" placeholder="Phone (optional)" value={form.phone} onChange={handleChange} />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required minLength={6} />
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="user">I need a mechanic</option>
            <option value="mechanic">I am a mechanic</option>
          </select>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary">Register</button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Sign In</Link></p>
      </div>
    </div>
  );
}
