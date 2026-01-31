/**
 * dashboard.js - Frontend JavaScript for TrustScore Dashboard
 * Handles user interactions, API calls, and UI updates
 */

// API Base URL - adjust for production
const API_BASE = window.location.origin;

/**
 * DOM Elements - Cache frequently used elements
 */
const elements = {
    addressInput: document.getElementById('address-input'),
    checkBtn: document.getElementById('check-btn'),
    resultsSection: document.getElementById('results-section'),
    addressType: document.getElementById('address-type'),
    reputationScore: document.getElementById('reputation-score'),
    trustLevel: document.getElementById('trust-level'),
    fraudFlags: document.getElementById('fraud-flags'),
    serviceMetrics: document.getElementById('service-metrics'),
    agentMetrics: document.getElementById('agent-metrics'),
    fraudSection: document.getElementById('fraud-section'),
    fraudFlagsList: document.getElementById('fraud-flags-list'),
    partnerAddress: document.getElementById('partner-address'),
    compatibilityBtn: document.getElementById('compatibility-btn'),
    compatibilityResult: document.getElementById('compatibility-result'),
    compatibilityStatus: document.getElementById('compatibility-status'),
    totalTransactions: document.getElementById('total-transactions'),
    totalServices: document.getElementById('total-services'),
    totalAgents: document.getElementById('total-agents'),
    activeFraud: document.getElementById('active-fraud'),
    walletBtn: document.getElementById('wallet-btn'),
    walletAddress: document.getElementById('wallet-address')
};

// Wallet state
let connectedWallet = null;

/**
 * Utility Functions
 */

/**
 * Connect to wallet (MetaMask or compatible provider)
 * @returns {Promise<string>} Connected wallet address
 */
async function connectWallet() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length > 0) {
                return accounts[0];
            } else {
                throw new Error('No accounts found');
            }
        } catch (error) {
            throw new Error('Failed to connect wallet: ' + error.message);
        }
    } else {
        throw new Error('No wallet provider found. Please install MetaMask or compatible wallet.');
    }
}

/**
 * Disconnect wallet
 */
function disconnectWallet() {
    connectedWallet = null;
    localStorage.removeItem('connectedWallet');
    updateWalletUI();
}

/**
 * Update wallet UI based on connection state
 */
function updateWalletUI() {
    if (connectedWallet) {
        elements.walletBtn.textContent = 'Disconnect';
        elements.walletBtn.className = 'px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500';
        elements.walletAddress.textContent = `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`;
        elements.walletAddress.classList.remove('hidden');
    } else {
        elements.walletBtn.textContent = 'Connect Wallet';
        elements.walletBtn.className = 'px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
        elements.walletAddress.classList.add('hidden');
    }
}

/**
 * Handle wallet connection button click
 */
async function handleWalletClick() {
    if (connectedWallet) {
        disconnectWallet();
    } else {
        try {
            setLoading(elements.walletBtn, 'Connecting...');
            connectedWallet = await connectWallet();
            localStorage.setItem('connectedWallet', connectedWallet);
            updateWalletUI();
        } catch (error) {
            showError(error.message);
        } finally {
            resetButton(elements.walletBtn, connectedWallet ? 'Disconnect' : 'Connect Wallet');
        }
    }
}

/**
 * Validate Ethereum address format
 * @param {string} address - Ethereum address to validate
 * @returns {boolean} True if valid address format
 */
function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Show loading state on button
 * @param {HTMLElement} button - Button element
 * @param {string} text - Loading text
 */
function setLoading(button, text = 'Loading...') {
    button.disabled = true;
    button.textContent = text;
}

/**
 * Reset button to normal state
 * @param {HTMLElement} button - Button element
 * @param {string} text - Normal text
 */
function resetButton(button, text) {
    button.disabled = false;
    button.textContent = text;
}

/**
 * Show error message to user
 * @param {string} message - Error message
 * @param {Object} details - Additional error details (optional)
 */
