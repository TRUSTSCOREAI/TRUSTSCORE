const express = require('express');
const router = express.Router();
const { getPlatformStats, getPaymentStats } = require('../../db/queries');

// FREE: Get platform statistics
router.get('/', async (req, res, next) => {
    try {
        const stats = await getPlatformStats();
        const paymentStats = await getPaymentStats();

        res.json({
            platform: {
                totalTransactions: stats.totalTransactions,
                servicesMonitored: stats.totalServices,
                agentsTracked: stats.totalAgents,
                activeFraudAlerts: stats.activeFraudFlags
            },
            revenue: {
                totalRevenue: paymentStats.totalRevenue.toFixed(2) + ' USDC',
                totalChecks: paymentStats.totalChecks,
                paidChecks: paymentStats.paidChecks,
                freeChecks: paymentStats.freeChecks
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;