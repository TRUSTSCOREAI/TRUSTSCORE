// src/reputation/trust-matcher.js - Trust Compatibility Checker
const { getServiceReputation, getAgentReputation } = require('../db/queries');
const { getFraudFlags } = require('../db/queries');

/**
 * Check trust compatibility between a service and agent for safe transactions
 * @param {string} serviceAddress - The service address
 * @param {string} agentAddress - The agent address
 * @returns {Object} Compatibility analysis with recommendation and risk assessment
 */
function checkTrustCompatibility(serviceAddress, agentAddress) {
    // Get both reputations
    let serviceRep = getServiceReputation(serviceAddress);
    let agentRep = getAgentReputation(agentAddress);

    // Calculate if not available
    if (!serviceRep) {
        const { calculateServiceReputation } = require('./service-scorer');
        serviceRep = calculateServiceReputation(serviceAddress);
    }

    if (!agentRep) {
        const { calculateAgentReputation } = require('./agent-scorer');
        agentRep = calculateAgentReputation(agentAddress);
    }

    // Get fraud flags
    const serviceFraud = getFraudFlags(serviceAddress, false);
    const hasFraudFlags = serviceFraud.length > 0;

    // Calculate compatibility score
    const avgScore = (serviceRep.reputationScore + agentRep.reputationScore) / 2;
    const scoreDiff = Math.abs(serviceRep.reputationScore - agentRep.reputationScore);

    // Penalize if large score difference or fraud flags
    let compatibility = avgScore;
    if (scoreDiff > 30) compatibility -= 10;
    if (hasFraudFlags) compatibility -= 20;

    compatibility = Math.max(0, Math.min(100, compatibility));

    // Determine recommendation
    const recommended = compatibility >= 60 && !hasFraudFlags;

    let riskLevel = 'low';
    if (compatibility < 40 || hasFraudFlags) riskLevel = 'high';
    else if (compatibility < 60) riskLevel = 'medium';

    // Generate warnings
    const warnings = [];
    if (serviceRep.reputationScore < 50) {
        warnings.push('Service has low reputation score');
    }
    if (agentRep.reputationScore < 50) {
        warnings.push('Agent has low reputation score');
    }
    if (hasFraudFlags) {
        warnings.push(`Service has ${serviceFraud.length} active fraud alert(s)`);
    }
    if (serviceRep.accountAgeDays < 7) {
        warnings.push('Service is very new (less than 7 days old)');
    }

    return {
        service: {
            address: serviceAddress,
            score: serviceRep.reputationScore,
            trustLevel: serviceRep.trustLevel,
            fraudFlags: serviceFraud.length
        },
        agent: {
            address: agentAddress,
            score: agentRep.reputationScore,
            trustLevel: agentRep.trustLevel
        },
        compatibility: {
            score: Math.round(compatibility),
            recommended,
            riskLevel,
            warnings
        },
        message: recommended ?
            'Both parties are trustworthy. Safe to transact.' :
            'Exercise caution. Review warnings before proceeding.'
    };
}

module.exports = {
    checkTrustCompatibility
};