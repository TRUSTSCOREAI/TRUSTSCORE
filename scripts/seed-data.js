// scripts/seed-data.js - Seed Test Data
require('dotenv').config();
const { initializeDatabase } = require('../src/db/database');
const { saveTransaction } = require('../src/db/queries');
const logger = require('../src/utils/logger');

/**
 * Seed the database with test transaction data for development
 * @returns {Promise<void>}
 */
async function seed() {
  try {
    logger.info(' Seeding test data...');

    // Initialize database
    initializeDatabase();
    const now = Math.floor(Date.now() / 1000);

    // Sample addresses
    const services = [
      '0x1234567890123456789012345678901234567890',
      '0x2345678901234567890123456789012345678901',
      '0x3456789012345678901234567890123456789012'
    ];

    const agents = [
      '0x4567890123456789012345678901234567890123',
      '0x5678901234567890123456789012345678901234',
      '0x6789012345678901234567890123456789012345'
    ];

    // Generate 100 test transactions
    let count = 0;
    for (let i = 0; i < 100; i++) {
      const service = services[Math.floor(Math.random() * services.length)];
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const amount = (Math.random() * 10 + 0.1).toFixed(2);
      const timestamp = now - (Math.random() * 86400 * 30); // Last 30 days

      try {
        saveTransaction({
          txHash: `0x${i.toString(16).padStart(64, '0')}`,
          fromAddress: agent,
          toAddress: service,
          amount: parseFloat(amount),
          blockNumber: 10000000 + i,
          timestamp: Math.floor(timestamp),
          gasPrice: '1000000000'
        });
        count++;
      } catch (error) {
        // Skip duplicates
      }
    }

    logger.success(` Seeded ${count} test transactions`);
    logger.info(`   Services: ${services.length}`);
    logger.info(`   Agents: ${agents.length}`);
    logger.info('');
    logger.info('Run fraud detection: npm start');
    logger.info('');

    process.exit(0);
  } catch (error) {
    logger.error(' Seeding failed:', error);
    process.exit(1);
  }
}

seed();