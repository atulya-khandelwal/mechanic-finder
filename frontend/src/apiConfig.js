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
 * Image URLs from the API are Cloudinary HTTPS URLs. Passthrough for safety (null, relative, etc.).
 */
export function resolvePublicUrl(url) {
  if (url == null || typeof url !== 'string') return url;
  if (/^https?:\/\//i.test(url)) return url;
  return url;
}
