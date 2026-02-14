// src/indexer/enhanced-indexer.js - Enhanced X402 Transaction Indexer
const ethers = require('ethers');
const { getDatabase } = require('../db/database');
const { saveTransaction } = require('../db/queries');
const { getFacilitatorAddresses, isFacilitator, getAllFacilitators } = require('./facilitator-discovery');
const config = require('../config/config');
const logger = require('../utils/logger');

class EnhancedIndexer {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
        this.usdcAddress = config.blockchain.usdcContract;
        this.facilitators = [];
        this.facilitatorMap = {};
        this.usdcContract = null;
        this.isRunning = false;
        this.lastCheckedBlock = 0;
        this.stats = {
            totalBlocksChecked: 0,
            totalEventsFound: 0,
            facilitatorEventsFound: 0,
            transactionsSaved: 0,
            errors: 0
        };

        // Event signature for TransferWithAuthorization only (real x402 payments)
        this.transferWithAuthSignature = ethers.id('TransferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,address)');

        // Event interface for parsing TransferWithAuthorization
        this.transferWithAuthInterface = new ethers.Interface(['event TransferWithAuthorization(address indexed from, address indexed to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 indexed nonce, address authorizer)']);
    }

    async initialize() {
        try {
            logger.info('Initializing Enhanced Indexer...');

            // Load facilitators with metadata
            const facilitatorData = await getAllFacilitators();
            this.facilitators = facilitatorData.addresses;
            this.facilitatorMap = facilitatorData.facilitatorMap;

            logger.info(`Loaded ${this.facilitators.length} facilitator addresses`);

            // Get current block number
            this.lastCheckedBlock = await this.provider.getBlockNumber();
            logger.info(`Current block: ${this.lastCheckedBlock}`);

            // Test USDC contract
            const usdcCode = await this.provider.getCode(this.usdcAddress);
            if (usdcCode.length === 0) {
                throw new Error(`USDC contract not found at ${this.usdcAddress}`);
            }
            logger.info(`USDC contract verified at ${this.usdcAddress}`);

            return true;
        } catch (error) {
            logger.error('Failed to initialize indexer:', error);
            throw error;
        }
    }

    async startIndexing() {
        if (this.isRunning) {
            logger.warn('Indexer is already running');
            return;
        }

        logger.info('Starting Enhanced Indexer...');
        this.isRunning = true;
        this.stats = {
            totalBlocksChecked: 0,
            totalEventsFound: 0,
            facilitatorEventsFound: 0,
            transactionsSaved: 0,
            errors: 0
        };

        // Start polling loop
        this.pollingInterval = setInterval(async () => {
            try {
                await this.pollForTransactions();
            } catch (error) {
                this.stats.errors++;
                logger.error('Error in polling loop:', error);
            }
        }, config.blockchain.pollingInterval); // Use configurable polling interval

        logger.info(`Enhanced indexer started with ${config.blockchain.pollingInterval}ms polling`);
        logger.info(`Batch size: ${config.blockchain.batchSize} blocks per query`);
        logger.info(`Max batch size: ${config.blockchain.maxBatchSize} blocks`);
    }

    async pollForTransactions() {
        try {
            const currentBlock = await this.provider.getBlockNumber();

            if (currentBlock > this.lastCheckedBlock) {
                const blocksToCheck = currentBlock - this.lastCheckedBlock;

                if (blocksToCheck <= config.blockchain.batchSize) {
                    // Check all blocks at once if within batch size
                    await this.checkBlockRange(this.lastCheckedBlock + 1, currentBlock);
                } else {
                    // Process in batches for large ranges
                    const batchSize = Math.min(config.blockchain.maxBatchSize, blocksToCheck);
                    let startBlock = this.lastCheckedBlock + 1;

                    while (startBlock <= currentBlock) {
                        const endBlock = Math.min(startBlock + batchSize - 1, currentBlock);
                        await this.checkBlockRange(startBlock, endBlock);
                        startBlock = endBlock + 1;

                        // Add small delay between batches to avoid overwhelming RPC
                        if (startBlock <= currentBlock) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }
                }

                this.lastCheckedBlock = currentBlock;
                this.logStats();
            }
        } catch (error) {
            this.stats.errors++;
            logger.error('Error polling for transactions:', error);
        }
    }

    async checkBlockRange(startBlock, endBlock) {
        try {
            const blocksInRange = endBlock - startBlock + 1;
            this.stats.totalBlocksChecked += blocksInRange;

            logger.debug(`Checking blocks ${startBlock} to ${endBlock} (${blocksInRange} blocks)`);

            // Get logs for entire block range at once - this is much more efficient
            const transferWithAuthLogs = await this.provider.getLogs({
                fromBlock: startBlock,
                toBlock: endBlock,
                address: this.usdcAddress,
                topics: [this.transferWithAuthSignature]
            });

            if (transferWithAuthLogs.length > 0) {
                this.stats.totalEventsFound += transferWithAuthLogs.length;
                logger.info(`Found ${transferWithAuthLogs.length} TransferWithAuthorization events in blocks ${startBlock}-${endBlock}`);

                for (const log of transferWithAuthLogs) {
                    await this.processTransferWithAuthEvent(log, log.blockNumber || startBlock);
                }
            }
        } catch (error) {
            this.stats.errors++;
            logger.error(`Error checking blocks ${startBlock} to ${endBlock}:`, error);

            // Fallback to individual block checking if batch fails
            logger.warn(`Falling back to individual block checking for range ${startBlock}-${endBlock}`);
            for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
                try {
                    await this.checkSingleBlock(blockNum);
                } catch (singleBlockError) {
                    logger.error(`Failed to check individual block ${blockNum}:`, singleBlockError);
                }
            }
        }
    }

    async checkSingleBlock(blockNumber) {
        try {
            // ONLY get TransferWithAuthorization events - these are real x402 payments
            const transferWithAuthLogs = await this.provider.getLogs({
                fromBlock: blockNumber,
                toBlock: blockNumber,
                address: this.usdcAddress,
                topics: [this.transferWithAuthSignature]
            });

            if (transferWithAuthLogs.length > 0) {
                this.stats.totalEventsFound += transferWithAuthLogs.length;
                logger.debug(`Block ${blockNumber}: Found ${transferWithAuthLogs.length} TransferWithAuthorization events`);

                for (const log of transferWithAuthLogs) {
                    await this.processTransferWithAuthEvent(log, blockNumber);
                }
            }
        } catch (error) {
            this.stats.errors++;
            logger.error(`Error checking block ${blockNumber}:`, error);
        }
    }

    async processTransferWithAuthEvent(log, blockNumber) {
        try {
            const parsed = this.transferWithAuthInterface.parseLog(log);
            const facilitatorAddress = parsed.args.authorizer.toLowerCase();
            const from = parsed.args.from.toLowerCase();
            const to = parsed.args.to.toLowerCase();
            const value = ethers.formatUnits(parsed.args.value, 6);

            // Check if facilitator is a known facilitator
            const isKnownFacilitator = this.facilitators.includes(facilitatorAddress);

            if (isKnownFacilitator) {
                this.stats.facilitatorEventsFound++;

                const facilitatorInfo = this.facilitatorMap[facilitatorAddress] || { provider: 'Unknown' };

                logger.info(`Found x402 transaction!`);
                logger.info(`   Type: TransferWithAuthorization`);
                logger.info(`   Block: ${blockNumber}`);
                logger.info(`   Hash: ${log.transactionHash}`);
                logger.info(`   From: ${from}`);
                logger.info(`   To: ${to}`);
                logger.info(`   Value: ${value} USDC`);
                logger.info(`   Facilitator: ${facilitatorAddress} (${facilitatorInfo.provider})`);

                // Get block timestamp
                const block = await this.provider.getBlock(blockNumber);

                // Prepare transaction data
                const transactionData = {
                    tx_hash: log.transactionHash,
                    from_address: from,
                    to_address: to,
                    amount: value,
                    block_number: blockNumber,
                    timestamp: block.timestamp,
                    facilitator_address: facilitatorAddress,
                    nonce: parsed.args.nonce.toString(),
                    valid_after: parsed.args.validAfter.toString(),
                    valid_before: parsed.args.validBefore.toString(),
                    authorizer: facilitatorAddress
                };

                // Save to database
                await saveTransaction(transactionData);
                this.stats.transactionsSaved++;

                logger.info(`x402 transaction saved to database`);

                // Trigger reputation updates
                // For x402: from is agent, to is service
                await this.updateReputations(from, to);
            } else {
                this.stats.errors++;
                logger.warn(`TransferWithAuthorization from unknown facilitator: ${facilitatorAddress}`);

                // Log unknown facilitators for potential addition
                if (!this.unknownFacilitators) {
                    this.unknownFacilitators = new Set();
                }
                this.unknownFacilitators.add(facilitatorAddress);
            }
        } catch (error) {
            this.stats.errors++;
            logger.error(`Error processing TransferWithAuthorization event:`, error);
        }
    }

    async updateReputations(agentAddress, serviceAddress) {
        try {
            const { calculateAgentReputation } = require('../reputation/agent-scorer');
            const { calculateServiceReputation } = require('../reputation/service-scorer');

            await Promise.all([
                calculateAgentReputation(agentAddress),
                calculateServiceReputation(serviceAddress)
            ]);
        } catch (error) {
            logger.error('Failed to update reputations:', error);
        }
    }

    logStats() {
        if (this.stats.totalBlocksChecked % 50 === 0) { // Log every 50 blocks now since we're checking larger ranges
            logger.info(`x402 Indexer Stats:`);
            logger.info(`   Blocks Checked: ${this.stats.totalBlocksChecked}`);
            logger.info(`   TransferWithAuthorization Events Found: ${this.stats.totalEventsFound}`);
            logger.info(`   Valid x402 Transactions: ${this.stats.facilitatorEventsFound}`);
            logger.info(`   Transactions Saved: ${this.stats.transactionsSaved}`);
            logger.info(`   Errors: ${this.stats.errors}`);

            if (this.unknownFacilitators && this.unknownFacilitators.size > 0) {
                logger.info(`   Unknown Facilitators: ${this.unknownFacilitators.size}`);
                logger.info(`   Unknown Addresses: ${Array.from(this.unknownFacilitators).slice(0, 3).join(', ')}...`);
            }
        }
    }

    async backfillBlocks(blocksToBackfill = 1000) {
        logger.info(`Backfilling last ${blocksToBackfill} blocks...`);

        const currentBlock = await this.provider.getBlockNumber();
        const startBlock = Math.max(0, currentBlock - blocksToBackfill);

        logger.info(`Scanning blocks ${startBlock} to ${currentBlock} in batches...`);

        let processedBlocks = 0;
        const batchSize = config.blockchain.maxBatchSize;

        for (let blockNum = startBlock; blockNum <= currentBlock; blockNum += batchSize) {
            const endBlock = Math.min(blockNum + batchSize - 1, currentBlock);
            await this.checkBlockRange(blockNum, endBlock);
            processedBlocks += (endBlock - blockNum + 1);

            // Log progress every 200 blocks
            if (processedBlocks % 200 === 0) {
                logger.info(`Backfill progress: ${processedBlocks}/${blocksToBackfill} blocks`);
            }
        }

        this.lastCheckedBlock = currentBlock;
        logger.info(`Backfill complete. Current block: ${currentBlock}`);
    }

    async refreshFacilitators() {
        try {
            logger.info('Refreshing facilitator list...');
            const facilitatorData = await getAllFacilitators();
            this.facilitators = facilitatorData.addresses;
            this.facilitatorMap = facilitatorData.facilitatorMap;
            logger.info(`Refreshed ${this.facilitators.length} facilitator addresses`);
        } catch (error) {
            logger.error('Failed to refresh facilitators:', error);
        }
    }

    stopIndexing() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        this.isRunning = false;
        logger.info('Enhanced indexer stopped');
        logger.info(`Final Stats:`, this.stats);
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            lastCheckedBlock: this.lastCheckedBlock,
            facilitatorCount: this.facilitators.length,
            stats: this.stats,
            hasUnknownFacilitators: this.unknownFacilitators ? this.unknownFacilitators.size > 0 : false,
            batchSize: config.blockchain.batchSize,
            maxBatchSize: config.blockchain.maxBatchSize,
            pollingInterval: config.blockchain.pollingInterval
        };
    }
}

// Export singleton instance
module.exports = new EnhancedIndexer();