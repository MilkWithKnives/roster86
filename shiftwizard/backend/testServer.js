const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');

// Initialize environment
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-change-in-production';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Import our modules
const db = require('./database/hybridAdapter');
const organizationController = require('./controllers/organizationController');
const licenseManager = require('./services/licenseManager');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
    const health = await db.healthCheck();
    res.json({
        status: health.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: health.checks,
        version: '1.0.0'
    });
});

// Create organization (signup)
app.post('/api/organizations/signup', organizationController.createOrganization.bind(organizationController));

// Simple test endpoint to create an organization
app.post('/api/test/quick-signup', async (req, res) => {
    try {
        const testData = {
            organizationName: req.body.name || 'Test Restaurant ' + Date.now(),
            email: req.body.email || `test${Date.now()}@example.com`,
            password: 'Test123!',
            firstName: 'Test',
            lastName: 'User'
        };

        // Generate license
        const license = licenseManager.generateTrialLicense(
            nanoid(), 
            testData.organizationName
        );

        // Create org in database
        const orgId = nanoid();
        const userId = nanoid();
        const slug = testData.organizationName.toLowerCase().replace(/\s+/g, '-');
        
        await db.query(`
            INSERT INTO organizations (
                id, name, slug, license_key, license_type,
                license_expires_at, license_seats, status,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            orgId,
            testData.organizationName,
            slug,
            license.fullKey,
            'trial',
            new Date(license.payload.expires).toISOString(),
            10,
            'trial'
        ]);

        // Hash password
        const passwordHash = await bcrypt.hash(testData.password, 10);

        // Create user
        await db.query(`
            INSERT INTO users (
                id, organization_id, email, password_hash,
                full_name, role, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            userId,
            orgId,
            testData.email,
            passwordHash,
            `${testData.firstName} ${testData.lastName}`,
            'owner'
        ]);

        // Generate JWT
        const token = jwt.sign(
            { userId, organizationId: orgId, role: 'owner' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Test organization created!',
            organization: {
                id: orgId,
                name: testData.organizationName,
                slug: slug,
                licenseKey: license.key
            },
            user: {
                id: userId,
                email: testData.email,
                role: 'owner'
            },
            token: token,
            loginUrl: `http://localhost:5173/login`,
            credentials: {
                email: testData.email,
                password: testData.password
            }
        });
    } catch (error) {
        console.error('Test signup error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get organization stats
app.get('/api/organizations/:orgId/stats', async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE organization_id = ?) as users,
                (SELECT COUNT(*) FROM schedules WHERE organization_id = ?) as schedules,
                (SELECT COUNT(*) FROM shifts WHERE organization_id = ?) as shifts
        `, [req.params.orgId, req.params.orgId, req.params.orgId]);

        res.json({
            success: true,
            stats: stats.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// List all organizations (for testing)
app.get('/api/test/organizations', async (req, res) => {
    try {
        const orgs = await db.query('SELECT * FROM organizations ORDER BY created_at DESC');
        res.json({
            success: true,
            count: orgs.rows.length,
            organizations: orgs.rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Initialize and start server
async function startServer() {
    try {
        // Initialize database
        await db.initialize();
        console.log('✅ Database initialized');

        // Start server
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            console.log(`\n🚀 ShiftWizard Test Server running on http://localhost:${PORT}`);
            console.log('\n📋 Available endpoints:');
            console.log('  GET  /health                     - Health check');
            console.log('  POST /api/test/quick-signup      - Quick test signup');
            console.log('  POST /api/organizations/signup   - Full organization signup');
            console.log('  GET  /api/test/organizations     - List all organizations');
            console.log('  GET  /api/organizations/:id/stats - Get organization stats');
            console.log('\n💡 Test it with:');
            console.log(`  curl -X POST http://localhost:${PORT}/api/test/quick-signup \\`);
            console.log('    -H "Content-Type: application/json" \\');
            console.log('    -d \'{"name":"My Restaurant","email":"owner@myrestaurant.com"}\'');
            console.log('\n✨ Your enterprise SaaS is ready!');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();