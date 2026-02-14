const express = require('express');
const router = express.Router();
const { x402PaymentRequired } = require('../middleware/x402-payment');
const { analyzeFraudPatterns, checkServiceForFraud, getFraudScore } = require('../../fraud/detector');
const { getFraudFlags } = require('../../db/queries');
const validateAddress = require('../validators/address');
const config = require('../../config/config');
const logger = require('../../utils/logger');

// PAID: Enhanced fraud pattern analysis ($0.02 via x402)
router.get('/analyze/:address',
    validateAddress,
    x402PaymentRequired(config.payment.pricing.fraudCheck),
    async (req, res, next) => {
        try {
            const { address } = req.params;

            // Run comprehensive fraud pattern analysis
            const fraudAnalysis = await analyzeFraudPatterns(address);

            // Get basic fraud score for comparison
            const fraudScore = await getFraudScore(address);

            // Combine both analyses
            const response = {
                address,
                enhancedAnalysis: fraudAnalysis,
                legacyAnalysis: {
                    fraudScore: fraudScore.score,
                    riskLevel: fraudScore.riskLevel,
                    activeFlags: fraudScore.activeFlagsList
                },
                payment: {
                    paidViaX402: !req.freeTier,
                    amount: req.freeTier ? 0 : config.payment.pricing.fraudCheck,
                    freeTier: req.freeTier || false
                },
                analyzedAt: new Date().toISOString()
            };

            // Add comparative insights
            if (fraudAnalysis.patterns.length > 0) {
                const maxSeverity = Math.max(...fraudAnalysis.patterns.map(p => p.severity));
                response.insights = {
                    primaryRiskFactors: fraudAnalysis.patterns
                        .filter(p => p.severity >= 6)
                        .map(p => ({
                            type: p.type,
                            severity: p.severity,
                            description: p.description
                        })),
                    riskDistribution: {
                        critical: fraudAnalysis.patterns.filter(p => p.severity >= 8).length,
                        high: fraudAnalysis.patterns.filter(p => p.severity >= 6 && p.severity < 8).length,
                        medium: fraudAnalysis.patterns.filter(p => p.severity >= 4 && p.severity < 6).length,
                        low: fraudAnalysis.patterns.filter(p => p.severity < 4).length
                    },
                    recommendationPriority: getRecommendationPriority(fraudAnalysis.patterns)
                };
            }

            res.json(response);

        } catch (error) {
            logger.error(`Failed to analyze fraud patterns for ${req.params.address}:`, error);
            next(error);
        }
    }
);

