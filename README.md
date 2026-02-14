# TrustScore Enhanced - Advanced Fraud Detection & Reputation System for x402

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3+-blue.svg)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-brightgreen.svg)](https://github.com/TRUSTSCOREAI/TRUSTSCORE)

**TrustScore Enhanced** is the most advanced trust layer for the x402 autonomous AI agent payments ecosystem. It provides real-time fraud detection, comprehensive reputation scoring, and enhanced analytics to prevent scams, ensure trust, and enable safe transactions between AI agents and services.

##  What's New in Enhanced Version

- ** Enhanced Indexer** - Improved blockchain monitoring with batch processing and configurable polling
- ** Advanced Analytics** - Transaction history API with detailed breakdowns and visual analysis
- ** Better Performance** - Optimized fraud detection with configurable batch sizes and polling intervals
- ** Enhanced Configuration** - More flexible settings for indexer performance and fraud detection thresholds
- ** Improved Data Management** - Better database querying and enhanced reputation calculation algorithms

## Features

### Core Capabilities
- ** Real-Time Fraud Detection** - Monitors all x402 transactions on Base, detecting 7 types of fraud patterns
- ** Two-Sided Reputation System** - Scores both services (0-100) and agents (0-100) based on on-chain behavior
- ** Trust Compatibility Checker** - Analyzes service-agent pairs for transaction safety
- ** Webhook Alerts** - Instant notifications when fraud is detected
- ** x402 Payment Integration** - Monetized API with free tier (10 checks/month) and one-time payment options
- ** Background Jobs** - Automated fraud scanning and reputation score updates with configurable intervals
- ** SQLite Database** - Lightweight, serverless database with optional PostgreSQL support
- ** Enhanced Web Dashboard** - Modern, responsive interface with animations and visual analytics
- ** Transaction History API** - Complete transaction analytics with pagination and detailed breakdowns
- ** Reputation Breakdown Visualization** - Visual representation of reputation score components

### Advanced Fraud Patterns Detected
1. **Velocity Abuse** - Services receiving >50 transactions/hour
2. **New Wallet Risk** - Wallets <7 days old with >$100 volume  
3. **Low Payer Diversity** - Very few unique addresses accounting for most volume
4. **Identical Amounts** - All transactions have exactly the same amounts
5. **Volume Spikes** - 10x+ sudden increase in daily transaction volume (enhanced threshold)
6. **Wash Trading** - Coordinated transactions to inflate activity metrics
7. **Time Clustering** - Suspiciously regular transaction timing indicating automation

## Project Structure

```
TrustScore/
├── src/                          # Core application code
│   ├── api/                      # Express.js API routes and middleware
│   │   ├── middleware/           # Rate limiting, error handling, x402 payments
│   │   ├── routes/               # API endpoints (reputation, fraud, transactions)
│   │   ├── validators/           # Input validation schemas
│   │   └── server.js            # Main Express server
│   ├── db/                      # Database layer
│   │   ├── database.js           # Database connection management
│   │   ├── queries.js            # SQL query functions
│   │   └── schema.js             # Database schema definitions
│   ├── fraud/                   # Fraud detection engine
│   │   ├── detector.js           # Advanced fraud pattern analysis
│   │   └── rules.js             # Fraud detection rules
│   ├── indexer/                 # Blockchain indexing
│   │   ├── enhanced-indexer.js  # Enhanced Base network transaction indexer
│   │   └── facilitator-discovery.js # Facilitator address discovery
│   ├── jobs/                    # Background tasks
│   │   ├── scheduler.js          # Cron job manager
│   │   ├── fraud-scanner.js      # Automated fraud detection
│   │   └── score-updater.js     # Reputation score updates
│   ├── notifications/           # Alert system
│   │   └── webhook.js            # Webhook notification service
│   ├── reputation/              # Reputation scoring system
│   │   ├── agent-scorer.js      # Agent reputation calculation
│   │   ├── service-scorer.js    # Service reputation calculation
│   │   └── trust-matcher.js     # Compatibility analysis
│   ├── utils/                   # Utility functions
│   │   ├── constants.js          # Application constants
│   │   ├── helpers.js            # Helper functions
│   │   └── logger.js             # Logging system
│   └── config/                  # Configuration
│       └── config.js             # Main configuration file
├── public/                      # Frontend assets
│   ├── index.html              # Web dashboard
│   └── js/
│       └── dashboard.js         # Frontend JavaScript
├── scripts/                     # Utility scripts
│   ├── setup-db.js            # Database initialization
│   └── seed-diverse-data.js    # Comprehensive test data seeding
├── tests/                       # Test suite
│   ├── integration/             # Integration tests
│   ├── unit/                   # Unit tests
│   └── setup.js               # Test configuration
├── examples/                    # Usage examples
│   ├── agent-integration.js    # Agent integration example
│   └── service-integration.js  # Service integration example
├── trustscore-SDK/             # Node.js SDK
│   ├── index.js               # SDK entry point
│   ├── package.json           # SDK dependencies
│   └── README.md             # SDK documentation
├── index.js                    # Main application entry point
├── package.json                # Dependencies and scripts
├── jest.config.js             # Test configuration
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
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

## Prerequisites

- **Node.js** 18+ with npm
- **SQLite** 3+ (included with Node.js) or PostgreSQL 13+ (optional)
- **Alchemy** or Infura RPC endpoint for Base network
- **Ethereum Wallet** with USDC for x402 payments

## Quick Start

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

### 4. Seed Test Data (Optional)

```bash
# Seed with diverse test scenarios for development
npm run seed
```

This creates test addresses with different fraud patterns:
- `0x1111...1111` - Legitimate Service (Score: ~85)
- `0x2222...2222` - Wash Trading (Score: ~30)
- `0x6666...6666` - New Risky (Score: ~45)
- `0x7777...7777` - Volume Spike (Score: ~65)
- `0x8888...8888` - Retry Spam (Score: ~60)
- `0xAAAA...AAAA` - Excellent (Score: ~95)

### 5. Start System

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The system will be available at:
- **API**: http://localhost:3000
- **Dashboard**: http://localhost:3000

### 6. How Address Indexing Works

**Important**: Addresses must be indexed before reputation data is available:

1. **New Addresses**: When you first query a service/agent address, you may see "address not found" 
2. **Indexing Process**: The system continuously scans Base blockchain for x402 transactions
3. **Data Population**: Once an address participates in x402 transactions, it gets automatically indexed
4. **Reputation Calculation**: Scores are calculated based on on-chain transaction history

**Monitor indexing progress**:
```bash
# Check API stats for indexed addresses
curl http://localhost:3000/api/stats
```

## SDK Usage(In Development)

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

## Testing

Run the complete test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
```

##  Enhanced Web Dashboard

The TrustScore Enhanced dashboard provides a comprehensive web interface for analyzing x402 addresses and monitoring platform health.

### Dashboard Features

####  Address Analysis
- **Auto-detection** - Automatically identifies whether an address is an x402 agent or service
- **Real-time Scoring** - Instant reputation scoring with detailed breakdowns
- **Visual Analytics** - Interactive charts and graphs for data visualization
- **Transaction History** - Complete transaction timeline with pagination

####  Visual Components
- **Animated Progress Bars** - Smooth score displays with color-coded trust levels
- **Pattern Cards** - Hover effects and detailed fraud pattern explanations
- **Severity Indicators** - Color-coded fraud flag severity levels (Critical, High, Medium, Low)
- **Reputation Breakdown** - Visual representation of score components

####  Interactive Features
- **Keyboard Shortcuts** - Ctrl+K to focus search, Escape to clear results
- **Responsive Design** - Mobile-friendly interface with Tailwind CSS
- **Loading Animations** - Smooth transitions and loading states
- **Tooltips** - Contextual help for user guidance

####  Advanced Analysis
- **Trust Compatibility Checker** - Analyze service-agent pair compatibility
- **Fraud Pattern Detection** - Detailed explanations of detected fraud patterns
- **Platform Statistics** - Real-time platform-wide metrics and health indicators
- **Performance Monitoring** - Page load time tracking and optimization alerts

### Dashboard Usage

1. **Access the Dashboard**: Navigate to `http://localhost:3000` after starting the system
2. **Enter Address**: Input any x402 agent or service address
3. **View Analysis**: Get instant reputation scores, fraud flags, and transaction history
4. **Check Compatibility**: Use the trust compatibility checker for pair analysis
5. **Monitor Stats**: View platform-wide statistics and system health

### Dashboard API Integration

The dashboard uses the following key API endpoints:
- `GET /api/reputation/service/:address` - Service reputation data
- `GET /api/reputation/agent/:address` - Agent reputation data
- `GET /api/fraud/analyze/:address` - Fraud pattern analysis
- `GET /api/transactions/:address` - Transaction history
- `GET /api/stats` - Platform statistics

## API Reference

### Reputation Endpoints

#### GET /api/reputation/service/:address
Get service reputation score and detailed metrics.

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

#### GET /api/fraud/analyze/:address (Premium)
Get comprehensive fraud pattern analysis with detailed explanations.

#### GET /api/fraud/status/:address (Free)
Get basic fraud status without payment.

#### GET /api/fraud/flags/:address (Premium)
Get detailed fraud flag history.

#### GET /api/fraud/patterns (Free)
Get educational information about fraud patterns.

### Transaction Endpoints

#### GET /api/transactions/:address
Get transaction history with pagination and detailed analytics.

#### GET /api/transactions/:address/summary
Get summary statistics without full transaction list.

### Platform Endpoints

#### GET /api/stats
Get platform-wide statistics and health metrics.

#### POST /api/webhooks/register
Register webhook for fraud alerts.

## Configuration

### Enhanced Indexer Configuration

```javascript
// src/config/config.js
blockchain: {
  rpcUrl: process.env.BASE_RPC_URL,
  usdcContract: process.env.USDC_CONTRACT || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  chainId: 8453, // Base Mainnet
  blockConfirmations: 1,
  backfillBlocks: 1000,
  // Enhanced batch processing configuration
  batchSize: parseInt(process.env.INDEXER_BATCH_SIZE) || 50,        // Blocks per batch
  maxBatchSize: parseInt(process.env.INDEXER_MAX_BATCH_SIZE) || 500, // Maximum batch size
  pollingInterval: parseInt(process.env.INDEXER_POLLING_INTERVAL) || 10000 // Polling in ms
}
```

### Fraud Detection Rules

```javascript
// src/config/config.js
fraud: {
  velocityLimit: 50,              // Max transactions per hour
  newWalletAgeDays: 7,            // Days to consider "new"
  newWalletVolumeThreshold: 100,  // USDC volume threshold
  volumeSpikeMultiplier: 10,      // Enhanced spike detection multiplier (increased from 5)
  retrySpamLimit: 10,            // Max retries in 5 minutes
  circularFlowMinCount: 10,       // Min identical payments for wash trading
  lowDiversityRatio: 0.1,        // Minimum payer diversity ratio
  timeClusteringVariance: 0.2     // Maximum variance for timing patterns
}
```

### Reputation Scoring Configuration

```javascript
// src/config/config.js
reputation: {
  defaultScore: 50,
  minScore: 0,
  maxScore: 100,
  decayDays: 30,                // Score decay over time
  minTransactionsForScore: 5     // Minimum transactions to calculate score
}
```

### Payment & Pricing Configuration

```javascript
// src/config/config.js
payment: {
  walletAddress: process.env.TRUSTSCORE_WALLET_ADDRESS,
  privateKey: process.env.TRUSTSCORE_PRIVATE_KEY,
  pricing: {
    reputationCheck: parseFloat(process.env.PRICE_REPUTATION_CHECK || '0.01'),
    fraudCheck: parseFloat(process.env.PRICE_FRAUD_CHECK || '0.02'),
    trustCheck: parseFloat(process.env.PRICE_TRUST_CHECK || '0.05'),
    webhookRegistration: parseFloat(process.env.PRICE_WEBHOOK_REGISTRATION || '1.00'),
    oneTimePayment: parseFloat(process.env.PRICE_ONE_TIME_PAYMENT || '0.10') // New: One-time payment for 10 free calls
  },
  freeTier: {
    monthlyLimit: parseInt(process.env.FREE_TIER_MONTHLY_LIMIT || '10')
  }
}
```

### Background Job Scheduling

```javascript
// src/config/config.js
jobs: {
  fraudScanInterval: '*/5 * * * *',    // Every 5 minutes
  scoreUpdateInterval: '0 * * * *',    // Every hour
  cleanupInterval: '0 0 * * *'          // Daily at midnight
}
```

## Production Deployment

### Railway (Recommended)

1. Connect GitHub repository to Railway
2. Add PostgreSQL database addon
3. Set all environment variables
4. Deploy and monitor

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

### Environment Variables for Production

```env
# Production settings
NODE_ENV=production
DB_SSL=true
API_SECRET=strong-random-secret
BASE_RPC_URL=https://your-alchemy-url
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Add comprehensive tests for new functionality
4. Ensure all tests pass and coverage stays above 80%
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- **Code Style**: ESLint and Prettier configuration included
- **Testing**: 80%+ code coverage required for new features
- **Documentation**: JSDoc comments for all public APIs
- **Security**: Input validation and SQL injection protection mandatory

## Business Model

### Revenue Streams

1. **API Subscriptions** - $10/month per service for premium features
2. **Pay-per-Check** - $0.01-$0.05 per reputation/fraud check
3. **Enterprise** - Custom integrations and white-label solutions

### Free Tier Limitations
- 10 API calls per month
- Basic reputation scores
- No advanced fraud pattern analysis

## Security

- **Input Validation**: All inputs validated with Joi schemas
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **SQL Injection Protection**: Parameterized queries only
- **Replay Attack Prevention**: Nonce tracking for x402 payments
- **HTTPS Only**: All production traffic encrypted
- **API Keys**: Secure authentication for premium features

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/trustscore/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/trustscore/discussions)
- **SDK Docs**: [trustscore-SDK/README.md](trustscore-SDK/README.md)

## Acknowledgments

- x402 Protocol team for the payment standard
- Base network for fast, low-cost transactions
- Alchemy for reliable RPC infrastructure
- Open source community for fraud detection research

---

**TrustScore** - Making AI agent payments safe and trustworthy.
