import { useState, useEffect } from 'react';
import { admin } from '../api';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard');
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('overview');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddMechanic, setShowAddMechanic] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    admin.stats().then(setStats).catch(() => setStats({ totalUsers: 0, totalMechanics: 0, totalBookings: 0, pendingBookings: 0 }));
  }, []);

  useEffect(() => {
    if (tab === 'users') admin.users().then(setUsers).catch(() => setUsers([]));
    if (tab === 'mechanics') admin.mechanics().then(setMechanics).catch(() => setMechanics([]));
    if (tab === 'bookings') admin.bookings().then(setBookings).catch(() => setBookings([]));
  }, [tab]);

  const refreshStats = () => admin.stats().then(setStats);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError('');
    const form = e.target;
    try {
      await admin.createUser({
        fullName: form.fullName.value,
        email: form.email.value,
        phone: form.phone.value.trim(),
        password: form.password.value,
      });
      form.reset();
      setShowAddUser(false);
      admin.users().then(setUsers);
      refreshStats();
    } catch (err) {
      setAddError(err.message);
    }
  };

  const handleAddMechanic = async (e) => {
    e.preventDefault();
    setAddError('');
    const form = e.target;
    try {
      await admin.createMechanic({
        fullName: form.fullName.value,
        email: form.email.value,
        phone: form.phone.value.trim(),
        password: form.password.value,
        address: form.address.value || null,
        specialization: form.specialization.value || null,
        hourlyRate: form.hourlyRate.value || null,
        latitude: form.latitude.value || null,
        longitude: form.longitude.value || null,
      });
      form.reset();
      setShowAddMechanic(false);
      admin.mechanics().then(setMechanics);
      refreshStats();
    } catch (err) {
      setAddError(err.message);
    }
  };

  return (
    <div className="dashboard admin-dashboard">
      <header>
        <h1>Admin Dashboard</h1>
        <div>
          <ThemeToggle />
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Overview</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users</button>
        <button className={tab === 'mechanics' ? 'active' : ''} onClick={() => setTab('mechanics')}>Mechanics</button>
        <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>Bookings</button>
      </nav>

      {tab === 'overview' && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.totalUsers}</span>
            <span className="stat-label">Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.totalMechanics}</span>
            <span className="stat-label">Mechanics</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.totalBookings}</span>
            <span className="stat-label">Total Bookings</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.pendingBookings}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="section-with-form">
          <div className="section-header">
            <h2>App Users (customers)</h2>
            <button className="btn btn-primary" onClick={() => setShowAddUser(true)}>+ Add User</button>
          </div>
          {showAddUser && (
            <form className="admin-form" onSubmit={handleAddUser}>
              <h4>Add New User</h4>
              <input name="fullName" placeholder="Full Name" required />
              <input name="email" type="email" placeholder="Email" required />
              <input name="phone" type="tel" inputMode="tel" placeholder="Phone (unique, e.g. +91…)" required />
              <input name="password" type="password" placeholder="Password" required minLength={6} />
              {addError && <p className="error">{addError}</p>}
              <div>
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddUser(false); setAddError(''); }}>Cancel</button>
              </div>
            </form>
          )}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || '-'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'mechanics' && (
        <div className="section-with-form">
          <div className="section-header">
            <h2>Mechanics</h2>
            <button className="btn btn-primary" onClick={() => setShowAddMechanic(true)}>+ Add Mechanic</button>
          </div>
          {showAddMechanic && (
            <form className="admin-form" onSubmit={handleAddMechanic}>
              <h4>Add New Mechanic</h4>
              <input name="fullName" placeholder="Full Name" required />
              <input name="email" type="email" placeholder="Email" required />
              <input name="phone" type="tel" inputMode="tel" placeholder="Phone (unique, e.g. +91…)" required />
              <input name="password" type="password" placeholder="Password" required minLength={6} />
              <input name="address" placeholder="Address" />
              <input name="specialization" placeholder="Specialization (e.g. General, Brakes)" />
              <input name="hourlyRate" type="number" step="0.01" placeholder="Hourly Rate (₹)" />
              <input name="latitude" type="number" step="any" placeholder="Latitude" />
              <input name="longitude" type="number" step="any" placeholder="Longitude" />
              {addError && <p className="error">{addError}</p>}
              <div>
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddMechanic(false); setAddError(''); }}>Cancel</button>
              </div>
            </form>
          )}
          <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Specialization</th>
                <th>Rate</th>
                <th>Available</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {mechanics.map((m) => (
                <tr key={m.id}>
                  <td>{m.full_name}</td>
                  <td>{m.email}</td>
                  <td>{m.specialization || '-'}</td>
                  <td>₹{m.hourly_rate}/hr</td>
                  <td>{m.is_available ? 'Yes' : 'No'}</td>
                  <td>⭐ {m.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Type</th>
                <th>User</th>
                <th>Mechanic</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.category_name}</td>
                  <td>{b.category_type}</td>
                  <td>{b.user_name}</td>
                  <td>{b.mechanic_name || '-'}</td>
                  <td><span className={`badge ${b.status}`}>{b.status}</span></td>
                  <td>{new Date(b.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
