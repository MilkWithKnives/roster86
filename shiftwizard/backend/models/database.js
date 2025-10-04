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

        // Then create indexes
        await this.createIndexes();
    }

    async createTables() {
        const tables = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'employee' CHECK(role IN ('admin', 'manager', 'employee')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

            // Employees table
            `CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        employee_id TEXT UNIQUE NOT NULL,
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
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      )`,

            // Shift Templates table
            `CREATE TABLE IF NOT EXISTS shift_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

            // Schedules table
            `CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
        description TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
            'CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email)',
            'CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department)',
            'CREATE INDEX IF NOT EXISTS idx_assignments_date ON assignments(date)',
            'CREATE INDEX IF NOT EXISTS idx_assignments_employee ON assignments(employee_id)',
            'CREATE INDEX IF NOT EXISTS idx_assignments_schedule ON assignments(schedule_id)'
        ];

        for (const sql of indexes) {
            await this.run(sql);
        }

        console.log('✅ Database indexes created successfully');
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