function showError(message, details = null) {
    // Create user-friendly error messages
    let userMessage = message;

    if (message.includes('Address not found')) {
        userMessage = 'This address has not been indexed yet. Addresses are added to the database after they participate in x402 transactions on Base network.';
    } else if (message.includes('Payment Required')) {
        userMessage = 'This endpoint requires x402 payment. Connect your wallet to make payment or use free tier (10 checks/month).';
        if (details && details.pricingInfo) {
            userMessage += `\n\nPricing: ${details.pricingInfo.amount}\nFree Tier Remaining: ${details.pricingInfo.freeTier.remaining}/${details.pricingInfo.freeTier.limit} checks`;
        }
    }

    // Simple alert for now - could be enhanced with toast notifications
    alert(userMessage);
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    return num.toLocaleString();
}

/**
 * Format currency (USDC)
 * @param {number} amount - Amount in USDC
 * @returns {string} Formatted currency
 */
function formatCurrency(amount) {
    return `$${amount.toFixed(2)} USDC`;
}

/**
 * Get trust level color class
 * @param {string} level - Trust level
 * @returns {string} Tailwind CSS classes
 */
function getTrustLevelColor(level) {
    const colors = {
        'excellent': 'text-green-600 bg-green-100',
        'high': 'text-blue-600 bg-blue-100',
        'medium': 'text-yellow-600 bg-yellow-100',
        'low': 'text-orange-600 bg-orange-100',
        'untrusted': 'text-red-600 bg-red-100'
    };
    return colors[level.toLowerCase()] || 'text-gray-600 bg-gray-100';
}

/**
 * API Functions
 */

/**
 * Make API request with error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Additional options for the request
 * @returns {Promise<Object>} API response data
 */
