// ============================================================================

// trustscore-sdk/README.md
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

// ============================================================================

// trustscore-sdk/.npmignore
# Files to exclude when publishing to NPM
examples/
*.test.js
.env
.env.*

// ============================================================================

// trustscore-sdk/examples/basic-usage.js
/**
 * Basic TrustScore SDK usage example
 */

const TrustScore = require('../index'); // or 'trustscore-sdk' if installed from NPM
const { ethers } = require('ethers');

async function basicExample() {
  // Initialize SDK with your wallet
  const wallet = new ethers.Wallet(process.env.YOUR_PRIVATE_KEY);
  const trustScore = new TrustScore({ 
    wallet,
    useFreeTier: true // Use free checks first
  });

  try {
    // Example 1: Check agent reputation
    console.log('Checking agent reputation...');
    const agentAddress = '0x1234567890123456789012345678901234567890';
    const agentRep = await trustScore.checkAgent(agentAddress);
    
    console.log(`Agent Score: ${agentRep.reputation.score}/100`);
    console.log(`Trust Level: ${agentRep.reputation.trustLevel}`);
    console.log(`Total Payments: ${agentRep.metrics.totalPayments}`);

    // Example 2: Check service reputation
    console.log('\nChecking service reputation...');
    const serviceAddress = '0x2345678901234567890123456789012345678901';
    const serviceRep = await trustScore.checkService(serviceAddress);
    
    console.log(`Service Score: ${serviceRep.reputation.score}/100`);
    console.log(`Trust Level: ${serviceRep.reputation.trustLevel}`);
    console.log(`Active Fraud Flags: ${serviceRep.fraudFlags}`);

    // Example 3: Free preview (no payment)
    console.log('\nGetting free preview...');
    const preview = await trustScore.getPreview(agentAddress);
    console.log(`Preview Score Range: ${preview.preview.scoreRange}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

basicExample();

// ============================================================================

// trustscore-sdk/examples/advanced-usage.js
/**
 * Advanced TrustScore SDK usage example
 */

const TrustScore = require('../index');
const { ethers } = require('ethers');

class SmartService {
  constructor(privateKey) {
    this.wallet = new ethers.Wallet(privateKey);
    this.trustScore = new TrustScore({ 
      wallet: this.wallet,
      useFreeTier: true
    });
    this.blacklist = new Set();
  }

  /**
   * Process agent payment with reputation check
   */
  async processPayment(agentAddress, amount) {
    console.log(`Processing payment from ${agentAddress}...`);

    // Check blacklist
    if (this.blacklist.has(agentAddress.toLowerCase())) {
      return { 
        success: false, 
        reason: 'Agent is blacklisted' 
      };
    }

    try {
      // Check agent reputation
      const rep = await this.trustScore.checkAgent(agentAddress);
      
      console.log(`Agent score: ${rep.reputation.score}/100`);

      // Decision logic
      if (rep.reputation.score < 30) {
        this.blacklist.add(agentAddress.toLowerCase());
        return { 
          success: false, 
          reason: 'Reputation too low - blacklisted',
          score: rep.reputation.score
        };
      }

      if (rep.reputation.score < 50) {
        return { 
          success: false, 
          reason: 'Reputation too low',
          score: rep.reputation.score
        };
      }

      if (rep.fraudFlags > 0) {
        return { 
          success: false, 
          reason: 'Active fraud alerts',
          flags: rep.fraudFlags
        };
      }

      // Agent is trustworthy - process payment
      console.log('✅ Agent verified - processing payment');
      return { 
        success: true, 
        score: rep.reputation.score 
      };

    } catch (error) {
      console.error('Reputation check failed:', error.message);
      // Decide: Allow or reject if check fails
      return { 
        success: false, 
        reason: 'Unable to verify reputation' 
      };
    }
  }

  /**
   * Register for fraud alerts (one-time setup)
   */
  async setupFraudAlerts(webhookUrl) {
    try {
      await this.trustScore.registerWebhook(
        this.wallet.address,
        webhookUrl
      );
      console.log('✅ Fraud alerts registered');
    } catch (error) {
      console.error('Failed to register webhook:', error.message);
    }
  }

  /**
   * Batch check multiple agents
   */
  async checkMultipleAgents(addresses) {
    console.log(`Checking ${addresses.length} agents...`);
    
    const results = await Promise.all(
      addresses.map(async (address) => {
        try {
          const rep = await this.trustScore.checkAgent(address);
          return {
            address,
            score: rep.reputation.score,
            trustLevel: rep.reputation.trustLevel,
            safe: rep.reputation.score >= 70 && rep.fraudFlags === 0
          };
        } catch (error) {
          return {
            address,
            error: error.message,
            safe: false
          };
        }
      })
    );

    const safeAgents = results.filter(r => r.safe);
    console.log(`${safeAgents.length}/${addresses.length} agents are safe`);
    
    return results;
  }
}

// Usage
async function advancedExample() {
  const service = new SmartService(process.env.SERVICE_PRIVATE_KEY);

  // Setup fraud alerts
  await service.setupFraudAlerts('https://myservice.com/webhooks/fraud');

  // Process individual payment
  const result = await service.processPayment(
    '0x1234567890123456789012345678901234567890',
    100
  );
  console.log('Payment result:', result);

  // Batch check agents
  const agents = [
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333'
  ];
  
  const batchResults = await service.checkMultipleAgents(agents);
  console.log('Batch results:', batchResults);
}

advancedExample();