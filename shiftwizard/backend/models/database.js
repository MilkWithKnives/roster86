const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');

class Database {
    constructor() {
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('📁 Connected to SQLite database');
            }
        });
    }

    // Initialize database with proper async/await support
    async init() {
        // Enable foreign keys
        await this.run('PRAGMA foreign_keys = ON');

        // Create tables first
        await this.createTables();

        // Run migrations for existing databases
        await this.runMigrations();

        // Then create indexes
        await this.createIndexes();
    }

    async createTables() {
        const tables = [
            // Organizations table (added for multi-tenancy)
            `CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        logo_url TEXT,
        stripe_customer_id TEXT UNIQUE,
        subscription_id TEXT,
        subscription_status TEXT DEFAULT 'trial' CHECK(subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'unpaid')),
        plan_type TEXT DEFAULT 'STARTER' CHECK(plan_type IN ('STARTER', 'PROFESSIONAL', 'ENTERPRISE')),
        trial_ends_at DATETIME DEFAULT (datetime('now', '+14 days')),
        settings TEXT, -- JSON string for organization settings
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

            // Organization Invites table
            `CREATE TABLE IF NOT EXISTS organization_invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
        token TEXT UNIQUE NOT NULL,
        invited_by INTEGER NOT NULL,
        expires_at DATETIME DEFAULT (datetime('now', '+7 days')),
        accepted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE CASCADE
      )`,

            // Billing Events table
            `CREATE TABLE IF NOT EXISTS billing_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        stripe_event_id TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'failed')),
        metadata TEXT, -- JSON string for event data
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
      )`,

            // Invoices table
            `CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        stripe_invoice_id TEXT UNIQUE NOT NULL,
        amount INTEGER NOT NULL, -- amount in cents
        status TEXT NOT NULL,
        pdf_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
      )`,

            // Users table (updated with organization support)
            `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'employee' CHECK(role IN ('admin', 'manager', 'employee')),
        organization_id INTEGER,
        role_in_org TEXT DEFAULT 'member' CHECK(role_in_org IN ('owner', 'admin', 'member')),
        invited_by INTEGER,
        joined_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE SET NULL,
        FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE SET NULL
      )`,

            // Employees table
            `CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        user_id INTEGER,
        employee_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        department TEXT,
        position TEXT,
        hire_date DATE,
        hourly_rate DECIMAL(10,2),
        max_hours_per_week INTEGER DEFAULT 40,
        availability TEXT, -- JSON string for availability
        skills TEXT, -- JSON string for skills
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'terminated')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        UNIQUE(organization_id, employee_id)
      )`,

            // Shift Templates table
            `CREATE TABLE IF NOT EXISTS shift_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_duration INTEGER DEFAULT 0, -- minutes
        required_skills TEXT, -- JSON string
        min_employees INTEGER DEFAULT 1,
        max_employees INTEGER,
        department TEXT,
        color TEXT DEFAULT '#3B82F6',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
      )`,

            // Schedules table
            `CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
        description TEXT,
        total_hours DECIMAL(10,2) DEFAULT 0,
        coverage_percentage INTEGER DEFAULT 0,
        fairness_score INTEGER DEFAULT 0,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
      )`,

            // Assignments table (shifts assigned to employees)
            `CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER NOT NULL,
        employee_id INTEGER NOT NULL,
        shift_template_id INTEGER,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_duration INTEGER DEFAULT 0,
        status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
        FOREIGN KEY (shift_template_id) REFERENCES shift_templates (id) ON DELETE SET NULL
      )`,

            // App Settings table
            `CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
        ];

        // Create tables sequentially to ensure they exist before indexes
        for (const sql of tables) {
            await this.run(sql);
        }

        console.log('✅ Database tables created successfully');
    }

    async createIndexes() {
        // Create indexes for better performance
        const indexes = [
            // Organization-related indexes
            'CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id)',
            'CREATE INDEX IF NOT EXISTS idx_employees_organization ON employees(organization_id)',
            'CREATE INDEX IF NOT EXISTS idx_shift_templates_organization ON shift_templates(organization_id)',
            'CREATE INDEX IF NOT EXISTS idx_schedules_organization ON schedules(organization_id)',
            'CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON organization_invites(token)',
            'CREATE INDEX IF NOT EXISTS idx_billing_events_org ON billing_events(organization_id)',
            'CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id)',

            // Existing indexes
            'CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email)',
            'CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department)',
            'CREATE INDEX IF NOT EXISTS idx_assignments_date ON assignments(date)',
            'CREATE INDEX IF NOT EXISTS idx_assignments_employee ON assignments(employee_id)',
            'CREATE INDEX IF NOT EXISTS idx_assignments_schedule ON assignments(schedule_id)',

            // Composite indexes for common queries
            'CREATE INDEX IF NOT EXISTS idx_employees_org_status ON employees(organization_id, status)',
            'CREATE INDEX IF NOT EXISTS idx_schedules_org_status ON schedules(organization_id, status)'
        ];

        for (const sql of indexes) {
            await this.run(sql);
        }

        console.log('✅ Database indexes created successfully');
    }

    async runMigrations() {
        // Helper function to check if column exists
        const columnExists = async(tableName, columnName) => {
            const result = await this.all(`PRAGMA table_info(${tableName})`);
            return result.some(col => col.name === columnName);
        };

        // Migration: Add metrics columns to schedules table
        const schedulesExists = await this.get("SELECT name FROM sqlite_master WHERE type='table' AND name='schedules'");
        if (schedulesExists) {
            if (!await columnExists('schedules', 'total_hours')) {
                await this.run('ALTER TABLE schedules ADD COLUMN total_hours DECIMAL(10,2) DEFAULT 0');
                console.log('✅ Added total_hours column to schedules table');
            }
            if (!await columnExists('schedules', 'coverage_percentage')) {
                await this.run('ALTER TABLE schedules ADD COLUMN coverage_percentage INTEGER DEFAULT 0');
                console.log('✅ Added coverage_percentage column to schedules table');
            }
            if (!await columnExists('schedules', 'fairness_score')) {
                await this.run('ALTER TABLE schedules ADD COLUMN fairness_score INTEGER DEFAULT 0');
                console.log('✅ Added fairness_score column to schedules table');
            }
        }

        // Migration: Add organization-related columns to users table
        const usersExists = await this.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
        if (usersExists) {
            if (!await columnExists('users', 'organization_id')) {
                await this.run('ALTER TABLE users ADD COLUMN organization_id INTEGER');
                console.log('✅ Added organization_id column to users table');
            }
            if (!await columnExists('users', 'role_in_org')) {
                await this.run('ALTER TABLE users ADD COLUMN role_in_org TEXT DEFAULT \'member\'');
                console.log('✅ Added role_in_org column to users table');
            }
            if (!await columnExists('users', 'invited_by')) {
                await this.run('ALTER TABLE users ADD COLUMN invited_by INTEGER');
                console.log('✅ Added invited_by column to users table');
            }
            if (!await columnExists('users', 'joined_at')) {
                await this.run('ALTER TABLE users ADD COLUMN joined_at DATETIME');
                console.log('✅ Added joined_at column to users table');
            }
            if (!await columnExists('users', 'stripe_customer_id')) {
                await this.run('ALTER TABLE users ADD COLUMN stripe_customer_id TEXT');
                console.log('✅ Added stripe_customer_id column to users table');
            }
            if (!await columnExists('users', 'subscription_id')) {
                await this.run('ALTER TABLE users ADD COLUMN subscription_id TEXT');
                console.log('✅ Added subscription_id column to users table');
            }
            if (!await columnExists('users', 'subscription_status')) {
                await this.run('ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT \'free\'');
                console.log('✅ Added subscription_status column to users table');
            }
            if (!await columnExists('users', 'subscription_plan')) {
                await this.run('ALTER TABLE users ADD COLUMN subscription_plan TEXT DEFAULT \'free\'');
                console.log('✅ Added subscription_plan column to users table');
            }
        }

        // Migration: Add organization_id to employees table if missing
        const employeesExists = await this.get("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'");
        if (employeesExists) {
            if (!await columnExists('employees', 'organization_id')) {
                await this.run('ALTER TABLE employees ADD COLUMN organization_id INTEGER DEFAULT 1');
                console.log('✅ Added organization_id column to employees table');
            }
        }

        // Migration: Add organization_id to shift_templates table if missing
        const shiftTemplatesExists = await this.get("SELECT name FROM sqlite_master WHERE type='table' AND name='shift_templates'");
        if (shiftTemplatesExists) {
            if (!await columnExists('shift_templates', 'organization_id')) {
                await this.run('ALTER TABLE shift_templates ADD COLUMN organization_id INTEGER DEFAULT 1');
                console.log('✅ Added organization_id column to shift_templates table');
            }
        }

        // Migration: Add organization_id to schedules table if missing
        if (schedulesExists) {
            if (!await columnExists('schedules', 'organization_id')) {
                await this.run('ALTER TABLE schedules ADD COLUMN organization_id INTEGER DEFAULT 1');
                console.log('✅ Added organization_id column to schedules table');
            }
        }

        console.log('✅ Database migrations completed successfully');
    }

    // ============================================
    // User Methods (including Stripe support)
    // ============================================

    async getUserById(userId) {
        return this.get('SELECT * FROM users WHERE id = ?', [userId]);
    }

    async getUserByEmail(email) {
        return this.get('SELECT * FROM users WHERE email = ?', [email]);
    }

    async getUserByStripeCustomerId(stripeCustomerId) {
        return this.get('SELECT * FROM users WHERE stripe_customer_id = ?', [stripeCustomerId]);
    }

    async updateUserStripeCustomerId(userId, stripeCustomerId) {
        return this.run(
            'UPDATE users SET stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [stripeCustomerId, userId]
        );
    }

    async updateUserSubscription(userId, subscriptionData) {
        const {
            subscriptionId,
            status,
            planName,
            cancelAtPeriodEnd,
            lastPaymentDate
        } = subscriptionData;

        let sql = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
        let params = [];

        if (subscriptionId !== undefined) {
            sql += ', subscription_id = ?';
            params.push(subscriptionId);
        }
        if (status !== undefined) {
            sql += ', subscription_status = ?';
            params.push(status);
        }
        if (planName !== undefined) {
            sql += ', plan_name = ?';
            params.push(planName);
        }
        if (cancelAtPeriodEnd !== undefined) {
            sql += ', cancel_at_period_end = ?';
            params.push(cancelAtPeriodEnd ? 1 : 0);
        }
        if (lastPaymentDate !== undefined) {
            sql += ', last_payment_date = ?';
            params.push(lastPaymentDate);
        }

        sql += ' WHERE id = ?';
        params.push(userId);

        return this.run(sql, params);
    }


    // Generic query methods
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

// Create and export singleton instance
const database = new Database();
module.exports = database;