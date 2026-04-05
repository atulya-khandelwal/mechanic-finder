import { v2 as cloudinary } from 'cloudinary';

const FOLDERS = {
  vehicle: 'mobile_mechanic/vehicles',
  profile: 'mobile_mechanic/profiles',
};

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
  );
}

function ensureConfig() {
  if (process.env.CLOUDINARY_URL) return;
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

/**
 * @param {Buffer} buffer
 * @param {'vehicle' | 'profile'} kind
 * @returns {Promise<string>} HTTPS URL (secure_url)
 */
export function uploadImageBuffer(buffer, kind) {
  ensureConfig();
  const folder = FOLDERS[kind] || 'mobile_mechanic/misc';
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => {
        if (err) reject(err);
        else if (!result?.secure_url) reject(new Error('Cloudinary upload returned no URL'));
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