// FREE: Basic fraud status (limited data)
router.get('/status/:address', validateAddress, async (req, res) => {
    try {
        const { address } = req.params;

        // Get basic flags for status check
        const flags = getFraudFlags(address, false);
        const hasActiveFlags = flags.length > 0;

        // Quick pattern detection using basic rules (no detailed analysis)
        let quickPatterns = [];
        if (hasActiveFlags) {
            quickPatterns = flags.map(flag => ({
                type: flag.flag_type,
                severity: flag.severity,
                detectedAt: flag.created_at,
                status: 'active'
            }));
        }

        res.json({
            address,
            status: hasActiveFlags ? 'flagged' : 'clean',
            activeFlagCount: flags.length,
            highestSeverity: hasActiveFlags ? Math.max(...flags.map(f => f.severity)) : 0,
            quickPatterns,
            message: hasActiveFlags
                ? `This address has ${flags.length} active fraud alert(s). Get detailed analysis with /fraud/analyze/${address}`
                : 'No active fraud alerts detected',
            pricing: {
                detailedAnalysis: config.payment.pricing.fraudCheck + ' USDC',
                freeTier: `${config.payment.freeTier.monthlyLimit} free checks per month`
            },
            metadata: {
                checkedAt: new Date().toISOString(),
                freeTier: true
            }
        });

    } catch (error) {
        logger.error(`Failed to get fraud status for ${req.params.address}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve fraud status',
            address: req.params.address
        });
    }
});

// PAID: Get detailed fraud flag history ($0.02 via x402)
router.get('/flags/:address',
    validateAddress,
    x402PaymentRequired(config.payment.pricing.fraudCheck),
    async (req, res, next) => {
        try {
            const { address } = req.params;
            const includeResolved = req.query.resolved === 'true';

            const flags = getFraudFlags(address, includeResolved);

            // Group flags by type for analysis
            const flagsByType = {};
            flags.forEach(flag => {
                if (!flagsByType[flag.flag_type]) {
                    flagsByType[flag.flag_type] = [];
                }
                flagsByType[flag.flag_type].push(flag);
            });

            // Calculate pattern frequency
            const patternAnalysis = Object.entries(flagsByType).map(([type, typeFlags]) => ({
                type,
                count: typeFlags.length,
                averageSeverity: typeFlags.reduce((sum, f) => sum + f.severity, 0) / typeFlags.length,
                firstDetected: typeFlags.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0].created_at,
                lastDetected: typeFlags.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at,
                activeCount: typeFlags.filter(f => !f.is_resolved).length,
                resolvedCount: typeFlags.filter(f => f.is_resolved).length
            }));

            res.json({
                address,
                flags: flags.map(f => ({
                    id: f.id,
                    type: f.flag_type,
                    severity: f.severity,
                    details: JSON.parse(f.details),
                    isResolved: !!f.is_resolved,
                    createdAt: f.created_at,
                    resolvedAt: f.resolved_at,
                    severityColor: getSeverityColor(f.severity)
                })),
                patternAnalysis,
                summary: {
                    totalFlags: flags.length,
                    activeFlags: flags.filter(f => !f.is_resolved).length,
                    resolvedFlags: flags.filter(f => f.is_resolved).length,
                    uniquePatternTypes: Object.keys(flagsByType).length,
                    averageSeverity: flags.length > 0 ? (flags.reduce((sum, f) => sum + f.severity, 0) / flags.length).toFixed(1) : 0,
                    riskTrend: calculateRiskTrend(flags)
                },
                payment: {
                    paidViaX402: !req.freeTier,
                    amount: req.freeTier ? 0 : config.payment.pricing.fraudCheck,
                    freeTier: req.freeTier || false
                }
            });

        } catch (error) {
            logger.error(`Failed to get fraud flags for ${req.params.address}:`, error);
            next(error);
        }
    }
);

// FREE: Get fraud pattern explanations (educational)
router.get('/patterns', async (req, res) => {
    try {
        const patterns = {
            VELOCITY_ABUSE: {
                name: 'Velocity Abuse',
                description: 'Excessive number of transactions in a short time period',
                indicators: [
                    'More than 50 transactions in 1 hour',
                    'Automated bot-like activity patterns',
                    'Unusually high transaction frequency'
                ],
                riskLevel: 'Medium to High',
                typicalSeverity: '4-8/10',
                prevention: 'Implement rate limiting and CAPTCHA challenges',
                examples: [
                    'Service processing 100+ transactions/hour suddenly',
                    'New account with immediate high-frequency activity'
                ]
            },
            IDENTICAL_AMOUNTS: {
                name: 'Identical Amounts',
                description: 'All or most transactions have exactly the same amount',
                indicators: [
                    '90%+ of transactions are identical amounts',
                    'Statistically improbable payment patterns',
                    'Round number transactions (e.g., exactly $10.00)'
                ],
                riskLevel: 'High',
                typicalSeverity: '6-9/10',
                prevention: 'Monitor for payment uniformity and investigate sources',
                examples: [
                    '150 transactions all exactly $10.00 USDC',
                    'Same payment amount repeated thousands of times'
                ]
            },
            LOW_PAYER_DIVERSITY: {
                name: 'Low Payer Diversity',
                description: 'Very few unique addresses accounting for most transaction volume',
                indicators: [
                    'Less than 10% diversity in payer addresses',
                    'Same 3-5 addresses account for 80%+ of volume',
                    'Circular payment patterns between few addresses'
                ],
                riskLevel: 'High',
                typicalSeverity: '7-10/10',
                prevention: 'Analyze address relationships and ownership',
                examples: [
                    'Same 3 addresses making 95% of payments',
                    'Circular trading between related accounts'
                ]
            },
            NEW_WALLET_RISK: {
                name: 'New Wallet Risk',
                description: 'Newly created account with unusually high transaction volume',
                indicators: [
                    'Account less than 7 days old with $100+ volume',
                    'High activity immediately after creation',
                    'Volume disproportionate to account age'
                ],
                riskLevel: 'High',
                typicalSeverity: '6-9/10',
                prevention: 'Enhanced monitoring for new accounts first 30 days',
                examples: [
                    '3-day-old account processing $1,000+ in volume',
                    'Immediate high-volume transactions after creation'
                ]
            },
            VOLUME_SPIKE: {
                name: 'Volume Spike',
                description: 'Sudden, unexplained increase in daily transaction volume',
                indicators: [
                    '5x+ increase in daily volume compared to average',
                    'Sustained high volume over multiple days',
                    'No clear business reason for volume increase'
                ],
                riskLevel: 'Medium to High',
                typicalSeverity: '4-7/10',
                prevention: 'Set volume alerts and investigate spikes',
                examples: [
                    'Daily volume jumps from $100 to $1,000 overnight',
                    'Sustained high volume for 3+ days'
                ]
            },
            WASH_TRADING: {
                name: 'Wash Trading',
                description: 'Coordinated transactions to inflate activity metrics artificially',
                indicators: [
                    'Same addresses repeatedly paying each other',
                    'High concentration of volume among few addresses',
                    'Identical or similar amounts in circular patterns'
                ],
                riskLevel: 'Critical',
                typicalSeverity: '8-10/10',
                prevention: 'Analyze address relationships and transaction graphs',
                examples: [
                    '3 accounts circulating same funds 100+ times',
                    '95% of volume from same 2-3 addresses'
                ]
            },
            TIME_CLUSTERING: {
                name: 'Time Clustering',
                description: 'Suspiciously regular transaction timing indicating automation',
                indicators: [
                    'Transactions at exact regular intervals',
                    'Less than 20% variation in timing',
                    '24/7 activity without natural breaks'
                ],
                riskLevel: 'Medium',
                typicalSeverity: '4-6/10',
                prevention: 'Implement behavioral analysis and bot detection',
                examples: [
                    'Transaction every 60 seconds exactly',
                    'Automated payments every 5 minutes 24/7'
                ]
            }
        };

        res.json({
            patterns,
            metadata: {
                totalPatterns: Object.keys(patterns).length,
                lastUpdated: new Date().toISOString(),
                educational: true
            }
        });

    } catch (error) {
        logger.error('Failed to get pattern explanations:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve pattern explanations'
        });
    }
});

/**
 * Helper function to get severity color
 */
function getSeverityColor(severity) {
    if (severity >= 8) return '#DC2626'; // red-600
    if (severity >= 6) return '#F97316'; // orange-500
    if (severity >= 4) return '#F59E0B'; // amber-500
    return '#10B981'; // green-500
}

/**
 * Helper function to calculate risk trend
 */
function calculateRiskTrend(flags) {
    if (flags.length < 2) return 'insufficient_data';

    const sortedFlags = flags.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const recent = sortedFlags.slice(0, Math.ceil(flags.length / 2));
    const older = sortedFlags.slice(Math.ceil(flags.length / 2));

    const recentAvgSeverity = recent.reduce((sum, f) => sum + f.severity, 0) / recent.length;
    const olderAvgSeverity = older.reduce((sum, f) => sum + f.severity, 0) / older.length;

    if (recentAvgSeverity > olderAvgSeverity + 1) return 'increasing';
    if (recentAvgSeverity < olderAvgSeverity - 1) return 'decreasing';
    return 'stable';
}

/**
 * Helper function to get recommendation priority
 */
function getRecommendationPriority(patterns) {
    const criticalPatterns = patterns.filter(p => p.severity >= 8);
    const highPatterns = patterns.filter(p => p.severity >= 6 && p.severity < 8);

    if (criticalPatterns.length > 0) {
        return {
            level: 'immediate',
            message: 'Immediate investigation required due to critical risk factors',
            actions: [
                'Consider temporary suspension',
                'Enhanced monitoring',
                'Manual review of transactions',
                'Contact service provider for verification'
            ]
        };
    } else if (highPatterns.length > 0) {
        return {
            level: 'high',
            message: 'High-risk patterns detected - enhanced monitoring recommended',
            actions: [
                'Increase monitoring frequency',
                'Implement additional verification',
                'Review recent transactions manually',
                'Consider user verification requirements'
            ]
        };
    } else {
        return {
            level: 'normal',
            message: 'Continue normal monitoring with periodic reviews',
            actions: [
                'Maintain standard monitoring',
                'Periodic manual reviews',
                'Update detection rules as needed'
            ]
        };
    }
}

module.exports = router;
