// seed-diverse-data.js - Seed diverse test data for TrustScore enhancement
const { initializeDatabase } = require('../src/db/database');
const { saveTransaction } = require('../src/db/queries');
const { saveServiceReputation } = require('../src/db/queries');
const { saveAgentReputation } = require('../src/db/queries');
const { saveFraudFlag } = require('../src/db/queries');
const logger = require('../src/utils/logger');

/**
 * Generate random Ethereum address
 */
function generateRandomAddress() {
    return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/**
 * Generate random amount within range
 */
function randomAmount(min, max) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

/**
 * Seed legitimate service data
 * Characteristics: Diverse payers, natural timing, varied amounts
 */
async function seedLegitimateService() {
    const service = '0x1111111111111111111111111111111111111';
    const now = Math.floor(Date.now() / 1000);
    const ninetyDaysAgo = now - (90 * 86400);

    console.log('🌟 Seeding LEGITIMATE SERVICE:', service);

    // Generate 100 transactions over 90 days
    const transactions = [];
    for (let i = 0; i < 100; i++) {
        const timestamp = ninetyDaysAgo + Math.random() * (90 * 86400);
        const payer = generateRandomAddress();
        const amount = randomAmount(5, 50); // Natural range $5-$50

        transactions.push({
            txHash: `0xlegit${i.toString().padStart(4, '0')}`,
            fromAddress: payer,
            toAddress: service,
            amount: amount,
            blockNumber: 10000000 + i,
            timestamp: timestamp,
            gasPrice: (1000000000 + Math.floor(Math.random() * 500000000)).toString(),
            facilitatorAddress: generateRandomAddress()
        });
    }

    // Save transactions
    for (const tx of transactions) {
        await saveTransaction(tx);
    }

    // Save reputation
    await saveServiceReputation({
        address: service,
        reputationScore: 85,
        trustLevel: 'excellent',
        totalTransactions: 100,
        totalVolume: transactions.reduce((sum, tx) => sum + tx.amount, 0),
        uniquePayers: 100, // All unique payers
        firstSeenAt: new Date(ninetyDaysAgo * 1000).toISOString(),
        lastActiveAt: new Date(now * 1000).toISOString(),
        activeFraudFlags: 0,
        badges: ['verified', 'reliable']
    });

    console.log(`✅ Created ${transactions.length} legitimate transactions`);
    return transactions;
}

/**
 * Seed wash trading service data
 * Characteristics: Same 3 payers, identical amounts, regular timing
 */
async function seedWashTradingService() {
    const service = '0x2222222222222222222222222222222222222222';
    const washers = [
        '0x3333333333333333333333333333333333333333',
        '0x4444444444444444444444444444444444444',
        '0x5555555555555555555555555555555555555555'
    ];
    const now = Math.floor(Date.now() / 1000);
    const threeDaysAgo = now - (3 * 86400);

    console.log('🚨 Seeding WASH TRADING SERVICE:', service);

    // Generate 150 transactions over 3 days
    const transactions = [];
    for (let i = 0; i < 150; i++) {
        const timestamp = threeDaysAgo + (i * 60 * 5); // Every 5 minutes
        const payer = washers[i % 3]; // Rotate through same 3 addresses
        const amount = 10.00; // Always exactly $10

        transactions.push({
            txHash: `0xwash${i.toString().padStart(4, '0')}`,
            fromAddress: payer,
            toAddress: service,
            amount: amount,
            blockNumber: 10100000 + i,
            timestamp: timestamp,
            gasPrice: '1000000000',
            facilitatorAddress: generateRandomAddress()
        });
    }

    // Save transactions
    for (const tx of transactions) {
        await saveTransaction(tx);
    }

    // Save reputation
    await saveServiceReputation({
        address: service,
        reputationScore: 30,
        trustLevel: 'untrusted',
        totalTransactions: 150,
        totalVolume: 1500, // 150 * $10
        uniquePayers: 3, // Only 3 unique payers
        firstSeenAt: new Date(threeDaysAgo * 1000).toISOString(),
        lastActiveAt: new Date(now * 1000).toISOString(),
        activeFraudFlags: 3,
        badges: ['suspicious']
    });

    // Save fraud flags
    await saveFraudFlag({
        serviceAddress: service,
        flagType: 'WASH_TRADING',
        severity: 9,
        details: JSON.stringify({
            description: 'Same 3 addresses account for 95% of volume',
            pattern: 'Circular payments between related addresses',
            evidence: {
                topPayers: washers.map(w => `${w.slice(0, 6)}...${w.slice(-4)}`),
                identicalAmounts: 150,
                totalVolume: 1500
            }
        })
    });

    await saveFraudFlag({
        serviceAddress: service,
        flagType: 'IDENTICAL_AMOUNTS',
        severity: 7,
        details: JSON.stringify({
            description: 'All transactions are exactly $10.00',
            uniformityPercentage: 100
        })
    });

    await saveFraudFlag({
        serviceAddress: service,
        flagType: 'TIME_CLUSTERING',
        severity: 6,
        details: JSON.stringify({
            description: 'Transactions every 5 minutes exactly',
            regularityScore: 0.1
        })
    });

    console.log(`✅ Created ${transactions.length} wash trading transactions`);
    return transactions;
}

/**
 * Seed new risky service data
 * Characteristics: New account with high volume
 */
async function seedNewRiskyService() {
    const service = '0x6666666666666666666666666666666666';
    const now = Math.floor(Date.now() / 1000);
    const threeDaysAgo = now - (3 * 86400);

    console.log('⚠️ Seeding NEW RISKY SERVICE:', service);

    // Generate 80 transactions in just 3 days
    const transactions = [];
    for (let i = 0; i < 80; i++) {
        const timestamp = threeDaysAgo + Math.random() * (3 * 86400);
        const payer = generateRandomAddress();
        const amount = randomAmount(10, 30); // Higher amounts

        transactions.push({
            txHash: `0xnew${i.toString().padStart(4, '0')}`,
            fromAddress: payer,
            toAddress: service,
            amount: amount,
            blockNumber: 10200000 + i,
            timestamp: timestamp,
            gasPrice: (1000000000 + Math.floor(Math.random() * 500000000)).toString(),
            facilitatorAddress: generateRandomAddress()
        });
    }

    // Save transactions
    for (const tx of transactions) {
        await saveTransaction(tx);
    }

    // Save reputation
    await saveServiceReputation({
        address: service,
        reputationScore: 45,
        trustLevel: 'low',
        totalTransactions: 80,
        totalVolume: transactions.reduce((sum, tx) => sum + tx.amount, 0),
        uniquePayers: 80,
        firstSeenAt: new Date(threeDaysAgo * 1000).toISOString(),
        lastActiveAt: new Date(now * 1000).toISOString(),
        activeFraudFlags: 2,
        badges: ['new_account']
    });

    // Save fraud flags
    await saveFraudFlag({
        serviceAddress: service,
        flagType: 'NEW_WALLET_RISK',
        severity: 8,
        details: JSON.stringify({
            accountAgeDays: 3,
            totalVolume: transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2),
            volumePerDay: (transactions.reduce((sum, tx) => sum + tx.amount, 0) / 3).toFixed(2)
        })
    });

    await saveFraudFlag({
        serviceAddress: service,
        flagType: 'VELOCITY_ABUSE',
        severity: 8,
        details: JSON.stringify({
            transactionsPerHour: 27,
            normalThreshold: 50
        })
    });

    console.log(`✅ Created ${transactions.length} new risky transactions`);
    return transactions;
}

