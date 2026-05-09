// ============================================================
// SELLERS MODULE
// ============================================================

// src/modules/sellers/sellers.routes.js
const express = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const { uploadDocuments } = require('../../config/cloudinary');
const ctrl = require('./sellers.controller');

const router = express.Router();

// Register as seller (with document uploads)
router.post(
  '/register',
  authenticate,
  uploadDocuments.fields([
    { name: 'government_id', maxCount: 1 },
    { name: 'passport_photo', maxCount: 1 },
  ]),
  ctrl.register
);

router.get('/me', authenticate, requireRole('seller'), ctrl.getMyProfile);
router.put('/me', authenticate, requireRole('seller'), ctrl.updateProfile);
router.get('/:id', ctrl.getById); // public
router.get('/', ctrl.list); // public - discovery

module.exports = router;

// ─────────────────────────────────────────────────────────────

// src/modules/sellers/sellers.controller.js
const { query } = require('../../config/db');

const register = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { business_name, business_address, description, whatsapp_number,
            location_lat, location_lng, location_label } = req.body;

    const govt_id_url = req.files?.government_id?.[0]?.path || null;
    const passport_url = req.files?.passport_photo?.[0]?.path || null;

    // Update user role to seller
    await query('UPDATE users SET role = $1 WHERE id = $2', ['seller', userId]);

    const { rows } = await query(
      `INSERT INTO sellers
         (user_id, business_name, business_address, description,
          government_id_url, passport_photo_url, whatsapp_number,
          location_lat, location_lng, location_label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [userId, business_name, business_address, description,
       govt_id_url, passport_url, whatsapp_number,
       location_lat, location_lng, location_label]
    );

    res.status(201).json({ seller: rows[0] });
  } catch (err) {
    next(err);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, u.name, u.email, u.phone,
              COALESCE(sr.average_rating, 0) as rating,
              COALESCE(sr.review_count, 0) as review_count
       FROM sellers s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN seller_ratings sr ON sr.seller_id = s.id
       WHERE s.user_id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Seller profile not found' });
    res.json({ seller: rows[0] });
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const { business_name, business_address, description,
            whatsapp_number, location_lat, location_lng, location_label } = req.body;
    const { rows } = await query(
      `UPDATE sellers SET
         business_name = COALESCE($1, business_name),
         business_address = COALESCE($2, business_address),
         description = COALESCE($3, description),
         whatsapp_number = COALESCE($4, whatsapp_number),
         location_lat = COALESCE($5, location_lat),
         location_lng = COALESCE($6, location_lng),
         location_label = COALESCE($7, location_label)
       WHERE user_id = $8 RETURNING *`,
      [business_name, business_address, description, whatsapp_number,
       location_lat, location_lng, location_label, req.user.id]
    );
    res.json({ seller: rows[0] });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, u.name,
              COALESCE(sr.average_rating, 0) as rating,
              COALESCE(sr.review_count, 0) as review_count
       FROM sellers s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN seller_ratings sr ON sr.seller_id = s.id
       WHERE s.id = $1 AND s.status = 'approved'`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Seller not found' });

    // Track view
    await query(
      `INSERT INTO interactions (entity_type, entity_id, interaction_type)
       VALUES ('seller', $1, 'view')`,
      [req.params.id]
    );
    await query('UPDATE sellers SET total_views = total_views + 1 WHERE id = $1', [req.params.id]);

    res.json({ seller: rows[0] });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const { search, lat, lng, limit = 20, offset = 0 } = req.query;

    let baseQuery = `
      SELECT s.id, s.business_name, s.location_label, s.location_lat, s.location_lng,
             s.total_views, s.whatsapp_number,
             u.name as owner_name,
             COALESCE(sr.average_rating, 0) as rating,
             COALESCE(sr.review_count, 0) as review_count
      FROM sellers s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN seller_ratings sr ON sr.seller_id = s.id
      WHERE s.status = 'approved'
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      baseQuery += ` AND (s.business_name ILIKE $${params.length} OR s.description ILIKE $${params.length})`;
    }

    baseQuery += ` ORDER BY rating DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await query(baseQuery, params);
    res.json({ sellers: rows, total: rows.length });
  } catch (err) { next(err); }
};

