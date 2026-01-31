# TrustScore - Fraud Detection & Reputation System for x402

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3+-blue.svg)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**TrustScore** is the trust layer for the x402 autonomous AI agent payments ecosystem. It provides real-time fraud detection and reputation scoring to prevent scams, ensure trust, and enable safe transactions between AI agents and services.

##  Features

### Core Capabilities
- **Real-Time Fraud Detection** - Monitors all x402 transactions on Base, detecting 5 types of fraud patterns
- **Two-Sided Reputation System** - Scores both services (0-100) and agents (0-100) based on on-chain behavior
- **Trust Compatibility Checker** - Analyzes service-agent pairs for transaction safety
- **Webhook Alerts** - Instant notifications when fraud is detected
- **x402 Payment Integration** - Monetized API with free tier (10 checks/month)
- **Background Jobs** - Automated fraud scanning and reputation score updates
- **SQLite Database** - Lightweight, serverless database with optional PostgreSQL support
- **Web Dashboard** - User-friendly interface for reputation checking and analytics

### Fraud Patterns Detected
1. **Velocity Abuse** - Services receiving >50 transactions/hour
2. **New Wallet Risk** - Wallets <7 days old with >$100 volume
3. **Wash Trading** - Identical payments from same address repeatedly (10+ times)
4. **Volume Spikes** - 10x+ sudden increase in transaction volume
5. **Retry Spam** - >10 attempts from same agent in 5 minutes with small amounts (<$0.10)

##  Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Agents     │    │   Services      │    │   Wallets       │
│   (Buyers)      │    │   (Sellers)     │    │   (x402)        │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────┬───────────┴──────────┬───────────┘
                     │                      │
          ┌─────────────────────┐    ┌─────────────────────┐
          │  TrustScore API     │    │  Blockchain Indexer │
          │  (Express.js)       │    │  (Ethers.js)        │
          └─────────────────────┘    └─────────────────────┘
                     │                      │
                     └──────────┬───────────┘
                                │
                     ┌─────────────────────┐
                     │  SQLite Database    │
                     │  (8 Tables)         │
                     └─────────────────────┘
```

### Database Schema

The system uses SQLite by default with 8 main tables:

- **transactions** - All x402 USDC transfers with facilitator data
- **fraud_flags** - Detected fraudulent activities and resolutions
- **service_reputation** - Reputation scores and metrics for services
- **agent_reputation** - Reputation scores and metrics for AI agents
- **webhooks** - Registered webhook URLs for fraud alerts
- **payments** - x402 payment tracking for API usage
- **used_nonces** - Prevents replay attacks on x402 payments
- **user_usage** - Free tier usage tracking

##  Prerequisites

- **Node.js** 18+ with npm
- **SQLite** 3+ (included with Node.js) or PostgreSQL 13+ (optional)
- **Alchemy** or Infura RPC endpoint for Base network
- **Ethereum Wallet** with USDC for x402 payments

##  Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/trustscore.git
cd trustscore
npm install
```

### 2. Environment Configuration

Create `.env` file from example:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database (SQLite by default)
DB_TYPE=sqlite
DB_PATH=./trustscore.db

# For PostgreSQL (alternative)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=trustscore
# DB_USER=trustscore_user
# DB_PASSWORD=your_password

# Blockchain
BASE_RPC_URL=https://mainnet.base.org
USDC_CONTRACT=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Server
PORT=3000
NODE_ENV=development

# x402 Payments
TRUSTSCORE_WALLET_ADDRESS=0x_your_wallet_address
TRUSTSCORE_PRIVATE_KEY=your_private_key

# API Pricing (in USDC)
PRICE_REPUTATION_CHECK=0.01
PRICE_FRAUD_CHECK=0.02
PRICE_TRUST_CHECK=0.05
PRICE_WEBHOOK_REGISTRATION=1.00

# Free Tier
FREE_TIER_MONTHLY_LIMIT=10

# API Security
API_SECRET=your-secret-key-change-this-in-production
```

### 3. Initialize Database

```bash
npm run setup
```

### 4. Start the System

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The system will be available at:
- **API**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard

### 5. Frontend Error Handling

**Fixed Issues**:
- **Payment Required**: API endpoints now require x402 payment for premium features
- **Free Tier**: Basic reputation checks available without payment (10 checks/month)
- **User-Friendly Messages**: Clear error explanations instead of technical errors
- **Address Not Found**: Explains indexing process and provides testing options

**Frontend Improvements**:
- Uses `/api/reputation/free/:address` endpoint for basic checks (no payment required)
- Shows free tier notification when using free endpoint
- Better error messages for "Address not found" and "Payment Required" scenarios
- Payment information displayed when applicable

### 6. How Address Indexing Works

**Important**: Addresses must be indexed before reputation data is available:

1. **New Addresses**: When you first query a service/agent address, you may see "address not found" 
2. **Indexing Process**: The system continuously scans Base blockchain for x402 transactions
3. **Data Population**: Once an address participates in x402 transactions, it gets automatically indexed
4. **Reputation Calculation**: Scores are calculated based on on-chain transaction history

**To test with sample data**:
```bash
# Seed the database with test transactions
npm run seed
```

**Monitor indexing progress**:
```bash
# Check API stats for indexed addresses
curl http://localhost:3000/api/stats
```

##  SDK Usage

### Installation

```bash
npm install trustscore-sdk
```

### Basic Usage

```javascript
const TrustScore = require('trustscore-sdk');
const { ethers } = require('ethers');