/**
 * Seed volume spike service data
 * Characteristics: Normal pattern with sudden spike
 */
async function seedVolumeSpikeService() {
    const service = '0x7777777777777777777777777777777777';
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - (30 * 86400);

    console.log('📈 Seeding VOLUME SPIKE SERVICE:', service);

    // Generate 120 transactions over 30 days
    const transactions = [];
    for (let i = 0; i < 120; i++) {
        let timestamp, amount;

        if (i < 100) {
            // Normal period - low volume
            timestamp = thirtyDaysAgo + Math.random() * (25 * 86400);
            amount = randomAmount(5, 15); // Small amounts
        } else {
            // Spike period - high volume
            timestamp = thirtyDaysAgo + (25 * 86400) + Math.random() * (5 * 86400);
            amount = randomAmount(50, 100); // Large amounts
        }

        transactions.push({
            txHash: `0xspike${i.toString().padStart(4, '0')}`,
            fromAddress: generateRandomAddress(),
            toAddress: service,
            amount: amount,
            blockNumber: 10300000 + i,
            timestamp: timestamp,
            gasPrice: (1000000000 + Math.floor(Math.random() * 500000000)).toString(),
            facilitatorAddress: generateRandomAddress()
        });
    }

    // Save transactions
    for (const tx of transactions) {
        await saveTransaction(tx);
    }

    // Save reputation
    await saveServiceReputation({
        address: service,
        reputationScore: 65,
        trustLevel: 'medium',
        totalTransactions: 120,
        totalVolume: transactions.reduce((sum, tx) => sum + tx.amount, 0),
        uniquePayers: 120,
        firstSeenAt: new Date(thirtyDaysAgo * 1000).toISOString(),
        lastActiveAt: new Date(now * 1000).toISOString(),
        activeFraudFlags: 1,
        badges: ['volume_spike']
    });

    // Save fraud flag
    await saveFraudFlag({
        serviceAddress: service,
        flagType: 'VOLUME_SPIKE',
        severity: 6,
        details: JSON.stringify({
            averageDailyVolume: '15.50',
            latestDailyVolume: '75.25',
            volumeMultiplier: '4.9'
        })
    });

    console.log(`✅ Created ${transactions.length} volume spike transactions`);
    return transactions;
}

