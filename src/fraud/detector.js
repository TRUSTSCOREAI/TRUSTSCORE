// src/fraud/detector.js - Enhanced Fraud Detection Engine with 7 Pattern Analysis
const rules = require('./rules');
const { saveFraudFlag, getFraudFlags, getTransactionsByAddress } = require('../db/queries');
const { sendWebhookAlert } = require('../notifications/webhook');
const logger = require('../utils/logger');

/**
 * Analyze detailed fraud patterns for a service
 * Returns comprehensive pattern analysis with explanations
 * @param {string} serviceAddress - The service address to analyze
 * @returns {Promise<Object>} Detailed fraud pattern analysis
 */
async function analyzeFraudPatterns(serviceAddress) {
    try {
        // Get all transactions for this service
        const transactions = await getTransactionsByAddress(serviceAddress, true);

        if (transactions.length === 0) {
            return {
                address: serviceAddress,
                patterns: [],
                summary: {
                    totalPatterns: 0,
                    riskLevel: 'low',
                    recommendation: 'No transactions to analyze'
                }
            };
        }

        const patterns = [];
        const now = Math.floor(Date.now() / 1000);
        const oneDayAgo = now - 86400;
        const oneHourAgo = now - 3600;

        // Pattern 1: Velocity Abuse
        const recentTransactions = transactions.filter(tx => tx.timestamp > oneHourAgo);
        if (recentTransactions.length > 50) {
            patterns.push({
                type: 'VELOCITY_ABUSE',
                severity: Math.min(10, Math.floor(recentTransactions.length / 10)),
                description: 'Excessive transaction velocity detected',
                details: {
                    transactionsPerHour: recentTransactions.length,
                    normalThreshold: 50,
                    timeWindow: 'Last 1 hour'
                },
                explanation: `This service processed ${recentTransactions.length} transactions in the last hour, which is ${Math.floor(recentTransactions.length / 10)}x higher than normal. This suggests automated bot activity or potential spam attacks.`,
                recommendation: 'Monitor closely and consider rate limiting if this continues'
            });
        }

        // Pattern 2: Identical Amounts
        const amounts = transactions.map(tx => parseFloat(tx.amount));
        const uniqueAmounts = [...new Set(amounts)];
        if (uniqueAmounts.length === 1 && transactions.length > 10) {
            patterns.push({
                type: 'IDENTICAL_AMOUNTS',
                severity: Math.min(10, Math.floor(transactions.length / 20)),
                description: 'All transactions have identical amounts',
                details: {
                    totalTransactions: transactions.length,
                    identicalAmount: uniqueAmounts[0],
                    uniformityPercentage: 100
                },
                explanation: `All ${transactions.length} transactions are exactly ${uniqueAmounts[0]} USDC. This is statistically improbable in natural payment patterns and suggests automated or coordinated activity.`,
                recommendation: 'Investigate source of funds and transaction purpose'
            });
        }

        // Pattern 3: Low Payer Diversity (Circular Trading)
        const uniquePayers = [...new Set(transactions.map(tx => tx.from_address))];
        const payerDiversityRatio = uniquePayers.length / transactions.length;
        if (payerDiversityRatio < 0.1 && transactions.length > 20) {
            patterns.push({
                type: 'LOW_PAYER_DIVERSITY',
                severity: Math.min(10, Math.floor((1 - payerDiversityRatio) * 15)),
                description: 'Very low payer diversity detected',
                details: {
                    uniquePayers: uniquePayers.length,
                    totalTransactions: transactions.length,
                    diversityRatio: payerDiversityRatio,
                    topPayers: getTopPayers(transactions, 5)
                },
                explanation: `Only ${uniquePayers.length} unique addresses account for ${transactions.length} transactions (${(payerDiversityRatio * 100).toFixed(1)}% diversity). This pattern is characteristic of wash trading or circular payment schemes.`,
                recommendation: 'Investigate relationships between payer addresses'
            });
        }

        // Pattern 4: New Wallet Risk
        const oldestTransaction = transactions[transactions.length - 1];
        const accountAgeDays = (now - oldestTransaction.timestamp) / 86400;
        const totalVolume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

        if (accountAgeDays < 7 && totalVolume > 100) {
            patterns.push({
                type: 'NEW_WALLET_RISK',
                severity: Math.min(10, Math.floor((100 - accountAgeDays * 10) + (totalVolume / 100))),
                description: 'New account with unusually high volume',
                details: {
                    accountAgeDays: Math.floor(accountAgeDays),
                    totalVolume: totalVolume.toFixed(2),
                    volumePerDay: (totalVolume / accountAgeDays).toFixed(2),
                    riskMultiplier: (totalVolume / 100 / accountAgeDays).toFixed(1)
                },
                explanation: `This account is only ${Math.floor(accountAgeDays)} days old but has processed $${totalVolume.toFixed(2)} in volume. New accounts typically process much less volume, suggesting potential money laundering or test activities.`,
                recommendation: 'Enhanced monitoring recommended for first 30 days'
            });
        }

        // Pattern 5: Volume Spike
        const dailyVolumes = {};
        transactions.forEach(tx => {
            const day = Math.floor(tx.timestamp / 86400);
            dailyVolumes[day] = (dailyVolumes[day] || 0) + parseFloat(tx.amount);
        });

        const volumeValues = Object.values(dailyVolumes);
        if (volumeValues.length > 7) {
            const avgVolume = volumeValues.slice(0, -1).reduce((a, b) => a + b, 0) / (volumeValues.length - 1);
            const latestVolume = volumeValues[volumeValues.length - 1];
            const volumeMultiplier = latestVolume / avgVolume;

            if (volumeMultiplier > 5) {
                patterns.push({
                    type: 'VOLUME_SPIKE',
                    severity: Math.min(10, Math.floor(volumeMultiplier / 2)),
                    description: 'Unusual volume spike detected',
                    details: {
                        averageDailyVolume: avgVolume.toFixed(2),
                        latestDailyVolume: latestVolume.toFixed(2),
                        volumeMultiplier: volumeMultiplier.toFixed(1),
                        spikeDate: new Date(Object.keys(dailyVolumes)[Object.keys(dailyVolumes).length - 1] * 86400).toLocaleDateString()
                    },
                    explanation: `Today's volume of $${latestVolume.toFixed(2)} is ${volumeMultiplier.toFixed(1)}x higher than the daily average of $${avgVolume.toFixed(2)}. Such sudden spikes often indicate promotional abuse, coordinated attacks, or testing activities.`,
                    recommendation: 'Monitor for next 48 hours to determine if pattern continues'
                });
            }
        }

        // Pattern 6: Wash Trading Detection
        const payerCounts = {};
        transactions.forEach(tx => {
            payerCounts[tx.from_address] = (payerCounts[tx.from_address] || 0) + 1;
        });

        const topPayers = Object.entries(payerCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        const topPayerVolume = topPayers.reduce((sum, [address, count]) => {
            const payerTransactions = transactions.filter(tx => tx.from_address === address);
            const volume = payerTransactions.reduce((s, tx) => s + parseFloat(tx.amount), 0);
            return sum + volume;
        }, 0);

        const totalTransactionVolume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        const washTradingRatio = topPayerVolume / totalTransactionVolume;

        if (washTradingRatio > 0.8 && transactions.length > 20) {
            patterns.push({
                type: 'WASH_TRADING',
                severity: Math.min(10, Math.floor(washTradingRatio * 12)),
                description: 'Wash trading pattern detected',
                details: {
                    topPayerCount: topPayers.length,
                    topPayerVolume: topPayerVolume.toFixed(2),
                    totalVolume: totalTransactionVolume.toFixed(2),
                    concentrationRatio: (washTradingRatio * 100).toFixed(1),
                    topPayers: topPayers.map(([address, count]) => ({
                        address: `${address.slice(0, 6)}...${address.slice(-4)}`,
                        transactions: count,
                        percentage: ((count / transactions.length) * 100).toFixed(1)
                    }))
                },
                explanation: `The top ${topPayers.length} addresses account for ${(washTradingRatio * 100).toFixed(1)}% of total volume, with repetitive payment patterns. This is characteristic of wash trading where the same entities circulate funds to inflate activity metrics.`,
                recommendation: 'Immediate investigation required - may constitute market manipulation'
            });
        }

        // Pattern 7: Time Clustering
        if (transactions.length > 10) {
            const intervals = [];
            for (let i = 1; i < Math.min(transactions.length, 20); i++) {
                intervals.push(transactions[i - 1].timestamp - transactions[i].timestamp);
            }

            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);
            const coefficientOfVariation = stdDev / avgInterval;

            if (coefficientOfVariation < 0.2 && avgInterval < 300) { // Less than 5 minutes avg
                patterns.push({
                    type: 'TIME_CLUSTERING',
                    severity: Math.min(10, Math.floor((1 - coefficientOfVariation) * 15)),
                    description: 'Suspiciously regular transaction timing',
                    details: {
                        averageInterval: Math.floor(avgInterval),
                        standardDeviation: Math.floor(stdDev),
                        regularityScore: coefficientOfVariation,
                        patternDescription: avgInterval < 60 ? 'Every minute' : `Every ${Math.floor(avgInterval / 60)} minutes`
                    },
                    explanation: `Transactions occur with extremely regular intervals (avg: ${Math.floor(avgInterval)} seconds, variation: ${(coefficientOfVariation * 100).toFixed(1)}%). Natural human activity shows much more variation. This suggests automated bot activity or scripted transactions.`,
                    recommendation: 'Block automated access and require human verification'
                });
            }
        }

        // Calculate overall risk level
        const maxSeverity = Math.max(...patterns.map(p => p.severity), 0);
        let riskLevel = 'low';
        if (maxSeverity >= 8) riskLevel = 'critical';
        else if (maxSeverity >= 6) riskLevel = 'high';
        else if (maxSeverity >= 4) riskLevel = 'medium';

        let recommendation = 'No suspicious patterns detected';
        if (patterns.length > 0) {
            if (riskLevel === 'critical') {
                recommendation = 'Immediate investigation and potential suspension recommended';
            } else if (riskLevel === 'high') {
                recommendation = 'Enhanced monitoring and verification required';
            } else if (riskLevel === 'medium') {
                recommendation = 'Monitor closely and consider additional verification';
            } else {
                recommendation = 'Continue normal monitoring';
            }
        }

        return {
            address: serviceAddress,
            totalTransactions: transactions.length,
            totalVolume: totalVolume.toFixed(2),
            accountAgeDays: Math.floor(accountAgeDays),
            uniquePayers: uniquePayers.length,
            patterns: patterns.sort((a, b) => b.severity - a.severity),
            summary: {
                totalPatterns: patterns.length,
                riskLevel,
                recommendation,
                maxSeverity,
                analysisTimestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        logger.error(`Failed to analyze fraud patterns for ${serviceAddress}:`, error);
        throw error;
    }
}

/**
 * Helper function to get top payers
 */
function getTopPayers(transactions, limit) {
    const payerCounts = {};
    transactions.forEach(tx => {
        payerCounts[tx.from_address] = (payerCounts[tx.from_address] || 0) + 1;
    });

    return Object.entries(payerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([address, count]) => ({
            address: `${address.slice(0, 6)}...${address.slice(-4)}`,
            transactions: count,
            percentage: ((count / transactions.length) * 100).toFixed(1)
        }));
}

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
    analyzeFraudPatterns,
    checkServiceForFraud,
    getFraudScore
};
