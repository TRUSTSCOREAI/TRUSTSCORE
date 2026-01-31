// tests/integration/api.test.js - Integration tests for API endpoints
const request = require('supertest');
const { app } = require('../../src/api/server');

// Mock database functions for testing
jest.mock('../../src/db/queries', () => ({
    getPlatformStats: jest.fn(() => Promise.resolve({
        totalTransactions: 1000,
        totalServices: 50,
        totalAgents: 200,
        activeFraudFlags: 5
    })),
    getServiceReputation: jest.fn((address) => {
        if (address === '0x1234567890123456789012345678901234567890') {
            return Promise.resolve({
                address: '0x1234567890123456789012345678901234567890',
                reputationScore: 85,
                trustLevel: 'high',
                totalTransactions: 100,
                totalVolume: 5000,
                uniquePayers: 50,
                accountAgeDays: 30,
                activeFraudFlags: 0,
                badges: ['VERIFIED', 'TRUSTED']
            });
        }
        return Promise.reject(new Error('Service not found'));
    }),
    getAgentReputation: jest.fn((address) => {
        if (address === '0x0987654321098765432109876543210987654321') {
            return Promise.resolve({
                address: '0x0987654321098765432109876543210987654321',
                reputationScore: 78,
                trustLevel: 'high',
                totalPayments: 75,
                totalSpent: 3750,
                uniqueServices: 15,
                accountAgeDays: 45,
                paymentReliability: 95,
                badges: ['ACTIVE']
            });
        }
        return Promise.reject(new Error('Agent not found'));
    })
}));

describe('API Integration Tests', () => {
    describe('GET /health', () => {
        test('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('GET /api/stats', () => {
        test('should return platform statistics', async () => {
            const response = await request(app)
                .get('/api/stats')
                .expect(200);

            expect(response.body).toHaveProperty('totalTransactions', 1000);
            expect(response.body).toHaveProperty('totalServices', 50);
            expect(response.body).toHaveProperty('totalAgents', 200);
            expect(response.body).toHaveProperty('activeFraudFlags', 5);
        });
    });

    describe('GET /api/reputation/service/:address', () => {
        test('should return service reputation for valid address', async () => {
            const address = '0x1234567890123456789012345678901234567890';
            const response = await request(app)
                .get(`/api/reputation/service/${address}`)
                .expect(200);

            expect(response.body).toHaveProperty('address', address);
            expect(response.body).toHaveProperty('reputationScore', 85);
            expect(response.body).toHaveProperty('trustLevel', 'high');
            expect(response.body).toHaveProperty('totalTransactions', 100);
            expect(response.body).toHaveProperty('badges');
        });

        test('should return 404 for invalid service address', async () => {
            const address = '0x9999999999999999999999999999999999999999';
            const response = await request(app)
                .get(`/api/reputation/service/${address}`)
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('not found');
        });

        test('should return 400 for invalid address format', async () => {
            const invalidAddress = 'invalid-address';
            const response = await request(app)
                .get(`/api/reputation/service/${invalidAddress}`)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid address format');
        });
    });

    describe('GET /api/reputation/agent/:address', () => {
        test('should return agent reputation for valid address', async () => {
            const address = '0x0987654321098765432109876543210987654321';
            const response = await request(app)
                .get(`/api/reputation/agent/${address}`)
                .expect(200);

            expect(response.body).toHaveProperty('address', address);
            expect(response.body).toHaveProperty('reputationScore', 78);
            expect(response.body).toHaveProperty('trustLevel', 'high');
            expect(response.body).toHaveProperty('totalPayments', 75);
            expect(response.body).toHaveProperty('badges');
        });

        test('should return 404 for invalid agent address', async () => {
            const address = '0x9999999999999999999999999999999999999999';
            const response = await request(app)
                .get(`/api/reputation/agent/${address}`)
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('not found');
        });
    });

    describe('GET /api/reputation/trust-check', () => {
        test('should return trust compatibility analysis', async () => {
            const serviceAddr = '0x1234567890123456789012345678901234567890';
            const agentAddr = '0x0987654321098765432109876543210987654321';

            const response = await request(app)
                .get(`/api/reputation/trust-check?service=${serviceAddr}&agent=${agentAddr}`)
                .expect(200);

            expect(response.body).toHaveProperty('recommended');
            expect(response.body).toHaveProperty('riskLevel');
            expect(response.body).toHaveProperty('compatibilityScore');
            expect(response.body).toHaveProperty('warnings');
        });

        test('should return 400 for missing parameters', async () => {
            const response = await request(app)
                .get('/api/reputation/trust-check')
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('404 Handler', () => {
        test('should return 404 for unknown routes', async () => {
            const response = await request(app)
                .get('/api/unknown-route')
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Not Found');
            expect(response.body).toHaveProperty('message');
        });
    });
});