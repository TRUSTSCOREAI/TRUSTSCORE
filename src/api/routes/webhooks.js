const express = require('express');
const router = express.Router();
const { x402PaymentRequired } = require('../middleware/x402-payment');
const { registerWebhook, getWebhooks } = require('../../db/queries');
const validateAddress = require('../validators/address');
const config = require('../../config/config');

// PAID: Register a new webhook ($1.00 via x402)
router.post('/register',
    x402PaymentRequired(config.payment.pricing.webhookRegistration),
    async (req, res, next) => {
        try {
            const { serviceAddress, webhookUrl } = req.body;

            if (!serviceAddress || !webhookUrl) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Both serviceAddress and webhookUrl are required'
                });
            }

            try {
                new URL(webhookUrl);
            } catch {
                return res.status(400).json({
                    error: 'Invalid webhook URL',
                    message: 'The provided webhookUrl is not a valid URL'
                });
            }

            const result = registerWebhook(serviceAddress, webhookUrl);

            res.status(201).json({
                success: true,
                webhookId: result.lastInsertRowid,
                message: 'Webhook registered successfully',
                serviceAddress,
                webhookUrl,
                payment: {
                    paidViaX402: true,
                    amount: config.payment.pricing.webhookRegistration
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// FREE: Get webhooks for a service
router.get('/:address', validateAddress, async (req, res, next) => {
    try {
        const { address } = req.params;
        const webhooks = getWebhooks(address, false);

        res.json({
            serviceAddress: address,
            webhooks: webhooks.map(w => ({
                id: w.id,
                url: w.webhook_url,
                isActive: !!w.is_active,
                failureCount: w.failure_count,
                lastTriggered: w.last_triggered_at,
                createdAt: w.created_at
            })),
            total: webhooks.length
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;