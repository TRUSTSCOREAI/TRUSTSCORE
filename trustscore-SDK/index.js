/**
 * TrustScore SDK for JavaScript/Node.js
 *
 * Official SDK for integrating TrustScore fraud detection and reputation services
 * into x402-compatible applications, wallets, and AI agent frameworks.
 *
 * Features:
 * - Check service/agent reputation scores (0-100)
 * - Real-time fraud detection alerts
 * - Trust compatibility analysis between parties
 * - x402 payment integration for monetization
 * - Free tier support (100 checks/month)
 * - Webhook registration for fraud alerts
 *
 * Usage:
 * - Services: Monitor incoming agent payments for fraud
 * - Agents: Verify service legitimacy before paying
 * - Wallets: Display reputation scores in UI
 * - Frameworks: Build trust-aware agent behaviors
 *
 * @example
 * ```javascript
 * const TrustScore = require('trustscore-sdk');
 * const { ethers } = require('ethers');
 *
 * // Initialize with wallet for x402 payments
 * const wallet = new ethers.Wallet('private-key');
 * const ts = new TrustScore({ wallet, useFreeTier: true });
 *
 * // Check if a service is trustworthy
 * const rep = await ts.checkService('0x...');
 * if (rep.reputation.score < 50) {
 *   console.log('High risk - avoid this service');
 * }
 * ```
 */

const axios = require('axios');
const { ethers } = require('ethers');

/**
 * Main TrustScore SDK class
 * Provides methods for interacting with TrustScore API
 */
class TrustScore {
    /**
     * Initialize TrustScore SDK
     * @param {Object} options - Configuration options
     * @param {string} options.baseURL - API base URL (default: production)
     * @param {ethers.Wallet} options.wallet - Ethers wallet for x402 payments
     * @param {boolean} options.useFreeTier - Use free tier (100 checks/month)
     */
    constructor(options = {}) {
        // API configuration
        this.baseURL = options.baseURL || 'https://api.trustscore.app';

        // Wallet for x402 payments (optional for free tier)
        this.wallet = options.wallet;

        // Free tier flag
        this.useFreeTier = options.useFreeTier || false;

        // Validate configuration
        if (!this.useFreeTier && !this.wallet) {
            throw new Error('Wallet required for paid requests. Set useFreeTier: true for free access.');
        }
    }

    /**
     * Check AI agent reputation score
     * Determines if an agent is trustworthy based on payment history and behavior
     *
     * @param {string} address - Ethereum address of the AI agent
     * @returns {Promise<Object>} Agent reputation data
     * @throws {Error} If payment required or agent not found
     *
     * @example
     * ```javascript
     * const rep = await ts.checkAgent('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
     * console.log(`Agent score: ${rep.reputation.score}/100`);
     * ```
     */
    async checkAgent(address) {
        return this._makeRequest(`/api/reputation/agent/${address}`, 0.01);
    }

    /**
     * Check service reputation score
     * Determines if a service is legitimate based on transaction history and fraud flags
     *
     * @param {string} address - Ethereum address of the service
     * @returns {Promise<Object>} Service reputation data
     * @throws {Error} If payment required or service not found
     *
     * @example
     * ```javascript
     * const rep = await ts.checkService('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
     * if (rep.fraudFlags.length > 0) {
     *   console.log('Service has fraud alerts!');
     * }
     * ```
     */
    async checkService(address) {
        return this._makeRequest(`/api/reputation/service/${address}`, 0.01);
    }

    /**
     * Check fraud detection status
     * Get current fraud flags and risk assessment for a service
     *
     * @param {string} address - Ethereum address of the service
     * @returns {Promise<Object>} Fraud analysis data
     * @throws {Error} If payment required or service not found
     */
    async checkFraud(address) {
        return this._makeRequest(`/api/fraud/check/${address}`, 0.02);
    }

    /**
     * Check trust compatibility between service and agent
     * Analyzes if a transaction between these parties is recommended
     *
     * @param {string} serviceAddress - Service Ethereum address
     * @param {string} agentAddress - Agent Ethereum address
     * @returns {Promise<Object>} Compatibility analysis
     * @throws {Error} If payment required or addresses not found
     *
     * @example
     * ```javascript
     * const result = await ts.checkCompatibility(serviceAddr, agentAddr);
     * if (result.recommended) {
     *   console.log('Safe to transact!');
     * }
     * ```
     */
    async checkCompatibility(serviceAddress, agentAddress) {
        return this._makeRequest(
            `/api/reputation/trust-check?service=${serviceAddress}&agent=${agentAddress}`,
            0.05
        );
    }

