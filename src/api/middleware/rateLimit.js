const config = require('../../config/config');

// Simple in-memory rate limiter (use Redis in production)
const requestCounts = new Map();

/**
 * Rate limiting middleware to prevent API abuse
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = config.api.rateLimit.windowMs;
    const maxRequests = config.api.rateLimit.max;

    // Clean up old entries
    for (const [key, data] of requestCounts.entries()) {
        if (now - data.resetTime > windowMs) {
            requestCounts.delete(key);
        }
    }

    // Get or create entry for this IP
    let entry = requestCounts.get(ip);
    if (!entry || now - entry.resetTime > windowMs) {
        entry = {
            count: 0,
            resetTime: now
        };
        requestCounts.set(ip, entry);
    }

    // Check limit
    if (entry.count >= maxRequests) {
        return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 60000} minutes.`,
            retryAfter: Math.ceil((windowMs - (now - entry.resetTime)) / 1000)
        });
    }

    // Increment counter
    entry.count++;

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count);
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime + windowMs).toISOString());

    next();
}

module.exports = rateLimit;