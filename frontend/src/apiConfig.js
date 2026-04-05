/**
 * API base for fetch() — built at runtime from Vite env.
 *
 * - **Dev (default):** unset → `"/api"` so requests stay same-origin and Vite proxies to the backend.
 * - **Production (API on another host):** set `VITE_API_BASE_URL=https://your-api.example.com`
 *   (with or without trailing `/api`; we normalize to `.../api`).
 */
export function getApiBase() {
  const v = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!v) return '/api';
  const base = v.replace(/\/$/, '');
  if (!/\/api$/i.test(base)) return `${base}/api`;
  return base;
}

export const API = getApiBase();

if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    '[API] This production build has no VITE_API_BASE_URL. Requests use same-origin /api (Vercel rewrites). ' +
      'Slow routes (e.g. signup OTP) can hit proxy timeouts. Set VITE_API_BASE_URL to your Render API URL and redeploy.'
  );
}

/**
 * When `API` is absolute, returns that server origin for resolving relative `/uploads/...` paths.
 * When `API` is relative (`/api`), returns "" (browser uses same origin as the SPA).
 */
export function getPublicApiOrigin() {
  const base = API;
  if (base.startsWith('http')) {
    try {
      return new URL(base).origin;
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Turn a possibly relative upload path into an absolute URL when the API is on another host.
 * Absolute URLs and Cloudinary URLs are returned unchanged.
 */
export function resolvePublicUrl(url) {
  if (url == null || typeof url !== 'string') return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/uploads')) {
    const origin = getPublicApiOrigin();
    if (origin) return `${origin}${url}`;
  }
  return url;
}
