// ============================================================
// src/modules/products/products.routes.js
// ============================================================
const express = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const { uploadProductImages } = require('../../config/cloudinary');

const router = express.Router();

// Public
router.get('/', require('./products.controller').list);
router.get('/seller/dashboard', authenticate, requireRole('seller'), require('./products.controller').sellerDashboard);
router.get('/:id', require('./products.controller').getById);

// Seller only
router.post('/',
  authenticate, requireRole('seller'),
  uploadProductImages.array('images', 4),
  require('./products.controller').create
);
router.put('/:id',
  authenticate, requireRole('seller'),
  uploadProductImages.array('images', 4),
  require('./products.controller').update
);
router.delete('/:id', authenticate, requireRole('seller'), require('./products.controller').remove);

module.exports = router;

// ============================================================
// src/modules/products/products.controller.js
// ============================================================
const { query } = require('../../config/db');

async function getSellerIdForUser(userId) {
  const { rows } = await query(
    "SELECT id FROM sellers WHERE user_id = $1 AND status = 'approved'",
    [userId]
  );
  return rows[0]?.id || null;
}

const list = async (req, res, next) => {
  try {
    const { search, category, seller_id, limit = 20, offset = 0 } = req.query;
    const params = [limit, offset];
    let where = "WHERE p.is_active = true AND s.status = 'approved'";

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }
    if (category) {
      params.push(category);
      where += ` AND p.category = $${params.length}`;
    }
    if (seller_id) {
      params.push(seller_id);
      where += ` AND p.seller_id = $${params.length}`;
    }

    const { rows } = await query(
      `SELECT p.*, s.business_name, s.whatsapp_number,
              COALESCE(pr.average_rating, 0) as rating
       FROM products p
       JOIN sellers s ON s.id = p.seller_id
       LEFT JOIN (
         SELECT product_id, ROUND(AVG(rating)::numeric, 1) as average_rating
         FROM reviews WHERE product_id IS NOT NULL GROUP BY product_id
       ) pr ON pr.product_id = p.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ products: rows });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, s.business_name, s.whatsapp_number, s.location_label,
              COALESCE(sr.average_rating, 0) as seller_rating,
              COALESCE(sr.review_count, 0) as seller_review_count
       FROM products p
       JOIN sellers s ON s.id = p.seller_id
       LEFT JOIN seller_ratings sr ON sr.seller_id = s.id
       WHERE p.id = $1 AND p.is_active = true`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });

    const { rows: sellerRows } = await query(
      `SELECT s.*, COALESCE(sr.average_rating, 0) as rating, COALESCE(sr.review_count, 0) as review_count
       FROM sellers s
       LEFT JOIN seller_ratings sr ON sr.seller_id = s.id
       WHERE s.id = $1`,
      [rows[0].seller_id]
    );

    // Track view
    await query(
      "INSERT INTO interactions (entity_type, entity_id, interaction_type) VALUES ('product', $1, 'view')",
      [req.params.id]
    );
    await query('UPDATE products SET total_views = total_views + 1 WHERE id = $1', [req.params.id]);

    res.json({ product: rows[0], seller: sellerRows[0] });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const sellerId = await getSellerIdForUser(req.user.id);
    if (!sellerId) return res.status(403).json({ error: 'Seller profile not approved' });

    const { name, description, price, cost_price, stock_quantity, category } = req.body;
    const images = (req.files || []).map(f => f.path);

    const { rows } = await query(
      `INSERT INTO products (seller_id, name, description, price, cost_price, stock_quantity, category, images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [sellerId, name, description, parseFloat(price), cost_price ? parseFloat(cost_price) : null,
       parseInt(stock_quantity) || 0, category, JSON.stringify(images)]
    );
    res.status(201).json({ product: rows[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const sellerId = await getSellerIdForUser(req.user.id);
    const { name, description, price, cost_price, stock_quantity, category } = req.body;
    const newImages = (req.files || []).map(f => f.path);
    const existingImages = JSON.parse(req.body.existing_images_json || '[]');
    const allImages = [...existingImages, ...newImages].slice(0, 4);

    const { rows } = await query(
      `UPDATE products SET
         name = COALESCE($1, name), description = COALESCE($2, description),
         price = COALESCE($3, price), cost_price = COALESCE($4, cost_price),
         stock_quantity = COALESCE($5, stock_quantity), category = COALESCE($6, category),
         images = $7
       WHERE id = $8 AND seller_id = $9 RETURNING *`,
      [name, description, price ? parseFloat(price) : null, cost_price ? parseFloat(cost_price) : null,
       stock_quantity ? parseInt(stock_quantity) : null, category,
       JSON.stringify(allImages), req.params.id, sellerId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found or not yours' });
    res.json({ product: rows[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const sellerId = await getSellerIdForUser(req.user.id);
    await query(
      'UPDATE products SET is_active = false WHERE id = $1 AND seller_id = $2',
      [req.params.id, sellerId]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

const sellerDashboard = async (req, res, next) => {
  try {
    const sellerId = await getSellerIdForUser(req.user.id);
    if (!sellerId) return res.status(403).json({ error: 'Seller profile not found or not approved' });

    const [products, stats] = await Promise.all([
      query(`SELECT * FROM products WHERE seller_id = $1 ORDER BY created_at DESC`, [sellerId]),
      query(
        `SELECT COUNT(*) as total_products, COALESCE(SUM(total_views),0) as total_views,
                COALESCE(SUM(total_whatsapp_clicks),0) as total_clicks
         FROM products WHERE seller_id = $1 AND is_active = true`,
        [sellerId]
      ),
    ]);

    const all = products.rows;
    const lowStock = all.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold || 5));
    const bestSelling = [...all].sort((a, b) => b.total_whatsapp_clicks - a.total_whatsapp_clicks).slice(0, 5);

    res.json({ stats: stats.rows[0], products: all, lowStockAlerts: lowStock, bestSelling });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove, sellerDashboard };

// ============================================================
// src/modules/reviews/reviews.routes.js + controller
// ============================================================
const reviewsRouter = express.Router();

reviewsRouter.get('/', async (req, res, next) => {
  try {
    const { seller_id, provider_id, product_id } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (seller_id) { params.push(seller_id); where += ` AND r.seller_id = $${params.length}`; }
    if (provider_id) { params.push(provider_id); where += ` AND r.provider_id = $${params.length}`; }
    if (product_id) { params.push(product_id); where += ` AND r.product_id = $${params.length}`; }

    const { rows } = await query(
      `SELECT r.*, u.name as reviewer_name
       FROM reviews r JOIN users u ON u.id = r.reviewer_id
       ${where} ORDER BY r.created_at DESC LIMIT 50`,
      params
    );
    res.json({ reviews: rows });
  } catch (err) { next(err); }
});

reviewsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { seller_id, provider_id, product_id, rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

    const { rows } = await query(
      `INSERT INTO reviews (reviewer_id, seller_id, provider_id, product_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, seller_id || null, provider_id || null, product_id || null, rating, comment]
    );
    res.status(201).json({ review: rows[0] });
  } catch (err) { next(err); }
});

