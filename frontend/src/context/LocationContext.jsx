import { createContext, useContext, useState } from 'react';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(() => {
    const saved = localStorage.getItem('userLocation');
    return saved ? JSON.parse(saved) : null;
  });

  const saveLocation = (lat, lng, address) => {
    const loc = { latitude: lat, longitude: lng, address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    setLocation(loc);
    localStorage.setItem('userLocation', JSON.stringify(loc));
  };

  const clearLocation = () => {
    setLocation(null);
    localStorage.removeItem('userLocation');
  };

  return (
    <LocationContext.Provider value={{ location, setLocation: saveLocation, clearLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);
