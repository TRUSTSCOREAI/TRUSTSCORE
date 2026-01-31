// src/jobs/fraud-scanner.js - Fraud Detection Job
const { getAllServices } = require('../db/queries');
const { checkServiceForFraud } = require('../fraud/detector');
const logger = require('../utils/logger');

/**
 * Run fraud detection scan on all registered services
 * @returns {Promise<Object>} Scan results with counts of scanned and flagged services
 */
async function runFraudScan() {
  const services = await getAllServices();

  logger.info(`Scanning ${services.length} services for fraud...`);

  let detectedCount = 0;

  for (const serviceAddress of services) {
    try {
      const fraud = await checkServiceForFraud(serviceAddress);

      if (fraud.length > 0) {
        detectedCount++;
        logger.warn(`Fraud detected for ${serviceAddress}:`, {
          types: fraud.map(f => f.type),
          count: fraud.length
        });
      }
    } catch (error) {
      logger.error(`Failed to scan ${serviceAddress}:`, error);
    }
  }

  logger.info(`Fraud scan complete: ${detectedCount} services flagged`);

  return {
    scanned: services.length,
    flagged: detectedCount
  };
}

module.exports = {
  runFraudScan
};
