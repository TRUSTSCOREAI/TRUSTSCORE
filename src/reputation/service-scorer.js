// src/reputation/service-scorer.js - Service Reputation Algorithm
const { getDatabase, initializeDatabase } = require('../db/database');
const { saveServiceReputation, getFraudFlags } = require('../db/queries');
const config = require('../config/config');

/**
 * Calculate reputation score for a service based on transaction history and fraud flags
 * @param {string} serviceAddress - The service address to score
 * @returns {Object} Reputation data including score, trust level, and metrics
 */
function calculateServiceReputation(serviceAddress) {
  // Ensure database is initialized
  initializeDatabase();
  const db = getDatabase();
  const address = serviceAddress.toLowerCase();

  // Get transaction metrics
  const metrics = db.prepare(`
    SELECT 
      COUNT(*) as total_transactions,
      SUM(amount) as total_volume,
      COUNT(DISTINCT from_address) as unique_payers,
      MIN(timestamp) as first_seen,
      MAX(timestamp) as last_active
    FROM transactions
    WHERE to_address = ?
  `).get(address);

  if (!metrics.total_transactions || metrics.total_transactions === 0) {
    // No transactions = neutral score
    return {
      address,
      reputationScore: config.reputation.defaultScore,
      trustLevel: 'medium',
      badges: ['NEW'],
      totalTransactions: 0,
      totalVolume: 0,
      uniquePayers: 0,
      accountAgeDays: 0,
      daysSinceLastActive: null,
      activeFraudFlags: 0
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const accountAge = now - metrics.first_seen;
  const accountAgeDays = accountAge / 86400;
  const daysSinceLastActive = (now - metrics.last_active) / 86400;

  // Get active fraud flags
  const fraudFlags = getFraudFlags(address, false);
  const activeFraudCount = fraudFlags.length;

  // ===== SCORING ALGORITHM =====
  let score = 0;

  // 1. Transaction Volume (0-30 points)
  const volumeScore = Math.min(30, (metrics.total_transactions / 100) * 30);
  score += volumeScore;

  // 2. Revenue History (0-20 points)
  const revenueScore = Math.min(20, (metrics.total_volume / 1000) * 20);
  score += revenueScore;

  // 3. Customer Diversity (0-15 points)
  const diversityScore = Math.min(15, (metrics.unique_payers / 50) * 15);
  score += diversityScore;

  // 4. Account Age (0-15 points)
  const ageScore = Math.min(15, (accountAgeDays / 90) * 15);
  score += ageScore;

  // 5. Recent Activity (0-10 points)
  const activityScore = daysSinceLastActive < 7 ? 10 :
    daysSinceLastActive < 30 ? 5 : 0;
  score += activityScore;

  // 6. Fraud Penalties (-15 to -27 points per flag)
  for (const flag of fraudFlags) {
    const penalty = Math.floor(flag.severity * 3); // Severity 1-10 → 3-30 penalty
    score -= penalty;
  }

  // Clamp score between 0-100
  score = Math.max(config.reputation.minScore, Math.min(config.reputation.maxScore, Math.round(score)));

  // Determine trust level
  let trustLevel = 'medium';
  if (score >= 85) trustLevel = 'excellent';
  else if (score >= 70) trustLevel = 'high';
  else if (score >= 50) trustLevel = 'medium';
  else if (score >= 30) trustLevel = 'low';
  else trustLevel = 'untrusted';

  // Assign badges
  const badges = [];
  if (score >= 85) badges.push('VERIFIED');
  if (score >= 70) badges.push('TRUSTED');
  if (accountAgeDays >= 90) badges.push('ESTABLISHED');
  if (metrics.total_transactions >= 1000) badges.push('HIGH_VOLUME');
  if (activeFraudCount === 0 && accountAgeDays >= 30) badges.push('CLEAN');
  if (accountAgeDays < 7) badges.push('NEW');

  const reputation = {
    address,
    reputationScore: score,
    trustLevel,
    badges,
    totalTransactions: metrics.total_transactions,
    totalVolume: parseFloat(metrics.total_volume.toFixed(2)),
    uniquePayers: metrics.unique_payers,
    accountAgeDays: Math.floor(accountAgeDays),
    daysSinceLastActive: Math.floor(daysSinceLastActive),
    activeFraudFlags: activeFraudCount
  };

  // Save to database
  saveServiceReputation(reputation);

  return reputation;
}

module.exports = {
  calculateServiceReputation
};
