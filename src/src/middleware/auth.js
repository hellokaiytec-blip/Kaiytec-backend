// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data
    const { rows } = await query(
      'SELECT id, name, email, phone, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!rows[0] || !rows[0].is_active) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Restrict route to specific roles
 * Usage: requireRole('admin') or requireRole('seller', 'admin')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Access denied. Required role: ${roles.join(' or ')}`,
    });
  }
  next();
};

module.exports = { authenticate, requireRole };
