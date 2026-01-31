// tests/unit/reputation-scoring.test.js - Unit tests for reputation scoring
const serviceScorer = require('../../src/reputation/service-scorer');
const agentScorer = require('../../src/reputation/agent-scorer');

describe('Reputation Scoring', () => {
    // Mock database for testing
    const mockDb = {
        prepare: jest.fn(() => ({
            get: jest.fn()
        }))
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.doMock('../../src/db/database', () => ({
            getDatabase: () => mockDb
        }));
    });

    describe('Service Reputation Scoring', () => {
        test('should calculate high reputation for established service', () => {
            // Mock database to return good metrics
            mockDb.prepare().get.mockReturnValue({
                total_transactions: 500,
                total_volume: 25000,
                unique_payers: 200,
                first_seen: Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60), // 90 days ago
                last_active: Math.floor(Date.now() / 1000) - (60 * 60) // 1 hour ago
            });

            // Mock getFraudFlags to return no fraud
            jest.doMock('../../src/db/queries', () => ({
                getFraudFlags: () => []
            }));

            const result = serviceScorer.calculateServiceReputation('0x1234567890123456789012345678901234567890');

            expect(result.reputationScore).toBeGreaterThan(80);
            expect(result.trustLevel).toBe('excellent');
            expect(result.totalTransactions).toBe(500);
            expect(result.totalVolume).toBe(25000);
        });

        test('should calculate low reputation for suspicious service', () => {
            // Mock database to return poor metrics
            mockDb.prepare().get.mockReturnValue({
                total_transactions: 50,
                total_volume: 5000,
                unique_payers: 5,
                first_seen: Math.floor(Date.now() / 1000) - (2 * 24 * 60 * 60), // 2 days ago
                last_active: Math.floor(Date.now() / 1000) - (60 * 60) // 1 hour ago
            });

            // Mock getFraudFlags to return fraud flags
            jest.doMock('../../src/db/queries', () => ({
                getFraudFlags: () => [
                    { type: 'new_wallet_risk', severity: 7 },
                    { type: 'wash_trading', severity: 9 }
                ]
            }));

            const result = serviceScorer.calculateServiceReputation('0x1234567890123456789012345678901234567890');

            expect(result.reputationScore).toBeLessThan(30);
            expect(result.trustLevel).toBe('untrusted');
            expect(result.activeFraudFlags).toBe(2);
        });

        test('should return neutral score for new service', () => {
            // Mock database to return no transactions
            mockDb.prepare().get.mockReturnValue({
                total_transactions: 0,
                total_volume: 0,
                unique_payers: 0,
                first_seen: null,
                last_active: null
            });

            const result = serviceScorer.calculateServiceReputation('0x1234567890123456789012345678901234567890');

            expect(result.reputationScore).toBe(50);
            expect(result.trustLevel).toBe('medium');
            expect(result.totalTransactions).toBe(0);
        });
    });

    describe('Agent Reputation Scoring', () => {
        test('should calculate high reputation for active agent', () => {
            // Mock database to return good metrics
            mockDb.prepare().get.mockReturnValue({
                total_payments: 150,
                total_spent: 7500,
                unique_services: 25,
                first_payment_at: Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60), // 60 days ago
                last_payment_at: Math.floor(Date.now() / 1000) - (60 * 60) // 1 hour ago
            });

            const result = agentScorer.calculateAgentReputation('0x1234567890123456789012345678901234567890');

            expect(result.reputationScore).toBeGreaterThan(80);
            expect(result.trustLevel).toBe('excellent');
            expect(result.totalPayments).toBe(150);
            expect(result.totalSpent).toBe(7500);
        });

        test('should calculate medium reputation for new agent', () => {
            // Mock database to return basic metrics
            mockDb.prepare().get.mockReturnValue({
                total_payments: 5,
                total_spent: 25,
                unique_services: 3,
                first_payment_at: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // 7 days ago
                last_payment_at: Math.floor(Date.now() / 1000) - (24 * 60 * 60) // 1 day ago
            });

            const result = agentScorer.calculateAgentReputation('0x1234567890123456789012345678901234567890');

            expect(result.reputationScore).toBeGreaterThan(40);
            expect(result.reputationScore).toBeLessThan(70);
            expect(result.trustLevel).toBe('medium');
        });
    });
});