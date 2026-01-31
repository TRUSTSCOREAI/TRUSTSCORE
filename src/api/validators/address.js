// src/api/validators/address.js - Address Validator
const { isValidAddress } = require('../../utils/helpers');

/**
 * Middleware to validate Ethereum addresses in API requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateAddress(req, res, next) {
    const address = req.params.address || req.query.address || req.body.address;

    if (!address) {
        return res.status(400).json({
            error: 'Missing address',
            message: 'Ethereum address is required'
        });
    }

    if (!isValidAddress(address)) {
        return res.status(400).json({
            error: 'Invalid address',
            message: 'Provided address is not a valid Ethereum address'
        });
    }

    next();
}

module.exports = validateAddress;