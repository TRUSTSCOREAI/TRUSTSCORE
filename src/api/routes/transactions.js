// src/api/routes/transactions.js - Transaction History API Routes
const express = require('express');
const router = express.Router();
const { getTransactionsByAddress } = require('../../db/queries');
const validateAddress = require('../validators/address');
const config = require('../../config/config');
const logger = require('../../utils/logger');

/**
 * GET /api/transactions/:address
 * Get transaction history for an address (FREE endpoint)
 * Query params:
 * - limit: Number of transactions to return (default: 10, max: 100)
 * - offset: Pagination offset (default: 0)
 * - type: 'service' or 'agent' (default: auto-detect)
 */
router.get('/:address', validateAddress, async (req, res) => {
    try {
        const { address } = req.params;
        const { limit = 10, offset = 0, type } = req.query;

        // Parse and validate parameters
        const transactionLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
        const transactionOffset = Math.max(parseInt(offset) || 0, 0);

        // Determine if we should query as service or agent
        let asService = true;
        if (type === 'agent') {
            asService = false;
        } else if (type === 'service') {
            asService = true;
        } else {
            // Auto-detect: try service first, then agent if no results
            const serviceTransactions = await getTransactionsByAddress(address, true);
            if (serviceTransactions.length > 0) {
                asService = true;
            } else {
                const agentTransactions = await getTransactionsByAddress(address, false);
                asService = agentTransactions.length === 0; // Keep service if both empty
            }
        }

        // Get transactions from database
        const allTransactions = await getTransactionsByAddress(address, asService);

        // Apply pagination
        const startIndex = transactionOffset;
        const endIndex = startIndex + transactionLimit;
        const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

        // Calculate statistics
        const totalTransactions = allTransactions.length;
        const totalVolume = allTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
        const uniqueCounterparties = asService
            ? [...new Set(allTransactions.map(tx => tx.from_address))].length
            : [...new Set(allTransactions.map(tx => tx.to_address))].length;

        // Get time range
        if (allTransactions.length > 0) {
            const timestamps = allTransactions.map(tx => tx.timestamp);
            const oldestTimestamp = Math.min(...timestamps);
            const newestTimestamp = Math.max(...timestamps);
            const accountAgeDays = Math.floor((Date.now() / 1000 - oldestTimestamp) / 86400);
        }

        // Format transactions for frontend
        const formattedTransactions = paginatedTransactions.map((tx, index) => {
            const counterparty = asService ? tx.from_address : tx.to_address;
            const isRecent = (Date.now() / 1000 - tx.timestamp) < 3600; // Less than 1 hour ago

            return {
                id: tx.id || index + 1,
                txHash: tx.tx_hash,
                counterparty: {
                    address: counterparty,
                    display: `${counterparty.slice(0, 6)}...${counterparty.slice(-4)}`,
                    isContract: counterparty.length === 42 && counterparty.startsWith('0x')
                },
                amount: {
                    value: parseFloat(tx.amount || 0).toFixed(2),
                    currency: 'USDC',
                    formatted: `$${parseFloat(tx.amount || 0).toFixed(2)} USDC`
                },
                timestamp: {
                    raw: tx.timestamp,
                    iso: new Date(tx.timestamp * 1000).toISOString(),
                    relative: getRelativeTime(tx.timestamp),
                    isRecent
                },
                block: {
                    number: tx.block_number,
                    confirmations: tx.block_number ? Math.max(0, 18000000 - tx.block_number) : 0
                },
                facilitator: tx.facilitator_address ? {
                    address: tx.facilitator_address,
                    display: `${tx.facilitator_address.slice(0, 6)}...${tx.facilitator_address.slice(-4)}`
                } : null,
                gas: {
                    price: tx.gas_price ? parseInt(tx.gas_price) : null,
                    formatted: tx.gas_price ? `${(parseInt(tx.gas_price) / 1000000000).toFixed(2)} Gwei` : null
                },
                metadata: {
                    role: asService ? 'received_from' : 'sent_to',
                    type: asService ? 'payment_received' : 'payment_sent',
                    index: totalTransactions - (startIndex + index) // Position in total history
                }
            };
        });

        // Determine account type and provide metadata
        const accountType = asService ? 'service' : 'agent';
        const oldestTimestamp = allTransactions.length > 0 ? Math.min(...allTransactions.map(tx => tx.timestamp)) : 0;
        const accountAgeDays = allTransactions.length > 0 ? Math.floor((Date.now() / 1000 - oldestTimestamp) / 86400) : 0;

        const response = {
            address,
            accountType,
            statistics: {
                totalTransactions,
                totalVolume: {
                    value: totalVolume.toFixed(2),
                    formatted: `$${totalVolume.toFixed(2)} USDC`
                },
                uniqueCounterparties,
                accountAgeDays,
                averageTransactionValue: totalTransactions > 0 ? (totalVolume / totalTransactions).toFixed(2) : '0.00',
                transactionsPerPage: transactionLimit,
                currentPage: Math.floor(transactionOffset / transactionLimit) + 1,
                totalPages: Math.ceil(totalTransactions / transactionLimit)
            },
            transactions: formattedTransactions,
            pagination: {
                limit: transactionLimit,
                offset: transactionOffset,
                hasMore: endIndex < totalTransactions,
                hasNextPage: endIndex < totalTransactions,
                hasPreviousPage: transactionOffset > 0,
                nextPage: endIndex < totalTransactions ? transactionOffset + transactionLimit : null,
                previousPage: transactionOffset > 0 ? Math.max(0, transactionOffset - transactionLimit) : null
            },
            metadata: {
                queriedAt: new Date().toISOString(),
                queryType: type || 'auto-detected',
                freeTier: true,
                cacheExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
            }
        };

        // Add warning flags for suspicious patterns
        const warnings = [];
        if (uniqueCounterparties === 1 && totalTransactions > 10) {
            warnings.push({
                type: 'LOW_DIVERSITY',
                message: 'Only one unique counterparty detected',
                severity: 'medium'
            });
        }

        if (formattedTransactions.every(tx => tx.amount.value === formattedTransactions[0].amount.value) && totalTransactions > 5) {
            warnings.push({
                type: 'IDENTICAL_AMOUNTS',
                message: 'All transactions have identical amounts',
                severity: 'high'
            });
        }

        if (accountAgeDays < 7 && totalTransactions > 50) {
            warnings.push({
                type: 'NEW_ACCOUNT_HIGH_ACTIVITY',
                message: 'New account with unusually high activity',
                severity: 'high'
            });
        }

        if (warnings.length > 0) {
            response.warnings = warnings;
        }

        res.json(response);

    } catch (error) {
        logger.error(`Failed to get transactions for ${req.params.address}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve transaction history',
            address: req.params.address,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/transactions/:address/summary
 * Get summary statistics for an address without full transaction list
 */
router.get('/:address/summary', validateAddress, async (req, res) => {
    try {
        const { address } = req.params;

        // Get transactions as both service and agent
        const [serviceTransactions, agentTransactions] = await Promise.all([
            getTransactionsByAddress(address, true),
            getTransactionsByAddress(address, false)
        ]);

        const allTransactions = serviceTransactions.length > 0 ? serviceTransactions : agentTransactions;
        const accountType = serviceTransactions.length > 0 ? 'service' : (agentTransactions.length > 0 ? 'agent' : 'unknown');

        if (allTransactions.length === 0) {
            return res.json({
                address,
                accountType: 'unknown',
                statistics: {
                    totalTransactions: 0,
                    totalVolume: '0.00',
                    uniqueCounterparties: 0,
                    accountAgeDays: 0,
                    hasActivity: false
                },
                message: 'No transactions found for this address'
            });
        }

        // Calculate summary statistics
        const totalVolume = allTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
        const uniqueCounterparties = accountType === 'service'
            ? [...new Set(allTransactions.map(tx => tx.from_address))].length
            : [...new Set(allTransactions.map(tx => tx.to_address))].length;

        const timestamps = allTransactions.map(tx => tx.timestamp);
        const oldestTimestamp = Math.min(...timestamps);
        const newestTimestamp = Math.max(...timestamps);
        const accountAgeDays = Math.floor((Date.now() / 1000 - oldestTimestamp) / 86400);

        // Calculate activity patterns
        const last24Hours = allTransactions.filter(tx => tx.timestamp > (Date.now() / 1000 - 86400));
        const last7Days = allTransactions.filter(tx => tx.timestamp > (Date.now() / 1000 - 7 * 86400));

        res.json({
            address,
            accountType,
            statistics: {
                totalTransactions: allTransactions.length,
                totalVolume: {
                    value: totalVolume.toFixed(2),
                    formatted: `$${totalVolume.toFixed(2)} USDC`
                },
                uniqueCounterparties,
                accountAgeDays,
                averageTransactionValue: (totalVolume / allTransactions.length).toFixed(2),
                hasActivity: true,
                recentActivity: {
                    last24Hours: last24Hours.length,
                    last7Days: last7Days.length,
                    activityRate: (last7Days.length / 7).toFixed(1) // transactions per day
                },
                timeRange: {
                    firstTransaction: new Date(oldestTimestamp * 1000).toISOString(),
                    lastTransaction: new Date(newestTimestamp * 1000).toISOString()
                }
            },
            metadata: {
                analyzedAt: new Date().toISOString(),
                dataPoints: allTransactions.length
            }
        });

    } catch (error) {
        logger.error(`Failed to get transaction summary for ${req.params.address}:`, error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve transaction summary',
            address: req.params.address
        });
    }
});

/**
 * Helper function to get relative time string
 */
function getRelativeTime(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
    return `${Math.floor(diff / 31536000)} years ago`;
}

module.exports = router;