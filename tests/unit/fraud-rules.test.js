// tests/unit/fraud-rules.test.js - Unit tests for fraud detection rules
const rules = require('../../src/fraud/rules');

describe('Fraud Detection Rules', () => {
    // Mock database for testing
    const mockDb = {
        prepare: jest.fn(() => ({
            get: jest.fn()
        }))
    };

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        // Mock the database getter
        jest.doMock('../../src/db/database', () => ({
            getDatabase: () => mockDb
        }));
    });

    describe('checkVelocityAbuse', () => {
        test('should detect velocity abuse when transactions exceed limit', () => {
            // Mock database to return high transaction count
            mockDb.prepare().get.mockReturnValue({ count: 60 });

            const result = rules.checkVelocityAbuse('0x1234567890123456789012345678901234567890');

            expect(result.detected).toBe(true);
            expect(result.type).toBe('velocity_abuse');
            expect(result.severity).toBe(8);
            expect(result.details.transactionsLastHour).toBe(60);
        });

        test('should not detect velocity abuse when under limit', () => {
            // Mock database to return normal transaction count
            mockDb.prepare().get.mockReturnValue({ count: 30 });

            const result = rules.checkVelocityAbuse('0x1234567890123456789012345678901234567890');

            expect(result.detected).toBe(false);
        });
    });

    describe('checkNewWalletRisk', () => {
        test('should detect new wallet risk when volume is high', () => {
            // Mock database to return high volume for new wallet
            mockDb.prepare().get.mockReturnValue({
                first_seen: Math.floor(Date.now() / 1000) - (5 * 24 * 60 * 60), // 5 days ago
                total_volume: 150
            });

            const result = rules.checkNewWalletRisk('0x1234567890123456789012345678901234567890');

            expect(result.detected).toBe(true);
            expect(result.type).toBe('new_wallet_risk');
            expect(result.severity).toBe(7);
        });

        test('should not detect new wallet risk for established wallets', () => {
            // Mock database to return normal volume for old wallet
            mockDb.prepare().get.mockReturnValue({
                first_seen: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // 30 days ago
                total_volume: 50
            });

            const result = rules.checkNewWalletRisk('0x1234567890123456789012345678901234567890');

            expect(result.detected).toBe(false);
        });
    });

    describe('checkCircularFlow', () => {
        test('should detect circular flow patterns', () => {
            // Mock database to return circular transaction pattern
            mockDb.prepare().get.mockReturnValue({ count: 15 });

            const result = rules.checkCircularFlow('0x1234567890123456789012345678901234567890');

            expect(result.detected).toBe(true);
            expect(result.type).toBe('wash_trading');
            expect(result.severity).toBe(9);
        });

        test('should not detect circular flow when under threshold', () => {
            // Mock database to return normal transaction pattern
            mockDb.prepare().get.mockReturnValue({ count: 5 });

            const result = rules.checkCircularFlow('0x1234567890123456789012345678901234567890');

            expect(result.detected).toBe(false);
        });
    });

    describe('checkVolumeSpike', () => {
        test('should detect volume spikes', () => {
            // Mock database to return volume spike
            mockDb.prepare().get.mockReturnValueOnce({ total_volume: 1000 }); // Recent
            mockDb.prepare().get.mockReturnValueOnce({ total_volume: 100 });  // Historical

            const result = rules.checkVolumeSpike('0x1234567890123456789012345678901234567890');

            expect(result.detected).toBe(true);
            expect(result.type).toBe('volume_spike');
            expect(result.severity).toBe(6);
        });
    });

    describe('checkRetrySpam', () => {
        test('should detect retry spam patterns', () => {
            // Mock database to return high retry count
            mockDb.prepare().get.mockReturnValue({ count: 15 });

            const result = rules.checkRetrySpam('0x1234567890123456789012345678901234567890');

            expect(result.detected).toBe(true);
            expect(result.type).toBe('retry_spam');
            expect(result.severity).toBe(5);
        });

        test('should not detect retry spam when under threshold', () => {
            // Mock database to return normal retry count
            mockDb.prepare().get.mockReturnValue({ count: 5 });

            const result = rules.checkRetrySpam('0x1234567890123456789012345678901234567890');

            expect(result.detected).toBe(false);
        });
    });
});