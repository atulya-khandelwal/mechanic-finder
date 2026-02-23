import express from 'express';
import { query } from '../db.js';

const router = express.Router();

router.get('/categories', async (req, res) => {
  try {
    const { type } = req.query; // 'emergency' or 'scheduled'
    let sql = 'SELECT * FROM service_categories';
    const params = [];
    if (type) {
      sql += ' WHERE type = $1';
      params.push(type);
    }
    sql += ' ORDER BY type, name';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

export default router;
