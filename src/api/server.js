// src/api/server.js - Express API Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const reputationRoutes = require('./routes/reputation');
const fraudRoutes = require('./routes/fraud');
const statsRoutes = require('./routes/stats');
const webhookRoutes = require('./routes/webhooks');
const transactionRoutes = require('./routes/transactions');

// Import middleware
const { x402PaymentRequired } = require('./middleware/x402-payment');
const rateLimit = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

// Import config
const config = require('../config/config');
const logger = require('../utils/logger');

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../../public')));

// API Routes
app.use('/api/reputation', reputationRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/transactions', transactionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: ['enhanced-fraud-detection', 'transaction-history', 'reputation-breakdown', 'visual-analysis']
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler (must be last)
app.use(errorHandler);

/**
 * Start Express API server
 * @returns {Promise} Promise that resolves when server is listening
 */
function startServer() {
  return new Promise((resolve) => {
    const PORT = process.env.PORT || config.server.port || 3000;
    app.listen(PORT, () => {
      logger.info(`TrustScore Enhanced API server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info('Enhanced features enabled:');
      logger.info('- 7-pattern fraud detection');
      logger.info('- Transaction history API');
      logger.info('- Reputation breakdown visualization');
      logger.info('- Enhanced frontend with animations');
      logger.info('- Quick test addresses for demo');
      resolve();
    });
  });
}

module.exports = {
  app,
  startServer
};