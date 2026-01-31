const express = require('express');
const router = express.Router();
const { x402PaymentRequired } = require('../middleware/x402-payment');
const { checkServiceForFraud, getFraudScore } = require('../../fraud/detector');
const { getFraudFlags } = require('../../db/queries');
const validateAddress = require('../validators/address');
const config = require('../../config/config');
const logger = require('../../utils/logger');

// PAID: Check fraud score for a service ($0.02 via x402)
router.get('/check/:address',
    validateAddress,
    x402PaymentRequired(config.payment.pricing.fraudCheck),
    async (req, res, next) => {
        try {
            const { address } = req.params;

            // Run fraud detection
            const detectedFraud = await checkServiceForFraud(address);

            // Get fraud score
            const fraudScore = await getFraudScore(address);

            res.json({
                address,
                fraudScore: fraudScore.score,
                riskLevel: fraudScore.riskLevel,
                activeFlags: fraudScore.activeFlagsList || detectedFraud.map(f => ({
                    type: f.type,
                    severity: f.severity,
                    details: f.details
                })),
                payment: {
                    paidViaX402: !req.freeTier,
                    amount: req.freeTier ? 0 : config.payment.pricing.fraudCheck,
                    freeTier: req.freeTier || false
                },
                checkedAt: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }
);

// PAID: Get fraud flag history ($0.02 via x402)
router.get('/flags/:address',
    validateAddress,
    x402PaymentRequired(config.payment.pricing.fraudCheck),
    async (req, res, next) => {
        try {
            const { address } = req.params;
            const includeResolved = req.query.resolved === 'true';

            const flags = getFraudFlags(address, includeResolved);

            res.json({
                address,
                flags: flags.map(f => ({
                    id: f.id,
                    type: f.flag_type,
                    severity: f.severity,
                    details: JSON.parse(f.details),
                    isResolved: !!f.is_resolved,
                    createdAt: f.created_at,
                    resolvedAt: f.resolved_at
                })),
                total: flags.length,
                payment: {
                    paidViaX402: !req.freeTier,
                    amount: req.freeTier ? 0 : config.payment.pricing.fraudCheck,
                    freeTier: req.freeTier || false
                }
            });

        } catch (error) {
            next(error);
        }
    }
);

// FREE: Basic fraud status (limited data)
router.get('/status/:address', validateAddress, async (req, res) => {
    const { address } = req.params;

    const flags = getFraudFlags(address, false);
    const hasActiveFlags = flags.length > 0;

    res.json({
        address,
        status: hasActiveFlags ? 'flagged' : 'clean',
        activeFlagCount: flags.length,
        highestSeverity: hasActiveFlags ? Math.max(...flags.map(f => f.severity)) : 0,
        message: hasActiveFlags
            ? `This address has ${flags.length} active fraud alert(s). Get details with /fraud/check/${address}`
            : 'No active fraud alerts',
        pricing: {
            detailedCheck: config.payment.pricing.fraudCheck + ' USDC',
            freeTier: `${config.payment.freeTier.monthlyLimit} free checks per month`
        }
    });
});

module.exports = router;