    /**
     * Register webhook for fraud alerts
     * Receive real-time notifications when fraud is detected for your service
     *
     * @param {string} serviceAddress - Your service's Ethereum address
     * @param {string} webhookUrl - HTTPS URL to receive fraud alerts
     * @returns {Promise<Object>} Webhook registration confirmation
     * @throws {Error} If payment required or invalid webhook URL
     *
     * @example
     * ```javascript
     * await ts.registerWebhook('0x...', 'https://myapi.com/webhooks/fraud');
     * // Will receive POST requests when fraud is detected
     * ```
     */
    async registerWebhook(serviceAddress, webhookUrl) {
        return this._makeRequest('/api/webhooks/register', 1.00, 'POST', {
            serviceAddress,
            webhookUrl
        });
    }

    /**
     * Get free preview (no payment required)
     * Basic reputation info without detailed metrics or fraud analysis
     *
     * @param {string} address - Ethereum address to preview
     * @returns {Promise<Object>} Basic reputation preview
     */
    async getPreview(address) {
        const response = await axios.get(`${this.baseURL}/api/reputation/preview/${address}`);
        return response.data;
    }

    /**
     * Get free fraud status (no payment required)
     * Basic fraud status without detailed analysis
     *
     * @param {string} address - Ethereum address to check
     * @returns {Promise<Object>} Basic fraud status
     */
    async getFraudStatus(address) {
        const response = await axios.get(`${this.baseURL}/api/fraud/status/${address}`);
        return response.data;
    }

    /**
     * Internal: Make authenticated request with x402 payment
     * Handles payment authorization and API communication
     *
     * @private
     * @param {string} endpoint - API endpoint path
     * @param {number} priceUSDC - Price in USDC (0 for free)
     * @param {string} method - HTTP method (GET/POST)
     * @param {Object} body - Request body for POST requests
     * @returns {Promise<Object>} API response data
     */
    async _makeRequest(endpoint, priceUSDC, method = 'GET', body = null) {
        try {
            // Prepare request headers
            const headers = {};

            // Free tier requests include wallet address for tracking
            if (this.useFreeTier && this.wallet) {
                headers['X-Customer-Wallet'] = this.wallet.address;
            } else if (this.wallet) {
                // Generate x402 payment authorization for paid requests
                const authorization = await this._generateX402Authorization(priceUSDC);
                headers['X-Payment-Authorization'] = authorization;
            }

            // Make HTTP request
            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers
            };

            if (body) {
                config.data = body;
            }

            const response = await axios(config);
            return response.data;

        } catch (error) {
            // Handle payment required errors (HTTP 402)
            if (error.response && error.response.status === 402) {
                throw new Error(`Payment Required: ${error.response.data.message}`);
            }
            throw error;
        }
    }

    /**
     * Generate x402 payment authorization
     * Creates signed authorization for USDC transfers
     *
     * @private
     * @param {number} amountUSDC - Amount to authorize
     * @returns {Promise<string>} Base64-encoded authorization string
     */
    async _generateX402Authorization(amountUSDC) {
        if (!this.wallet) {
            throw new Error('Wallet required for x402 payments. Initialize SDK with wallet option.');
        }

        // x402 protocol constants
        const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC
        const TRUSTSCORE_WALLET = process.env.TRUSTSCORE_WALLET_ADDRESS;

        // Generate payment parameters
        const from = this.wallet.address;
        const to = TRUSTSCORE_WALLET;
        const value = ethers.parseUnits(amountUSDC.toString(), 6); // USDC has 6 decimals
        const validAfter = Math.floor(Date.now() / 1000);
        const validBefore = validAfter + 3600; // Valid for 1 hour
        const nonce = ethers.id(Date.now().toString()); // Generate unique nonce

        // Create authorization message hash
        const message = ethers.solidityPackedKeccak256(
            ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes32'],
            [from, to, value, validAfter, validBefore, nonce]
        );

        // Sign the authorization
        const signature = await this.wallet.signMessage(ethers.getBytes(message));

        // Encode authorization data
        const authorization = {
            from,
            to,
            value: value.toString(),
            validAfter,
            validBefore,
            nonce,
            signature
        };

        // Return base64-encoded authorization
        return 'Bearer ' + Buffer.from(JSON.stringify(authorization)).toString('base64');
    }
}

module.exports = TrustScore;