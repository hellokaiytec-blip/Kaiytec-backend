const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { query } = require('../../config/db');

router.get('/', async (req, res, next) => {
  try {
    const { seller_id, provider_id, product_id } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (seller_id) { params.push(seller_id); where += ` AND r.seller_id = $${params.length}`; }
    if (provider_id) { params.push(provider_id); where += ` AND r.provider_id = $${params.length}`; }
    if (product_id) { params.push(product_id); where += ` AND r.product_id = $${params.length}`; }
    const { rows } = await query(
      `SELECT r.*, u.name as reviewer_name FROM reviews r JOIN users u ON u.id = r.reviewer_id ${where} ORDER BY r.created_at DESC LIMIT 50`, params
    );
    res.json({ reviews: rows });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { seller_id, provider_id, product_id, rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const { rows } = await query(
      'INSERT INTO reviews (reviewer_id, seller_id, provider_id, product_id, rating, comment) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, seller_id || null, provider_id || null, product_id || null, rating, comment]
    );
    res.status(201).json({ review: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
