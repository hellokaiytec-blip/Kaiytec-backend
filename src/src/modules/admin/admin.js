// src/modules/admin/admin.routes.js
const express = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const ctrl = require('./admin.controller');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

// ── Dashboard Stats ──────────────────────────────────────────
router.get('/stats', ctrl.getStats);

// ── Users ────────────────────────────────────────────────────
router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.patch('/users/:id/deactivate', ctrl.deactivateUser);

// ── Sellers ──────────────────────────────────────────────────
router.get('/sellers', ctrl.listSellers);
router.get('/sellers/:id', ctrl.getSeller);
router.patch('/sellers/:id/approve', ctrl.approveSeller);
router.patch('/sellers/:id/reject', ctrl.rejectSeller);

// ── Providers ────────────────────────────────────────────────
router.get('/providers', ctrl.listProviders);
router.patch('/providers/:id/approve', ctrl.approveProvider);
router.patch('/providers/:id/reject', ctrl.rejectProvider);

// ── Listings ─────────────────────────────────────────────────
router.get('/products', ctrl.listProducts);
router.delete('/products/:id', ctrl.deleteProduct);

module.exports = router;

// ─────────────────────────────────────────────────────────────

// src/modules/admin/admin.controller.js
const { query } = require('../../config/db');

const getStats = async (req, res, next) => {
  try {
    const [users, sellers, providers, products] = await Promise.all([
      query('SELECT COUNT(*) FROM users WHERE role != $1', ['admin']),
      query("SELECT COUNT(*) FROM sellers WHERE status = 'approved'"),
      query("SELECT COUNT(*) FROM providers WHERE status = 'approved'"),
      query('SELECT COUNT(*) FROM products WHERE is_active = true'),
    ]);

    const [pendingSellers, pendingProviders] = await Promise.all([
      query("SELECT COUNT(*) FROM sellers WHERE status = 'pending'"),
      query("SELECT COUNT(*) FROM providers WHERE status = 'pending'"),
    ]);

    res.json({
      total_users: parseInt(users.rows[0].count),
      active_sellers: parseInt(sellers.rows[0].count),
      active_providers: parseInt(providers.rows[0].count),
      total_products: parseInt(products.rows[0].count),
      pending_sellers: parseInt(pendingSellers.rows[0].count),
      pending_providers: parseInt(pendingProviders.rows[0].count),
    });
  } catch (err) { next(err); }
};

const listUsers = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, role } = req.query;
    const params = [limit, offset];
    let where = "WHERE role != 'admin'";
    if (role) {
      params.push(role);
      where += ` AND role = $${params.length}`;
    }
    const { rows } = await query(
      `SELECT id, name, email, phone, role, is_active, created_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ users: rows });
  } catch (err) { next(err); }
};

const getUser = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.*, s.business_name, s.status as seller_status
       FROM users u
       LEFT JOIN sellers s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
};

const deactivateUser = async (req, res, next) => {
  try {
    await query('UPDATE users SET is_active = false WHERE id = $1', [req.params.id]);
    await logAdminAction(req.user.id, 'deactivate_user', 'user', req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

const listSellers = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    const { rows } = await query(
      `SELECT s.*, u.name, u.email, u.phone
       FROM sellers s JOIN users u ON u.id = s.user_id
       WHERE s.status = $1 ORDER BY s.created_at ASC`,
      [status]
    );
    res.json({ sellers: rows });
  } catch (err) { next(err); }
};

const getSeller = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, u.name, u.email, u.phone
       FROM sellers s JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Seller not found' });
    res.json({ seller: rows[0] });
  } catch (err) { next(err); }
};

const approveSeller = async (req, res, next) => {
  try {
    await query(
      `UPDATE sellers SET status = 'approved', approved_at = NOW(), approved_by = $1 WHERE id = $2`,
      [req.user.id, req.params.id]
    );
    await logAdminAction(req.user.id, 'approve_seller', 'seller', req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

const rejectSeller = async (req, res, next) => {
  try {
    const { reason } = req.body;
    await query(
      `UPDATE sellers SET status = 'rejected', rejection_reason = $1 WHERE id = $2`,
      [reason, req.params.id]
    );
    await logAdminAction(req.user.id, 'reject_seller', 'seller', req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

const listProviders = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    const { rows } = await query(
      `SELECT p.*, u.name, u.email FROM providers p JOIN users u ON u.id = p.user_id WHERE p.status = $1`,
      [status]
    );
    res.json({ providers: rows });
  } catch (err) { next(err); }
};

const approveProvider = async (req, res, next) => {
  try {
    await query(
      `UPDATE providers SET status = 'approved', approved_at = NOW(), approved_by = $1 WHERE id = $2`,
      [req.user.id, req.params.id]
    );
    await logAdminAction(req.user.id, 'approve_provider', 'provider', req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

const rejectProvider = async (req, res, next) => {
  try {
    const { reason } = req.body;
    await query(
      `UPDATE providers SET status = 'rejected', rejection_reason = $1 WHERE id = $2`,
      [reason, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

const listProducts = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, s.business_name FROM products p
       JOIN sellers s ON s.id = p.seller_id
       WHERE p.is_active = true ORDER BY p.created_at DESC LIMIT 100`
    );
    res.json({ products: rows });
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  try {
    await query('UPDATE products SET is_active = false WHERE id = $1', [req.params.id]);
    await logAdminAction(req.user.id, 'delete_product', 'product', req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// Audit logging helper
async function logAdminAction(adminId, action, targetType, targetId) {
  await query(
    `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id) VALUES ($1,$2,$3,$4)`,
    [adminId, action, targetType, targetId]
  );
}

module.exports = {
  getStats, listUsers, getUser, deactivateUser,
  listSellers, getSeller, approveSeller, rejectSeller,
  listProviders, approveProvider, rejectProvider,
  listProducts, deleteProduct,
};

