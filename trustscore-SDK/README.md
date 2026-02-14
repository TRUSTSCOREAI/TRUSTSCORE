# TrustScore SDK

Official JavaScript/Node.js SDK for TrustScore fraud detection and reputation API.

## Installation

```bash
npm install trustscore-sdk
```

## Quick Start

```javascript
const TrustScore = require('trustscore-sdk');
const { ethers } = require('ethers');

// Initialize with your wallet (for x402 payments)
const wallet = new ethers.Wallet('your-private-key');
const trustScore = new TrustScore({ 
  wallet: wallet,
  useFreeTier: true  // Use 100 free checks/month
});

// Check agent reputation
const agentRep = await trustScore.checkAgent('0xAgentAddress');
console.log(`Score: ${agentRep.reputation.score}/100`);

// Check service reputation
const serviceRep = await trustScore.checkService('0xServiceAddress');
console.log(`Trust Level: ${serviceRep.reputation.trustLevel}`);
```

## API Methods

### Paid Methods (require x402 payment or free tier)

#### `checkAgent(address)`
Check reputation score for an AI agent.
- **Cost:** $0.01 USDC
- **Free Tier:** Yes (100/month)

```javascript
const result = await trustScore.checkAgent('0x...');
console.log(result.reputation.score); // 0-100
```

#### `checkService(address)`
Check reputation score for an x402 service.
- **Cost:** $0.01 USDC
- **Free Tier:** Yes (100/month)

```javascript
const result = await trustScore.checkService('0x...');
console.log(result.reputation.trustLevel); // excellent, high, medium, low, untrusted
```

#### `checkFraud(address)`
Get detailed fraud analysis for a service.
- **Cost:** $0.02 USDC
- **Free Tier:** Yes (100/month)

```javascript
const result = await trustScore.checkFraud('0x...');
console.log(result.fraudScore); // 0-100 (lower = more fraud)
console.log(result.activeFlags); // Array of fraud alerts
```

#### `checkCompatibility(serviceAddress, agentAddress)`
Analyze trust compatibility between service and agent.
- **Cost:** $0.05 USDC
- **Free Tier:** Yes (100/month)

```javascript
const result = await trustScore.checkCompatibility('0xService', '0xAgent');
console.log(result.compatibility.recommended); // true/false
console.log(result.compatibility.riskLevel); // low, medium, high
```

#### `registerWebhook(serviceAddress, webhookUrl)`
Register for real-time fraud alerts.
- **Cost:** $1.00 USDC (one-time)
- **Free Tier:** No

```javascript
await trustScore.registerWebhook(
  '0xYourService',
  'https://yourapi.com/webhooks/fraud-alert'
);
```

### Free Methods (no payment required)

#### `getPreview(address)`
Get basic reputation preview without payment.

```javascript
const preview = await trustScore.getPreview('0x...');
console.log(preview.preview.scoreRange); // e.g., "70-80"
```

#### `getFraudStatus(address)`
Get basic fraud status without payment.

```javascript
const status = await trustScore.getFraudStatus('0x...');
console.log(status.status); // "clean" or "flagged"
```

## Configuration Options

```javascript
const trustScore = new TrustScore({
  baseURL: 'https://api.trustscore.app',  // API endpoint
  wallet: ethersWallet,                    // Ethers.js wallet for payments
  useFreeTier: true                        // Use free tier (100 checks/month)
});
```

## Error Handling

```javascript
try {
  const result = await trustScore.checkAgent('0x...');
} catch (error) {
  if (error.message.includes('Payment Required')) {
    console.log('Free tier exhausted or payment failed');
  } else {
    console.error('API error:', error.message);
  }
}
```

## Examples

### Example 1: Service Checking Agents

```javascript
const TrustScore = require('trustscore-sdk');
const { ethers } = require('ethers');

const serviceWallet = new ethers.Wallet(process.env.SERVICE_PRIVATE_KEY);
const trustScore = new TrustScore({ wallet: serviceWallet, useFreeTier: true });

async function shouldAcceptAgent(agentAddress) {
  const rep = await trustScore.checkAgent(agentAddress);
  
  if (rep.reputation.score < 40) {
    return { accept: false, reason: 'Low reputation' };
  }
  
  if (rep.fraudFlags > 0) {
    return { accept: false, reason: 'Fraud alerts' };
  }
  
  return { accept: true };
}
```

### Example 2: Agent Checking Services

```javascript
const agentWallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY);
const trustScore = new TrustScore({ wallet: agentWallet, useFreeTier: true });

async function shouldUseService(serviceAddress) {
  const rep = await trustScore.checkService(serviceAddress);
  
  return rep.reputation.score >= 70 && rep.fraudFlags === 0;
}
```

## Free Tier

- **100 checks per month** across all paid endpoints (combined)
- Automatically resets monthly
- No credit card required
- Upgrade to paid automatically when limit reached

## Support

- Documentation: https://docs.trustscore.app
- GitHub: https://github.com/yourusername/trustscore
- Email: support@trustscore.app

## License

MIT