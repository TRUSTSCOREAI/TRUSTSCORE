// index.js - Main Entry Point for TrustScore
// This file initializes and starts the TrustScore system, which provides
// fraud detection and reputation scoring for the x402 AI agent payment ecosystem.
// It coordinates database setup, blockchain monitoring, background jobs, and API services.

/**
 * TrustScore - Fraud Detection & Reputation System for x402
 *
 * Core Features:
 * - Real-time blockchain monitoring of USDC transfers on Base
 * - Fraud pattern detection (velocity abuse, wash trading, honeypots, etc.)
 * - Reputation scoring for both AI services and agents (0-100 scale)
 * - REST API for integration with x402 wallets and services
 * - Web dashboard for reputation checking and analytics
 * - Webhook alerts for fraud detection
 *
 * Architecture:
 * - SQLite/PostgreSQL database for transaction storage and analytics
 * - Node.js/Express API server with rate limiting and validation
 * - Background cron jobs for fraud scanning and reputation updates
 * - React frontend dashboard for user interaction
 * - SDK for easy integration by developers
 */

require('dotenv').config();
const { initializeDatabase } = require('./src/db/database');
const { initializeSchema } = require('./src/db/schema');
const { startScheduler } = require('./src/jobs/scheduler');
const { startServer } = require('./src/api/server');
const logger = require('./src/utils/logger');
const config = require('./src/config/config');

/**
 * Main application startup function that initializes and starts all TrustScore components
 * @returns {Promise<void>}
 */
async function start() {
    try {
        // Display startup banner with system info
        logger.info('Starting TrustScore...');
        logger.info(`Environment: ${config.server.env}`);
        logger.info(`Network: Base (Chain ID: ${config.blockchain.chainId})`);
        logger.info(`Database: ${config.database.type.toUpperCase()} ${config.database.type === 'sqlite' ? config.database.path : `${config.database.host}:${config.database.port}/${config.database.name}`}`);

        // Step 1: Initialize database connection and create tables
        // This establishes the database connection and creates all necessary tables
        logger.info('Initializing database...');
        initializeDatabase();
        await initializeSchema();
        logger.info('Database ready');

        // Step 2: X402 indexer is started by scheduler
        // Monitors Base blockchain for USDC TransferWithAuthorization events
        logger.info('X402 indexer will be started by scheduler...');

        // Step 3: Start background jobs
        // Schedules fraud detection scans and reputation score updates
        logger.info('Starting background jobs...');
        startScheduler();
        logger.info('Background jobs scheduled');

        // Step 4: Start API server
        // Launches Express server with REST endpoints for reputation/fraud queries
        logger.info('Starting API server...');
        await startServer();
        logger.info(`API server running on port ${config.server.port}`);

        // Display success message with access URLs
        logger.info('');
        logger.info('TrustScore is fully operational!');
        logger.info(`API: http://localhost:${config.server.port}`);
        logger.info(`Dashboard: http://localhost:${config.server.port}/dashboard`);
        logger.info(`Payment Wallet: ${config.payment.walletAddress}`);
        logger.info('');

    } catch (error) {
        // Log fatal error and exit if startup fails
        logger.error('Failed to start TrustScore:', error);
        logger.error('Please check your configuration and database connection');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', error);
});

// Start the application
start();
