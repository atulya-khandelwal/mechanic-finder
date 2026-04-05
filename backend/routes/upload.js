import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { isCloudinaryConfigured, uploadImageBuffer } from '../services/cloudinary.service.js';

const memory = multer.memoryStorage();
const uploadMw = multer({ storage: memory, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

function cloudinaryRequired(res) {
  if (!isCloudinaryConfigured()) {
    res.status(503).json({
      error:
        'Image uploads require Cloudinary. Set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) in the server environment.',
    });
    return false;
  }
  return true;
}

async function storeVehicleImage(req, res) {
  if (!req.file?.buffer) return res.status(400).json({ error: 'No image uploaded' });
  if (!cloudinaryRequired(res)) return;
  try {
    const url = await uploadImageBuffer(req.file.buffer, 'vehicle');
    return res.json({ url });
  } catch (err) {
    console.error('vehicle-image upload:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}

async function storeProfilePhoto(req, res) {
  if (!req.file?.buffer) return res.status(400).json({ error: 'No image uploaded' });
  if (!cloudinaryRequired(res)) return;
  try {
    const url = await uploadImageBuffer(req.file.buffer, 'profile');
    return res.json({ url });
  } catch (err) {
    console.error('profile-photo upload:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}

const router = express.Router();
router.use(authenticate);

router.post('/vehicle-image', uploadMw.single('image'), (req, res) => {
  storeVehicleImage(req, res).catch((e) => res.status(500).json({ error: e.message || 'Upload failed' }));
});

router.post('/profile-photo', uploadMw.single('image'), (req, res) => {
  storeProfilePhoto(req, res).catch((e) => res.status(500).json({ error: e.message || 'Upload failed' }));
});

export default router;
