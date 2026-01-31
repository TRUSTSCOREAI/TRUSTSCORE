// src/utils/helpers.js - Helper Functions
const { ethers } = require('ethers');

/**
 * Validate Ethereum address format using ethers.js
 * @param {string} address - The address to validate
 * @returns {boolean} True if address is valid
 */
function isValidAddress(address) {
    try {
        return ethers.isAddress(address);
    } catch {
        return false;
    }
}

/**
 * Normalize Ethereum address to lowercase format
 * @param {string} address - The address to normalize
 * @returns {string} Lowercase normalized address
 * @throws {Error} If address is invalid
 */
function normalizeAddress(address) {
    if (!isValidAddress(address)) {
        throw new Error('Invalid Ethereum address');
    }
    return address.toLowerCase();
}

/**
 * Format USDC amount with dollar sign and 2 decimal places
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted USDC string
 */
function formatUSDC(amount) {
    return `$${parseFloat(amount).toFixed(2)} USDC`;
}

/**
 * Calculate percentage of value relative to total
 * @param {number} value - The numerator value
 * @param {number} total - The denominator total
 * @returns {number} Percentage as integer (0-100)
 */
function calculatePercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

/**
 * Delay execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after the delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff on failure
 * @param {Function} fn - The async function to retry
 * @param {number} maxAttempts - Maximum number of retry attempts
 * @param {number} delayMs - Base delay in milliseconds
 * @returns {Promise} Result of the successful function call
 */
async function retry(fn, maxAttempts = 3, delayMs = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxAttempts) throw error;
            await delay(delayMs * Math.pow(2, attempt - 1));
        }
    }
}

/**
 * Truncate a string in the middle, keeping start and end characters
 * @param {string} str - The string to truncate
 * @param {number} start - Number of characters to keep at the start
 * @param {number} end - Number of characters to keep at the end
 * @returns {string} Truncated string with ellipsis in the middle
 */
function truncateMiddle(str, start = 6, end = 4) {
    if (str.length <= start + end) return str;
    return `${str.slice(0, start)}...${str.slice(-end)}`;
}

/**
 * Format Unix timestamp to ISO string
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} ISO formatted date string
 */
function formatTimestamp(timestamp) {
    return new Date(timestamp * 1000).toISOString();
}

module.exports = {
    isValidAddress,
    normalizeAddress,
    formatUSDC,
    calculatePercentage,
    delay,
    retry,
    truncateMiddle,
    formatTimestamp
};
