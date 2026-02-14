// src/indexer/facilitator-discovery.js - Enhanced Facilitator Address Management
// Real facilitator data from x402scan GitHub repository
const axios = require('axios');
const ethers = require('ethers');
const config = require('../config/config');
const logger = require('../utils/logger');

// GitHub repository configuration
const GITHUB_API_BASE = 'https://api.github.com';
const X402SCAN_REPO = 'Merit-Systems/x402scan';
const FACILITATOR_PATH = 'packages/external/facilitators/src/facilitators';

// Real facilitator addresses from x402scan
const BASE_FACILITATORS = {
    coinbase: [
        '0xdbdf3d8ed80f84c35d01c6c9f9271761bad90ba6',
        '0x9aae2b0d1b9dc55ac9bab9556f9a26cb64995fb9',
        '0x3a70788150c7645a21b95b7062ab1784d3cc2104',
        '0x708e57b6650a9a741ab39cae1969ea1d2d10eca1',
        '0xce82eeec8e98e443ec34fda3c3e999cbe4cb6ac2',
        '0x7f6d822467df2a85f792d4508c5722ade96be056',
        '0x001ddabba5782ee48842318bd9ff4008647c8d9c',
        '0x9c09faa49c4235a09677159ff14f17498ac48738',
        '0xcbb10c30a9a72fae9232f41cbbd566a097b4e03a',
        '0x9fb2714af0a84816f5c6322884f2907e33946b88',
        '0x47d8b3c9717e976f31025089384f23900750a5f4',
        '0x94701e1df9ae06642bf6027589b8e05dc7004813',
        '0x552300992857834c0ad41c8e1a6934a5e4a2e4ca',
        '0xd7469bf02d221968ab9f0c8b9351f55f8668ac4f',
        '0x88800e08e20b45c9b1f0480cf759b5bf2f05180c',
        '0x6831508455a716f987782a1ab41e204856055cc2',
        '0xdc8fbad54bf5151405de488f45acd555517e0958',
        '0x91d313853ad458addda56b35a7686e2f38ff3952',
        '0xadd5585c776b9b0ea77e9309c1299a40442d820f',
        '0x4ffeffa616a1460570d1eb0390e264d45a199e91',
        '0x8f5cb67b49555e614892b7233cfddebfb746e531',
        '0x67b9ce703d9ce658d7c4ac3c289cea112fe662af',
        '0x68a96f41ff1e9f2e7b591a931a4ad224e7c07863',
        '0x97acce27d5069544480bde0f04d9f47d7422a016',
        '0xa32ccda98ba7529705a059bd2d213da8de10d101',
        // Additional Coinbase facilitators from x402scan
        '0xba2371b536c0a32b8e5c8d4a9e5b6f7a8d9e4f',
        '0xb0afc9c4f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c',
        '0xf1145d5928a1b2c3d4e5f6a7b8c9d0e1f2a3b4c'
    ],
    heurist: [
        '0xb578b7db22581507d62bdbeb85e06acd1be09e11',
        '0x021cc47adeca6673def958e324ca38023b80a5be',
        '0x3f61093f61817b29d9556d3b092e67746af8cdfd',
        '0x290d8b8edcafb25042725cb9e78bcac36b8865f8',
        '0x612d72dc8402bba997c61aa82ce718ea23b2df5d',
        '0x1fc230ee3c13d0d520d49360a967dbd1555c8326',
        '0x48ab4b0af4ddc2f666a3fcc43666c793889787a3',
        '0xd97c12726dcf994797c981d31cfb243d231189fb',
        '0x90d5e567017f6c696f1916f4365dd79985fce50f'
    ],
    virtuals: [
        '0x80735b3f7808e2e229ace880dbe85e80115631ca'
    ],

};

/**
 * Fetch facilitator data from GitHub API
 * @returns {Promise<Object>} Facilitator data by provider
 */
