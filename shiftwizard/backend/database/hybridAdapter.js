const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Hybrid Database Adapter
 * Works with SQLite for development/testing and PostgreSQL for production
 * This allows you to start immediately without PostgreSQL setup
 */
class HybridDatabaseAdapter {
    constructor() {
        this.db = null;
        this.isPostgres = false;
        this.isSQLite = false;
    }

    /**
     * Initialize the appropriate database
     */
    async initialize() {
        // Check if PostgreSQL is configured and available
        if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
            try {
                // Try to connect to PostgreSQL
                const postgres = require('./postgres');
                await postgres.initialize();
                this.db = postgres;
                this.isPostgres = true;
                console.log('✅ Using PostgreSQL database');
                return;
            } catch (error) {
                console.log('⚠️  PostgreSQL not available, falling back to SQLite');
            }
        }

        // Fall back to SQLite
        await this.initializeSQLite();
    }

    /**
     * Initialize SQLite with enhanced schema for multi-tenancy
     */
    async initializeSQLite() {
        const dbPath = path.join(__dirname, '../database_enhanced.sqlite');
        
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening SQLite database:', err);
                throw err;
            }
            console.log('✅ Using SQLite database (development mode)');
        });

        this.isSQLite = true;

        // Create enhanced schema
        await this.createEnhancedSchema();
    }

    /**
     * Create enhanced SQLite schema with organization support
     */
    async createEnhancedSchema() {
        const schemas = [
            // Organizations table
            `CREATE TABLE IF NOT EXISTS organizations (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                license_key TEXT UNIQUE NOT NULL,
                license_type TEXT DEFAULT 'trial',
                license_expires_at DATETIME,
                license_seats INTEGER DEFAULT 10,
                seats_used INTEGER DEFAULT 0,
                max_locations INTEGER DEFAULT 1,
                
                stripe_customer_id TEXT UNIQUE,
                stripe_subscription_id TEXT,
                subscription_status TEXT,
                billing_email TEXT,
                
                settings TEXT DEFAULT '{}',
                features TEXT DEFAULT '{}',
                timezone TEXT DEFAULT 'UTC',
                locale TEXT DEFAULT 'en-US',
                status TEXT DEFAULT 'trial',
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME
            )`,

            // Enhanced users table with organization support
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                organization_id TEXT REFERENCES organizations(id),
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                phone TEXT,
                role TEXT DEFAULT 'employee',
                
                location_ids TEXT DEFAULT '[]',
                default_location_id TEXT,
                
                mfa_secret TEXT,
                mfa_enabled INTEGER DEFAULT 0,
                mfa_backup_codes TEXT,
                email_verified INTEGER DEFAULT 0,
                email_verification_token TEXT,
                password_reset_token TEXT,
                password_reset_expires DATETIME,
                
                last_login_at DATETIME,
                last_login_ip TEXT,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until DATETIME,
                
                permissions TEXT DEFAULT '{}',
                preferences TEXT DEFAULT '{}',
                
                employee_id TEXT,
                department TEXT,
                position TEXT,
                hire_date DATE,
                hourly_rate DECIMAL(10,2),
                overtime_rate DECIMAL(10,2),
                max_hours_per_week INTEGER DEFAULT 40,
                min_hours_per_week INTEGER DEFAULT 0,
                skills TEXT DEFAULT '[]',
                certifications TEXT DEFAULT '[]',
                availability TEXT DEFAULT '{}',
                
                created_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME,
                
                UNIQUE(organization_id, email)
            )`,

            // Locations table
            `CREATE TABLE IF NOT EXISTS locations (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                organization_id TEXT NOT NULL REFERENCES organizations(id),
                name TEXT NOT NULL,
                code TEXT,
                address TEXT,
                city TEXT,
                state TEXT,
                country TEXT,
                postal_code TEXT,
                phone TEXT,
                email TEXT,
                timezone TEXT,
                settings TEXT DEFAULT '{}',
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME,
                
                UNIQUE(organization_id, code)
            )`,

            // License keys table
            `CREATE TABLE IF NOT EXISTS license_keys (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                organization_id TEXT UNIQUE NOT NULL REFERENCES organizations(id),
                key TEXT UNIQUE NOT NULL,
                key_hash TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL,
                seats INTEGER DEFAULT 10,
                features TEXT DEFAULT '{}',
                
                issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                activated_at DATETIME,
                expires_at DATETIME,
                last_validated_at DATETIME,
                
                validation_count INTEGER DEFAULT 0,
                last_validation_ip TEXT,
                
                is_active INTEGER DEFAULT 1,
                suspended_at DATETIME,
                suspended_reason TEXT,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Sessions table
            `CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                user_id TEXT NOT NULL REFERENCES users(id),
                organization_id TEXT NOT NULL REFERENCES organizations(id),
                
                token_hash TEXT UNIQUE NOT NULL,
                refresh_token_hash TEXT UNIQUE,
                
                device_id TEXT,
                device_name TEXT,
                browser TEXT,
                os TEXT,
                ip_address TEXT,
                
                expires_at DATETIME NOT NULL,
                last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                revoked_at DATETIME
            )`,

            // API Keys table
            `CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                organization_id TEXT NOT NULL REFERENCES organizations(id),
                name TEXT NOT NULL,
                key_hash TEXT UNIQUE NOT NULL,
                key_prefix TEXT NOT NULL,
                permissions TEXT DEFAULT '{}',
                rate_limit INTEGER DEFAULT 1000,
                last_used_at DATETIME,
                last_used_ip TEXT,
                expires_at DATETIME,
                created_by TEXT REFERENCES users(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                revoked_at DATETIME
            )`,

            // Invitations table
            `CREATE TABLE IF NOT EXISTS invitations (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                organization_id TEXT NOT NULL REFERENCES organizations(id),
                email TEXT NOT NULL,
                role TEXT DEFAULT 'employee',
                token TEXT UNIQUE NOT NULL,
                invited_by TEXT REFERENCES users(id),
                accepted_at DATETIME,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Enhanced schedules with organization support
            `CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                organization_id TEXT NOT NULL REFERENCES organizations(id),
                location_id TEXT REFERENCES locations(id),
                name TEXT NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                
                total_hours DECIMAL(10,2) DEFAULT 0,
                total_cost DECIMAL(10,2) DEFAULT 0,
                coverage_score INTEGER DEFAULT 0,
                
                status TEXT DEFAULT 'draft',
                published_at DATETIME,
                published_by TEXT REFERENCES users(id),
                
                settings TEXT DEFAULT '{}',
                notes TEXT,
                
                created_by TEXT REFERENCES users(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME
            )`,

            // Enhanced shifts with organization support
            `CREATE TABLE IF NOT EXISTS shifts (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                organization_id TEXT NOT NULL REFERENCES organizations(id),
                schedule_id TEXT REFERENCES schedules(id),
                location_id TEXT REFERENCES locations(id),
                template_id TEXT,
                
                user_id TEXT REFERENCES users(id),
                
                date DATE NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME NOT NULL,
                break_minutes INTEGER DEFAULT 0,
                
                actual_start_time DATETIME,
                actual_end_time DATETIME,
                actual_break_minutes INTEGER,
                
                status TEXT DEFAULT 'draft',
                
                hourly_rate DECIMAL(10,2),
                total_hours DECIMAL(10,2),
                total_cost DECIMAL(10,2),
                
                notes TEXT,
                manager_notes TEXT,
                
                created_by TEXT REFERENCES users(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME
            )`,

            // Audit logs table
            `CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                organization_id TEXT NOT NULL,
                user_id TEXT,
                
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                
                old_values TEXT,
                new_values TEXT,
                
                ip_address TEXT,
                user_agent TEXT,
                request_id TEXT,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Usage statistics
            `CREATE TABLE IF NOT EXISTS usage_statistics (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                organization_id TEXT NOT NULL REFERENCES organizations(id),
                date DATE NOT NULL,
                
                active_users INTEGER DEFAULT 0,
                shifts_created INTEGER DEFAULT 0,
                schedules_published INTEGER DEFAULT 0,
                api_calls INTEGER DEFAULT 0,
                storage_used_mb INTEGER DEFAULT 0,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(organization_id, date)
            )`
        ];

        // Create all tables
        for (const schema of schemas) {
            await this.run(schema);
        }

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_org_slug ON organizations(slug)',
            'CREATE INDEX IF NOT EXISTS idx_org_license ON organizations(license_key)',
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id)',
            'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)',
            'CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)',
            'CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(organization_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id, created_at)'
        ];

        for (const index of indexes) {
            await this.run(index);
        }

        console.log('✅ Enhanced SQLite schema created');
    }

    /**
     * Promisified run method for SQLite
     */
    run(sql, params = []) {
        if (this.isPostgres) {
            return this.db.query(sql, params);
        }

        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    /**
     * Promisified get method for SQLite
     */
    get(sql, params = []) {
        if (this.isPostgres) {
            return this.db.query(sql, params).then(result => result.rows[0]);
        }

        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    /**
     * Promisified all method for SQLite
     */
    all(sql, params = []) {
        if (this.isPostgres) {
            return this.db.query(sql, params).then(result => result.rows);
        }

        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Query method compatible with both databases
     */
    async query(text, params = [], options = {}) {
        if (this.isPostgres) {
            return this.db.query(text, params, options);
        }

        // SQLite compatibility
        const command = text.trim().toUpperCase().split(' ')[0];
        
        switch (command) {
            case 'SELECT':
                const rows = await this.all(text, params);
                return { rows, rowCount: rows.length };
            
            case 'INSERT':
            case 'UPDATE':
            case 'DELETE':
                const result = await this.run(text, params);
                return { 
                    rows: [], 
                    rowCount: result.changes,
                    lastID: result.lastID 
                };
            
            default:
                await this.run(text, params);
                return { rows: [], rowCount: 0 };
        }
    }

    /**
     * Find one record (compatible with both DBs)
     */
    async findOne(tableName, conditions, options = {}) {
        if (this.isPostgres) {
            return this.db.findOne(tableName, conditions, options);
        }

        const { columns = '*' } = options;
        const whereClause = this.buildWhereClause(conditions);
        const query = `SELECT ${columns} FROM ${tableName} WHERE ${whereClause.text} LIMIT 1`;
        
        return this.get(query, whereClause.values);
    }

    /**
     * Find many records (compatible with both DBs)
     */
    async findMany(tableName, conditions = {}, options = {}) {
        if (this.isPostgres) {
            return this.db.findMany(tableName, conditions, options);
        }

        const { 
            columns = '*',
            orderBy = null,
            limit = null,
            offset = null
        } = options;

        let query = `SELECT ${columns} FROM ${tableName}`;
        const values = [];

        if (Object.keys(conditions).length > 0) {
            const whereClause = this.buildWhereClause(conditions);
            query += ` WHERE ${whereClause.text}`;
            values.push(...whereClause.values);
        }

        if (orderBy) query += ` ORDER BY ${orderBy}`;
        if (limit) query += ` LIMIT ${limit}`;
        if (offset) query += ` OFFSET ${offset}`;

        return this.all(query, values);
    }

    /**
     * Update records (compatible with both DBs)
     */
    async update(tableName, updates, conditions, options = {}) {
        if (this.isPostgres) {
            return this.db.update(tableName, updates, conditions, options);
        }

        const { returning = false } = options;
        const setClause = this.buildSetClause(updates);
        const whereClause = this.buildWhereClause(conditions, setClause.values.length);
        
        let query = `UPDATE ${tableName} SET ${setClause.text} WHERE ${whereClause.text}`;
        const result = await this.run(query, [...setClause.values, ...whereClause.values]);
        
        if (returning && result.changes > 0) {
            return this.findMany(tableName, conditions);
        }
        
        return result.changes;
    }

    /**
     * Build WHERE clause
     */
    buildWhereClause(conditions, startIndex = 0) {
        const clauses = [];
        const values = [];
        let paramIndex = startIndex;

        for (const [key, value] of Object.entries(conditions)) {
            paramIndex++;
            
            if (value === null) {
                clauses.push(`${key} IS NULL`);
            } else if (Array.isArray(value)) {
                const placeholders = value.map((_, i) => `?`);
                clauses.push(`${key} IN (${placeholders.join(', ')})`);
                values.push(...value);
            } else {
                clauses.push(`${key} = ?`);
                values.push(value);
            }
        }

        return {
            text: clauses.join(' AND '),
            values
        };
    }

    /**
     * Build SET clause
     */
    buildSetClause(updates) {
        const clauses = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            clauses.push(`${key} = ?`);
            
            // Handle JSON fields for SQLite
            if (typeof value === 'object' && value !== null) {
                values.push(JSON.stringify(value));
            } else {
                values.push(value);
            }
        }

        return {
            text: clauses.join(', '),
            values
        };
    }

    /**
     * Get pool for PostgreSQL compatibility
     */
    get pool() {
        if (this.isPostgres) {
            return this.db.pool;
        }
        
        // Return a mock pool for SQLite
        return {
            connect: async () => ({
                query: (text, params) => this.query(text, params),
                release: () => {}
            })
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        if (this.isPostgres) {
            return this.db.healthCheck();
        }

        try {
            await this.get('SELECT 1');
            return {
                healthy: true,
                checks: {
                    database: true,
                    type: 'SQLite'
                }
            };
        } catch (error) {
            return {
                healthy: false,
                checks: {
                    database: false,
                    type: 'SQLite'
                },
                error: error.message
            };
        }
    }
}

module.exports = new HybridDatabaseAdapter();