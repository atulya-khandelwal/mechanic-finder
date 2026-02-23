import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LocationGate from './LocationGate';
import UserDashboard from './UserDashboard';
import MechanicDashboard from './MechanicDashboard';
import AdminDashboard from './AdminDashboard';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'admin') {
    return <AdminDashboard />;
  }
  if (user.role === 'mechanic') {
    return <MechanicDashboard />;
  }

  return (
    <LocationGate>
      <UserDashboard />
    </LocationGate>
  );
}