/**
 * Seed retry spam service data
 * Characteristics: Repeated failed transactions
 */
async function seedRetrySpamService() {
    const service = '0x8888888888888888888888888888888888888888';
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - (7 * 86400);

    console.log('🔄 Seeding RETRY SPAM SERVICE:', service);

    // Generate 60 transactions over 7 days with retry patterns
    const transactions = [];
    for (let i = 0; i < 60; i++) {
        const timestamp = sevenDaysAgo + Math.random() * (7 * 86400);
        const payer = generateRandomAddress();
        const amount = randomAmount(1, 5); // Small amounts, many retries

        transactions.push({
            txHash: `0xretry${i.toString().padStart(4, '0')}`,
            fromAddress: payer,
            toAddress: service,
            amount: amount,
            blockNumber: 10400000 + i,
            timestamp: timestamp,
            gasPrice: (1000000000 + Math.floor(Math.random() * 500000000)).toString(),
            facilitatorAddress: generateRandomAddress()
        });
    }

    // Save transactions
    for (const tx of transactions) {
        await saveTransaction(tx);
    }

    // Save reputation
    await saveServiceReputation({
        address: service,
        reputationScore: 60,
        trustLevel: 'medium',
        totalTransactions: 60,
        totalVolume: transactions.reduce((sum, tx) => sum + tx.amount, 0),
        uniquePayers: 60,
        firstSeenAt: new Date(sevenDaysAgo * 1000).toISOString(),
        lastActiveAt: new Date(now * 1000).toISOString(),
        activeFraudFlags: 1,
        badges: ['retry_patterns']
    });

    // Save fraud flag
    await saveFraudFlag({
        serviceAddress: service,
        flagType: 'RETRY_SPAM',
        severity: 5,
        details: JSON.stringify({
            smallTransactionRatio: 0.8,
            averageAmount: '2.50'
        })
    });

    console.log(`✅ Created ${transactions.length} retry spam transactions`);
    return transactions;
}

/**
 * Seed excellent service data
 * Characteristics: Perfect reputation across all metrics
 */
