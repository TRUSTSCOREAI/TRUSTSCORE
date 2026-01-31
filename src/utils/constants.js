// src/utils/constants.js - Constants & Enums
module.exports = {
    // Fraud types
    FRAUD_TYPES: {
        VELOCITY_ABUSE: 'velocity_abuse',
        NEW_WALLET_RISK: 'new_wallet_risk',
        WASH_TRADING: 'wash_trading',
        VOLUME_SPIKE: 'volume_spike',
        RETRY_SPAM: 'retry_spam'
    },

    // Trust levels
    TRUST_LEVELS: {
        EXCELLENT: 'excellent',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low',
        UNTRUSTED: 'untrusted'
    },

    // Risk levels
    RISK_LEVELS: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        CRITICAL: 'critical'
    },

    // Badges
    BADGES: {
        VERIFIED: 'VERIFIED',
        TRUSTED: 'TRUSTED',
        ESTABLISHED: 'ESTABLISHED',
        HIGH_VOLUME: 'HIGH_VOLUME',
        CLEAN: 'CLEAN',
        NEW: 'NEW',
        RELIABLE: 'RELIABLE',
        EXPERIENCED: 'EXPERIENCED',
        ACTIVE: 'ACTIVE'
    },

    // API Response codes
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        PAYMENT_REQUIRED: 402,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        TOO_MANY_REQUESTS: 429,
        INTERNAL_ERROR: 500
    },

    // Time constants
    TIME: {
        SECOND: 1,
        MINUTE: 60,
        HOUR: 3600,
        DAY: 86400,
        WEEK: 604800,
        MONTH: 2592000
    }
};