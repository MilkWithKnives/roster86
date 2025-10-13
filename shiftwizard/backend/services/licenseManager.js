const crypto = require('crypto');
const { nanoid } = require('nanoid');

/**
 * Enterprise License Key Manager
 * Generates and validates cryptographically signed license keys
 * Format: SHIFT-XXXX-XXXX-XXXX-XXXX
 */
class LicenseManager {
    constructor() {
        // In production, these should be loaded from secure environment variables
        this.privateKey = process.env.LICENSE_PRIVATE_KEY;
        this.publicKey = process.env.LICENSE_PUBLIC_KEY;
        
        // Initialize keys if not present (development only)
        if (!this.privateKey || !this.publicKey) {
            this.generateKeyPair();
        }
    }

    /**
     * Generate RSA key pair for license signing (development only)
     */
    generateKeyPair() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        
        console.warn('⚠️  Generated new license key pair. In production, use persistent keys!');
    }

    /**
     * Generate a new license key
     */
    generateLicenseKey(options = {}) {
        const {
            organizationId,
            organizationName,
            type = 'trial',
            seats = 10,
            locations = 1,
            expiresAt = null,
            features = {}
        } = options;

        // Create license payload
        const payload = {
            id: nanoid(16),
            org: organizationId,
            name: organizationName,
            type: type,
            seats: seats,
            locations: locations,
            features: this.getFeaturesForType(type, features),
            issued: Date.now(),
            expires: expiresAt ? new Date(expiresAt).getTime() : null,
            version: '1.0'
        };

        // Sign the payload
        const signature = this.signPayload(payload);
        
        // Encode the license
        const licenseData = {
            payload,
            signature
        };
        
        // Create the license key
        const encoded = Buffer.from(JSON.stringify(licenseData)).toString('base64url');
        const chunks = this.chunkString(encoded, 4);
        const formattedKey = `SHIFT-${chunks.slice(0, 4).join('-')}`;
        
        // Store the full encoded data separately for validation
        return {
            key: formattedKey,
            fullKey: encoded,
            payload,
            checksum: this.generateChecksum(formattedKey)
        };
    }

    /**
     * Validate a license key
     */
    async validateLicense(licenseKey, fullKey = null) {
        try {
            // Extract the base64 data
            let encoded;
            if (fullKey) {
                encoded = fullKey;
            } else {
                // Try to reconstruct from the formatted key (limited validation)
                const parts = licenseKey.replace('SHIFT-', '').split('-').join('');
                encoded = parts;
            }

            // Decode the license data
            const licenseData = JSON.parse(Buffer.from(encoded, 'base64url').toString());
            const { payload, signature } = licenseData;

            // Verify signature
            if (!this.verifySignature(payload, signature)) {
                return {
                    valid: false,
                    error: 'Invalid signature'
                };
            }

            // Check expiration
            if (payload.expires && payload.expires < Date.now()) {
                return {
                    valid: false,
                    error: 'License expired',
                    expiredAt: new Date(payload.expires)
                };
            }

            // Return validation result
            return {
                valid: true,
                payload,
                features: payload.features,
                seats: payload.seats,
                locations: payload.locations,
                type: payload.type,
                expiresAt: payload.expires ? new Date(payload.expires) : null
            };
        } catch (error) {
            return {
                valid: false,
                error: 'Invalid license format',
                details: error.message
            };
        }
    }

    /**
     * Sign payload with private key
     */
    signPayload(payload) {
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(JSON.stringify(payload));
        sign.end();
        return sign.sign(this.privateKey, 'base64');
    }

    /**
     * Verify signature with public key
     */
    verifySignature(payload, signature) {
        const verify = crypto.createVerify('RSA-SHA256');
        verify.update(JSON.stringify(payload));
        verify.end();
        return verify.verify(this.publicKey, signature, 'base64');
    }

    /**
     * Generate checksum for quick validation
     */
    generateChecksum(key) {
        return crypto
            .createHash('sha256')
            .update(key)
            .digest('hex')
            .substring(0, 8);
    }

    /**
     * Verify checksum
     */
    verifyChecksum(key, checksum) {
        return this.generateChecksum(key) === checksum;
    }

    /**
     * Get features based on license type
     */
    getFeaturesForType(type, customFeatures = {}) {
        const baseFeatures = {
            trial: {
                maxUsers: 10,
                maxLocations: 1,
                apiAccess: false,
                customBranding: false,
                advancedReporting: false,
                ssoEnabled: false,
                auditLogs: false,
                dataExport: true,
                support: 'community',
                backups: 'daily',
                retention: 7, // days
                integrations: ['basic'],
                mfa: false,
                customRoles: false,
                shiftTemplates: 5,
                scheduleTemplates: 3,
                duration: 14 // trial days
            },
            basic: {
                maxUsers: 50,
                maxLocations: 2,
                apiAccess: false,
                customBranding: false,
                advancedReporting: true,
                ssoEnabled: false,
                auditLogs: true,
                dataExport: true,
                support: 'email',
                backups: 'daily',
                retention: 30,
                integrations: ['basic', 'calendar'],
                mfa: true,
                customRoles: false,
                shiftTemplates: 20,
                scheduleTemplates: 10
            },
            professional: {
                maxUsers: 200,
                maxLocations: 10,
                apiAccess: true,
                customBranding: true,
                advancedReporting: true,
                ssoEnabled: false,
                auditLogs: true,
                dataExport: true,
                support: 'priority',
                backups: 'hourly',
                retention: 90,
                integrations: ['basic', 'calendar', 'payroll', 'hr'],
                mfa: true,
                customRoles: true,
                shiftTemplates: 100,
                scheduleTemplates: 50
            },
            enterprise: {
                maxUsers: -1, // unlimited
                maxLocations: -1, // unlimited
                apiAccess: true,
                customBranding: true,
                advancedReporting: true,
                ssoEnabled: true,
                auditLogs: true,
                dataExport: true,
                support: 'dedicated',
                backups: 'realtime',
                retention: 365,
                integrations: ['all'],
                mfa: true,
                customRoles: true,
                shiftTemplates: -1, // unlimited
                scheduleTemplates: -1, // unlimited
                whiteLabel: true,
                customDomain: true,
                sla: true
            }
        };

        return {
            ...baseFeatures[type] || baseFeatures.trial,
            ...customFeatures
        };
    }

    /**
     * Check if a feature is enabled for a license
     */
    hasFeature(licensePayload, featureName) {
        if (!licensePayload || !licensePayload.features) {
            return false;
        }
        
        const feature = licensePayload.features[featureName];
        
        // Handle boolean features
        if (typeof feature === 'boolean') {
            return feature;
        }
        
        // Handle numeric limits (-1 means unlimited)
        if (typeof feature === 'number') {
            return feature !== 0;
        }
        
        // Handle array features
        if (Array.isArray(feature)) {
            return feature.length > 0;
        }
        
        return !!feature;
    }

    /**
     * Check if limit is exceeded
     */
    checkLimit(licensePayload, limitName, currentValue) {
        if (!licensePayload || !licensePayload.features) {
            return false;
        }
        
        const limit = licensePayload.features[limitName];
        
        // -1 means unlimited
        if (limit === -1) {
            return true;
        }
        
        return currentValue <= limit;
    }

    /**
     * Split string into chunks
     */
    chunkString(str, size) {
        const chunks = [];
        for (let i = 0; i < str.length; i += size) {
            chunks.push(str.substring(i, i + size).toUpperCase());
        }
        return chunks;
    }

    /**
     * Generate a trial license
     */
    generateTrialLicense(organizationId, organizationName) {
        const trialDays = 14;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + trialDays);
        
        return this.generateLicenseKey({
            organizationId,
            organizationName,
            type: 'trial',
            seats: 10,
            locations: 1,
            expiresAt,
            features: {
                trialDaysRemaining: trialDays
            }
        });
    }

    /**
     * Upgrade license
     */
    upgradeLicense(currentLicense, newType, additionalOptions = {}) {
        // Validate current license first
        const validation = this.validateLicense(currentLicense);
        if (!validation.valid) {
            throw new Error('Current license is invalid');
        }
        
        // Generate new license with upgraded type
        return this.generateLicenseKey({
            organizationId: validation.payload.org,
            organizationName: validation.payload.name,
            type: newType,
            seats: additionalOptions.seats || this.getFeaturesForType(newType).maxUsers,
            locations: additionalOptions.locations || this.getFeaturesForType(newType).maxLocations,
            expiresAt: additionalOptions.expiresAt,
            features: additionalOptions.features
        });
    }

    /**
     * Batch validate licenses (for performance)
     */
    async batchValidate(licenses) {
        const results = await Promise.all(
            licenses.map(license => this.validateLicense(license))
        );
        
        return results.map((result, index) => ({
            license: licenses[index],
            ...result
        }));
    }

    /**
     * Get license statistics
     */
    getLicenseStats(licensePayload) {
        if (!licensePayload || !licensePayload.features) {
            return null;
        }
        
        const now = Date.now();
        const expires = licensePayload.expires;
        
        return {
            type: licensePayload.type,
            isActive: !expires || expires > now,
            daysRemaining: expires ? Math.ceil((expires - now) / (1000 * 60 * 60 * 24)) : null,
            seats: {
                total: licensePayload.seats,
                unlimited: licensePayload.seats === -1
            },
            locations: {
                total: licensePayload.locations,
                unlimited: licensePayload.locations === -1
            },
            features: Object.keys(licensePayload.features).filter(
                feature => this.hasFeature(licensePayload, feature)
            )
        };
    }
}

module.exports = new LicenseManager();