// src/reputation/agent-scorer.js - Agent Reputation Algorithm
const { getDatabase, initializeDatabase } = require('../db/database');
const { saveAgentReputation } = require('../db/queries');
const config = require('../config/config');

/**
 * Calculate reputation score for an agent based on payment history and behavior
 * @param {string} agentAddress - The agent address to score
 * @returns {Object} Reputation data including score, trust level, and metrics
 */
function calculateAgentReputation(agentAddress) {
  // Ensure database is initialized
  initializeDatabase();
  const db = getDatabase();
  const address = agentAddress.toLowerCase();

  // Get payment metrics
  const metrics = db.prepare(`
    SELECT 
      COUNT(*) as total_payments,
      SUM(amount) as total_spent,
      COUNT(DISTINCT to_address) as unique_services,
      MIN(timestamp) as first_payment,
      MAX(timestamp) as last_payment
    FROM transactions
    WHERE from_address = ?
  `).get(address);

  if (!metrics.total_payments || metrics.total_payments === 0) {
    return {
      address,
      reputationScore: config.reputation.defaultScore,
      trustLevel: 'medium',
      badges: ['NEW'],
      totalPayments: 0,
      totalSpent: 0,
      uniqueServices: 0,
      accountAgeDays: 0,
      daysSinceLastPayment: null,
      paymentReliability: 100,
      disputeCount: 0
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const accountAge = now - metrics.first_payment;
  const accountAgeDays = accountAge / 86400;
  const daysSinceLastPayment = (now - metrics.last_payment) / 86400;

  // Calculate payment reliability (consistency)
  const avgDaysBetweenPayments = accountAgeDays / metrics.total_payments;
  const paymentReliability = avgDaysBetweenPayments < 1 ? 100 :
    avgDaysBetweenPayments < 7 ? 90 :
      avgDaysBetweenPayments < 30 ? 75 : 50;

  // ===== SCORING ALGORITHM =====
  let score = 0;

  // 1. Payment Count (0-25 points)
  const countScore = Math.min(25, (metrics.total_payments / 100) * 25);
  score += countScore;

  // 2. Total Spent (0-20 points)
  const spentScore = Math.min(20, (metrics.total_spent / 1000) * 20);
  score += spentScore;

  // 3. Service Diversity (0-15 points)
  const diversityScore = Math.min(15, (metrics.unique_services / 20) * 15);
  score += diversityScore;

  // 4. Account Age (0-15 points)
  const ageScore = Math.min(15, (accountAgeDays / 90) * 15);
  score += ageScore;

  // 5. Recent Activity (0-15 points)
  const activityScore = daysSinceLastPayment < 7 ? 15 :
    daysSinceLastPayment < 30 ? 10 : 5;
  score += activityScore;

  // 6. Behavior Consistency (0-10 points)
  score += (paymentReliability / 100) * 10;

  // Clamp score
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
  if (score >= 70) badges.push('RELIABLE');
  if (accountAgeDays >= 90) badges.push('EXPERIENCED');
  if (metrics.total_payments >= 500) badges.push('ACTIVE');
  if (accountAgeDays < 7) badges.push('NEW');

  const reputation = {
    address,
    reputationScore: score,
    trustLevel,
    badges,
    totalPayments: metrics.total_payments,
    totalSpent: parseFloat(metrics.total_spent.toFixed(2)),
    uniqueServices: metrics.unique_services,
    accountAgeDays: Math.floor(accountAgeDays),
    daysSinceLastPayment: Math.floor(daysSinceLastPayment),
    paymentReliability: Math.round(paymentReliability),
    disputeCount: 0 // TODO: Track disputes
  };

  // Save to database
  saveAgentReputation(reputation);

  return reputation;
}

module.exports = {
  calculateAgentReputation
};