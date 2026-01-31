/**
 * Example: x402 service integrating TrustScore
 */

const express = require('express');
const TrustScore = require('../trustscore-SDK/index.js');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());

// Initialize TrustScore with your service wallet
const wallet = new ethers.Wallet(process.env.SERVICE_PRIVATE_KEY);
const trustScore = new TrustScore({
    wallet,
    useFreeTier: true // Use free tier first (10 checks/month)
});

// Register webhook for fraud alerts (one-time, costs $1.00)
async function setupFraudAlerts() {
    try {
        await trustScore.registerWebhook(
            wallet.address,
            'https://myservice.com/webhooks/fraud-alert'
        );
        console.log(' Fraud alerts registered');
    } catch (error) {
        console.error('Failed to register webhook:', error.message);
    }
}

// Before processing agent payment, check reputation
app.post('/api/process-payment', async (req, res) => {
    const { agentAddress, amount } = req.body;

    try {
        // Check agent reputation before accepting payment
        const agentRep = await trustScore.checkAgent(agentAddress);

        console.log(`Agent ${agentAddress}: Score ${agentRep.reputation.score}`);

        // Decision logic
        if (agentRep.reputation.score < 40) {
            return res.status(403).json({
                error: 'Agent reputation too low',
                score: agentRep.reputation.score,
                message: 'Please build payment history before using this service'
            });
        }

        if (agentRep.fraudFlags > 0) {
            return res.status(403).json({
                error: 'Agent has active fraud alerts',
                message: 'This agent has been flagged for suspicious activity'
            });
        }

        // Agent is trustworthy, proceed with payment
        await processPayment(agentAddress, amount);

        res.json({
            success: true,
            message: 'Payment processed',
            agentScore: agentRep.reputation.score
        });

    } catch (error) {
        console.error('TrustScore check failed:', error.message);

        // Fallback: allow payment but log for review
        await processPayment(agentAddress, amount);
        res.json({
            success: true,
            warning: 'Payment processed without reputation check'
        });
    }
});

// Receive fraud alerts from TrustScore
app.post('/webhooks/fraud-alert', express.json(), (req, res) => {
    const { service, alert } = req.body;

    console.log(` FRAUD ALERT for ${service}`);
    console.log(`Type: ${alert.type}, Severity: ${alert.severity}/10`);
    console.log('Details:', alert.details);

    // Take action based on severity
    if (alert.severity >= 8) {
        // Critical fraud - block immediately
        blockMaliciousAgent(alert.details.suspiciousPayer);
        notifyAdmin(`Critical fraud detected: ${alert.type}`);
    } else if (alert.severity >= 5) {
        // Moderate fraud - flag for review
        flagForReview(alert.details);
    }

    res.sendStatus(200);
});

app.listen(3001, () => {
    console.log('Service running on port 3001');
    setupFraudAlerts();
});
