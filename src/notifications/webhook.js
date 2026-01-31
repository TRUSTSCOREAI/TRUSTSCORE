// src/notifications/webhook.js - Webhook Alert Delivery
const axios = require('axios');
const { getWebhooks, updateWebhookFailure, updateWebhookTriggered } = require('../db/queries');
const logger = require('../utils/logger');

/**
 * Send webhook alert notifications for detected fraud
 * @param {string} serviceAddress - The service address where fraud was detected
 * @param {Object} alert - Fraud alert details including type, severity, and details
 * @returns {Promise<void>}
 */
async function sendWebhookAlert(serviceAddress, alert) {
    const webhooks = getWebhooks(serviceAddress, true); // Only active webhooks

    if (webhooks.length === 0) {
        return; // No webhooks registered
    }

    const payload = {
        event: 'fraud_detected',
        service: serviceAddress,
        alert: {
            type: alert.type,
            severity: alert.severity,
            details: alert.details,
            timestamp: new Date().toISOString()
        }
    };

    // Send to all registered webhooks
    for (const webhook of webhooks) {
        try {
            await axios.post(webhook.webhook_url, payload, {
                timeout: 5000, // 5 second timeout
                headers: {
                    'Content-Type': 'application/json',
                    'X-TrustScore-Event': 'fraud_detected',
                    'X-TrustScore-Signature': generateSignature(payload) // TODO: Implement signing
                }
            });

            // Success - update last triggered
            updateWebhookTriggered(webhook.id);
            logger.info(`Webhook delivered to ${webhook.webhook_url}`);

        } catch (error) {
            // Failure - increment failure count
            updateWebhookFailure(webhook.id);
            logger.error(`Webhook delivery failed for ${webhook.webhook_url}:`, error.message);
        }
    }
}

/**
 * Generate webhook signature (HMAC)
 * TODO: Implement proper HMAC signature
 */
function generateSignature(payload) {
    // For MVP, just return a simple hash
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

module.exports = {
    sendWebhookAlert
};