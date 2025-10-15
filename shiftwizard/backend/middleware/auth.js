const jwt = require('jsonwebtoken');
const database = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET environment variable is not set!');
    console.error('Generate a secure secret with: openssl rand -hex 32');
    process.exit(1);
}

// Middleware to verify JWT token
const authenticateToken = async(req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            error: 'Access denied',
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Get user from database to ensure they still exist
        const user = await database.get(
            'SELECT id, email, full_name, role, organization_id, role_in_org FROM users WHERE id = ?', [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'User not found'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Token expired'
            });
        }

        return res.status(403).json({
            error: 'Access denied',
            message: 'Invalid token'
        });
    }
};

// Middleware to check if user has required role
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

// Generate JWT token
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
};

// Optional middleware - doesn't fail if no token
const optionalAuth = async(req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await database.get(
            'SELECT id, email, full_name, role, organization_id, role_in_org FROM users WHERE id = ?', [decoded.userId]
        );
        req.user = user || null;
    } catch {
        req.user = null;
    }

    next();
};

module.exports = {
    authenticateToken,
    requireRole,
    generateToken,
    optionalAuth,
    JWT_SECRET
};