/**
 * Example: AI agent using TrustScore before making payments
 */

const TrustScore = require('../trustscore-SDK/index.js');
const { ethers } = require('ethers');

class SmartAIAgent {
  constructor(walletPrivateKey) {
    this.wallet = new ethers.Wallet(walletPrivateKey);
    this.trustScore = new TrustScore({
      wallet: this.wallet,
      useFreeTier: true
    });
  }

  /**
   * Before using any x402 service, check if it's safe
   */
  async useService(serviceAddress, action) {
    try {
      console.log(` Agent checking service ${serviceAddress}...`);

      // Check service reputation
      const serviceRep = await this.trustScore.checkService(serviceAddress);

      console.log(`Service score: ${serviceRep.reputation.score}/100`);
      console.log(`Trust level: ${serviceRep.reputation.trustLevel}`);

      // Decision logic
      if (serviceRep.reputation.score < 50) {
        console.log(' Service score too low - SKIPPING');
        return {
          success: false,
          reason: 'Low reputation service',
          score: serviceRep.reputation.score
        };
      }

      if (serviceRep.fraudFlags > 0) {
        console.log(' Service has fraud alerts - AVOIDING');
        return {
          success: false,
          reason: 'Service has active fraud flags',
          flags: serviceRep.fraudFlags
        };
      }

      // Service is safe, proceed with action
      console.log(' Service is trustworthy, proceeding...');
      const result = await action();

      return {
        success: true,
        serviceScore: serviceRep.reputation.score,
        result
      };

    } catch (error) {
      console.error('TrustScore check failed:', error.message);

      // Agent decides: skip service if can't verify safety
      return {
        success: false,
        reason: 'Unable to verify service safety',
        error: error.message
      };
    }
  }

  /**
   * Find the most trustworthy service from a list
   */
  async findBestService(serviceAddresses) {
    console.log(` Evaluating ${serviceAddresses.length} services...`);

    const evaluations = await Promise.all(
      serviceAddresses.map(async (address) => {
        try {
          const rep = await this.trustScore.checkService(address);
          return {
            address,
            score: rep.reputation.score,
            trustLevel: rep.reputation.trustLevel,
            fraudFlags: rep.fraudFlags,
            safe: rep.reputation.score >= 70 && rep.fraudFlags === 0
          };
        } catch (error) {
          return {
            address,
            score: 0,
            safe: false,
            error: error.message
          };
        }
      })
    );

    // Filter safe services and sort by score
    const safeServices = evaluations
      .filter(e => e.safe)
      .sort((a, b) => b.score - a.score);

    if (safeServices.length === 0) {
      console.log(' No safe services found');
      return null;
    }

    const best = safeServices[0];
    console.log(` Best service: ${best.address} (score: ${best.score})`);

    return best;
  }
}

// Usage
async function main() {
  const agent = new SmartAIAgent(process.env.AGENT_PRIVATE_KEY);

  // Example 1: Check before using a service
  await agent.useService('0xServiceAddress', async () => {
    // Make API call to service
    console.log('Making API call...');
    return { data: 'result' };
  });

  // Example 2: Choose best service from options
  const services = [
    '0xService1',
    '0xService2',
    '0xService3'
  ];

  const bestService = await agent.findBestService(services);
  if (bestService) {
    console.log(`Using best service: ${bestService.address}`);
  }
}

main();