module.exports = { reviewsRouter };

// ============================================================
// src/modules/providers/providers.routes.js + controller
// ============================================================
const providersRouter = express.Router();

providersRouter.get('/', async (req, res, next) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;
    const params = [limit, offset];
    let where = "WHERE status = 'approved'";
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (full_name ILIKE $${params.length} OR bio ILIKE $${params.length} OR $${params.length} = ANY(services_offered::text[]))`;
    }
    const { rows } = await query(
      `SELECT p.*, COALESCE(pr.average_rating, 0) as rating, COALESCE(pr.review_count, 0) as review_count
       FROM providers p LEFT JOIN provider_ratings pr ON pr.provider_id = p.id
       ${where} ORDER BY is_available DESC, rating DESC LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ providers: rows });
  } catch (err) { next(err); }
});

providersRouter.get('/me', authenticate, requireRole('provider'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, COALESCE(pr.average_rating, 0) as rating, COALESCE(pr.review_count, 0) as review_count
       FROM providers p LEFT JOIN provider_ratings pr ON pr.provider_id = p.id
       WHERE p.user_id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Provider profile not found' });
    res.json({ provider: rows[0] });
  } catch (err) { next(err); }
});

providersRouter.post('/register', authenticate, async (req, res, next) => {
  try {
    const { full_name, services_offered, experience_years, bio, whatsapp_number,
            location_lat, location_lng, location_label } = req.body;
    await query('UPDATE users SET role = $1 WHERE id = $2', ['provider', req.user.id]);
    const { rows } = await query(
      `INSERT INTO providers (user_id, full_name, services_offered, experience_years, bio,
        whatsapp_number, location_lat, location_lng, location_label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, full_name, services_offered, experience_years, bio,
       whatsapp_number, location_lat, location_lng, location_label]
    );
    res.status(201).json({ provider: rows[0] });
  } catch (err) { next(err); }
});

providersRouter.patch('/me/availability', authenticate, requireRole('provider'), async (req, res, next) => {
  try {
    const { is_available } = req.body;
    await query('UPDATE providers SET is_available = $1 WHERE user_id = $2', [is_available, req.user.id]);
    res.json({ success: true, is_available });
  } catch (err) { next(err); }
});

providersRouter.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, u.name, COALESCE(pr.average_rating, 0) as rating, COALESCE(pr.review_count, 0) as review_count
       FROM providers p JOIN users u ON u.id = p.user_id
       LEFT JOIN provider_ratings pr ON pr.provider_id = p.id
       WHERE p.id = $1 AND p.status = 'approved'`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Provider not found' });
    await query('UPDATE providers SET total_views = total_views + 1 WHERE id = $1', [req.params.id]);
    res.json({ provider: rows[0] });
  } catch (err) { next(err); }
});

module.exports = { providersRouter };

// ============================================================
// src/modules/analytics/analytics.routes.js
// ============================================================
const analyticsRouter = express.Router();

analyticsRouter.post('/track', async (req, res, next) => {
  try {
    const { entity_type, entity_id, interaction_type } = req.body;
    const user_id = req.user?.id || null;

    if (!['product', 'seller', 'provider'].includes(entity_type)) {
      return res.status(400).json({ error: 'Invalid entity_type' });
    }
    if (!['view', 'whatsapp_click', 'search_impression'].includes(interaction_type)) {
      return res.status(400).json({ error: 'Invalid interaction_type' });
    }

    await query(
      `INSERT INTO interactions (user_id, entity_type, entity_id, interaction_type, ip_address)
       VALUES ($1,$2,$3,$4,$5)`,
      [user_id, entity_type, entity_id, interaction_type, req.ip]
    );

    const col = interaction_type === 'view' ? 'total_views' : 'total_whatsapp_clicks';
    if (['view', 'whatsapp_click'].includes(interaction_type)) {
      const table = entity_type === 'product' ? 'products'
                  : entity_type === 'seller'  ? 'sellers' : 'providers';
      await query(`UPDATE ${table} SET ${col} = ${col} + 1 WHERE id = $1`, [entity_id]);
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = { analyticsRouter };
