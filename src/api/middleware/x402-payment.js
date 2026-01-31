const { ethers } = require('ethers');
const config = require('../../config/config');
const { recordPayment, getUserUsage } = require('../../db/queries');
const logger = require('../../utils/logger');

/**
 * Middleware to require x402 payment before allowing access to paid endpoints
 * @param {number} priceInUSDC - Price in USDC for the endpoint
 * @returns {Function} Express middleware function
 */
function x402PaymentRequired(priceInUSDC) {
    return async (req, res, next) => {
        try {
            // Check if customer is on free tier first
            const customerWallet = req.query.wallet || req.headers['x-customer-wallet'];

            if (customerWallet) {
                const usage = await getUserUsage(customerWallet);

                // Allow free tier usage
                if (usage.monthlyChecks < config.payment.freeTier.monthlyLimit) {
                    logger.info('Free tier access granted', { wallet: customerWallet, usage: usage.monthlyChecks });
                    req.freeTier = true;
                    await recordPayment({
                        customerWallet,
                        amount: 0,
                        endpoint: req.path,
                        freeTier: true
                    });
                    return next();
                }
            }

            // Get x402 payment authorization from header
            const authHeader = req.headers['x-payment-authorization'];

            if (!authHeader) {
                return res.status(402).json({
                    error: 'Payment Required',
                    message: 'Include x402 payment authorization header or use free tier (100 checks/month)',
                    pricing: {
                        amount: priceInUSDC + ' USDC',
                        recipient: config.payment.walletAddress,
                        network: 'base',
                        protocol: 'x402'
                    },
                    freeTier: {
                        limit: config.payment.freeTier.monthlyLimit,
                        used: customerWallet ? (await getUserUsage(customerWallet)).monthlyChecks : 0,
                        remaining: customerWallet ? config.payment.freeTier.monthlyLimit - (await getUserUsage(customerWallet)).monthlyChecks : config.payment.freeTier.monthlyLimit
                    },
                    howToPay: {
                        method: 'x402',
                        example: 'Include X-Payment-Authorization header with signed payment authorization'
                    }
                });
            }

            // Verify x402 payment
            const paymentVerification = await verifyX402Payment(authHeader, priceInUSDC);

            if (!paymentVerification.valid) {
                return res.status(402).json({
                    error: 'Invalid Payment',
                    message: paymentVerification.reason || 'Payment verification failed',
                    expectedAmount: priceInUSDC + ' USDC',
                    recipient: config.payment.walletAddress
                });
            }

            // Record successful payment
            await recordPayment({
                customerWallet: paymentVerification.from,
                amount: priceInUSDC,
                txHash: paymentVerification.txHash,
                endpoint: req.path,
                freeTier: false
            });

            logger.info('x402 payment verified', {
                from: paymentVerification.from,
                amount: priceInUSDC,
                endpoint: req.path
            });

            // Payment verified, proceed to endpoint
            req.paidAccess = true;
            req.customerWallet = paymentVerification.from;
            next();

        } catch (error) {
            logger.error('Payment verification error', { error: error.message });
            res.status(500).json({
                error: 'Payment verification error',
                message: error.message
            });
        }
    };
}

/**
 * Verify x402 payment authorization header and validate payment details
 * @param {string} authorizationHeader - The X-Payment-Authorization header value
 * @param {number} expectedAmount - Expected payment amount in USDC
 * @returns {Promise<Object>} Verification result with validity status and details
 */
async function verifyX402Payment(authorizationHeader, expectedAmount) {
    try {
        // Parse authorization header
        // Expected format: "Bearer "
        const authData = authorizationHeader.replace('Bearer ', '');

        // Decode the authorization (this would use actual x402 library in production)
        const decoded = JSON.parse(Buffer.from(authData, 'base64').toString());

        // Verify components
        const { from, to, value, validAfter, validBefore, nonce, signature } = decoded;

        // 1. Check recipient is our wallet
        if (to.toLowerCase() !== config.payment.walletAddress.toLowerCase()) {
            return {
                valid: false,
                reason: 'Payment recipient mismatch'
            };
        }

        // 2. Check amount matches
        const amountInUSDC = parseFloat(ethers.formatUnits(value, 6));
        if (Math.abs(amountInUSDC - expectedAmount) > 0.001) { // Allow 0.001 USDC tolerance
            return {
                valid: false,
                reason: `Amount mismatch. Expected ${expectedAmount}, got ${amountInUSDC}`
            };
        }

        // 3. Check validity period
        const now = Math.floor(Date.now() / 1000);
        if (now < validAfter || now > validBefore) {
            return {
                valid: false,
                reason: 'Authorization expired or not yet valid'
            };
        }

        // 4. Verify signature (simplified - use proper x402 library)
        const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
        const message = ethers.solidityPackedKeccak256(
            ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes32'],
            [from, to, value, validAfter, validBefore, nonce]
        );

        const recoveredAddress = ethers.verifyMessage(ethers.getBytes(message), signature);

        if (recoveredAddress.toLowerCase() !== from.toLowerCase()) {
            return {
                valid: false,
                reason: 'Invalid signature'
            };
        }

        // 5. Check nonce hasn't been used (prevent replay attacks)
        const nonceUsed = await checkNonceUsed(nonce);
        if (nonceUsed) {
            return {
                valid: false,
                reason: 'Nonce already used'
            };
        }

        // Mark nonce as used
        await markNonceUsed(nonce, from);

        // All checks passed
        return {
            valid: true,
            from,
            to,
            amount: amountInUSDC,
            txHash: ethers.id(nonce) // Use nonce hash as pseudo-txHash for now
        };

    } catch (error) {
        logger.error('Payment verification failed', { error: error.message });
        return {
            valid: false,
            reason: 'Verification error: ' + error.message
        };
    }
}

/**
 * Check if a nonce has already been used to prevent replay attacks
 * @param {string} nonce - The nonce to check
 * @returns {Promise<boolean>} True if nonce has been used before
 */
async function checkNonceUsed(nonce) {
    const { getDatabase } = require('../../db/database');
    const db = getDatabase();

    const result = db.prepare('SELECT COUNT(*) as count FROM used_nonces WHERE nonce = ?').get(nonce);
    return result.count > 0;
}

/**
 * Mark a nonce as used to prevent replay attacks
 * @param {string} nonce - The nonce to mark as used
 * @param {string} customerWallet - The customer's wallet address
 * @returns {Promise<void>}
 */
async function markNonceUsed(nonce, customerWallet) {
    const { getDatabase } = require('../../db/database');
    const db = getDatabase();

    db.prepare(`
    INSERT INTO used_nonces (nonce, customer_wallet, used_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).run(nonce, customerWallet);
}

module.exports = {
    x402PaymentRequired,
    verifyX402Payment
};