const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');

router.post('/track', async (req, res, next) => {
  try {
    const { entity_type, entity_id, interaction_type } = req.body;
    await query(
      'INSERT INTO interactions (entity_type, entity_id, interaction_type) VALUES ($1,$2,$3)',
      [entity_type, entity_id, interaction_type]
    );
    if (interaction_type === 'view') {
      const table = entity_type === 'product' ? 'products' : entity_type === 'seller' ? 'sellers' : 'providers';
      await query(`UPDATE ${table} SET total_views = total_views + 1 WHERE id = $1`, [entity_id]);
    }
    if (interaction_type === 'whatsapp_click') {
      const table = entity_type === 'product' ? 'products' : entity_type === 'seller' ? 'sellers' : 'providers';
      await query(`UPDATE ${table} SET total_whatsapp_clicks = total_whatsapp_clicks + 1 WHERE id = $1`, [entity_id]);
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
