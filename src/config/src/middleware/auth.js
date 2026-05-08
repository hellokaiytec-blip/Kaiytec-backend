// src/modules/auth/auth.routes.js
const express = require('express');
const { body } = require('express-validator');
const { loginLimiter } = require('../../middleware/rateLimiter');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./auth.controller');

const router = express.Router();

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['buyer', 'seller', 'provider']).withMessage('Invalid role'),
], ctrl.register);

router.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], ctrl.login);

router.get('/me', authenticate, ctrl.getMe);

module.exports = router;

// ─────────────────────────────────────────────────────────────

// src/modules/auth/auth.controller.js
const { validationResult } = require('express-validator');
const authService = require('./auth.service');

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { register, login, getMe };

// ─────────────────────────────────────────────────────────────

// src/modules/auth/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');

const register = async ({ name, email, phone, password, role }) => {
  // Check duplicates
  const existing = await query(
    'SELECT id FROM users WHERE email = $1 OR phone = $2',
    [email, phone]
  );
  if (existing.rows.length > 0) {
    const err = new Error('Email or phone number already registered');
    err.statusCode = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { rows } = await query(
    `INSERT INTO users (name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, phone, role, created_at`,
    [name, email, phone, password_hash, role]
  );

  const user = rows[0];
  const token = generateToken(user.id);

  return { user, token };
};

const login = async ({ email, password }) => {
  const { rows } = await query(
    'SELECT id, name, email, phone, role, password_hash, is_active FROM users WHERE email = $1',
    [email]
  );

  const user = rows[0];
  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Account has been deactivated. Contact support.');
    err.statusCode = 403;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const { password_hash: _, ...safeUser } = user;
  const token = generateToken(user.id);

  return { user: safeUser, token };
};

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { register, login };

