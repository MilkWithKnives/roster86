const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const fs = require('fs');

/**
 * Health Check Endpoint
 *
 * Returns system health status for monitoring and load balancers
 */

// GET /api/health - Quick health check
router.get('/', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        };

        res.status(200).json(health);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// GET /api/health/detailed - Comprehensive health check
router.get('/detailed', async (req, res) => {
    const checks = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {}
    };

    let overallHealthy = true;

    // Check 1: Database connectivity
    try {
        const database = require('../models/database');
        await database.get('SELECT 1');
        checks.checks.database = { status: 'ok', message: 'Database accessible' };
    } catch (error) {
        checks.checks.database = { status: 'error', message: error.message };
        overallHealthy = false;
    }

    // Check 2: Python availability
    try {
        const pythonPath = process.env.PYTHON_PATH || 'python3';
        execSync(`${pythonPath} --version`, { stdio: 'ignore' });
        checks.checks.python = { status: 'ok', message: 'Python available' };
    } catch (error) {
        checks.checks.python = { status: 'error', message: 'Python not found' };
        overallHealthy = false;
    }

    // Check 3: OR-Tools availability
    try {
        const pythonPath = process.env.PYTHON_PATH || 'python3';
        execSync(`${pythonPath} -c "from ortools.sat.python import cp_model"`, { stdio: 'ignore' });
        checks.checks.ortools = { status: 'ok', message: 'OR-Tools available' };
    } catch (error) {
        checks.checks.ortools = { status: 'error', message: 'OR-Tools not installed' };
        overallHealthy = false;
    }

    // Check 4: Disk space
    try {
        const stats = fs.statfsSync('.');
        const freeSpace = (stats.bfree * stats.bsize) / (1024 * 1024 * 1024); // GB
        if (freeSpace < 1) {
            checks.checks.disk = { status: 'warning', message: `Low disk space: ${freeSpace.toFixed(2)}GB` };
        } else {
            checks.checks.disk = { status: 'ok', message: `Free space: ${freeSpace.toFixed(2)}GB` };
        }
    } catch (error) {
        checks.checks.disk = { status: 'error', message: 'Cannot check disk space' };
    }

    // Check 5: Memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
    checks.checks.memory = {
        status: 'ok',
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        percentage: `${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1)}%`
    };

    // Check 6: Scheduling scripts
    try {
        const scriptPath = './restaurant_scheduling_runner.py';
        if (fs.existsSync(scriptPath)) {
            checks.checks.schedulingScripts = { status: 'ok', message: 'Scripts present' };
        } else {
            checks.checks.schedulingScripts = { status: 'error', message: 'Scripts missing' };
            overallHealthy = false;
        }
    } catch (error) {
        checks.checks.schedulingScripts = { status: 'error', message: error.message };
        overallHealthy = false;
    }

    checks.status = overallHealthy ? 'healthy' : 'unhealthy';

    const statusCode = overallHealthy ? 200 : 503;
    res.status(statusCode).json(checks);
});

// GET /api/health/ready - Readiness probe (for Kubernetes)
router.get('/ready', async (req, res) => {
    try {
        // Check if app is ready to serve requests
        const database = require('../models/database');
        await database.get('SELECT 1');

        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error.message
        });
    }
});

// GET /api/health/live - Liveness probe (for Kubernetes)
router.get('/live', (req, res) => {
    // Simple check - if we can respond, we're alive
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
