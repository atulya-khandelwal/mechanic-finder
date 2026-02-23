const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

export async function searchAddress(query) {
  if (!MAPBOX_TOKEN || !query?.trim()) return [];
  const q = encodeURIComponent(query.trim());
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=address,place,locality`
  );
  const data = await res.json();
  return data.features || [];
}

export async function reverseGeocode(lng, lat) {
  if (!MAPBOX_TOKEN) return null;
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
  );
  const data = await res.json();
  const f = data.features?.[0];
  return f ? f.place_name : null;
}

export function getMapboxToken() {
  return MAPBOX_TOKEN;
}