// Initialize with wallet for x402 payments
const wallet = new ethers.Wallet('your-private-key');
const ts = new TrustScore({
  wallet: wallet,
  useFreeTier: true  // 10 free checks/month
});

// Check service reputation
const serviceRep = await ts.checkService('0xServiceAddress');
console.log(`Score: ${serviceRep.reputation.score}/100`);

// Check agent reputation
const agentRep = await ts.checkAgent('0xAgentAddress');
console.log(`Trust Level: ${agentRep.reputation.trustLevel}`);

// Check fraud status
const fraudStatus = await ts.checkFraud('0xServiceAddress');
console.log(`Active fraud flags: ${fraudStatus.activeFlags.length}`);

// Register for fraud alerts
await ts.registerWebhook('0xYourService', 'https://your-api.com/webhooks/fraud');
```

##  Testing

Run the test suite:

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

##  API Reference

### Reputation Endpoints

#### GET /api/reputation/service/:address
Get service reputation score and metrics.

**Response:**
```json
{
  "address": "0x...",
  "reputationScore": 85,
  "trustLevel": "high",
  "totalTransactions": 100,
  "totalVolume": "5000.00",
  "uniquePayers": 50,
  "accountAgeDays": 30,
  "activeFraudFlags": 0,
  "badges": ["VERIFIED", "TRUSTED"]
}
```

#### GET /api/reputation/agent/:address
Get agent reputation score and metrics.

#### GET /api/reputation/trust-check
Check compatibility between service and agent.

### Fraud Detection Endpoints

#### GET /api/fraud/check/:address
Get current fraud status for a service.

**Response:**
```json
{
  "address": "0x...",
  "fraudScore": 15,
  "riskLevel": "high",
  "activeFlags": [
    {
      "type": "velocity_abuse",
      "severity": 8,
      "details": {
        "transactionsLastHour": 60,
        "threshold": 50
      }
    }
  ]
}
```

### Platform Endpoints

#### GET /api/stats
Get platform-wide statistics.

#### POST /api/webhooks/register
Register webhook for fraud alerts.

## 🔧 Configuration

### Fraud Detection Rules

```javascript
// src/config/config.js
fraud: {
  velocityLimit: 50,              // Max transactions per hour
  newWalletAgeDays: 7,            // Days to consider "new"
  newWalletVolumeThreshold: 100,  // USDC volume threshold
  volumeSpikeMultiplier: 10,      // Spike detection multiplier
  retrySpamLimit: 10,             // Max retries in 5 minutes
  circularFlowMinCount: 10         // Min identical payments for wash trading
}
```

### Reputation Scoring Weights

```javascript
reputation: {
  defaultScore: 50,
  transactionWeight: 0.3,
  volumeWeight: 0.2,
  diversityWeight: 0.15,
  ageWeight: 0.15,
  activityWeight: 0.1,
  fraudPenalty: -15
}
```

##  Production Deployment

### Railway (Recommended)

1. Connect GitHub repository
2. Add PostgreSQL database
3. Set environment variables
4. Deploy

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

```env
# Production settings
NODE_ENV=production
DB_SSL=true
API_SECRET=strong-random-secret
BASE_RPC_URL=https://your-alchemy-url
```

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Development Guidelines

- **Code Style**: ESLint configuration included
- **Testing**: 80%+ code coverage required
- **Documentation**: JSDoc comments for all public APIs
- **Security**: Input validation and SQL injection protection

##  Business Model

### Revenue Streams

1. **API Subscriptions** - $99/month per service for premium features
2. **Pay-per-Check** - $0.01-$0.05 per reputation/fraud check
3. **Enterprise** - Custom integrations and white-label solutions

### Free Tier
- 10 API calls per month
- Basic reputation scores
- Email alerts only

##  Security

- **Input Validation**: All inputs validated with Joi schemas
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **SQL Injection Protection**: Parameterized queries only
- **Replay Attack Prevention**: Nonce tracking for x402 payments
- **HTTPS Only**: All production traffic encrypted

##  License

MIT License - see [LICENSE](LICENSE) file for details.

##  Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/trustscore/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/trustscore/discussions)

##  Acknowledgments

- x402 Protocol team for the payment standard
- Base network for fast, low-cost transactions
- Alchemy for reliable RPC infrastructure

---

**TrustScore** - Making AI agent payments safe and trustworthy. 🚀</content>
<parameter name="filePath">c:\Users\USER\TrustScore\README.md
