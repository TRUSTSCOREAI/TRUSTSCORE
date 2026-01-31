// src/indexer/x402-indexer.js - X402 Transaction Indexer
const ethers = require('ethers');
const { getDatabase } = require('../db/database');
const { saveTransaction } = require('../db/queries');
const { getFacilitatorAddresses, isFacilitator } = require('./facilitator-discovery');
const config = require('../config/config');
const logger = require('../utils/logger');

class X402Indexer {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
        this.usdcAddress = config.blockchain.usdcContract;
        this.facilitators = [];
        this.usdcContract = null;
        this.eventListener = null;
        this.isRunning = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
    }

    async initialize() {
        // Get facilitator addresses
        this.facilitators = await getFacilitatorAddresses();
        this.setupUSDCContract();
        logger.info(`Initialized indexer with ${this.facilitators.length} facilitators`);
    }

    setupUSDCContract() {
        const abi = ['event TransferWithAuthorization(address indexed from, address indexed to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 indexed nonce, address authorizer)'];
        this.usdcContract = new ethers.Contract(this.usdcAddress, abi, this.provider);
    }

    async startIndexing(fromBlock = 'latest') {
        if (this.isRunning) {
            logger.warn('X402 indexer is already running');
            return;
        }

        logger.info('Starting X402 indexer...');
        this.isRunning = true;
        await this.setupEventListener();
    }

    async setupEventListener() {
        try {
            // Remove any existing listener
            if (this.eventListener) {
                this.usdcContract.removeAllListeners('TransferWithAuthorization');
                this.eventListener = null;
            }

            // Override the provider's getFilterChanges to catch filter errors
            const originalGetFilterChanges = this.provider.getFilterChanges.bind(this.provider);
            this.provider.getFilterChanges = async (filterId) => {
                try {
                    return await originalGetFilterChanges(filterId);
                } catch (error) {
                    if (error.code === -32000 && error.message?.includes('filter not found')) {
                        logger.warn('Filter expired detected, attempting to recreate event listener...');
                        await this.handleProviderError(error);
                        // Return empty array to prevent immediate retry
                        return [];
                    }
                    throw error; // Re-throw other errors
                }
            };

            // Create new event listener with error handling
            this.eventListener = this.usdcContract.on('TransferWithAuthorization',
                async (from, to, value, validAfter, validBefore, nonce, authorizer, event) => {
                    try {
                        if (isFacilitator(authorizer)) {
                            await this.processTransaction({
                                txHash: event.transactionHash,
                                fromAddress: from,
                                toAddress: to,
                                amount: ethers.formatUnits(value, 6), // USDC 6 decimals
                                blockNumber: event.blockNumber,
                                timestamp: (await event.getBlock()).timestamp,
                                facilitatorAddress: authorizer,
                                nonce: nonce.toString(),
                                validAfter: validAfter.toString(),
                                validBefore: validBefore.toString(),
                                authorizer
                            });
                        }
                    } catch (error) {
                        logger.error('Error processing TransferWithAuthorization event:', error);
                    }
                }
            );

            // Handle provider errors
            this.provider.on('error', (error) => {
                logger.error('Provider error:', error);
                this.handleProviderError(error);
            });

            logger.info('X402 event listener setup completed');

        } catch (error) {
            logger.error('Failed to setup X402 event listener:', error);
            await this.handleProviderError(error);
        }
    }

    async handleProviderError(error) {
        // Check if it's a filter-related error
        if (error.code === -32000 && error.message?.includes('filter not found')) {
            logger.warn('Filter expired, attempting to recreate event listener...');

            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                logger.info(`Retrying event listener setup (attempt ${this.retryCount}/${this.maxRetries})`);

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));

                try {
                    await this.setupEventListener();
                    this.retryCount = 0; // Reset retry count on success
                    logger.info('Event listener successfully recreated');
                } catch (retryError) {
                    logger.error(`Retry ${this.retryCount} failed:`, retryError);
                    if (this.retryCount >= this.maxRetries) {
                        logger.error('Max retries reached, stopping indexer');
                        this.stopIndexing();
                    }
                }
            } else {
                logger.error('Max retries reached, stopping indexer');
                this.stopIndexing();
            }
        } else {
            logger.error('Unhandled provider error:', error);
        }
    }

    async processTransaction(tx) {
        try {
            await saveTransaction(tx);
            logger.info(`Indexed X402 transaction: ${tx.txHash} from facilitator ${tx.facilitatorAddress}`);

            // Trigger reputation updates
            await this.updateReputations(tx.fromAddress, tx.toAddress);
        } catch (error) {
            logger.error('Failed to process transaction:', error);
        }
    }

    async updateReputations(agentAddress, serviceAddress) {
        try {
            const { calculateAgentReputation } = require('../reputation/agent-scorer');
            const { calculateServiceReputation } = require('../reputation/service-scorer');

            await calculateAgentReputation(agentAddress);
            await calculateServiceReputation(serviceAddress);
        } catch (error) {
            logger.error('Failed to update reputations:', error);
        }
    }

    // Refresh facilitators periodically
    async refreshFacilitators() {
        try {
            const newFacilitators = await getFacilitatorAddresses(); // Recent activity
            if (JSON.stringify(newFacilitators.sort()) !== JSON.stringify(this.facilitators.sort())) {
                this.facilitators = newFacilitators;
                logger.info('Refreshed facilitator list');

                // Recreate event listener with new facilitator list
                if (this.isRunning) {
                    await this.setupEventListener();
                }
            }
        } catch (error) {
            logger.error('Failed to refresh facilitators:', error);
        }
    }

    stopIndexing() {
        if (this.eventListener) {
            this.usdcContract.removeAllListeners('TransferWithAuthorization');
            this.eventListener = null;
        }

        if (this.provider) {
            this.provider.removeAllListeners('error');
        }

        this.isRunning = false;
        this.retryCount = 0;
        logger.info('X402 indexer stopped');
    }

    async startPollingIndexing() {
        if (this.isRunning) {
            logger.warn('X402 indexer is already running');
            return;
        }

        logger.info('Starting X402 indexer with enhanced polling approach...');
        this.isRunning = true;

        try {
            this.lastCheckedBlock = await this.provider.getBlockNumber();
            logger.info(`Starting from block ${this.lastCheckedBlock}`);
        } catch (error) {
            logger.error('Failed to get current block number:', error);
            this.lastCheckedBlock = 0;
        }

        // Start polling every 15 seconds to avoid rate limits
        this.pollingInterval = setInterval(async () => {
            try {
                await this.pollForNewTransactions();
            } catch (error) {
                logger.error('Error in polling loop:', error);
                // Don't let polling errors crash the indexer
            }
        }, 15000);

        logger.info('X402 enhanced polling indexer started - monitoring USDC TransferWithAuthorization events');
    }

    async pollForNewTransactions() {
        try {
            const currentBlock = await this.provider.getBlockNumber();

            if (currentBlock > this.lastCheckedBlock) {
                // Check blocks from lastCheckedBlock + 1 to currentBlock
                for (let blockNumber = this.lastCheckedBlock + 1; blockNumber <= currentBlock; blockNumber++) {
                    await this.checkBlockForX402Transactions(blockNumber);
                }
                this.lastCheckedBlock = currentBlock;
            }
        } catch (error) {
            logger.error('Error polling for transactions:', error);
        }
    }

    async checkBlockForX402Transactions(blockNumber) {
        try {
            const block = await this.provider.getBlock(blockNumber);
            if (!block) return;

            // Query TransferWithAuthorization events from USDC contract
            const logs = await this.provider.getLogs({
                fromBlock: blockNumber,
                toBlock: blockNumber,
                address: this.usdcAddress,
                topics: [ethers.id('TransferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,address)')]
            });

            for (const log of logs) {
                try {
                    const parsed = this.parseTransferWithAuthEvent(log);
                    if (parsed && this.facilitators.includes(parsed.authorizer)) {
                        await this.processTransaction({
                            txHash: log.transactionHash,
                            fromAddress: parsed.from,
                            toAddress: parsed.to,
                            amount: ethers.formatUnits(parsed.value, 6), // USDC 6 decimals
                            blockNumber: log.blockNumber,
                            timestamp: block.timestamp,
                            facilitatorAddress: parsed.authorizer,
                            nonce: parsed.nonce,
                            validAfter: parsed.validAfter.toString(),
                            validBefore: parsed.validBefore.toString(),
                            authorizer: parsed.authorizer
                        });
                    }
                } catch (error) {
                    logger.error('Error processing log:', error);
                }
            }
        } catch (error) {
            // Handle rate limit errors gracefully
            if (error.code === -32016 && error.message?.includes('over rate limit')) {
                logger.warn(`Rate limit hit checking block ${blockNumber}, will retry in next cycle`);
                return; // Skip this block, will try again in next polling cycle
            }
            logger.error(`Error checking block ${blockNumber}:`, error);
        }
    }

    parseTransferWithAuthEvent(log) {
        try {
            const iface = new ethers.Interface(['event TransferWithAuthorization(address indexed from, address indexed to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 indexed nonce, address authorizer)']);
            const parsed = iface.parseLog(log);

            return {
                from: parsed.args.from.toLowerCase(),
                to: parsed.args.to.toLowerCase(),
                value: parsed.args.value,
                validAfter: parsed.args.validAfter,
                validBefore: parsed.args.validBefore,
                nonce: parsed.args.nonce,
                authorizer: parsed.args.authorizer.toLowerCase()
            };
        } catch (error) {
            logger.error('Failed to parse TransferWithAuthorization event:', error);
            return null;
        }
    }

    stopPollingIndexing() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        this.isRunning = false;
        logger.info('X402 polling indexer stopped');
    }

    // Get indexer status
    getStatus() {
        return {
            isRunning: this.isRunning,
            facilitatorCount: this.facilitators.length,
            retryCount: this.retryCount,
            hasEventListener: !!this.eventListener,
            lastCheckedBlock: this.lastCheckedBlock,
            pollingActive: !!this.pollingInterval
        };
    }
}

module.exports = new X402Indexer();
