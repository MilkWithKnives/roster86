const { Pool } = require('pg');

class PostgresDatabase {
    constructor() {
        this.pool = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return this.pool;

        try {
            // Database connection configuration
            let config;
            
            // Support for DATABASE_URL (common in cloud deployments)
            if (process.env.DATABASE_URL) {
                config = {
                    connectionString: process.env.DATABASE_URL,
                    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                    max: parseInt(process.env.DATABASE_MAX_CONNECTIONS) || 20,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                };
            } else {
                // Individual connection parameters
                config = {
                    user: process.env.DB_USER || process.env.PGUSER || 'postgres',
                    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
                    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
                    port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
                    database: process.env.DB_NAME || process.env.PGDATABASE || 'shiftwizard_dev',
                    
                    // SSL configuration for production
                    ssl: process.env.NODE_ENV === 'production' ? {
                        rejectUnauthorized: false
                    } : false,
                    
                    // Connection pool settings
                    max: parseInt(process.env.DATABASE_MAX_CONNECTIONS) || 20,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 2000,
                };
            }

            console.log('🔌 Connecting to PostgreSQL database...');
            console.log(`📍 Host: ${config.host}:${config.port}`);
            console.log(`🗄️ Database: ${config.database}`);
            
            this.pool = new Pool(config);

            // Test the connection
            const client = await this.pool.connect();
            console.log('✅ PostgreSQL connection established successfully');
            client.release();

            // Initialize database schema
            await this.initializeSchema();

            this.initialized = true;
            return this.pool;

        } catch (error) {
            console.error('❌ Failed to connect to PostgreSQL:', error);
            throw error;
        }
    }

    async initializeSchema() {
        try {
            console.log('🏗️ Initializing database schema...');
            
            const schemaSQL = `
                -- Create users table
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255) NOT NULL,
                    role VARCHAR(50) DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Create employees table
                CREATE TABLE IF NOT EXISTS employees (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    employee_id VARCHAR(50) UNIQUE,
                    department VARCHAR(100),
                    position VARCHAR(100),
                    phone VARCHAR(20),
                    hire_date DATE,
                    skills TEXT[], -- PostgreSQL array type for skills
                    availability JSONB, -- JSON for complex availability data
                    hourly_rate DECIMAL(10,2),
                    max_hours_per_week INTEGER DEFAULT 40,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Create shift_templates table
                CREATE TABLE IF NOT EXISTS shift_templates (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    required_staff INTEGER DEFAULT 1,
                    department VARCHAR(100),
                    required_skills TEXT[],
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Create schedules table
                CREATE TABLE IF NOT EXISTS schedules (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
                    total_assignments INTEGER DEFAULT 0,
                    total_cost DECIMAL(10,2) DEFAULT 0,
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Create assignments table
                CREATE TABLE IF NOT EXISTS assignments (
                    id SERIAL PRIMARY KEY,
                    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
                    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
                    shift_template_id INTEGER REFERENCES shift_templates(id),
                    date DATE NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'absent', 'cancelled')),
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(employee_id, date, start_time) -- Prevent double-booking
                );

                -- Create scheduling_jobs table for tracking async operations
                CREATE TABLE IF NOT EXISTS scheduling_jobs (
                    id SERIAL PRIMARY KEY,
                    job_id UUID UNIQUE DEFAULT gen_random_uuid(),
                    schedule_id INTEGER REFERENCES schedules(id),
                    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
                    progress INTEGER DEFAULT 0,
                    constraints JSONB,
                    results JSONB,
                    error_message TEXT,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Create ai_suggestions table
                CREATE TABLE IF NOT EXISTS ai_suggestions (
                    id SERIAL PRIMARY KEY,
                    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
                    job_id UUID REFERENCES scheduling_jobs(job_id),
                    suggestion_type VARCHAR(100),
                    coverage_gap JSONB,
                    suggestion TEXT,
                    confidence DECIMAL(5,2),
                    estimated_cost DECIMAL(10,2),
                    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
                    applied_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Create indexes for better performance
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
                CREATE INDEX IF NOT EXISTS idx_assignments_schedule_id ON assignments(schedule_id);
                CREATE INDEX IF NOT EXISTS idx_assignments_employee_id ON assignments(employee_id);
                CREATE INDEX IF NOT EXISTS idx_assignments_date ON assignments(date);
                CREATE INDEX IF NOT EXISTS idx_scheduling_jobs_job_id ON scheduling_jobs(job_id);
                CREATE INDEX IF NOT EXISTS idx_ai_suggestions_schedule_id ON ai_suggestions(schedule_id);

                -- Create updated_at trigger function
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';

                -- Create triggers for updated_at
                DO $$
                DECLARE
                    t TEXT;
                BEGIN
                    FOR t IN SELECT table_name FROM information_schema.tables 
                             WHERE table_schema = 'public' AND table_name IN ('users', 'employees', 'shift_templates', 'schedules', 'assignments')
                    LOOP
                        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
                        EXECUTE format('CREATE TRIGGER update_%I_updated_at 
                                       BEFORE UPDATE ON %I 
                                       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
                    END LOOP;
                END;
                $$;
            `;

            await this.pool.query(schemaSQL);
            console.log('✅ Database schema initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize database schema:', error);
            throw error;
        }
    }

