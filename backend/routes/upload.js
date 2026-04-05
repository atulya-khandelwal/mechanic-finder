import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import { isCloudinaryConfigured, uploadImageBuffer } from '../services/cloudinary.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const memory = multer.memoryStorage();
const uploadMw = multer({ storage: memory, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

function safeLocalName(prefix, originalname) {
  const base = String(originalname || 'image').replace(/[^\w.\-]+/g, '-').slice(0, 80);
  return `${prefix}-${Date.now()}-${base}`;
}

async function storeVehicleImage(req, res) {
  if (!req.file?.buffer) return res.status(400).json({ error: 'No image uploaded' });
  try {
    if (isCloudinaryConfigured()) {
      const url = await uploadImageBuffer(req.file.buffer, 'vehicle');
      return res.json({ url });
    }
    const filename = safeLocalName('vehicle', req.file.originalname);
    await fs.promises.writeFile(join(uploadsDir, filename), req.file.buffer);
    return res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('vehicle-image upload:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}

async function storeProfilePhoto(req, res) {
  if (!req.file?.buffer) return res.status(400).json({ error: 'No image uploaded' });
  try {
    if (isCloudinaryConfigured()) {
      const url = await uploadImageBuffer(req.file.buffer, 'profile');
      return res.json({ url });
    }
    const filename = safeLocalName('profile', req.file.originalname);
    await fs.promises.writeFile(join(uploadsDir, filename), req.file.buffer);
    return res.json({ url: `/uploads/${filename}` });
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
