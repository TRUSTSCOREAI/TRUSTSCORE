// scripts/setup-db.js - Database Setup Script
require('dotenv').config();
const { initializeDatabase } = require('../src/db/database');
const { initializeSchema } = require('../src/db/schema');
const logger = require('../src/utils/logger');

/**
 * Setup script to initialize database connection and create schema
 * @returns {Promise<void>}
 */
async function setup() {
    try {
        logger.info(' Setting up TrustScore database...');

        // Initialize database
        initializeDatabase();

        // Create schema
        await initializeSchema();

        logger.success(' Database setup complete!');
        logger.info('');
        logger.info('Next steps:');
        logger.info('1. Update .env with your configuration');
        logger.info('2. Run: npm start');
        logger.info('');

        process.exit(0);
    } catch (error) {
        logger.error(' Setup failed:', error);
        process.exit(1);
    }
}

setup();