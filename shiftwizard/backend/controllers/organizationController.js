const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const db = require('../database/hybridAdapter');
const licenseManager = require('../services/licenseManager');
const emailService = require('../services/emailService');
// Initialize Stripe only if configured
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Organization Controller
 * Handles organization signup, onboarding, and management
 */
class OrganizationController {
    /**
     * Create a new organization with owner account
     * This is the main signup flow for new customers
     */
    async createOrganization(req, res) {
        const {
            // Organization details
            organizationName,
            industry,
            size, // small, medium, large, enterprise
            
            // Owner details
            email,
            password,
            firstName,
            lastName,
            phone,
            
            // Plan selection
            planType = 'trial',
            
            // Optional
            timezone = 'America/New_York',
            country = 'US',
            referralCode = null
        } = req.body;

        // Start transaction
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Check if email already exists
            const existingUser = await client.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered'
                });
            }

            // 2. Generate organization slug
            const baseSlug = this.generateSlug(organizationName);
            let slug = baseSlug;
            let slugCounter = 1;
            
            // Ensure unique slug
            while (true) {
                const existingSlug = await client.query(
                    'SELECT id FROM organizations WHERE slug = $1',
                    [slug]
                );
                
                if (existingSlug.rows.length === 0) break;
                
                slug = `${baseSlug}-${slugCounter}`;
                slugCounter++;
            }

            // 3. Determine license details based on plan
            const licenseConfig = this.getLicenseConfig(planType, size);
            
            // 4. Generate license key
            const licenseData = licenseManager.generateLicenseKey({
                organizationId: nanoid(),
                organizationName,
                type: planType,
                seats: licenseConfig.seats,
                locations: licenseConfig.locations,
                expiresAt: licenseConfig.expiresAt,
                features: licenseConfig.features
            });

            // 5. Create organization
            const orgResult = await client.query(`
                INSERT INTO organizations (
                    name, slug, license_key, license_type, 
                    license_expires_at, license_seats, max_locations,
                    timezone, status, settings, features,
                    created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                    NOW(), NOW()
                ) RETURNING *
            `, [
                organizationName,
                slug,
                licenseData.fullKey,
                planType,
                licenseConfig.expiresAt,
                licenseConfig.seats,
                licenseConfig.locations,
                timezone,
                planType === 'trial' ? 'trial' : 'active',
                JSON.stringify({
                    industry,
                    size,
                    country,
                    referralCode,
                    onboardingCompleted: false,
                    setupStep: 1
                }),
                JSON.stringify(licenseData.payload.features),
            ]);

            const organization = orgResult.rows[0];

            // 6. Store license key details
            await client.query(`
                INSERT INTO license_keys (
                    organization_id, key, key_hash, type,
                    seats, features, expires_at, is_active,
                    created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, true,
                    NOW(), NOW()
                )
            `, [
                organization.id,
                licenseData.fullKey,
                licenseManager.hashToken(licenseData.fullKey),
                planType,
                licenseConfig.seats,
                JSON.stringify(licenseData.payload.features),
                licenseConfig.expiresAt
            ]);

            // 7. Create default location
            const locationResult = await client.query(`
                INSERT INTO locations (
                    organization_id, name, code, timezone, is_active,
                    created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, true, NOW(), NOW()
                ) RETURNING id
            `, [
                organization.id,
                'Main Location',
                'MAIN',
                timezone
            ]);

            const locationId = locationResult.rows[0].id;

            // 8. Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // 9. Create owner user account
            const userResult = await client.query(`
                INSERT INTO users (
                    organization_id, email, password_hash, full_name,
                    phone, role, default_location_id, location_ids,
                    email_verified, permissions, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    NOW(), NOW()
                ) RETURNING *
            `, [
                organization.id,
                email,
                passwordHash,
                `${firstName} ${lastName}`,
                phone,
                'owner',
                locationId,
                [locationId],
                false, // Email not verified yet
                JSON.stringify(this.getOwnerPermissions())
            ]);

            const user = userResult.rows[0];

            // 10. Generate email verification token
            const verificationToken = nanoid(32);
            await client.query(
                'UPDATE users SET email_verification_token = $1 WHERE id = $2',
                [verificationToken, user.id]
            );

            // 11. Create initial session
            const sessionToken = jwt.sign(
                {
                    userId: user.id,
                    organizationId: organization.id,
                    role: user.role
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            await client.query(`
                INSERT INTO sessions (
                    user_id, organization_id, token_hash,
                    device_name, browser, os, ip_address,
                    expires_at, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7,
                    NOW() + INTERVAL '7 days', NOW()
                ) RETURNING id
            `, [
                user.id,
                organization.id,
                this.hashToken(sessionToken),
                req.headers['user-agent']?.substring(0, 255),
                this.extractBrowser(req.headers['user-agent']),
                this.extractOS(req.headers['user-agent']),
                req.ip
            ]);

            // 12. Create Stripe customer if not trial
            let stripeCustomerId = null;
            if (planType !== 'trial' && stripe) {
                try {
                    const customer = await stripe.customers.create({
                        email: email,
                        name: `${firstName} ${lastName}`,
                        metadata: {
                            organizationId: organization.id,
                            userId: user.id
                        }
                    });
                    stripeCustomerId = customer.id;
                    
                    await client.query(
                        'UPDATE organizations SET stripe_customer_id = $1, billing_email = $2 WHERE id = $3',
                        [stripeCustomerId, email, organization.id]
                    );
                } catch (stripeError) {
                    console.error('Stripe customer creation failed:', stripeError);
                    // Don't fail the signup if Stripe fails
                }
            }

            // 13. Send welcome email
            try {
                await emailService.sendWelcomeEmail({
                    to: email,
                    name: firstName,
                    organizationName,
                    verificationToken,
                    planType,
                    trialDays: planType === 'trial' ? 14 : 0
                });
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
                // Don't fail signup if email fails
            }

            // 14. Log the signup event
            await client.query(`
                INSERT INTO audit_logs (
                    organization_id, user_id, action,
                    resource_type, resource_id, new_values,
                    ip_address, user_agent, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, NOW()
                )
            `, [
                organization.id,
                user.id,
                'organization.created',
                'organization',
                organization.id,
                JSON.stringify({ planType, size, industry }),
                req.ip,
                req.headers['user-agent']
            ]);

            // Commit transaction
            await client.query('COMMIT');

            // Return success response
            return res.status(201).json({
                success: true,
                message: 'Organization created successfully',
                data: {
                    organization: {
                        id: organization.id,
                        name: organization.name,
                        slug: organization.slug,
                        planType: organization.license_type,
                        licenseKey: licenseData.key, // Short display version
                        expiresAt: organization.license_expires_at,
                        seats: organization.license_seats,
                        locations: organization.max_locations
                    },
                    user: {
                        id: user.id,
                        email: user.email,
                        fullName: user.full_name,
                        role: user.role,
                        emailVerified: false
                    },
                    session: {
                        token: sessionToken,
                        expiresIn: '7d'
                    },
                    nextSteps: [
                        'Verify your email address',
                        'Complete organization setup',
                        'Invite team members',
                        'Configure your first schedule'
                    ]
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Organization creation error:', error);
            
            return res.status(500).json({
                success: false,
                error: 'Failed to create organization',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    /**
     * Complete organization onboarding
     */
    async completeOnboarding(req, res) {
        const { organizationId } = req.organization;
        const {
            step,
            data
        } = req.body;

        try {
            const organization = await db.findOne('organizations', {
                id: organizationId
            });

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    error: 'Organization not found'
                });
            }

            const settings = organization.settings || {};
            
            // Update based on step
            switch (step) {
                case 1: // Business details
                    settings.businessDetails = {
                        ...data,
                        completedAt: new Date()
                    };
                    break;
                    
                case 2: // Location setup
                    await this.setupLocations(organizationId, data.locations);
                    settings.locationsSetup = {
                        completed: true,
                        completedAt: new Date()
                    };
                    break;
                    
                case 3: // Team invites
                    await this.inviteTeamMembers(organizationId, data.invites, req.user.id);
                    settings.teamInvited = {
                        count: data.invites.length,
                        completedAt: new Date()
                    };
                    break;
                    
                case 4: // Schedule preferences
                    settings.schedulePreferences = {
                        ...data,
                        completedAt: new Date()
                    };
                    break;
                    
                case 5: // Billing setup (if not trial)
                    if (organization.license_type !== 'trial') {
                        await this.setupBilling(organizationId, data);
                        settings.billingSetup = {
                            completed: true,
                            completedAt: new Date()
                        };
                    }
                    break;
            }

            // Update setup step
            settings.setupStep = step + 1;
            
            // Check if onboarding is complete
            const isComplete = step >= 4 || 
                              (step >= 5 && organization.license_type !== 'trial');
            
            if (isComplete) {
                settings.onboardingCompleted = true;
                settings.onboardingCompletedAt = new Date();
            }

            // Update organization
            await db.update('organizations', 
                { 
                    settings: settings,
                    updated_at: new Date()
                },
                { id: organizationId }
            );

            // Log the action
            await db.query(`
                INSERT INTO audit_logs (
                    organization_id, user_id, action,
                    resource_type, new_values,
                    ip_address, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
                organizationId,
                req.user.id,
                `onboarding.step${step}.completed`,
                'organization',
                JSON.stringify(data),
                req.ip
            ]);

            return res.json({
                success: true,
                message: `Step ${step} completed`,
                data: {
                    currentStep: settings.setupStep,
                    onboardingComplete: isComplete,
                    nextStep: isComplete ? null : this.getOnboardingStep(settings.setupStep)
                }
            });

        } catch (error) {
            console.error('Onboarding error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update onboarding',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get organization details
     */
    async getOrganization(req, res) {
        try {
            const organization = await db.findOne('organizations', {
                id: req.organization.id,
                deleted_at: null
            });

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    error: 'Organization not found'
                });
            }

            // Get usage statistics
            const stats = await this.getOrganizationStats(req.organization.id);

            // Get license information
            const licenseInfo = licenseManager.getLicenseStats({
                type: organization.license_type,
                features: organization.features,
                expires: organization.license_expires_at
            });

            return res.json({
                success: true,
                data: {
                    organization: {
                        id: organization.id,
                        name: organization.name,
                        slug: organization.slug,
                        status: organization.status,
                        timezone: organization.timezone,
                        locale: organization.locale,
                        settings: organization.settings,
                        createdAt: organization.created_at
                    },
                    license: licenseInfo,
                    usage: stats,
                    limits: {
                        users: {
                            used: organization.seats_used,
                            total: organization.license_seats,
                            percentage: Math.round((organization.seats_used / organization.license_seats) * 100)
                        },
                        locations: {
                            used: stats.locationsCount,
                            total: organization.max_locations
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Get organization error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch organization details'
            });
        }
    }

    /**
     * Update organization settings
     */
    async updateOrganization(req, res) {
        const allowedFields = [
            'name', 'timezone', 'locale', 'settings',
            'billing_email'
        ];

        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }

        try {
            // If updating settings, merge with existing
            if (updates.settings) {
                const current = await db.findOne('organizations', 
                    { id: req.organization.id },
                    { columns: 'settings' }
                );
                
                updates.settings = {
                    ...current.settings,
                    ...updates.settings
                };
            }

            const result = await db.update(
                'organizations',
                updates,
                { id: req.organization.id },
                { returning: true }
            );

            // Log the update
            await db.query(`
                INSERT INTO audit_logs (
                    organization_id, user_id, action,
                    resource_type, resource_id, old_values, new_values,
                    ip_address, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            `, [
                req.organization.id,
                req.user.id,
                'organization.updated',
                'organization',
                req.organization.id,
                JSON.stringify({}), // Would need to fetch old values
                JSON.stringify(updates),
                req.ip
            ]);

            return res.json({
                success: true,
                message: 'Organization updated successfully',
                data: result[0]
            });

        } catch (error) {
            console.error('Update organization error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update organization'
            });
        }
    }

    /**
     * Invite team members
     */
    async inviteTeamMembers(organizationId, invites, invitedById) {
        const results = [];

        // Fetch inviter and organization context for email templates
        const inviter = await db.findOne('users', { id: invitedById });
        const organization = await db.findOne('organizations', { id: organizationId });
        const inviterName = inviter?.full_name || 'Administrator';
        const organizationName = organization?.name || 'Your Organization';
        
        for (const invite of invites) {
            try {
                const inviteToken = nanoid(32);
                
                // Store invite in database
                await db.query(`
                    INSERT INTO invitations (
                        organization_id, email, role,
                        token, invited_by, expires_at,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days', NOW())
                `, [
                    organizationId,
                    invite.email,
                    invite.role || 'employee',
                    inviteToken,
                    invitedById
                ]);

                // Send invitation email
                await emailService.sendInvitation({
                    email: invite.email,
                    inviterName,
                    organizationName,
                    role: invite.role,
                    token: inviteToken
                });

                results.push({
                    email: invite.email,
                    status: 'sent'
                });
            } catch (error) {
                results.push({
                    email: invite.email,
                    status: 'failed',
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Get organization statistics
     */
    async getOrganizationStats(organizationId) {
        const statsQuery = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE organization_id = $1 AND deleted_at IS NULL) as users_count,
                (SELECT COUNT(*) FROM locations WHERE organization_id = $1 AND deleted_at IS NULL) as locations_count,
                (SELECT COUNT(*) FROM schedules WHERE organization_id = $1 AND deleted_at IS NULL) as schedules_count,
                (SELECT COUNT(*) FROM shifts WHERE organization_id = $1 AND deleted_at IS NULL) as shifts_count,
                (SELECT COUNT(*) FROM shifts WHERE organization_id = $1 AND date >= CURRENT_DATE AND deleted_at IS NULL) as upcoming_shifts
        `, [organizationId]);

        return {
            usersCount: parseInt(statsQuery.rows[0].users_count),
            locationsCount: parseInt(statsQuery.rows[0].locations_count),
            schedulesCount: parseInt(statsQuery.rows[0].schedules_count),
            shiftsCount: parseInt(statsQuery.rows[0].shifts_count),
            upcomingShifts: parseInt(statsQuery.rows[0].upcoming_shifts)
        };
    }

    /**
     * Helper: Generate URL-safe slug
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
            .substring(0, 50);
    }

    /**
     * Helper: Get license configuration
     */
    getLicenseConfig(planType, size) {
        const configs = {
            trial: {
                seats: 10,
                locations: 1,
                expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
                features: {}
            },
            basic: {
                seats: size === 'small' ? 25 : 50,
                locations: 2,
                expiresAt: null,
                features: {}
            },
            professional: {
                seats: size === 'small' ? 50 : size === 'medium' ? 100 : 200,
                locations: 10,
                expiresAt: null,
                features: {}
            },
            enterprise: {
                seats: 999999, // Unlimited
                locations: 999999, // Unlimited
                expiresAt: null,
                features: { customLimits: true }
            }
        };

        return configs[planType] || configs.trial;
    }

    /**
     * Helper: Get owner permissions
     */
    getOwnerPermissions() {
        return {
            all: true, // Owners have all permissions
            billing: true,
            users: { create: true, read: true, update: true, delete: true },
            schedules: { create: true, read: true, update: true, delete: true },
            shifts: { create: true, read: true, update: true, delete: true },
            reports: { view: true, export: true },
            settings: { view: true, update: true }
        };
    }

    /**
     * Helper: Extract browser from user agent
     */
    extractBrowser(userAgent) {
        if (!userAgent) return 'Unknown';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Other';
    }

    /**
     * Helper: Extract OS from user agent
     */
    extractOS(userAgent) {
        if (!userAgent) return 'Unknown';
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS')) return 'iOS';
        return 'Other';
    }

    /**
     * Helper: Hash token
     */
    hashToken(token) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Helper: Get onboarding step info
     */
    getOnboardingStep(stepNumber) {
        const steps = {
            1: {
                title: 'Business Details',
                description: 'Tell us about your business'
            },
            2: {
                title: 'Location Setup',
                description: 'Add your business locations'
            },
            3: {
                title: 'Team Members',
                description: 'Invite your team'
            },
            4: {
                title: 'Schedule Preferences',
                description: 'Configure scheduling settings'
            },
            5: {
                title: 'Billing Setup',
                description: 'Add payment method'
            }
        };

        return steps[stepNumber] || null;
    }
}

module.exports = new OrganizationController();