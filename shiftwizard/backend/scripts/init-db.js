const database = require('../models/database');

async function initializeDatabase() {
    try {
        console.log('🚀 Initializing database...');

        // Wait a moment for database connection to be established
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initialize database tables and indexes
        await database.init();

        // Add default app settings
        const defaultSettings = [
            { key: 'app_name', value: 'Roster86', description: 'Application name' },
            { key: 'timezone', value: 'UTC', description: 'Default timezone' },
            { key: 'max_hours_per_day', value: '12', description: 'Maximum hours an employee can work per day' },
            { key: 'min_break_between_shifts', value: '8', description: 'Minimum hours between shifts for same employee' },
            { key: 'auto_approve_shifts', value: 'false', description: 'Automatically approve shift assignments' }
        ];

        for (const setting of defaultSettings) {
            await database.run(
                'INSERT OR IGNORE INTO app_settings (key, value, description) VALUES (?, ?, ?)', [setting.key, setting.value, setting.description]
            );
        }

        console.log('✅ Database initialized successfully!');
        console.log('📋 Default app settings created');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase().then(() => {
        process.exit(0);
    });
}

module.exports = initializeDatabase;