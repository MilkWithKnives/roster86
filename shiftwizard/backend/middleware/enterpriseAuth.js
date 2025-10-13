const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const db = require('../database/postgres');
const licenseManager = require('../services/licenseManager');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');

/**
 * Enterprise Authentication Middleware
 * Handles JWT validation, organization context, MFA, and rate limiting
 */
class EnterpriseAuthMiddleware {
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || ''
        });

        // Setup rate limiters per license type
        this.rateLimiters = this.setupRateLimiters();
    }

    /**
     * Setup rate limiters for different license types
     */
    setupRateLimiters() {
        return {
            trial: new RateLimiterRedis({
                storeClient: this.redis,
                keyPrefix: 'rl:trial',
                points: 100, // requests
                duration: 3600, // per hour
                blockDuration: 60 // block for 1 minute
            }),
            basic: new RateLimiterRedis({
                storeClient: this.redis,
                keyPrefix: 'rl:basic',
                points: 500,
                duration: 3600,
                blockDuration: 30
            }),
            professional: new RateLimiterRedis({
                storeClient: this.redis,
                keyPrefix: 'rl:pro',
                points: 2000,
                duration: 3600,
                blockDuration: 10
            }),
            enterprise: new RateLimiterRedis({
                storeClient: this.redis,
                keyPrefix: 'rl:ent',
                points: 10000,
                duration: 3600,
                blockDuration: 5
            })
        };
    }

    /**
     * Main authentication middleware
     */
    authenticate(options = {}) {
        const {
            requireMFA = false,
            requireOrganization = true,
            permissions = [],
            roles = []
        } = options;

        return async (req, res, next) => {
            try {
                // Extract token from header
                const token = this.extractToken(req);
                if (!token) {
                    return res.status(401).json({
                        success: false,
                        error: 'No authentication token provided'
                    });
                }

                // Verify JWT token
                let decoded;
                try {
                    decoded = jwt.verify(token, process.env.JWT_SECRET);
                } catch (error) {
                    if (error.name === 'TokenExpiredError') {
                        return res.status(401).json({
                            success: false,
                            error: 'Token has expired',
                            code: 'TOKEN_EXPIRED'
                        });
                    }
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid token'
                    });
                }

                // Get user from database
                const user = await db.findOne('users', {
                    id: decoded.userId,
                    deleted_at: null
                });

                if (!user) {
                    return res.status(401).json({
                        success: false,
                        error: 'User not found'
                    });
                }

                // Check if user is locked
                if (user.locked_until && new Date(user.locked_until) > new Date()) {
                    return res.status(403).json({
                        success: false,
                        error: 'Account is locked',
                        lockedUntil: user.locked_until
                    });
                }

                // Get organization if required
                let organization = null;
                if (requireOrganization) {
                    organization = await db.findOne('organizations', {
                        id: user.organization_id,
                        deleted_at: null
                    });

                    if (!organization) {
                        return res.status(403).json({
                            success: false,
                            error: 'Organization not found'
                        });
                    }

                    // Check organization status
                    if (organization.status !== 'active' && organization.status !== 'trial') {
                        return res.status(403).json({
                            success: false,
                            error: 'Organization is not active',
                            status: organization.status
                        });
                    }

                    // Validate license
                    const licenseValidation = await this.validateLicense(organization);
                    if (!licenseValidation.valid) {
                        return res.status(403).json({
                            success: false,
                            error: 'License validation failed',
                            details: licenseValidation.error
                        });
                    }

                    // Apply rate limiting based on license type
                    try {
                        const rateLimiter = this.rateLimiters[organization.license_type] || 
                                          this.rateLimiters.trial;
                        await rateLimiter.consume(organization.id);
                    } catch (rateLimiterRes) {
                        return res.status(429).json({
                            success: false,
                            error: 'Too many requests',
                            retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000) || 60
                        });
                    }
                }

                // Check MFA if required
                if (requireMFA && user.mfa_enabled) {
                    const mfaToken = req.headers['x-mfa-token'];
                    if (!mfaToken) {
                        return res.status(403).json({
                            success: false,
                            error: 'MFA token required',
                            code: 'MFA_REQUIRED'
                        });
                    }

                    const mfaValid = this.verifyMFA(user.mfa_secret, mfaToken);
                    if (!mfaValid) {
                        return res.status(403).json({
                            success: false,
                            error: 'Invalid MFA token'
                        });
                    }
                }

                // Check role requirements
                if (roles.length > 0 && !roles.includes(user.role)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient role privileges',
                        required: roles,
                        current: user.role
                    });
                }

                // Check permission requirements
                if (permissions.length > 0) {
                    const hasPermission = this.checkPermissions(user.permissions, permissions);
                    if (!hasPermission) {
                        return res.status(403).json({
                            success: false,
                            error: 'Insufficient permissions',
                            required: permissions
                        });
                    }
                }

                // Update last activity
                await db.update('sessions', 
                    { last_activity_at: new Date() },
                    { token_hash: this.hashToken(token) }
                );

                // Attach user and organization to request
                req.user = {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    organizationId: user.organization_id,
                    permissions: user.permissions || {},
                    locationIds: user.location_ids || []
                };

                if (organization) {
                    req.organization = {
                        id: organization.id,
                        name: organization.name,
                        slug: organization.slug,
                        licenseType: organization.license_type,
                        features: licenseValidation.features || {},
                        timezone: organization.timezone,
                        locale: organization.locale
                    };
                }

                // Set request ID for tracing
                req.requestId = this.generateRequestId();

                // Log the request
                await this.logRequest(req);

                next();
            } catch (error) {
                console.error('Authentication error:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Authentication failed',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        };
    }

    /**
     * API Key authentication middleware
     */
    authenticateApiKey(options = {}) {
        return async (req, res, next) => {
            try {
                const apiKey = req.headers['x-api-key'];
                if (!apiKey) {
                    return res.status(401).json({
                        success: false,
                        error: 'API key required'
                    });
                }

                // Hash the API key for lookup
                const keyHash = this.hashToken(apiKey);

                // Find API key in database
                const apiKeyRecord = await db.findOne('api_keys', {
                    key_hash: keyHash,
                    revoked_at: null
                });

                if (!apiKeyRecord) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid API key'
                    });
                }

                // Check expiration
                if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
                    return res.status(401).json({
                        success: false,
                        error: 'API key has expired'
                    });
                }

                // Get organization
                const organization = await db.findOne('organizations', {
                    id: apiKeyRecord.organization_id,
                    deleted_at: null
                });

                if (!organization || organization.status !== 'active') {
                    return res.status(403).json({
                        success: false,
                        error: 'Organization not active'
                    });
                }

                // Apply rate limiting for API keys
                const rateLimiter = new RateLimiterRedis({
                    storeClient: this.redis,
                    keyPrefix: `rl:api:${apiKeyRecord.id}`,
                    points: apiKeyRecord.rate_limit || 1000,
                    duration: 3600
                });

                try {
                    await rateLimiter.consume(apiKeyRecord.id);
                } catch (rateLimiterRes) {
                    return res.status(429).json({
                        success: false,
                        error: 'API rate limit exceeded',
                        retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000) || 60
                    });
                }

                // Update last used
                await db.update('api_keys', 
                    { 
                        last_used_at: new Date(),
                        last_used_ip: req.ip 
                    },
                    { id: apiKeyRecord.id }
                );

                // Attach context to request
                req.apiKey = {
                    id: apiKeyRecord.id,
                    name: apiKeyRecord.name,
                    permissions: apiKeyRecord.permissions || {}
                };

                req.organization = {
                    id: organization.id,
                    name: organization.name,
                    slug: organization.slug
                };

                next();
            } catch (error) {
                console.error('API key authentication error:', error);
                return res.status(500).json({
                    success: false,
                    error: 'API authentication failed'
                });
            }
        };
    }

    /**
     * Extract token from request
     */
    extractToken(req) {
        // Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Check cookie
        if (req.cookies && req.cookies.token) {
            return req.cookies.token;
        }

        // Check query parameter (for downloads, etc.)
        if (req.query && req.query.token) {
            return req.query.token;
        }

        return null;
    }

    /**
     * Validate organization license
     */
    async validateLicense(organization) {
        // Check license expiration
        if (organization.license_expires_at && 
            new Date(organization.license_expires_at) < new Date()) {
            return {
                valid: false,
                error: 'License has expired'
            };
        }

        // Get full license validation
        const licenseRecord = await db.findOne('license_keys', {
            organization_id: organization.id,
            is_active: true
        });

        if (!licenseRecord) {
            // Trial without license key
            if (organization.license_type === 'trial') {
                const trialDaysRemaining = Math.ceil(
                    (new Date(organization.license_expires_at) - new Date()) / 
                    (1000 * 60 * 60 * 24)
                );
                
                return {
                    valid: trialDaysRemaining > 0,
                    features: licenseManager.getFeaturesForType('trial'),
                    daysRemaining: trialDaysRemaining
                };
            }

            return {
                valid: false,
                error: 'No valid license found'
            };
        }

        // Validate the license key
        return await licenseManager.validateLicense(licenseRecord.key, licenseRecord.key);
    }

    /**
     * Verify MFA token
     */
    verifyMFA(secret, token) {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time steps before/after
        });
    }

    /**
     * Check permissions
     */
    checkPermissions(userPermissions, requiredPermissions) {
        if (!userPermissions || typeof userPermissions !== 'object') {
            return false;
        }

        return requiredPermissions.every(permission => {
            // Handle nested permissions (e.g., 'shifts.create')
            const parts = permission.split('.');
            let current = userPermissions;

            for (const part of parts) {
                if (!current[part]) {
                    return false;
                }
                current = current[part];
                if (typeof current === 'boolean') {
                    return current;
                }
            }

            return true;
        });
    }

    /**
     * Hash token for storage
     */
    hashToken(token) {
        const crypto = require('crypto');
        return crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
    }

    /**
     * Generate request ID for tracing
     */
    generateRequestId() {
        return require('crypto').randomBytes(16).toString('hex');
    }

    /**
     * Log request for audit
     */
    async logRequest(req) {
        // Skip logging for health checks and static assets
        if (req.path.includes('/health') || req.path.includes('/static')) {
            return;
        }

        try {
            await db.query(`
                INSERT INTO audit_logs (
                    organization_id, 
                    user_id, 
                    action, 
                    resource_type,
                    ip_address, 
                    user_agent, 
                    request_id,
                    created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [
                req.organization?.id || null,
                req.user?.id || null,
                `${req.method} ${req.path}`,
                'api_request',
                req.ip,
                req.headers['user-agent'] || null,
                req.requestId
            ]);
        } catch (error) {
            console.error('Failed to log request:', error);
            // Don't fail the request if logging fails
        }
    }

    /**
     * Organization switcher middleware
     */
    organizationSwitcher() {
        return async (req, res, next) => {
            const targetOrgId = req.headers['x-organization-id'] || req.query.organizationId;
            
            if (!targetOrgId) {
                return next();
            }

            // Check if user has access to this organization
            const userOrgs = await db.query(`
                SELECT o.* 
                FROM organizations o
                JOIN users u ON u.organization_id = o.id
                WHERE u.id = $1 AND o.id = $2 AND o.deleted_at IS NULL
            `, [req.user.id, targetOrgId]);

            if (userOrgs.rows.length === 0) {
                // Check if user is super admin
                if (req.user.role !== 'super_admin') {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied to this organization'
                    });
                }
            }

            // Update request context
            const organization = userOrgs.rows[0];
            req.organization = {
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
                licenseType: organization.license_type
            };

            next();
        };
    }
}

// Export singleton instance
module.exports = new EnterpriseAuthMiddleware();