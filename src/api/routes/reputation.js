const express = require('express');
const router = express.Router();
const { x402PaymentRequired } = require('../middleware/x402-payment');
const { calculateServiceReputation } = require('../../reputation/service-scorer');
const { calculateAgentReputation } = require('../../reputation/agent-scorer');
const { checkTrustCompatibility } = require('../../reputation/trust-matcher');
const { getServiceReputation, getAgentReputation } = require('../../db/queries');
const validateAddress = require('../validators/address');
const config = require('../../config/config');

// PAID: Get service reputation ($0.01 via x402)
router.get('/service/:address',
    validateAddress,
    x402PaymentRequired(config.payment.pricing.reputationCheck),
    async (req, res, next) => {
        try {
            const { address } = req.params;
            const forceRecalculate = req.query.recalculate === 'true';

            let reputation;

            if (forceRecalculate) {
                reputation = calculateServiceReputation(address);
            } else {
                reputation = getServiceReputation(address);
                if (!reputation) {
                    reputation = calculateServiceReputation(address);
                }
            }

            res.json({
                address,
                type: 'x402_service',
                reputationScore: reputation.reputationScore,
                trustLevel: reputation.trustLevel,
                badges: reputation.badges || [],
                totalTransactions: reputation.totalTransactions,
                totalVolume: reputation.totalVolume,
                uniquePayers: reputation.uniquePayers,
                accountAgeDays: reputation.accountAgeDays,
                daysSinceLastActive: reputation.daysSinceLastActive,
                activeFraudFlags: reputation.activeFraudFlags,
                payment: {
                    paidViaX402: !req.freeTier,
                    amount: config.payment.pricing.webhookRegistration,
                    freeTier: req.freeTier || false
                }
            });

        } catch (error) {
            next(error);
        }
    }
);

// PAID: Get agent reputation ($0.01 via x402)
router.get('/agent/:address',
    validateAddress,
    x402PaymentRequired(config.payment.pricing.reputationCheck),
    async (req, res, next) => {
        try {
            const { address } = req.params;
            const forceRecalculate = req.query.recalculate === 'true';

            let reputation;

            if (forceRecalculate) {
                reputation = calculateAgentReputation(address);
            } else {
                reputation = getAgentReputation(address);
                if (!reputation) {
                    reputation = calculateAgentReputation(address);
                }
            }

            res.json({
                address,
                type: 'x402_agent',
                reputationScore: reputation.reputationScore,
                trustLevel: reputation.trustLevel,
                badges: reputation.badges || [],
                totalPayments: reputation.totalPayments,
                totalSpent: reputation.totalSpent,
                uniqueServices: reputation.uniqueServices,
                accountAgeDays: reputation.accountAgeDays,
                paymentReliability: reputation.paymentReliability,
                disputeCount: reputation.disputeCount || 0,
                activeFraudFlags: reputation.activeFraudFlags || [],
                payment: {
                    paidViaX402: !req.freeTier,
                    amount: config.payment.pricing.reputationCheck,
                    freeTier: req.freeTier || false
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

// FREE: Basic reputation check without payment (for demo/testing)
router.get('/free/:address', validateAddress, async (req, res, next) => {
    try {
        const { address } = req.params;
        const forceRecalculate = req.query.recalculate === 'true';

        let reputation;

        if (forceRecalculate) {
            reputation = calculateServiceReputation(address);
        } else {
            reputation = getServiceReputation(address);
            if (!reputation) {
                reputation = calculateServiceReputation(address);
            }
        }

        // Return basic reputation data without payment info
        res.json({
            address,
            type: 'x402_service',
            reputationScore: reputation.reputationScore,
            trustLevel: reputation.trustLevel,
            badges: reputation.badges || [],
            totalTransactions: reputation.totalTransactions,
            totalVolume: reputation.totalVolume,
            uniquePayers: reputation.uniquePayers,
            accountAgeDays: reputation.accountAgeDays,
            daysSinceLastActive: reputation.daysSinceLastActive,
            activeFraudFlags: reputation.activeFraudFlags,
            freeTier: true,
            note: 'Basic reputation check - requires payment for premium features'
        });

    } catch (error) {
        next(error);
    }
});

// ONE-TIME: Purchase 10 free calls without monthly subscription
router.get('/onetime/:address', validateAddress, async (req, res, next) => {
    try {
        const { address } = req.params;
        const forceRecalculate = req.query.recalculate === 'true';

        let reputation;

        if (forceRecalculate) {
            reputation = calculateServiceReputation(address);
        } else {
            reputation = getServiceReputation(address);
            if (!reputation) {
                reputation = calculateServiceReputation(address);
            }
        }

        // Ensure we have a valid reputation object
        if (!reputation) {
            reputation = calculateServiceReputation(address);
        }

        // Return complete reputation data with one-time payment option
        res.json({
            address,
            type: 'x402_service',
            reputationScore: reputation.reputationScore || 50,
            trustLevel: reputation.trustLevel || 'medium',
            badges: reputation.badges || [],
            totalTransactions: reputation.totalTransactions || 0,
            totalVolume: reputation.totalVolume || 0,
            uniquePayers: reputation.uniquePayers || 0,
            accountAgeDays: reputation.accountAgeDays || 0,
            daysSinceLastActive: reputation.daysSinceLastActive || null,
            activeFraudFlags: reputation.activeFraudFlags || 0,
            payment: {
                paidViaX402: false,
                oneTimePayment: config.payment.pricing.oneTimePayment,
                freeTierUsed: false,
                note: 'One-time payment for 10 free checks (no monthly reset)'
            }
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