async function apiRequest(endpoint, options = {}) {
    try {
        // Use connected wallet or fallback to random wallet for demo
        const walletAddress = connectedWallet || '0x' + Math.random().toString(16).substr(2, 40);
        const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);

        // Add wallet as query parameter for free tier
        url.searchParams.set('wallet', walletAddress);

        // Add recalculate flag if needed
        if (options.recalculate) {
            url.searchParams.set('recalculate', 'true');
        }

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!response.ok) {
            // Handle payment required response
            if (response.status === 402) {
                data.paymentRequired = true;
                data.pricingInfo = {
                    amount: '0.01 USDC',
                    recipient: 'TrustScore Payment Wallet',
                    network: 'Base',
                    freeTier: {
                        limit: 10,
                        used: data.freeTier?.used || 0,
                        remaining: data.freeTier?.remaining || 10
                    }
                };
            }
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

/**
 * Check reputation for an address
 * @param {string} address - Ethereum address
 * @returns {Promise<Object>} Reputation data
 */
async function checkReputation(address) {
    // Try one-time payment endpoint first (better value for users)
    try {
        const serviceData = await apiRequest(`/api/reputation/onetime/${address}`);
        return { type: 'service', data: serviceData };
    } catch (error) {
        // If not a service, try free agent endpoint
        try {
            const agentData = await apiRequest(`/api/reputation/agent/${address}`);
            return { type: 'agent', data: agentData };
        } catch (error) {
            throw new Error('Address not found in TrustScore database');
        }
    }
}

/**
 * Check fraud status for an address
 * @param {string} address - Ethereum address
 * @returns {Promise<Object>} Fraud data
 */
async function checkFraud(address) {
    return await apiRequest(`/api/fraud/check/${address}`);
}

/**
 * Check trust compatibility between addresses
 * @param {string} address1 - First address
 * @param {string} address2 - Second address
 * @returns {Promise<Object>} Compatibility data
 */
async function checkCompatibility(address1, address2) {
    return await apiRequest(`/api/reputation/trust-check?service=${address1}&agent=${address2}`);
}

/**
 * Get platform statistics
 * @returns {Promise<Object>} Platform stats
 */
async function getPlatformStats() {
    return await apiRequest('/api/stats');
}

/**
 * UI Update Functions
 */

/**
 * Update reputation display
 * @param {Object} reputation - Reputation data
 * @param {string} type - 'service' or 'agent'
 */
function updateReputationDisplay(reputation, type) {
    elements.reputationScore.textContent = reputation.reputationScore || '--';
    elements.trustLevel.textContent = reputation.trustLevel || '--';
    elements.trustLevel.className = `px-3 py-1 text-sm font-medium rounded-full ${getTrustLevelColor(reputation.trustLevel || 'medium')}`;

    // Show free tier notification if applicable
    if (reputation.freeTier) {
        // Add a small notification that this is a free tier check
        const freeTierNote = document.createElement('div');
        freeTierNote.className = 'mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700';
        freeTierNote.innerHTML = '📊 Using Free Tier - Basic reputation data (10 checks/month)';

        // Insert after the address type
        elements.addressType.parentNode.insertBefore(freeTierNote, elements.addressType.nextSibling);
    }

    // Show relevant metrics section
    if (type === 'service') {
        elements.serviceMetrics.classList.remove('hidden');
        elements.agentMetrics.classList.add('hidden');

        // Update service metrics
        document.getElementById('service-transactions').textContent = formatNumber(reputation.totalTransactions || 0);
        document.getElementById('service-volume').textContent = formatCurrency(reputation.totalVolume || 0);
        document.getElementById('service-payers').textContent = formatNumber(reputation.uniquePayers || 0);
        document.getElementById('service-age').textContent = `${reputation.accountAgeDays || 0} days`;
    } else {
        elements.agentMetrics.classList.remove('hidden');
        elements.serviceMetrics.classList.add('hidden');

        // Update agent metrics
        document.getElementById('agent-payments').textContent = formatNumber(reputation.totalPayments || 0);
        document.getElementById('agent-spent').textContent = formatCurrency(reputation.totalSpent || 0);
        document.getElementById('agent-services').textContent = formatNumber(reputation.uniqueServices || 0);
        document.getElementById('agent-age').textContent = `${reputation.accountAgeDays || 0} days`;
    }
}

/**
 * Update fraud flags display
 * @param {Array} fraudFlags - Array of fraud flags
 */
function updateFraudDisplay(fraudFlags) {
    elements.fraudFlags.textContent = fraudFlags.length;

    if (fraudFlags.length > 0) {
        elements.fraudSection.classList.remove('hidden');
        elements.fraudFlagsList.innerHTML = '';

        fraudFlags.forEach(flag => {
            const flagElement = document.createElement('div');
            flagElement.className = 'p-3 bg-red-50 border border-red-200 rounded-md';
            flagElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <span class="font-medium text-red-800">${flag.type.replace('_', ' ').toUpperCase()}</span>
                        <span class="ml-2 text-sm text-red-600">Severity: ${flag.severity}/10</span>
                    </div>
                    <span class="text-sm text-gray-500">${new Date(flag.createdAt).toLocaleDateString()}</span>
                </div>
                <p class="text-sm text-red-700 mt-1">${flag.details || 'No additional details'}</p>
            `;
            elements.fraudFlagsList.appendChild(flagElement);
        });
    } else {
        elements.fraudSection.classList.add('hidden');
    }
}

/**
 * Update compatibility result display
 * @param {Object} result - Compatibility check result
 */
function updateCompatibilityDisplay(result) {
    elements.compatibilityResult.classList.remove('hidden');

    let statusClass, statusText;
    if (result.recommended) {
        statusClass = 'bg-green-50 border-green-200 text-green-800';
        statusText = ' RECOMMENDED - Both parties are trustworthy';
    } else {
        statusClass = 'bg-red-50 border-red-200 text-red-800';
        statusText = ' NOT RECOMMENDED - Trust issues detected';
    }

    elements.compatibilityStatus.className = `p-4 rounded-md border ${statusClass}`;
    elements.compatibilityStatus.innerHTML = `
        <div class="font-medium mb-2">${statusText}</div>
        <div class="text-sm space-y-1">
            <div>Risk Level: <span class="font-medium">${result.riskLevel || 'Unknown'}</span></div>
            <div>Compatibility Score: <span class="font-medium">${result.compatibilityScore || 0}/100</span></div>
            ${result.warnings ? `<div>Warnings: ${result.warnings.join(', ')}</div>` : ''}
        </div>
    `;
}

/**
 * Update platform statistics display
 * @param {Object} stats - Platform statistics
 */
function updatePlatformStats(stats) {
    elements.totalTransactions.textContent = formatNumber(stats.totalTransactions || 0);
    elements.totalServices.textContent = formatNumber(stats.totalServices || 0);
    elements.totalAgents.textContent = formatNumber(stats.totalAgents || 0);
    elements.activeFraud.textContent = formatNumber(stats.activeFraudFlags || 0);
}

/**
 * Event Handlers
 */

/**
 * Handle address check button click
 */
async function handleCheckAddress() {
    const address = elements.addressInput.value.trim();

    if (!address) {
        showError('Please enter an Ethereum address');
        return;
    }

    if (!isValidAddress(address)) {
        showError('Please enter a valid Ethereum address (0x...)');
        return;
    }

    setLoading(elements.checkBtn, 'Checking...');

    try {
        // Check reputation
        const reputationResult = await checkReputation(address);

        // Check fraud status
        const fraudResult = await checkFraud(address);

        // Update UI
        elements.addressType.textContent = reputationResult.type.toUpperCase();
        updateReputationDisplay(reputationResult.data, reputationResult.type);
        updateFraudDisplay(fraudResult.activeFlags || []);

        // Show results
        elements.resultsSection.classList.remove('hidden');
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        showError(error.message);
    } finally {
        resetButton(elements.checkBtn, 'Check Reputation');
    }
}

/**
 * Handle compatibility check button click
 */
async function handleCompatibilityCheck() {
    const mainAddress = elements.addressInput.value.trim();
    const partnerAddress = elements.partnerAddress.value.trim();

    if (!mainAddress || !partnerAddress) {
        showError('Please enter both addresses');
        return;
    }

    if (!isValidAddress(mainAddress) || !isValidAddress(partnerAddress)) {
        showError('Please enter valid Ethereum addresses');
        return;
    }

    setLoading(elements.compatibilityBtn, 'Checking...');

    try {
        const result = await checkCompatibility(mainAddress, partnerAddress);
        updateCompatibilityDisplay(result);
    } catch (error) {
        showError(error.message);
    } finally {
        resetButton(elements.compatibilityBtn, 'Check Compatibility');
    }
}

/**
 * Load platform statistics on page load
 */
async function loadPlatformStats() {
    try {
        const stats = await getPlatformStats();
        updatePlatformStats(stats);
    } catch (error) {
        console.error('Failed to load platform stats:', error);
    }
}

/**
 * Initialize the dashboard
 */
function init() {
    // Restore wallet connection from localStorage
    const savedWallet = localStorage.getItem('connectedWallet');
    if (savedWallet) {
        connectedWallet = savedWallet;
    }

    // Update wallet UI
    updateWalletUI();

    // Set up event listeners
    elements.walletBtn.addEventListener('click', handleWalletClick);
    elements.checkBtn.addEventListener('click', handleCheckAddress);
    elements.compatibilityBtn.addEventListener('click', handleCompatibilityCheck);

    // Allow Enter key to trigger check
    elements.addressInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCheckAddress();
        }
    });

    elements.partnerAddress.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCompatibilityCheck();
        }
    });

    // Load initial data
    loadPlatformStats();

    // Auto-refresh stats every 30 seconds
    setInterval(loadPlatformStats, 30000);

    console.log('TrustScore Dashboard initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
