// src/jobs/score-updater.js - Reputation Score Update Job
const { getAllServices, getAllAgents } = require('../db/queries');
const { calculateServiceReputation } = require('../reputation/service-scorer');
const { calculateAgentReputation } = require('../reputation/agent-scorer');
const logger = require('../utils/logger');

/**
 * Update reputation scores for all services and agents in the system
 * @returns {Promise<Object>} Update results with counts of services and agents updated
 */
async function updateAllScores() {
    // Update services
    const services = await getAllServices();
    logger.info(`Updating ${services.length} service reputation scores...`);

    let serviceCount = 0;
    for (const address of services) {
        try {
            await calculateServiceReputation(address);
            serviceCount++;
        } catch (error) {
            logger.error(`Failed to update service ${address}:`, error);
        }
    }

    // Update agents
    const agents = await getAllAgents();
    logger.info(`Updating ${agents.length} agent reputation scores...`);

    let agentCount = 0;
    for (const address of agents) {
        try {
            await calculateAgentReputation(address);
            agentCount++;
        } catch (error) {
            logger.error(`Failed to update agent ${address}:`, error);
        }
    }

    logger.info(`Score update complete: ${serviceCount} services, ${agentCount} agents`);

    return {
        servicesUpdated: serviceCount,
        agentsUpdated: agentCount
    };
}

module.exports = {
    updateAllScores
};
