// server.js — Kaiytec Marketplace API Bootstrap
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🌍 Kaiytec Marketplace API        ║
  ║   Running on port ${PORT}              ║
  ║   ENV: ${process.env.NODE_ENV}            ║
  ╚══════════════════════════════════════╝
  `);
});

