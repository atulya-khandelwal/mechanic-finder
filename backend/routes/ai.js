import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { config } from '../config.js';
import { suggestTriage } from '../services/ai-triage.service.js';

const router = express.Router();

router.get('/capabilities', (req, res) => {
  res.json({ triageEnabled: Boolean(config.groqApiKey) });
});

router.post('/triage', authenticate, requireRole('user'), async (req, res) => {
  if (!config.groqApiKey) {
    return res.status(503).json({
      error: 'AI suggestions are not configured. Set GROQ_API_KEY on the server.',
      code: 'NOT_CONFIGURED',
    });
  }

  try {
    const { problemText, vehicleMake, vehicleModel } = req.body || {};
    const result = await suggestTriage({ problemText, vehicleMake, vehicleModel });
    res.json(result);
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    if (err.code === 'VALIDATION' || err.code === 'INVALID_CATEGORY') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    if (err.code === 'NO_CATEGORIES') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    if (err.code === 'PARSE') {
      return res.status(502).json({ error: err.message, code: err.code });
    }
    if (err.code === 'GROQ_ERROR') {
      return res.status(err.status >= 400 && err.status < 600 ? err.status : 502).json({
        error: err.message,
        code: err.code,
      });
    }
    console.error('AI triage error:', err);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

export default router;