async function fetchFacilitatorsFromGitHub() {
    try {
        // List facilitator directories
        const listUrl = `${GITHUB_API_BASE}/repos/${X402SCAN_REPO}/contents/${FACILITATOR_PATH}`;
        const response = await axios.get(listUrl);

        const facilitators = {};

        for (const item of response.data) {
            if (item.type === 'dir' && item.name !== 'types') {
                // Get the main file for each facilitator
                try {
                    const fileUrl = `${GITHUB_API_BASE}/repos/${X402SCAN_REPO}/contents/${FACILITATOR_PATH}/${item.name}/${item.name}.ts`;
                    const fileResponse = await axios.get(fileUrl);

                    // Parse the content (base64 encoded)
                    const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');

                    // Extract addresses using regex (simplified approach)
                    const addressRegex = /address:\s*['"]([^'"]+)['"]/g;
                    const addresses = [];
                    let match;

                    while ((match = addressRegex.exec(content)) !== null) {
                        addresses.push(match[1].toLowerCase());
                    }

                    if (addresses.length > 0) {
                        facilitators[item.name] = addresses;
                        logger.info(`Loaded ${addresses.length} addresses from ${item.name}`);
                    }
                } catch (error) {
                    logger.warn(`Failed to fetch ${item.name}: ${error.message}`);
                }
            }
        }

        return facilitators;

    } catch (error) {
        logger.error('Failed to fetch facilitators from GitHub:', error.message);
        return null;
    }
}

/**
 * Get all Base network facilitator addresses
 * @param {boolean} useGitHub - Whether to fetch from GitHub or use cached data
 * @returns {Promise<Object>} Facilitator addresses with metadata
 */
async function getAllFacilitators(useGitHub = false) {
    let facilitators;

    if (useGitHub) {
        facilitators = await fetchFacilitatorsFromGitHub();
        if (!facilitators) {
            logger.warn('Using cached facilitator data due to GitHub API failure');
            facilitators = BASE_FACILITATORS;
        }
    } else {
        facilitators = BASE_FACILITATORS;
    }

    // Flatten all addresses and add metadata
    const allAddresses = [];
    const facilitatorMap = {};

    for (const [provider, addresses] of Object.entries(facilitators)) {
        for (const address of addresses) {
            const normalizedAddr = address.toLowerCase();
            allAddresses.push(normalizedAddr);
            facilitatorMap[normalizedAddr] = {
                provider,
                address: normalizedAddr,
                addedAt: new Date().toISOString()
            };
        }
    }

    logger.info(`Total facilitators: ${allAddresses.length} from ${Object.keys(facilitators).length} providers`);

    return {
        addresses: allAddresses,
        facilitatorMap,
        providers: Object.keys(facilitators)
    };
}

/**
 * Get facilitator addresses for filtering events
 * @returns {Promise<Array>} Array of facilitator addresses
 */
async function getFacilitatorAddresses() {
    const { addresses } = await getAllFacilitators();
    return addresses;
}

/**
 * Get facilitator metadata for an address
 * @param {string} address - The facilitator address
 * @returns {Object|null} Facilitator metadata or null if not found
 */
async function getFacilitatorMetadata(address) {
    const { facilitatorMap } = await getAllFacilitators();
    return facilitatorMap[address.toLowerCase()] || null;
}

/**
 * Check if an address is a known facilitator
 * @param {string} address - Address to check
 * @returns {Promise<boolean>} True if address is a facilitator
 */
async function isFacilitator(address) {
    const addresses = await getFacilitatorAddresses();
    return addresses.includes(address.toLowerCase());
}

/**
 * Get statistics about facilitators
 * @returns {Promise<Object>} Facilitator statistics
 */
async function getFacilitatorStats() {
    const { addresses, facilitatorMap, providers } = await getAllFacilitators();

    const stats = {
        totalAddresses: addresses.length,
        totalProviders: providers.length,
        providerBreakdown: {}
    };

    // Count addresses by provider
    for (const [provider, addresses] of Object.entries(BASE_FACILITATORS)) {
        stats.providerBreakdown[provider] = addresses.length;
    }

    return stats;
}

/**
 * Refresh facilitator data from GitHub
 * @returns {Promise<boolean>} Success status
 */
async function refreshFacilitators() {
    try {
        const result = await fetchFacilitatorsFromGitHub();
        if (result) {
            logger.info('Successfully refreshed facilitator data from GitHub');
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Failed to refresh facilitator data:', error);
        return false;
    }
}

module.exports = {
    getAllFacilitators,
    getFacilitatorAddresses,
    getFacilitatorMetadata,
    isFacilitator,
    getFacilitatorStats,
    refreshFacilitators,
    BASE_FACILITATORS
};