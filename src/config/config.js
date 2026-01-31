require('dotenv').config();

module.exports = {
  // Blockchain
  blockchain: {
    rpcUrl: process.env.BASE_RPC_URL,
    usdcContract: process.env.USDC_CONTRACT || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: 8453, // Base Mainnet
    blockConfirmations: 1,
    backfillBlocks: 1000
  },

  // Server
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    corsOrigins: ['http://localhost:3000', 'https://trustscore.app']
  },

  // Database (SQLite)
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    path: process.env.DB_PATH || './trustscore.db',
    // Legacy PostgreSQL config (for reference)
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'trustscore',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  },

  // x402 Payment Configuration (NEW!)
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
  },

  // Fraud Detection
  fraud: {
    velocityLimit: 50, //USDC
    newWalletAgeDays: 7,
    newWalletVolumeThreshold: 100,
    volumeSpikeMultiplier: 10,
    retrySpamLimit: 10,
    circularFlowMinCount: 10,
  },

  // Reputation Scoring
  reputation: {
    defaultScore: 50,
    minScore: 0,
    maxScore: 100,
    decayDays: 30,
    minTransactionsForScore: 5
  },

  // Jobs
  jobs: {
    fraudScanInterval: '*/5 * * * *',
    scoreUpdateInterval: '0 * * * *',
    cleanupInterval: '0 0 * * *'
  },

  // API
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100
    },
    apiSecret: process.env.API_SECRET || 'change-this-secret'
  }
};
