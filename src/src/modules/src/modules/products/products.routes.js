const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { query } = require('../../config/db');

// List products (public)
router.get('/', async (req, res, next) => {
  try {
    const { search, category, limit = 20, offset = 0 } = req.query;
    const params = [limit, offset];
    let where = "WHERE p.is_active = true AND s.status = 'approved'";
    if (search) { params.push(`%${search}%`); where += ` AND p.name ILIKE $${params.length}`; }
    if (category) { params.push(category); where += ` AND p.category = $${params.length}`; }
    const { rows } = await query(
      `SELECT p.*, s.business_name, s.whatsapp_number FROM products p
       JOIN sellers s ON s.id = p.seller_id ${where}
       ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`, params
    );
    res.json({ products: rows });
  } catch (err) { next(err); }
});

// Seller dashboard
router.get('/seller/dashboard', authenticate, async (req, res, next) => {
  try {
    const sellerRes = await query("SELECT id FROM sellers WHERE user_id = $1 AND status = 'approved'", [req.user.id]);
    if (!sellerRes.rows[0]) return res.status(403).json({ error: 'Seller profile not found or not approved' });
    const sellerId = sellerRes.rows[0].id;
    const [products, stats] = await Promise.all([
      query('SELECT * FROM products WHERE seller_id = $1 ORDER BY created_at DESC', [sellerId]),
      query('SELECT COUNT(*) as total_products, COALESCE(SUM(total_views),0) as total_views, COALESCE(SUM(total_whatsapp_clicks),0) as total_clicks FROM products WHERE seller_id = $1 AND is_active = true', [sellerId]),
    ]);
    const lowStock = products.rows.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5);
    const bestSelling = [...products.rows].sort((a, b) => b.total_whatsapp_clicks - a.total_whatsapp_clicks).slice(0, 5);
    res.json({ stats: stats.rows[0], products: products.rows, lowStockAlerts: lowStock, bestSelling });
  } catch (err) { next(err); }
});

// Get product by ID (public)
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, s.business_name, s.whatsapp_number FROM products p
       JOIN sellers s ON s.id = p.seller_id WHERE p.id = $1 AND p.is_active = true`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    await query('UPDATE products SET total_views = total_views + 1 WHERE id = $1', [req.params.id]);
    res.json({ product: rows[0] });
  } catch (err) { next(err); }
});

// Add product
router.post('/', authenticate, async (req, res, next) => {
  try {
    const sellerRes = await query("SELECT id FROM sellers WHERE user_id = $1 AND status = 'approved'", [req.user.id]);
    if (!sellerRes.rows[0]) return res.status(403).json({ error: 'Not an approved seller' });
    const { name, description, price, cost_price, stock_quantity, category } = req.body;
    const { rows } = await query(
      'INSERT INTO products (seller_id, name, description, price, cost_price, stock_quantity, category) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [sellerRes.rows[0].id, name, description, parseFloat(price), cost_price ? parseFloat(cost_price) : null, parseInt(stock_quantity) || 0, category]
    );
    res.status(201).json({ product: rows[0] });
  } catch (err) { next(err); }
});

// Delete product
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE products SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
