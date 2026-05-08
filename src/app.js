const express = require('express');
const app = express();
app.use(express.json());
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'kaiytec-api' });
});
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
module.exports = app;
