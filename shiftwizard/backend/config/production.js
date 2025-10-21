/**
 * Production Configuration Validator
 *
 * Validates environment variables and provides safe defaults
 */

const fs = require('fs');
const path = require('path');

class ProductionConfig {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.config = {};

        this.load();
        this.validate();
    }

    load() {
        // Load environment variables
        this.config = {
            // Core
            nodeEnv: process.env.NODE_ENV || 'production',
            port: parseInt(process.env.PORT) || 3000,

            // Scheduling Engine
            useAdvancedScheduler: process.env.USE_ADVANCED_SCHEDULER !== 'false',
            defaultSolverTimeLimit: this.parseNumber(process.env.DEFAULT_SOLVER_TIME_LIMIT, 60, 10, 300),
            solverParallelWorkers: this.parseNumber(process.env.SOLVER_PARALLEL_WORKERS, 4, 1, 8),
            maxWorkers: this.parseNumber(process.env.MAX_WORKERS, 100, 1, 1000),
            maxShiftsPerWeek: this.parseNumber(process.env.MAX_SHIFTS_PER_WEEK, 500, 1, 5000),

            // Budget Defaults
            defaultWeeklyBudget: this.parseNumber(process.env.DEFAULT_WEEKLY_BUDGET, 8000, 1000, 100000),
            defaultDailyBudget: this.parseNumber(process.env.DEFAULT_DAILY_BUDGET, 1200, 100, 10000),

            // Fairness Defaults
            defaultMaxConsecutiveDays: this.parseNumber(process.env.DEFAULT_MAX_CONSECUTIVE_DAYS, 6, 3, 7),
            defaultMinRestHours: this.parseNumber(process.env.DEFAULT_MIN_REST_HOURS, 12, 8, 24),
            defaultMaxShiftImbalance: this.parseNumber(process.env.DEFAULT_MAX_SHIFT_IMBALANCE, 4, 1, 10),

            // Database
            databasePath: process.env.DATABASE_PATH || './database.sqlite',
            databaseBackupPath: process.env.DATABASE_BACKUP_PATH || './backups',

            // Logging
            logLevel: process.env.LOG_LEVEL || 'info',
            logFile: process.env.LOG_FILE || './logs/production.log',

            // Security
            jwtSecret: process.env.JWT_SECRET,
            corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
            rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '15m',
            rateLimitMaxRequests: this.parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100, 1, 10000),

            // Python
            pythonPath: process.env.PYTHON_PATH || 'python3',
            pythonTimeout: this.parseNumber(process.env.PYTHON_TIMEOUT, 300, 10, 3600),

            // Monitoring
            enableMonitoring: process.env.ENABLE_MONITORING !== 'false',
            enableErrorTracking: process.env.ENABLE_ERROR_TRACKING === 'true',

            // Caching
            cacheTTL: this.parseNumber(process.env.CACHE_TTL, 3600, 60, 86400),
        };
    }

    parseNumber(value, defaultValue, min, max) {
        const parsed = parseInt(value);
        if (isNaN(parsed)) return defaultValue;
        return Math.max(min, Math.min(max, parsed));
    }

    validate() {
        // CRITICAL: JWT Secret must be set in production
        if (!this.config.jwtSecret || this.config.jwtSecret === 'your-secret-key-change-in-production') {
            this.errors.push('JWT_SECRET must be set to a secure random string in production');
        }

        // CRITICAL: Database must be writable
        try {
            const dbDir = path.dirname(this.config.databasePath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
        } catch (error) {
            this.errors.push(`Database directory not writable: ${error.message}`);
        }

        // CRITICAL: Log directory must exist
        try {
            const logDir = path.dirname(this.config.logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        } catch (error) {
            this.errors.push(`Log directory not writable: ${error.message}`);
        }

        // CRITICAL: Python must be available
        try {
            const { execSync } = require('child_process');
            execSync(`${this.config.pythonPath} --version`, { stdio: 'ignore' });
        } catch (error) {
            this.errors.push(`Python not found at ${this.config.pythonPath}. Install Python 3.11+`);
        }

        // WARNING: CORS origins should be set
        if (this.config.corsOrigins.length === 0) {
            this.warnings.push('CORS_ORIGINS not set. API will reject cross-origin requests.');
        }

        // WARNING: Monitoring should be enabled
        if (!this.config.enableMonitoring) {
            this.warnings.push('Monitoring is disabled. Enable for production visibility.');
        }

        // Report results
        if (this.errors.length > 0) {
            console.error('\n❌ PRODUCTION CONFIG ERRORS:');
            this.errors.forEach(err => console.error(`  • ${err}`));
            console.error('\nFix these errors before deploying to production!\n');
            process.exit(1);
        }

        if (this.warnings.length > 0) {
            console.warn('\n⚠️  PRODUCTION CONFIG WARNINGS:');
            this.warnings.forEach(warn => console.warn(`  • ${warn}`));
            console.warn('');
        }

        console.log('✅ Production configuration validated successfully\n');
    }

    get() {
        return this.config;
    }
}

// Singleton instance
let instance = null;

module.exports = {
    getConfig: () => {
        if (!instance) {
            instance = new ProductionConfig();
        }
        return instance.get();
    },

    validateConfig: () => {
        if (!instance) {
            instance = new ProductionConfig();
        }
        return instance.errors.length === 0;
    }
};
