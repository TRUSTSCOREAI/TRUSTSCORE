// src/jobs/scheduler.js - Job Scheduler
const cron = require('node-cron');
const config = require('../config/config');
const logger = require('../utils/logger');
const { runFraudScan } = require('./fraud-scanner');
const { updateAllScores } = require('./score-updater');
const x402Indexer = require('../indexer/enhanced-indexer');

/**
 * Start all scheduled background jobs for fraud scanning and reputation updates
 */
function startScheduler() {
    // Job 1: Fraud detection scan (every 5 minutes)
    cron.schedule(config.jobs.fraudScanInterval, async () => {
        logger.info(' Running scheduled fraud scan...');
        try {
            await runFraudScan();
            logger.info(' Fraud scan complete');
        } catch (error) {
            logger.error(' Fraud scan failed:', error);
        }
    });

    // Job 2: Reputation score updates (every hour)
    cron.schedule(config.jobs.scoreUpdateInterval, async () => {
        logger.info(' Updating reputation scores...');
        try {
            await updateAllScores();
            logger.info(' Reputation scores updated');
        } catch (error) {
            logger.error(' Score update failed:', error);
        }
    });

    // Job 3: X402 transaction indexing (continuous)
    // Start indexer on scheduler initialization with polling approach to avoid filter issues
    setTimeout(async () => {
        try {
            await x402Indexer.initialize();
            await x402Indexer.startIndexing(); // Use enhanced indexer
            logger.info(' X402 indexer started with polling approach');
        } catch (error) {
            logger.error(' X402 indexer failed to start:', error);
        }
    }, 5000); // Start 5 seconds after scheduler

    // Job 4: Refresh facilitator list (every hour)
    cron.schedule('0 * * * *', async () => {
        logger.info(' Refreshing facilitator list...');
        try {
            await x402Indexer.refreshFacilitators();
            logger.info(' Facilitator list refreshed');
        } catch (error) {
            logger.error(' Facilitator refresh failed:', error);
        }
    });

    logger.info('Scheduled jobs started:');
    logger.info(`- Fraud scan: ${config.jobs.fraudScanInterval}`);
    logger.info(`- Score update: ${config.jobs.scoreUpdateInterval}`);
    logger.info('- X402 indexer: continuous');
    logger.info('- Facilitator refresh: hourly');
}

module.exports = {
    startScheduler
};
