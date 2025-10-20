const path = require('path');

class DatabaseConfig {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        const nodeEnv = process.env.NODE_ENV || 'development';
        
        // PostgreSQL configuration
        if (this.shouldUsePostgreSQL()) {
            return {
                type: 'postgresql',
                connection: {
                    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
                    port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
                    database: process.env.DB_NAME || process.env.PGDATABASE || 'shiftwizard_dev',
                    user: process.env.DB_USER || process.env.PGUSER || 'postgres',
                    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
                    ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
                    max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                }
            };
        }

        // SQLite configuration (default for development)
        return {
            type: 'sqlite',
            connection: {
                filename: process.env.DB_PATH || path.join(__dirname, '../data/shiftwizard.db')
            }
        };
    }

    shouldUsePostgreSQL() {
        // Use PostgreSQL if:
        // 1. DATABASE_URL is set (common in production)
        // 2. USE_POSTGRESQL environment variable is set
        // 3. Production environment with PostgreSQL connection details
        return !!(
            process.env.DATABASE_URL ||
            process.env.USE_POSTGRESQL === 'true' ||
            (process.env.NODE_ENV === 'production' && process.env.DB_HOST)
        );
    }

    getDatabase() {
        if (this.config.type === 'postgresql') {
            return require('../models/databasePostgres');
        } else {
            return require('../models/database');
        }
    }

    getDatabaseInfo() {
        return {
            type: this.config.type,
            connection: this.config.type === 'postgresql' 
                ? `${this.config.connection.host}:${this.config.connection.port}/${this.config.connection.database}`
                : this.config.connection.filename
        };
    }
}

module.exports = new DatabaseConfig();