async function seedExcellentService() {
    const service = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const now = Math.floor(Date.now() / 1000);
    const ninetyDaysAgo = now - (90 * 86400);

    console.log('⭐ Seeding EXCELLENT SERVICE:', service);

    // Generate 150 transactions over 90 days with perfect patterns
    const transactions = [];
    for (let i = 0; i < 150; i++) {
        const timestamp = ninetyDaysAgo + Math.random() * (90 * 86400);
        const payer = generateRandomAddress();
        const amount = randomAmount(20, 100); // Healthy amounts

        transactions.push({
            txHash: `0xexcell${i.toString().padStart(4, '0')}`,
            fromAddress: payer,
            toAddress: service,
            amount: amount,
            blockNumber: 10500000 + i,
            timestamp: timestamp,
            gasPrice: (1000000000 + Math.floor(Math.random() * 500000000)).toString(),
            facilitatorAddress: generateRandomAddress()
        });
    }

    // Save transactions
    for (const tx of transactions) {
        await saveTransaction(tx);
    }

    // Save reputation
    await saveServiceReputation({
        address: service,
        reputationScore: 95,
        trustLevel: 'excellent',
        totalTransactions: 150,
        totalVolume: transactions.reduce((sum, tx) => sum + tx.amount, 0),
        uniquePayers: 150,
        firstSeenAt: new Date(ninetyDaysAgo * 1000).toISOString(),
        lastActiveAt: new Date(now * 1000).toISOString(),
        activeFraudFlags: 0,
        badges: ['verified', 'excellent', 'long_standing']
    });

    console.log(`✅ Created ${transactions.length} excellent transactions`);
    return transactions;
}

/**
 * Seed agent data for diversity
 */
async function seedTestAgents() {
    const agents = [
        {
            address: '0xagent1111111111111111111111111111111111111',
            reputationScore: 75,
            trustLevel: 'high',
            totalPayments: 50,
            totalSpent: 2500,
            uniqueServices: 8,
            accountAgeDays: 60
        },
        {
            address: '0xagent2222222222222222222222222222222222222',
            reputationScore: 85,
            trustLevel: 'excellent',
            totalPayments: 80,
            totalSpent: 3200,
            uniqueServices: 12,
            accountAgeDays: 120
        }
    ];

    console.log('🤖 Seeding TEST AGENTS');

    for (const agent of agents) {
        await saveAgentReputation({
            address: agent.address,
            reputationScore: agent.reputationScore,
            trustLevel: agent.trustLevel,
            totalPayments: agent.totalPayments,
            totalSpent: agent.totalSpent,
            uniqueServices: agent.uniqueServices,
            firstPaymentAt: new Date(Date.now() - agent.accountAgeDays * 86400 * 1000).toISOString(),
            lastPaymentAt: new Date().toISOString(),
            accountAgeDays: agent.accountAgeDays,
            paymentReliability: 95,
            disputeCount: 0,
            badges: ['reliable']
        });
    }

    console.log(`✅ Created ${agents.length} test agents`);
}

/**
 * Main seeding function
 */
async function seed() {
    try {
        console.log('🌱 Starting diverse data seeding for TrustScore enhancement...');

        // Initialize database connection
        initializeDatabase();

        // Seed all service types
        await seedLegitimateService();
        await seedWashTradingService();
        await seedNewRiskyService();
        await seedVolumeSpikeService();
        await seedRetrySpamService();
        await seedExcellentService();

        // Seed test agents
        await seedTestAgents();

        console.log('🎉 Diverse data seeding completed!');
        console.log('');
        console.log('📊 Test Addresses Created:');
        console.log('🌟 0x1111...1111 - Legitimate Service (Score: ~85)');
        console.log('🚨 0x2222...2222 - Wash Trading (Score: ~30)');
        console.log('⚠️ 0x6666...6666 - New Risky (Score: ~45)');
        console.log('📈 0x7777...7777 - Volume Spike (Score: ~65)');
        console.log('🔄 0x8888...8888 - Retry Spam (Score: ~60)');
        console.log('⭐ 0xAAAA...AAAA - Excellent (Score: ~95)');
        console.log('');
        console.log('🔥 Start the enhanced server and test!');
        console.log('🌐 Visit: http://localhost:3000');
        console.log('');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}

// Run seeding if this file is executed directly
if (require.main === module) {
    seed();
}

module.exports = {
    seed,
    seedLegitimateService,
    seedWashTradingService,
    seedNewRiskyService,
    seedVolumeSpikeService,
    seedRetrySpamService,
    seedExcellentService,
    seedTestAgents
};