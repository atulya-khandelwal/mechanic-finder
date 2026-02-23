import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { searchAddress, reverseGeocode, getMapboxToken } from '../utils/mapbox';

const DEFAULT_CENTER = [-98.5795, 39.8283]; // US center
const DEFAULT_ZOOM = 3;

export default function MapLocationPicker({ onSelect, initialLat, initialLng }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [pendingLocation, setPendingLocation] = useState(null); // { lat, lng, address }
  const [fallbackLat, setFallbackLat] = useState('');
  const [fallbackLng, setFallbackLng] = useState('');
  const token = getMapboxToken();

  const updatePendingLocation = useCallback(async (lng, lat) => {
    const address = await reverseGeocode(lng, lat);
    setPendingLocation({ lat, lng, address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
  }, []);

  useEffect(() => {
    if (!token || !mapContainer.current) return;

    mapboxgl.accessToken = token;
    const center = initialLat && initialLng ? [initialLng, initialLat] : DEFAULT_CENTER;
    const zoom = initialLat && initialLng ? 14 : DEFAULT_ZOOM;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom,
    });

    marker.current = new mapboxgl.Marker({ draggable: true })
      .setLngLat(center)
      .addTo(map.current);

    if (initialLat && initialLng) {
      map.current.flyTo({ center: [initialLng, initialLat], zoom: 14 });
    }

    const onMapClick = (e) => {
      const { lng, lat } = e.lngLat;
      marker.current.setLngLat([lng, lat]);
      updatePendingLocation(lng, lat);
    };

    const onMarkerDragEnd = () => {
      const pos = marker.current.getLngLat();
      updatePendingLocation(pos.lng, pos.lat);
    };

    map.current.on('click', onMapClick);
    marker.current.on('dragend', onMarkerDragEnd);

    return () => {
      map.current?.off('click', onMapClick);
      marker.current?.off('dragend', onMarkerDragEnd);
      map.current?.remove();
      map.current = null;
    };
  }, [token, initialLat, initialLng, updatePendingLocation]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setError('');
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        const results = await searchAddress(q);
        if (cancelled) return;
        setSearchResults(results);
        if (results.length > 0 && map.current) {
          const [lng, lat] = results[0].center;
          const placeName = results[0].place_name;
          map.current.flyTo({ center: [lng, lat], zoom: 14 });
          marker.current?.setLngLat([lng, lat]);
          setPendingLocation({ lat, lng, address: placeName });
        } else {
          setError('No results found');
        }
      } catch (err) {
        if (!cancelled) setError('Search failed. Check your Mapbox token.');
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const selectResult = (feature) => {
    const [lng, lat] = feature.center;
    setSearchQuery(feature.place_name);
    setSearchResults([]);
    setPendingLocation({ lat, lng, address: feature.place_name });
    if (map.current) {
      map.current.flyTo({ center: [lng, lat], zoom: 14 });
      marker.current?.setLngLat([lng, lat]);
    }
  };

  const useMyLocation = () => {
    setError('');
    setLocating(true);
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const address = await reverseGeocode(longitude, latitude);
        setPendingLocation({ lat: latitude, lng: longitude, address: address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
        if (map.current) {
          map.current.flyTo({ center: [longitude, latitude], zoom: 14 });
          marker.current?.setLngLat([longitude, latitude]);
        }
        setLocating(false);
      },
      (err) => {
        setError(err.message || 'Could not get location');
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const submitFallback = (e) => {
    e?.preventDefault();
    const lat = parseFloat(fallbackLat);
    const lng = parseFloat(fallbackLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Enter valid coordinates (lat: -90 to 90, lng: -180 to 180)');
      return;
    }
    setError('');
    onSelect?.(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  if (!token) {
    return (
      <div className="mapbox-fallback">
        <p>Add <code>VITE_MAPBOX_ACCESS_TOKEN</code> to your .env for map & address search.</p>
        <p>Get a free token at <a href="https://account.mapbox.com/" target="_blank" rel="noreferrer">mapbox.com</a></p>
        <form onSubmit={submitFallback} style={{ marginTop: '1rem' }}>
          <input
            type="text"
            placeholder="Latitude (e.g. 37.7749)"
            value={fallbackLat}
            onChange={(e) => setFallbackLat(e.target.value)}
          />
          <input
            type="text"
            placeholder="Longitude (e.g. -122.4194)"
            value={fallbackLng}
            onChange={(e) => setFallbackLng(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Use This Location</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="map-location-picker">
      <div className="map-search-row">
        <div className="map-search-form">
          <input
            type="text"
            placeholder="Search address or place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searching && <span className="map-search-status">Searching...</span>}
        </div>
        <button type="button" className="btn btn-secondary" onClick={useMyLocation} disabled={locating}>
          {locating ? 'Locating...' : '📍 My Location'}
        </button>
      </div>
      {searchResults.length > 0 && (
        <ul className="map-search-results">
          {searchResults.map((f, i) => (
            <li key={i} onClick={() => selectResult(f)}>{f.place_name}</li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
      <p className="map-hint">Search for an address, use your location, or click/drag on the map</p>
      <div ref={mapContainer} className="map-container" />
      {pendingLocation && (
        <div className="map-confirm">
          <p><strong>Selected:</strong> {pendingLocation.address}</p>
          <button type="button" className="btn btn-primary" onClick={() => onSelect?.(pendingLocation.lat, pendingLocation.lng, pendingLocation.address)}>
            Use This Location
          </button>
        </div>
      )}
    </div>
  );
}