    async query(text, params = []) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            // Log slow queries (>100ms)
            if (duration > 100) {
                console.log('🐌 Slow query:', { text, duration, rows: result.rowCount });
            }
            
            return result;
        } catch (error) {
            console.error('❌ Database query error:', { text, params, error: error.message });
            throw error;
        }
    }

    async findAll(table, where = {}, orderBy = 'id ASC') {
        try {
            let query = `SELECT * FROM ${table}`;
            const params = [];
            
            if (Object.keys(where).length > 0) {
                const conditions = Object.keys(where).map((key, index) => {
                    params.push(where[key]);
                    return `${key} = $${index + 1}`;
                });
                query += ` WHERE ${conditions.join(' AND ')}`;
            }
            
            query += ` ORDER BY ${orderBy}`;
            
            const result = await this.query(query, params);
            return result.rows;
        } catch (error) {
            console.error(`❌ Error finding all from ${table}:`, error);
            throw error;
        }
    }

    async findById(table, id) {
        try {
            const result = await this.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error(`❌ Error finding ${table} by id ${id}:`, error);
            throw error;
        }
    }

    async create(table, data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, index) => `$${index + 1}`);
            
            const query = `
                INSERT INTO ${table} (${keys.join(', ')}) 
                VALUES (${placeholders.join(', ')}) 
                RETURNING *
            `;
            
            const result = await this.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error(`❌ Error creating ${table}:`, error);
            throw error;
        }
    }

    async update(table, id, data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const setClause = keys.map((key, index) => `${key} = $${index + 2}`);
            
            const query = `
                UPDATE ${table} 
                SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 
                RETURNING *
            `;
            
            const result = await this.query(query, [id, ...values]);
            return result.rows[0];
        } catch (error) {
            console.error(`❌ Error updating ${table} id ${id}:`, error);
            throw error;
        }
    }

    async delete(table, id) {
        try {
            const result = await this.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id]);
            return result.rows[0];
        } catch (error) {
            console.error(`❌ Error deleting ${table} id ${id}:`, error);
            throw error;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 PostgreSQL connection closed');
        }
    }

    // Health check method
    async healthCheck() {
        try {
            const result = await this.query('SELECT NOW() as current_time, version() as version');
            return {
                status: 'healthy',
                database: 'postgresql',
                currentTime: result.rows[0].current_time,
                version: result.rows[0].version,
                poolConnections: {
                    total: this.pool.totalCount,
                    idle: this.pool.idleCount,
                    waiting: this.pool.waitingCount
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

// Create a singleton instance
const database = new PostgresDatabase();

module.exports = database;