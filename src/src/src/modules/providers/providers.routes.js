const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { query } = require('../../config/db');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM providers WHERE status = 'approved' ORDER BY is_available DESC, created_at DESC LIMIT 50");
    res.json({ providers: rows });
  } catch (err) { next(err); }
});

router.post('/register', authenticate, async (req, res, next) => {
  try {
    const { full_name, services_offered, experience_years, bio, whatsapp_number, location_lat, location_lng, location_label } = req.body;
    await query('UPDATE users SET role = $1 WHERE id = $2', ['provider', req.user.id]);
    const { rows } = await query(
      'INSERT INTO providers (user_id, full_name, services_offered, experience_years, bio, whatsapp_number, location_lat, location_lng, location_label) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.user.id, full_name, services_offered, experience_years, bio, whatsapp_number, location_lat, location_lng, location_label]
    );
    res.status(201).json({ provider: rows[0] });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM providers WHERE user_id = $1', [req.user.id]);
    if (!rows[0]) return res.status(403).json({ error: 'Provider profile not found' });
    res.json({ provider: rows[0] });
  } catch (err) { next(err); }
});

router.patch('/me/availability', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE providers SET is_available = $1 WHERE user_id = $2', [req.body.is_available, req.user.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM providers WHERE id = $1 AND status = 'approved'", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Provider not found' });
    res.json({ provider: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
