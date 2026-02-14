/**
 * enhanced-dashboard.js - Enhanced Frontend JavaScript for TrustScore Dashboard
 * Handles user interactions, API calls, and UI updates with advanced features
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
 */
function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Show loading state on button
 */
function setLoading(button, text = 'Loading...') {
    button.disabled = true;
    button.textContent = text;
}

/**
 * Reset button to normal state
 */
function resetButton(button, text) {
    button.disabled = false;
    button.textContent = text;
}

/**
 * Show error message to user
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

    // Create enhanced error notification
    showNotification(userMessage, 'error', 5000);
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';

    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
    notification.innerHTML = `
        <div class="flex items-center">
            <span class="mr-2">${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Slide in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
        notification.classList.add('translate-x-0');
    }, 100);

    // Remove after duration
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, duration);
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toLocaleString();
}

/**
 * Format currency (USDC)
 */
function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2)} USDC`;
}

/**
 * Get trust level color class
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
 * Create progress bar for score breakdown
 */
function createProgressBar(score, maxScore, label, colorClass = 'bg-blue-500') {
    const percentage = Math.min((score / maxScore) * 100, 100);
    const scoreColor = percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-blue-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500';

    return `
        <div class="mb-3">
            <div class="flex justify-between items-center mb-1">
                <span class="text-sm text-gray-600">${label}</span>
                <span class="text-sm font-medium">${score}/${maxScore}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="${scoreColor} h-2 rounded-full transition-all duration-500 ease-out" 
                     style="width: 0%" data-target-width="${percentage}%"></div>
            </div>
        </div>
    `;
}

/**
 * Animate progress bars
 */
function animateProgressBars() {
    const progressBars = document.querySelectorAll('[data-target-width]');
    progressBars.forEach((bar, index) => {
        setTimeout(() => {
            bar.style.width = bar.dataset.targetWidth;
        }, index * 100);
    });
}

/**
 * API Functions
 */

/**
 * Make API request with error handling
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
 * Get transaction history for an address
 */
async function getTransactionHistory(address, limit = 10, type = null) {
    const url = `/api/transactions/${address}?limit=${limit}`;
    if (type) {
        return await apiRequest(`${url}&type=${type}`);
    }
    return await apiRequest(url);
}

/**
 * Analyze fraud patterns for an address
 */
async function analyzeFraudPatterns(address) {
    try {
        return await apiRequest(`/api/fraud/analyze/${address}`);
    } catch (error) {
        // If payment required, fall back to basic status
        if (error.message.includes('Payment Required')) {
            return await apiRequest(`/api/fraud/status/${address}`);
        }
        throw error;
    }
}

/**
 * Check reputation for an address
 */
async function checkReputation(address) {
    const addressType = document.querySelector('input[name="address-type"]:checked').value;

    // Try one-time payment endpoint first (better value for users)
    try {
        const serviceData = await apiRequest(`/api/reputation/onetime/${address}`);
        return { type: 'service', data: serviceData };
    } catch (error) {
        // If not a service, try appropriate endpoint based on selection
        try {
            if (addressType === 'agent') {
                const agentData = await apiRequest(`/api/reputation/agent/${address}`);
                return { type: 'agent', data: agentData };
            } else if (addressType === 'service') {
                const serviceData = await apiRequest(`/api/reputation/service/${address}`);
                return { type: 'service', data: serviceData };
            } else {
                // Auto-detect: try service first, then agent
                try {
                    const serviceData = await apiRequest(`/api/reputation/free/${address}`);
                    if (serviceData.totalTransactions > 0) {
                        return { type: 'service', data: serviceData };
                    } else {
                        const agentData = await apiRequest(`/api/reputation/agent/${address}`);
                        return { type: 'agent', data: agentData };
                    }
                } catch (autoError) {
                    const agentData = await apiRequest(`/api/reputation/agent/${address}`);
                    return { type: 'agent', data: agentData };
                }
            }
        } catch (error) {
            throw new Error('Address not found in TrustScore database');
        }
    }
}

/**
 * Check fraud status for an address
 */
async function checkFraud(address) {
    return await apiRequest(`/api/fraud/check/${address}`);
}

/**
 * Check trust compatibility between addresses
 */
async function checkCompatibility(address1, address2) {
    return await apiRequest(`/api/reputation/trust-check?service=${address1}&agent=${address2}`);
}

/**
 * Get platform statistics
 */
async function getPlatformStats() {
    return await apiRequest('/api/stats');
}

/**
 * UI Update Functions
 */

/**
 * Update reputation display with enhanced breakdown
 */
function updateReputationDisplay(reputation, type) {
    elements.reputationScore.textContent = reputation.reputationScore || '--';
    elements.trustLevel.textContent = reputation.trustLevel || '--';
    elements.trustLevel.className = `px-3 py-1 text-sm font-medium rounded-full ${getTrustLevelColor(reputation.trustLevel || 'medium')}`;

    // Calculate and display score breakdown
    const breakdown = calculateScoreBreakdown(reputation, type);
    displayReputationBreakdown(breakdown);

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
 * Calculate score breakdown components
 */
function calculateScoreBreakdown(reputation, type) {
    const baseScore = reputation.reputationScore || 0;

    if (type === 'service') {
        const totalTx = reputation.totalTransactions || 0;
        const volume = parseFloat(reputation.totalVolume || 0);
        const uniquePayers = reputation.uniquePayers || 0;
        const accountAge = reputation.accountAgeDays || 0;

        return {
            transactionVolume: {
                score: Math.min(30, Math.floor(totalTx / 10)),
                maxScore: 30,
                label: 'Transaction Volume'
            },
            revenueHistory: {
                score: Math.min(20, Math.floor(volume / 50)),
                maxScore: 20,
                label: 'Revenue History'
            },
            customerDiversity: {
                score: Math.min(15, Math.floor(uniquePayers / 5)),
                maxScore: 15,
                label: 'Customer Diversity'
            },
            accountAge: {
                score: Math.min(15, Math.floor(accountAge / 30)),
                maxScore: 15,
                label: 'Account Age'
            },
            recentActivity: {
                score: Math.min(10, baseScore >= 70 ? 10 : baseScore >= 50 ? 8 : baseScore >= 30 ? 5 : 2),
                maxScore: 10,
                label: 'Recent Activity'
            }
        };
    } else {
        // Agent breakdown
        const payments = reputation.totalPayments || 0;
        const spent = parseFloat(reputation.totalSpent || 0);
        const services = reputation.uniqueServices || 0;
        const accountAge = reputation.accountAgeDays || 0;

        return {
            paymentReliability: {
                score: Math.min(25, Math.floor(payments / 5)),
                maxScore: 25,
                label: 'Payment Reliability'
            },
            totalSpent: {
                score: Math.min(25, Math.floor(spent / 100)),
                maxScore: 25,
                label: 'Total Spent'
            },
            serviceDiversity: {
                score: Math.min(25, Math.floor(services / 3)),
                maxScore: 25,
                label: 'Service Diversity'
            },
            accountAge: {
                score: Math.min(15, Math.floor(accountAge / 30)),
                maxScore: 15,
                label: 'Account Age'
            },
            trustScore: {
                score: Math.min(10, baseScore >= 80 ? 10 : baseScore >= 60 ? 7 : baseScore >= 40 ? 4 : 2),
                maxScore: 10,
                label: 'Trust Score'
            }
        };
    }
}

/**
 * Display reputation breakdown with animated progress bars
 */
function displayReputationBreakdown(breakdown) {
    // Create breakdown section if it doesn't exist
    let breakdownSection = document.getElementById('reputation-breakdown');
    if (!breakdownSection) {
        breakdownSection = document.createElement('div');
        breakdownSection.id = 'reputation-breakdown';
        breakdownSection.className = 'bg-white rounded-lg shadow-sm p-6 mb-6';

        const title = document.createElement('h4');
        title.className = 'text-md font-semibold text-gray-900 mb-4';
        title.textContent = 'Reputation Score Breakdown';

        breakdownSection.appendChild(title);

        // Insert after the address info section
        const addressInfo = document.querySelector('.bg-white.rounded-lg.shadow-sm.p-6.mb-6');
        addressInfo.parentNode.insertBefore(breakdownSection, addressInfo.nextSibling);
    }

    // Clear existing content (except title)
    const title = breakdownSection.querySelector('h4');
    breakdownSection.innerHTML = '';
    breakdownSection.appendChild(title);

    // Create progress bars
    const progressContainer = document.createElement('div');
    progressContainer.className = 'space-y-2';

    Object.entries(breakdown).forEach(([key, component]) => {
        progressContainer.innerHTML += createProgressBar(
            component.score,
            component.maxScore,
            component.label
        );
    });

    breakdownSection.appendChild(progressContainer);

    // Animate progress bars after a short delay
    setTimeout(animateProgressBars, 100);
}

/**
 * Update transaction history display
 */
function updateTransactionHistory(transactions, accountType) {
    // Create transaction history section if it doesn't exist
    let transactionSection = document.getElementById('transaction-history');
    if (!transactionSection) {
        transactionSection = document.createElement('div');
        transactionSection.id = 'transaction-history';
        transactionSection.className = 'bg-white rounded-lg shadow-sm p-6 mb-6';

        const title = document.createElement('h4');
        title.className = 'text-md font-semibold text-gray-900 mb-4';
        title.textContent = 'Recent Transactions (Last 10)';

        transactionSection.appendChild(title);

        // Insert after the reputation breakdown
        const breakdownSection = document.getElementById('reputation-breakdown');
        breakdownSection.parentNode.insertBefore(transactionSection, breakdownSection.nextSibling);
    }

    if (!transactions || transactions.length === 0) {
        transactionSection.innerHTML += `
            <div class="text-gray-500 text-center py-4">
                No transactions found for this address
            </div>
        `;
        return;
    }

    const transactionList = document.createElement('div');
    transactionList.className = 'space-y-2';

    transactions.forEach((tx, index) => {
        const isRecent = tx.timestamp.isRecent;
        const warningIcon = isRecent ? '🚩' : '';
        const direction = accountType === 'service' ? 'from' : 'to';

        transactionList.innerHTML += `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center space-x-3">
                    <span class="text-sm text-gray-500">#${tx.metadata.index}</span>
                    <span class="font-medium ${tx.amount.value > 50 ? 'text-red-600' : 'text-gray-900'}">
                        ${tx.amount.formatted} ${warningIcon}
                    </span>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="text-sm text-gray-600">
                        ${direction} ${tx.counterparty.display}
                    </span>
                    <span class="text-sm text-gray-500">
                        ${tx.timestamp.relative}
                    </span>
                </div>
            </div>
        `;
    });

    transactionSection.appendChild(transactionList);
}

/**
 * Update fraud analysis display with enhanced patterns
 */
function updateFraudAnalysis(fraudAnalysis) {
    // Create enhanced fraud analysis section
    let fraudSection = document.getElementById('enhanced-fraud-analysis');
    if (!fraudSection) {
        fraudSection = document.createElement('div');
        fraudSection.id = 'enhanced-fraud-analysis';
        fraudSection.className = 'bg-white rounded-lg shadow-sm p-6 mb-6';

        const title = document.createElement('h4');
        title.className = 'text-md font-semibold text-gray-900 mb-4';
        title.textContent = 'Fraud Pattern Analysis';

        fraudSection.appendChild(title);

        // Insert after transaction history
        const transactionSection = document.getElementById('transaction-history');
        transactionSection.parentNode.insertBefore(fraudSection, transactionSection.nextSibling);
    }

    // Clear existing content (except title)
    const title = fraudSection.querySelector('h4');
    fraudSection.innerHTML = '';
    fraudSection.appendChild(title);

    if (!fraudAnalysis.patterns || fraudAnalysis.patterns.length === 0) {
        fraudSection.innerHTML += `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="flex items-center">
                    <span class="text-green-600 text-2xl mr-3">✅</span>
                    <div>
                        <div class="font-medium text-green-800">No Suspicious Patterns Detected</div>
                        <div class="text-sm text-green-700">This address shows normal transaction patterns</div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Display detected patterns
    fraudAnalysis.patterns.forEach(pattern => {
        const severityColor = pattern.severity >= 8 ? 'red' : pattern.severity >= 6 ? 'orange' : pattern.severity >= 4 ? 'yellow' : 'green';
        const severityIcon = pattern.severity >= 8 ? '🚨' : pattern.severity >= 6 ? '⚠️' : 'ℹ️';

        const patternCard = document.createElement('div');
        patternCard.className = `mb-4 p-4 border-l-4 border-${severityColor}-500 bg-${severityColor}-50`;
        patternCard.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center">
                    <span class="text-2xl mr-3">${severityIcon}</span>
                    <div>
                        <div class="font-semibold text-gray-900">${pattern.type.replace(/_/g, ' ')}</div>
                        <div class="text-sm text-gray-600">Severity: ${pattern.severity}/10</div>
                    </div>
                </div>
                <span class="px-2 py-1 text-xs font-medium bg-${severityColor}-100 text-${severityColor}-800 rounded-full">
                    ${severityColor.toUpperCase()}
                </span>
            </div>
            <p class="text-sm text-gray-700 mb-2">${pattern.explanation}</p>
            <div class="text-xs text-gray-600">
                <strong>Recommendation:</strong> ${pattern.recommendation}
            </div>
        `;

        fraudSection.appendChild(patternCard);
    });

    // Add summary
    const summaryCard = document.createElement('div');
    summaryCard.className = 'mt-4 p-4 bg-gray-50 rounded-lg';
    summaryCard.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
                <div class="text-2xl font-bold text-red-600">${fraudAnalysis.patterns.length}</div>
                <div class="text-sm text-gray-600">Patterns</div>
            </div>
            <div>
                <div class="text-2xl font-bold text-orange-600">${fraudAnalysis.summary.maxSeverity}/10</div>
                <div class="text-sm text-gray-600">Max Severity</div>
            </div>
            <div>
                <div class="text-2xl font-bold text-blue-600">${fraudAnalysis.totalTransactions}</div>
                <div class="text-sm text-gray-600">Transactions</div>
            </div>
            <div>
                <div class="text-2xl font-bold text-green-600">${fraudAnalysis.uniquePayers}</div>
                <div class="text-sm text-gray-600">Unique Payers</div>
            </div>
        </div>
    `;

    fraudSection.appendChild(summaryCard);
}

/**
 * Update fraud flags display (legacy)
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

    setLoading(elements.checkBtn, 'Analyzing...');

    try {
        // Clear previous results
        clearResults();

        // Check reputation
        const reputationResult = await checkReputation(address);

        // Get transaction history with appropriate type
        const transactionHistory = await getTransactionHistory(address, 10, reputationResult.type);

        // Analyze fraud patterns
        const fraudAnalysis = await analyzeFraudPatterns(address);

        // Update UI
        elements.addressType.textContent = reputationResult.type.toUpperCase();
        updateReputationDisplay(reputationResult.data, reputationResult.type);
        updateTransactionHistory(transactionHistory.transactions || [], reputationResult.type);
        updateFraudAnalysis(fraudAnalysis.enhancedAnalysis || fraudAnalysis);

        // Update basic fraud flags if available
        if (fraudAnalysis.legacyAnalysis) {
            updateFraudDisplay(fraudAnalysis.legacyAnalysis.activeFlagsList || []);
        }

        // Show results
        elements.resultsSection.classList.remove('hidden');
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });

        showNotification('Analysis complete!', 'success', 3000);

    } catch (error) {
        showError(error.message);
    } finally {
        resetButton(elements.checkBtn, 'Analyze Address');
    }
}

/**
 * Clear previous results
 */
function clearResults() {
    // Remove dynamic sections
    const sections = ['reputation-breakdown', 'transaction-history', 'enhanced-fraud-analysis'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.remove();
        }
    });
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

    console.log('Enhanced TrustScore Dashboard initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}