module.exports = { register, getMyProfile, updateProfile, getById, list };


// ============================================================
// PRODUCTS MODULE
// ============================================================

// src/modules/products/products.routes.js — (reference)
// Routes:
//   POST   /api/products              → add product (seller auth)
//   PUT    /api/products/:id          → edit product (seller auth)
//   DELETE /api/products/:id          → delete product (seller auth)
//   GET    /api/products              → list/search products (public)
//   GET    /api/products/:id          → get product detail (public)
//   GET    /api/products/seller/me    → my products dashboard (seller auth)

// src/modules/products/products.controller.js
const productsController = {
  addProduct: async (req, res, next) => {
    try {
      const sellerId = await getSellerIdForUser(req.user.id);
      if (!sellerId) return res.status(403).json({ error: 'Seller profile not found or not approved' });

      const { name, description, price, cost_price, stock_quantity, category } = req.body;
      const images = (req.files || []).map(f => f.path);

      const { rows } = await query(
        `INSERT INTO products
           (seller_id, name, description, price, cost_price, stock_quantity, category, images)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [sellerId, name, description, price, cost_price, stock_quantity, category, JSON.stringify(images)]
      );
      res.status(201).json({ product: rows[0] });
    } catch (err) { next(err); }
  },

  getSellerDashboard: async (req, res, next) => {
    try {
      const sellerId = await getSellerIdForUser(req.user.id);
      if (!sellerId) return res.status(403).json({ error: 'Seller profile not found' });

      const [products, stats] = await Promise.all([
        query(`SELECT * FROM products WHERE seller_id = $1 ORDER BY created_at DESC`, [sellerId]),
        query(`SELECT
                 COUNT(*) as total_products,
                 SUM(total_views) as total_views,
                 SUM(total_whatsapp_clicks) as total_clicks,
                 SUM(price * (stock_quantity - COALESCE(stock_quantity, 0))) as est_revenue
               FROM products WHERE seller_id = $1`, [sellerId]),
      ]);

      const lowStock = products.rows.filter(p => p.stock_quantity <= p.low_stock_threshold);
      const bestSelling = [...products.rows].sort((a, b) => b.total_whatsapp_clicks - a.total_whatsapp_clicks).slice(0, 5);

      res.json({
        stats: stats.rows[0],
        products: products.rows,
        lowStockAlerts: lowStock,
        bestSelling,
      });
    } catch (err) { next(err); }
  },
};

async function getSellerIdForUser(userId) {
  const { rows } = await query(
    `SELECT id FROM sellers WHERE user_id = $1 AND status = 'approved'`,
    [userId]
  );
  return rows[0]?.id || null;
}


// ============================================================
// ANALYTICS MODULE
// ============================================================

// POST /api/analytics/track
const trackInteraction = async (req, res, next) => {
  try {
    const { entity_type, entity_id, interaction_type } = req.body;
    const user_id = req.user?.id || null;

    await query(
      `INSERT INTO interactions (user_id, entity_type, entity_id, interaction_type, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, entity_type, entity_id, interaction_type, req.ip]
    );

    // Increment denormalized counter
    if (interaction_type === 'view') {
      const table = entity_type === 'product' ? 'products'
                  : entity_type === 'seller'  ? 'sellers' : 'providers';
      await query(`UPDATE ${table} SET total_views = total_views + 1 WHERE id = $1`, [entity_id]);
    }
    if (interaction_type === 'whatsapp_click') {
      const table = entity_type === 'product' ? 'products'
                  : entity_type === 'seller'  ? 'sellers' : 'providers';
      await query(`UPDATE ${table} SET total_whatsapp_clicks = total_whatsapp_clicks + 1 WHERE id = $1`, [entity_id]);
    }

    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { trackInteraction, productsController };

