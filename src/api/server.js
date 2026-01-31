// src/api/server.js - Express API Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');
const rateLimit = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const fraudRoutes = require('./routes/fraud');
const reputationRoutes = require('./routes/reputation');
const webhooksRoutes = require('./routes/webhooks');
const statsRoutes = require('./routes/stats');

const app = express();

/**
 * Middleware
 */
app.use(cors({
  origin: config.server.corsOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static dashboard
app.use(express.static(path.join(__dirname, '../../public')));

// Apply rate limiting to API routes
app.use('/api', rateLimit);

// Request logging (development only)
if (config.server.env === 'development') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

/**
 * Routes
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/fraud', fraudRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/stats', statsRoutes);

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
    app.listen(config.server.port, () => {
      logger.info(`Server listening on port ${config.server.port}`);
      resolve();
    });
  });
}

module.exports = {
  app,
  startServer
};
