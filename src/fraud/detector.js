// src/fraud/detector.js - Main Fraud Detection Engine
const rules = require('./rules');
const { saveFraudFlag, getFraudFlags } = require('../db/queries');
const { sendWebhookAlert } = require('../notifications/webhook');
const logger = require('../utils/logger');

/**
 * Run all fraud detection checks on a service and save results
 * @param {string} serviceAddress - The service address to check for fraud
 * @returns {Array} Array of detected fraud patterns with details
 */
async function checkServiceForFraud(serviceAddress) {
    const detectedFraud = [];

    // Run all 5 fraud detection rules
    const checks = [
        rules.checkVelocityAbuse(serviceAddress),
        rules.checkNewWalletRisk(serviceAddress),
        rules.checkCircularFlow(serviceAddress),
        rules.checkVolumeSpike(serviceAddress),
        rules.checkRetrySpam(serviceAddress)
    ];

    // Collect detected fraud
    for (const check of checks) {
        if (check.detected) {
            detectedFraud.push(check);

            // Save to database
            saveFraudFlag({
                serviceAddress,
                flagType: check.type,
                severity: check.severity,
                details: JSON.stringify(check.details)
            });

            // Send webhook alert
            await sendWebhookAlert(serviceAddress, {
                type: check.type,
                severity: check.severity,
                details: check.details
            });

            logger.warn(`Fraud detected: ${check.type} for ${serviceAddress}`, check.details);
        }
    }

    return detectedFraud;
}

/**
 * Calculate overall fraud score for a service based on active fraud flags
 * @param {string} serviceAddress - The service address to score
 * @returns {Promise<Object>} Fraud score data with risk level assessment
 */
async function getFraudScore(serviceAddress) {
    const flags = await getFraudFlags(serviceAddress, false); // Only active flags

    if (!flags || flags.length === 0) {
        return {
            score: 100,
            riskLevel: 'low',
            activeFlags: 0,
            activeFlagsList: []
        };
    }

    // Calculate score based on severity
    let totalPenalty = 0;
    for (const flag of flags) {
        totalPenalty += flag.severity * 10; // Each severity point = 10 score penalty
    }

    const score = Math.max(0, 100 - totalPenalty);

    let riskLevel = 'low';
    if (score < 30) riskLevel = 'critical';
    else if (score < 50) riskLevel = 'high';
    else if (score < 70) riskLevel = 'medium';

    return {
        score,
        riskLevel,
        activeFlags: flags.length,
        activeFlagsList: flags
    };
}

module.exports = {
    checkServiceForFraud,
    getFraudScore
};
