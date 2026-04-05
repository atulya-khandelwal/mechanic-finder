/**
 * Map deep links for the same lat/lng. Options depend on device detection when possible.
 */

function parseCoords(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (Number.isNaN(la) || Number.isNaN(lo)) return null;
  return { la, lo };
}

const GEO_TITLE = 'Uses your device’s default maps app when the browser supports it';

/** Google Maps (web + native app when installed). */
export function googleMapsSearchUrl(lat, lng) {
  const c = parseCoords(lat, lng);
  if (!c) return null;
  const query = `${c.la},${c.lo}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Apple Maps — best on iPhone/iPad/Mac Safari; opens web elsewhere. */
export function appleMapsUrl(lat, lng) {
  const c = parseCoords(lat, lng);
  if (!c) return null;
  return `https://maps.apple.com/?q=${encodeURIComponent(`${c.la},${c.lo}`)}&ll=${c.la},${c.lo}`;
}

/** Waze deep link (exported for reuse; not shown in the default device-aware list). */
export function wazeUrl(lat, lng) {
  const c = parseCoords(lat, lng);
  if (!c) return null;
  return `https://waze.com/ul?ll=${c.la},${c.lo}&navigate=yes`;
}

/**
 * RFC 5870-style geo: URI — often opens the system “choose maps app” sheet.
 */
export function geoMapsUrl(lat, lng) {
  const c = parseCoords(lat, lng);
  if (!c) return null;
  return `geo:${c.la},${c.lo}`;
}

export function formatCoordinates(lat, lng) {
  const c = parseCoords(lat, lng);
  if (!c) return '—';
  return `${c.la.toFixed(6)}, ${c.lo.toFixed(6)}`;
}

/**
 * `android` | `ios` | `unknown` — used to pick sensible default map apps.
 */
export function getMapsDeviceHint() {
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent || '';
  const uaData = navigator.userAgentData;
  if (uaData?.platform) {
    const p = String(uaData.platform).toLowerCase();
    if (p === 'android') return 'android';
    if (p === 'ios' || p.includes('iphone') || p.includes('ipad')) return 'ios';
  }

  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return 'ios';

  return 'unknown';
}

function mapsAppOption(lat, lng) {
  return {
    id: 'geo',
    label: 'Use other platforms',
    href: geoMapsUrl(lat, lng),
    newTab: false,
    title: GEO_TITLE,
  };
}

/**
 * Android: Google Maps + Maps app.
 * iOS: Apple Maps + Maps app.
 * Unknown (desktop, privacy browsers, etc.): Google Maps + Apple Maps + Maps app.
 */
export function mapAppChoices(lat, lng) {
  const c = parseCoords(lat, lng);
  if (!c) return [];

  const g = googleMapsSearchUrl(lat, lng);
  const a = appleMapsUrl(lat, lng);
  const geoOpt = mapsAppOption(lat, lng);
  const hint = getMapsDeviceHint();

  if (hint === 'android') {
    return [
      { id: 'google', label: 'Google Maps', href: g, newTab: true },
      geoOpt,
    ];
  }
  if (hint === 'ios') {
    return [
      { id: 'apple', label: 'Apple Maps', href: a, newTab: true },
      geoOpt,
    ];
  }
  return [
    { id: 'google', label: 'Google Maps', href: g, newTab: true },
    { id: 'apple', label: 'Apple Maps', href: a, newTab: true },
    geoOpt,
  ];
}
