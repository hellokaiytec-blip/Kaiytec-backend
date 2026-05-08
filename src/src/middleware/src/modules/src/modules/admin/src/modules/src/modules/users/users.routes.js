// src/modules/users/users.routes.js
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { uploadDocuments } = require('../../config/cloudinary');
const router = express.Router();

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { query } = require('../../config/db');
    const { name, phone, location_lat, location_lng, location_label } = req.body;
    const { rows } = await query(
      `UPDATE users SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         location_lat = COALESCE($3, location_lat),
         location_lng = COALESCE($4, location_lng),
         location_label = COALESCE($5, location_label)
       WHERE id = $6
       RETURNING id, name, email, phone, role, avatar_url, location_label`,
      [name, phone, location_lat, location_lng, location_label, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

router.put('/me/avatar',
  authenticate,
  uploadDocuments.single('avatar'),
  async (req, res, next) => {
    try {
      const { query } = require('../../config/db');
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const avatar_url = req.file.path;
      await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatar_url, req.user.id]);
      res.json({ avatar_url });
    } catch (err) { next(err); }
  }
);

module.exports = router;

