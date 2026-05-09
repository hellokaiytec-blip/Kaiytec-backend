const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'kaiytec-api' });
});

// Auth routes
const authRoutes = require('./modules/auth/auth.routes');
app.use('/api/auth', authRoutes);

// Users routes
const usersRoutes = require('./modules/users/users.routes');
app.use('/api/users', usersRoutes);

// Sellers routes
const sellersRoutes = require('./modules/sellers/sellers.routes');
app.use('/api/sellers', sellersRoutes);

// Products routes
const productsRoutes = require('./modules/products/products.routes');
app.use('/api/products', productsRoutes);

// Providers routes
const providersRoutes = require('./modules/providers/providers.routes');
app.use('/api/providers', providersRoutes);

// Reviews routes
const reviewsRoutes = require('./modules/reviews/reviews.routes');
app.use('/api/reviews', reviewsRoutes);

// Analytics routes
const analyticsRoutes = require('./modules/analytics/analytics.routes');
app.use('/api/analytics', analyticsRoutes);

// Admin routes
const adminRoutes = require('./modules/admin/admin.routes');
app.use('/api/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
