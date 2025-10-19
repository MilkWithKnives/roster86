const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const MetricsService = require('../services/metricsService');

const router = express.Router();
router.use(authenticateToken);

/**
 * Real-time Metrics API Routes
 */

// GET /api/metrics/dashboard - Get current dashboard metrics
router.get('/dashboard', async (req, res) => {
    try {
        const io = req.app.get('io');
        const metricsService = new MetricsService(io);
        const organizationId = req.user.organization_id || 1;

        const metrics = await metricsService.calculateMetrics(organizationId);
        
        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        console.error('Dashboard metrics error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch dashboard metrics'
        });
    }
});

// GET /api/metrics/coverage - Get detailed coverage information
router.get('/coverage', async (req, res) => {
    try {
        const io = req.app.get('io');
        const metricsService = new MetricsService(io);
        const organizationId = req.user.organization_id || 1;

        const coverageMetrics = await metricsService.calculateCoverageMetrics(organizationId);
        
        res.json({
            success: true,
            data: coverageMetrics
        });
    } catch (error) {
        console.error('Coverage metrics error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch coverage metrics'
        });
    }
});

// GET /api/metrics/employees - Get employee utilization metrics
router.get('/employees', async (req, res) => {
    try {
        const io = req.app.get('io');
        const metricsService = new MetricsService(io);
        const organizationId = req.user.organization_id || 1;

        const employeeStats = await metricsService.calculateEmployeeStats(organizationId);
        
        res.json({
            success: true,
            data: employeeStats
        });
    } catch (error) {
        console.error('Employee metrics error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch employee metrics'
        });
    }
});

// POST /api/metrics/refresh - Manually refresh and broadcast metrics
router.post('/refresh', async (req, res) => {
    try {
        const io = req.app.get('io');
        const metricsService = new MetricsService(io);
        const organizationId = req.user.organization_id || 1;

        // Calculate and broadcast updated metrics
        const metrics = await metricsService.calculateMetrics(organizationId);
        
        // Send immediate response
        res.json({
            success: true,
            message: 'Metrics refreshed and broadcast to connected clients',
            data: metrics
        });
    } catch (error) {
        console.error('Metrics refresh error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to refresh metrics'
        });
    }
});

// POST /api/metrics/alert - Send custom coverage alert
router.post('/alert', async (req, res) => {
    try {
        const io = req.app.get('io');
        const metricsService = new MetricsService(io);
        const organizationId = req.user.organization_id || 1;

        const { type, message, severity, details } = req.body;

        if (!type || !message) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Type and message are required'
            });
        }

        const alert = {
            type,
            message,
            severity: severity || 'medium',
            details: details || {},
            triggeredBy: req.user.full_name
        };

        await metricsService.emitCoverageAlert(organizationId, alert);

        res.json({
            success: true,
            message: 'Alert sent successfully',
            data: alert
        });
    } catch (error) {
        console.error('Alert error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to send alert'
        });
    }
});

// GET /api/metrics/health - Health check for metrics service
router.get('/health', async (req, res) => {
    try {
        const io = req.app.get('io');
        const connectedClients = io.engine.clientsCount;

        res.json({
            success: true,
            data: {
                status: 'healthy',
                connectedClients,
                timestamp: new Date().toISOString(),
                websocketEnabled: !!io
            }
        });
    } catch (error) {
        console.error('Metrics health check error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Health check failed'
        });
    }
});

module.exports = router;