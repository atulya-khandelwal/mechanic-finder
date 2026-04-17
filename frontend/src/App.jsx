import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserDashboard from './pages/UserDashboard';
import MechanicDashboard from './pages/MechanicDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LocationGate from './pages/LocationGate';
import LandingPage from './pages/LandingPage';
import KnowledgeBase from './pages/KnowledgeBase';
import Article from './pages/Article';
import './App.css';

function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirect =
      user.role === 'admin' ? '/admin' : user.role === 'mechanic' ? '/mechanic/overview' : '/user/find';
    return <Navigate to={redirect} replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/knowledge-base" element={<KnowledgeBase />} />
      <Route path="/knowledge-base/:slug" element={<Article />} />
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/mechanic/jobs/:bookingId"
        element={
          <PrivateRoute allowedRoles={['mechanic']}>
            <MechanicDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/mechanic/:tab"
        element={
          <PrivateRoute allowedRoles={['mechanic']}>
            <MechanicDashboard />
          </PrivateRoute>
        }
      />
      <Route path="/mechanic" element={<Navigate to="/mechanic/overview" replace />} />
      <Route
        path="/user/bookings/:bookingId"
        element={
          <PrivateRoute allowedRoles={['user']}>
            <LocationGate>
              <UserDashboard />
            </LocationGate>
          </PrivateRoute>
        }
      />
      <Route
        path="/user/:tab"
        element={
          <PrivateRoute allowedRoles={['user']}>
            <LocationGate>
              <UserDashboard />
            </LocationGate>
          </PrivateRoute>
        }
      />
      <Route path="/user" element={<Navigate to="/user/find" replace />} />
      <Route path="/" element={<NavigateToRole />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function NavigateToRole() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <LandingPage />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'mechanic') return <Navigate to="/mechanic/overview" replace />;
  return <Navigate to="/user/find" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LocationProvider>
            <div className="app">
              <AppRoutes />
            </div>
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
