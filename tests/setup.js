// tests/setup.js - Jest test setup
require('dotenv').config();
const { initializeDatabase, closeDatabase } = require('../src/db/database');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'trustscore_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'password';

// Initialize database before tests
beforeAll(async () => {
    try {
        await initializeDatabase();
    } catch (error) {
        console.warn('Database initialization failed in tests:', error.message);
        // Continue with tests even if DB fails - some tests might not need it
    }
});

// Clean up after tests
afterAll(async () => {
    try {
        await closeDatabase();
    } catch (error) {
        console.warn('Database cleanup failed:', error.message);
    }
});

// Global test utilities
global.testUtils = {
    // Helper to create test addresses
    createTestAddress: () => `0x${Math.random().toString(16).substr(2, 40)}`,

    // Helper to create test transactions
    createTestTransaction: (overrides = {}) => ({
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        fromAddress: global.testUtils.createTestAddress(),
        toAddress: global.testUtils.createTestAddress(),
        amount: Math.random() * 100,
        blockNumber: Math.floor(Math.random() * 1000000),
        timestamp: Math.floor(Date.now() / 1000),
        gasPrice: '20000000000',
        ...overrides
    })
};