/**
 * check-database-state.js - Script to check database state and transactions
 */

const { getDatabase, initializeDatabase } = require('../src/db/database');
const { getTransactionCount, getPlatformStats } = require('../src/db/queries');
const logger = require('../src/utils/logger');

async function checkDatabaseState() {
    try {
        // Initialize database connection
        initializeDatabase();

        console.log('🔍 Checking database state...\n');

        // Get basic counts
        const transactionCount = await getTransactionCount();
        const platformStats = await getPlatformStats();

        console.log('📊 Database Statistics:');
        console.log(`   Total Transactions: ${transactionCount}`);
        console.log(`   Total Services: ${platformStats.totalServices}`);
        console.log(`   Total Agents: ${platformStats.totalAgents}`);
        console.log(`   Active Fraud Flags: ${platformStats.activeFraudFlags}`);

        if (transactionCount === 0) {
            console.log('\n No transactions found in database');
            console.log('💡 This is expected if:');
            console.log('   - The indexer just started');
            console.log('   - No x402 transactions have been processed yet');
            console.log('   - The blockchain scanner hasn\'t found any transactions');

            console.log('\n🚀 To get sample data:');
            console.log('1. Wait for the indexer to process some transactions');
            console.log('2. Or use the seed script: node scripts/seed-diverse-data.js');
            console.log('3. Or make test transactions via the API');

            return;
        }

        console.log('\n✅ Database has data - you can now:');
        console.log('1. Test agent addresses: node scripts/get-active-agents.js');
        console.log('2. View dashboard: http://localhost:3000');
        console.log('3. Check API: curl http://localhost:3000/api/stats');

    } catch (error) {
        logger.error('Error checking database state:', error);
        console.error('❌ Error:', error.message);
    }
}



if (require.main === module) {
    checkDatabaseState();
}

module.exports = { checkDatabaseState };