const { Pool } = require('pg');
const Redis = require('ioredis');
const winston = require('winston');

/**
 * Enterprise PostgreSQL Database Manager
 * Handles connection pooling, caching, and multi-tenancy
 */
class DatabaseManager {
    constructor() {
        this.pool = null;
        this.redis = null;
        this.logger = this.setupLogger();
        this.isInitialized = false;
    }

    /**
     * Setup Winston logger
     */
    setupLogger() {
        return winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                new winston.transports.File({ 
                    filename: 'logs/error.log', 
                    level: 'error' 
                }),
                new winston.transports.File({ 
                    filename: 'logs/combined.log' 
                })
            ]
        });
    }

    /**
     * Initialize database connections
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize PostgreSQL connection pool
            this.pool = new Pool({
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME || 'shiftwizard',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || '',
                
                // Pool configuration for high concurrency
                max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections
                min: parseInt(process.env.DB_POOL_MIN || '5'),  // Minimum connections
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
                
                // Enable SSL in production
                ssl: process.env.NODE_ENV === 'production' ? {
                    rejectUnauthorized: false
                } : false
            });

            // Test database connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            this.logger.info('✅ PostgreSQL connected successfully');

            // Initialize Redis for caching
            this.redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || '',
                db: process.env.REDIS_DB || 0,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
                lazyConnect: false
            });

            await this.redis.ping();
            this.logger.info('✅ Redis connected successfully');

            // Setup error handlers
            this.pool.on('error', (err) => {
                this.logger.error('PostgreSQL pool error:', err);
            });

            this.redis.on('error', (err) => {
                this.logger.error('Redis error:', err);
            });

            this.isInitialized = true;
        } catch (error) {
            this.logger.error('Database initialization failed:', error);
            throw error;
        }
    }

    /**
     * Execute a query with tenant isolation
     */
    async query(text, params = [], options = {}) {
        const { 
            organizationId = null, 
            userId = null,
            cache = false,
            cacheTTL = 300 // 5 minutes default
        } = options;

        // Generate cache key if caching is enabled
        let cacheKey = null;
        if (cache && this.redis) {
            cacheKey = this.generateCacheKey(text, params, organizationId);
            
            // Try to get from cache
            try {
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    this.logger.debug('Cache hit:', cacheKey);
                    return JSON.parse(cached);
                }
            } catch (err) {
                this.logger.warn('Cache get error:', err);
            }
        }

        const client = await this.pool.connect();
        
        try {
            // Set tenant context for Row Level Security
            if (organizationId) {
                await client.query('SET app.current_organization = $1', [organizationId]);
            }
            if (userId) {
                await client.query('SET app.current_user = $1', [userId]);
            }

            // Execute query
            const start = Date.now();
            const result = await client.query(text, params);
            const duration = Date.now() - start;

            // Log slow queries
            if (duration > 1000) {
                this.logger.warn(`Slow query (${duration}ms):`, { text, params });
            }

            // Cache result if enabled
            if (cache && cacheKey && this.redis) {
                try {
                    await this.redis.setex(cacheKey, cacheTTL, JSON.stringify(result));
                } catch (err) {
                    this.logger.warn('Cache set error:', err);
                }
            }

            return result;
        } finally {
            client.release();
        }
    }

    /**
     * Execute a transaction
     */
    async transaction(callback, options = {}) {
        const { organizationId = null, userId = null } = options;
        const client = await this.pool.connect();
        
        try {
            // Set tenant context
            if (organizationId) {
                await client.query('SET app.current_organization = $1', [organizationId]);
            }
            if (userId) {
                await client.query('SET app.current_user = $1', [userId]);
            }

            await client.query('BEGIN');
            
            const result = await callback(client);
            
            await client.query('COMMIT');
            
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Batch insert with high performance
     */
    async batchInsert(tableName, records, options = {}) {
        if (!records || records.length === 0) {
            return { rowCount: 0 };
        }

        const { 
            organizationId = null,
            onConflict = null,
            returning = false 
        } = options;

        // Get column names from first record
        const columns = Object.keys(records[0]);
        
        // Build values array and placeholders
        const values = [];
        const placeholders = [];
        
        records.forEach((record, recordIndex) => {
            const rowPlaceholders = columns.map((col, colIndex) => {
                const paramIndex = recordIndex * columns.length + colIndex + 1;
                values.push(record[col]);
                return `$${paramIndex}`;
            });
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
        });

        // Build query
        let query = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES ${placeholders.join(', ')}
        `;

        if (onConflict) {
            query += ` ${onConflict}`;
        }

        if (returning) {
            query += ' RETURNING *';
        }

        return this.query(query, values, { organizationId });
    }

    /**
     * Upsert operation
     */
    async upsert(tableName, record, conflictColumns = ['id'], updateColumns = null) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        
        // If no update columns specified, use all except conflict columns
        if (!updateColumns) {
            updateColumns = columns.filter(col => !conflictColumns.includes(col));
        }

        const placeholders = columns.map((_, i) => `$${i + 1}`);
        const updates = updateColumns.map(col => `${col} = EXCLUDED.${col}`);

        const query = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
            ON CONFLICT (${conflictColumns.join(', ')})
            DO UPDATE SET ${updates.join(', ')}
            RETURNING *
        `;

        const result = await this.query(query, values);
        return result.rows[0];
    }

    /**
     * Find one record
     */
    async findOne(tableName, conditions, options = {}) {
        const { columns = '*', organizationId = null, cache = true } = options;
        
        const whereClause = this.buildWhereClause(conditions);
        const query = `
            SELECT ${columns}
            FROM ${tableName}
            WHERE ${whereClause.text}
            LIMIT 1
        `;

        const result = await this.query(query, whereClause.values, {
            organizationId,
            cache,
            cacheTTL: 60 // 1 minute for single records
        });

        return result.rows[0];
    }

    /**
     * Find many records
     */
    async findMany(tableName, conditions = {}, options = {}) {
        const { 
            columns = '*',
            organizationId = null,
            orderBy = null,
            limit = null,
            offset = null,
            cache = false 
        } = options;

        let query = `SELECT ${columns} FROM ${tableName}`;
        const values = [];

        // Add WHERE clause
        if (Object.keys(conditions).length > 0) {
            const whereClause = this.buildWhereClause(conditions);
            query += ` WHERE ${whereClause.text}`;
            values.push(...whereClause.values);
        }

        // Add ORDER BY
        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
        }

        // Add LIMIT and OFFSET
        if (limit) {
            query += ` LIMIT ${limit}`;
        }
        if (offset) {
            query += ` OFFSET ${offset}`;
        }

        const result = await this.query(query, values, {
            organizationId,
            cache,
            cacheTTL: 300
        });

        return result.rows;
    }

    /**
     * Update records
     */
    async update(tableName, updates, conditions, options = {}) {
        const { organizationId = null, returning = false } = options;

        const setClause = this.buildSetClause(updates);
        const whereClause = this.buildWhereClause(conditions, setClause.values.length);
        
        let query = `
            UPDATE ${tableName}
            SET ${setClause.text}
            WHERE ${whereClause.text}
        `;

        if (returning) {
            query += ' RETURNING *';
        }

        const result = await this.query(
            query,
            [...setClause.values, ...whereClause.values],
            { organizationId }
        );

        // Invalidate cache for this table
        await this.invalidateCache(tableName);

        return returning ? result.rows : result.rowCount;
    }

    /**
     * Delete records
     */
    async delete(tableName, conditions, options = {}) {
        const { organizationId = null, soft = true } = options;

        if (soft) {
            // Soft delete
            return this.update(
                tableName,
                { deleted_at: new Date() },
                conditions,
                { organizationId }
            );
        }

        // Hard delete
        const whereClause = this.buildWhereClause(conditions);
        const query = `DELETE FROM ${tableName} WHERE ${whereClause.text}`;
        
        const result = await this.query(query, whereClause.values, { organizationId });
        
        // Invalidate cache
        await this.invalidateCache(tableName);
        
        return result.rowCount;
    }

    /**
     * Build WHERE clause from conditions object
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
                const placeholders = value.map((_, i) => `$${paramIndex + i}`);
                clauses.push(`${key} IN (${placeholders.join(', ')})`);
                values.push(...value);
                paramIndex += value.length - 1;
            } else if (typeof value === 'object' && value.op) {
                // Handle operators like { op: '>', value: 5 }
                clauses.push(`${key} ${value.op} $${paramIndex}`);
                values.push(value.value);
            } else {
                clauses.push(`${key} = $${paramIndex}`);
                values.push(value);
            }
        }

        return {
            text: clauses.join(' AND '),
            values
        };
    }

    /**
     * Build SET clause for UPDATE
     */
    buildSetClause(updates) {
        const clauses = [];
        const values = [];
        let paramIndex = 0;

        for (const [key, value] of Object.entries(updates)) {
            paramIndex++;
            clauses.push(`${key} = $${paramIndex}`);
            values.push(value);
        }

        return {
            text: clauses.join(', '),
            values
        };
    }

    /**
     * Generate cache key
     */
    generateCacheKey(query, params, organizationId) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256');
        hash.update(query);
        hash.update(JSON.stringify(params));
        if (organizationId) {
            hash.update(organizationId);
        }
        return `query:${hash.digest('hex')}`;
    }

    /**
     * Invalidate cache for a table
     */
    async invalidateCache(tableName) {
        if (!this.redis) return;

        try {
            const pattern = `query:*${tableName}*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
                this.logger.debug(`Invalidated ${keys.length} cache entries for ${tableName}`);
            }
        } catch (err) {
            this.logger.warn('Cache invalidation error:', err);
        }
    }

    /**
     * Get database statistics
     */
    async getStats() {
        const poolStats = {
            total: this.pool.totalCount,
            idle: this.pool.idleCount,
            waiting: this.pool.waitingCount
        };

        // Get database size
        const sizeResult = await this.query(`
            SELECT 
                pg_database_size(current_database()) as db_size,
                pg_size_pretty(pg_database_size(current_database())) as db_size_pretty
        `);

        // Get table sizes
        const tablesResult = await this.query(`
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 10
        `);

        return {
            pool: poolStats,
            database: sizeResult.rows[0],
            topTables: tablesResult.rows
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        const checks = {
            postgres: false,
            redis: false,
            pool: false
        };

        try {
            // Check PostgreSQL
            const result = await this.query('SELECT 1');
            checks.postgres = result.rows.length === 1;

            // Check Redis
            if (this.redis) {
                const pong = await this.redis.ping();
                checks.redis = pong === 'PONG';
            }

            // Check pool
            checks.pool = this.pool && !this.pool.ended;

            return {
                healthy: checks.postgres && checks.pool,
                checks
            };
        } catch (error) {
            this.logger.error('Health check failed:', error);
            return {
                healthy: false,
                checks,
                error: error.message
            };
        }
    }

    /**
     * Close all connections
     */
    async close() {
        try {
            if (this.pool) {
                await this.pool.end();
                this.logger.info('PostgreSQL pool closed');
            }

            if (this.redis) {
                this.redis.disconnect();
                this.logger.info('Redis connection closed');
            }

            this.isInitialized = false;
        } catch (error) {
            this.logger.error('Error closing connections:', error);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new DatabaseManager();