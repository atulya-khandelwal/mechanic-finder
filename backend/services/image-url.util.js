/**
 * URLs we persist for user-uploaded images (Cloudinary only).
 */
export function isAllowedStoredImageUrl(url) {
  if (url == null || url === '') return true;
  const t = String(url).trim();
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return u.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}
