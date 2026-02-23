import { useLocation } from '../context/LocationContext';
import ThemeToggle from '../components/ThemeToggle';
import MapLocationPicker from '../components/MapLocationPicker';

export default function LocationGate({ children }) {
  const { location, setLocation } = useLocation();

  if (location) return children;

  return (
    <div className="location-gate">
      <ThemeToggle />
      <div className="location-card">
        <h1>📍 Share Your Location</h1>
        <p>We need your location to find mechanics within 10km of you.</p>
        <MapLocationPicker
          onSelect={(lat, lng, address) => setLocation(lat, lng, address)}
        />
      </div>
    </div>
  );
}
