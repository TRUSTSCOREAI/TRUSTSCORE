// src/utils/logger.js - Logging Utility
const config = require('../config/config');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

/**
 * Get current timestamp in ISO format
 * @returns {string} ISO timestamp string
 */
function timestamp() {
    return new Date().toISOString();
}

/**
 * Format log message with timestamp, level, and optional data
 * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
 * @param {string} message - Log message
 * @param {*} data - Optional data to include in log output
 * @returns {string} Formatted log message
 */
function formatMessage(level, message, data) {
    let colorCode = colors.reset;

    switch (level) {
        case 'ERROR': colorCode = colors.red; break;
        case 'WARN': colorCode = colors.yellow; break;
        case 'INFO': colorCode = colors.cyan; break;
        case 'DEBUG': colorCode = colors.magenta; break;
    }

    let output = `${colorCode}[${timestamp()}] ${level}${colors.reset} ${message}`;

    if (data) {
        output += '\n' + JSON.stringify(data, null, 2);
    }

    return output;
}

const logger = {
    error: (message, data) => {
        console.error(formatMessage('ERROR', message, data));
    },

    warn: (message, data) => {
        console.warn(formatMessage('WARN', message, data));
    },

    info: (message, data) => {
        console.log(formatMessage('INFO', message, data));
    },

    debug: (message, data) => {
        if (config.server.env === 'development') {
            console.log(formatMessage('DEBUG', message, data));
        }
    },

    success: (message, data) => {
        console.log(`${colors.green}[${timestamp()}] SUCCESS${colors.reset} ${message}`);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
};

module.exports = logger;