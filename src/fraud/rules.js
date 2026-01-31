// src/fraud/rules.js - Fraud Detection Rules
const { getDatabase } = require('../db/database');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Check for velocity abuse - detects services receiving too many transactions in a short time
 * @param {string} serviceAddress - The service address to check
 * @returns {Object} Fraud detection result with detected status and details
 */
function checkVelocityAbuse(serviceAddress) {
  const db = getDatabase();

  // Count transactions in last hour
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM transactions
    WHERE to_address = ?
    AND timestamp > ?
  `).get(serviceAddress.toLowerCase(), oneHourAgo);

  if (result.count > config.fraud.velocityLimit) {
    return {
      detected: true,
      type: 'velocity_abuse',
      severity: 8,
      details: {
        transactionsLastHour: result.count,
        threshold: config.fraud.velocityLimit,
        message: `${result.count} transactions in last hour (limit: ${config.fraud.velocityLimit})`
      }
    };
  }

  return { detected: false };
}

/**
 * Check for new wallet risk - detects new wallets with suspiciously high volume
 * @param {string} serviceAddress - The service address to check
 * @returns {Object} Fraud detection result with detected status and details
 */
function checkNewWalletRisk(serviceAddress) {
  const db = getDatabase();

  const result = db.prepare(`
    SELECT 
      MIN(timestamp) as first_seen,
      SUM(amount) as total_volume
    FROM transactions
    WHERE to_address = ?
  `).get(serviceAddress.toLowerCase());

  if (!result.first_seen) {
    return { detected: false };
  }

  const accountAge = Math.floor(Date.now() / 1000) - result.first_seen;
  const accountAgeDays = accountAge / 86400;

  if (accountAgeDays < config.fraud.newWalletAgeDays &&
    result.total_volume > config.fraud.newWalletVolumeThreshold) {
    return {
      detected: true,
      type: 'new_wallet_risk',
      severity: 7,
      details: {
        accountAgeDays: accountAgeDays.toFixed(1),
        totalVolume: result.total_volume.toFixed(2),
        threshold: config.fraud.newWalletVolumeThreshold,
        message: `Wallet only ${accountAgeDays.toFixed(1)} days old with $${result.total_volume.toFixed(2)} volume`
      }
    };
  }

  return { detected: false };
}

/**
 * Check for circular/wash trading - detects same addresses paying repeatedly with same amounts
 * @param {string} serviceAddress - The service address to check
 * @returns {Object} Fraud detection result with detected status and details
 */
function checkCircularFlow(serviceAddress) {
  const db = getDatabase();

  // Find addresses that paid this service multiple times with same amounts
  const result = db.prepare(`
    SELECT 
      from_address,
      COUNT(*) as payment_count,
      COUNT(DISTINCT amount) as unique_amounts
    FROM transactions
    WHERE to_address = ?
    GROUP BY from_address
    HAVING payment_count >= ?
    AND unique_amounts = 1
  `).all(serviceAddress.toLowerCase(), config.fraud.circularFlowMinCount);

  if (result.length > 0) {
    const suspiciousPayers = result.map(r => ({
      address: r.from_address,
      count: r.payment_count
    }));

    return {
      detected: true,
      type: 'wash_trading',
      severity: 9,
      details: {
        suspiciousPayers,
        pattern: 'Identical repeated payments from same addresses',
        message: `${result.length} address(es) making identical repeated payments`
      }
    };
  }

  return { detected: false };
}

/**
 * Check for volume spike - detects sudden unusual increases in transaction volume
 * @param {string} serviceAddress - The service address to check
 * @returns {Object} Fraud detection result with detected status and details
 */
function checkVolumeSpike(serviceAddress) {
  const db = getDatabase();

  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 86400;
  const oneWeekAgo = now - (86400 * 7);

  // Get average daily volume from last week
  const weeklyAvg = db.prepare(`
    SELECT AVG(daily_volume) as avg_volume
    FROM (
      SELECT SUM(amount) as daily_volume
      FROM transactions
      WHERE to_address = ?
      AND timestamp BETWEEN ? AND ?
      GROUP BY DATE(timestamp, 'unixepoch')
    )
  `).get(serviceAddress.toLowerCase(), oneWeekAgo, oneDayAgo);

  // Get today's volume
  const todayVolume = db.prepare(`
    SELECT SUM(amount) as volume
    FROM transactions
    WHERE to_address = ?
    AND timestamp > ?
  `).get(serviceAddress.toLowerCase(), oneDayAgo);

  if (weeklyAvg.avg_volume && todayVolume.volume) {
    const multiplier = todayVolume.volume / weeklyAvg.avg_volume;

    if (multiplier > config.fraud.volumeSpikeMultiplier) {
      return {
        detected: true,
        type: 'volume_spike',
        severity: 6,
        details: {
          todayVolume: todayVolume.volume.toFixed(2),
          averageVolume: weeklyAvg.avg_volume.toFixed(2),
          multiplier: multiplier.toFixed(1) + 'x',
          message: `Volume ${multiplier.toFixed(1)}x higher than average`
        }
      };
    }
  }

  return { detected: false };
}

/**
 * Check for retry spam - detects agents spamming retry attempts with small amounts
 * @param {string} serviceAddress - The service address to check
 * @returns {Object} Fraud detection result with detected status and details
 */
function checkRetrySpam(serviceAddress) {
  const db = getDatabase();

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;

  // Find agents with many failed attempts (assuming small amounts = retries)
  const result = db.prepare(`
    SELECT 
      from_address,
      COUNT(*) as attempt_count
    FROM transactions
    WHERE to_address = ?
    AND timestamp > ?
    AND amount < 0.1
    GROUP BY from_address
    HAVING attempt_count > ?
  `).all(serviceAddress.toLowerCase(), fiveMinutesAgo, config.fraud.retrySpamLimit);

  if (result.length > 0) {
    return {
      detected: true,
      type: 'retry_spam',
      severity: 5,
      details: {
        spammers: result.map(r => ({
          address: r.from_address,
          attempts: r.attempt_count
        })),
        message: `${result.length} address(es) making excessive retry attempts`
      }
    };
  }

  return { detected: false };
}

module.exports = {
  checkVelocityAbuse,
  checkNewWalletRisk,
  checkCircularFlow,
  checkVolumeSpike,
  checkRetrySpam
};