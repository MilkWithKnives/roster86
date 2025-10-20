#!/usr/bin/env node

require('dotenv').config();
const dbConfig = require('../config/database');

async function testDatabase() {
    console.log('🧪 Testing Database Connection...\n');
    
    const dbInfo = dbConfig.getDatabaseInfo();
    console.log(`📊 Database Type: ${dbInfo.type}`);
    console.log(`🔗 Connection: ${dbInfo.connection}\n`);
    
    try {
        const database = dbConfig.getDatabase();
        
        console.log('🔌 Initializing database connection...');
        await database.init();
        
        console.log('✅ Database connection successful!\n');
        
        // Test basic operations
        console.log('🧪 Testing basic operations...');
        
        if (dbInfo.type === 'postgresql') {
            // Test PostgreSQL specific operations
            console.log('🐘 Testing PostgreSQL operations...');
            
            const healthCheck = await database.healthCheck();
            console.log('Health Check:', healthCheck);
            
            // Test a simple query
            const result = await database.query('SELECT version() as version, now() as current_time');
            console.log('Database Info:', result.rows[0]);
            
        } else {
            // Test SQLite operations
            console.log('🗃️ Testing SQLite operations...');
            
            // Test a simple query
            const result = await database.query("SELECT sqlite_version() as version, datetime('now') as current_time");
            console.log('Database Info:', result);
        }
        
        console.log('\n✅ All database tests passed!');
        
    } catch (error) {
        console.error('\n❌ Database test failed:', error.message);
        
        if (dbInfo.type === 'postgresql') {
            console.log('\n💡 PostgreSQL troubleshooting tips:');
            console.log('1. Make sure PostgreSQL is running');
            console.log('2. Check connection details in environment variables:');
            console.log('   - DB_HOST (or PGHOST)');
            console.log('   - DB_PORT (or PGPORT)');
            console.log('   - DB_NAME (or PGDATABASE)');
            console.log('   - DB_USER (or PGUSER)');
            console.log('   - DB_PASSWORD (or PGPASSWORD)');
            console.log('3. Or set DATABASE_URL for full connection string');
            console.log('\n🔧 To use SQLite instead, remove PostgreSQL environment variables');
        } else {
            console.log('\n💡 SQLite troubleshooting tips:');
            console.log('1. Make sure the data directory exists');
            console.log('2. Check file permissions');
            console.log('3. Ensure sufficient disk space');
        }
        
        process.exit(1);
    } finally {
        // Close database connection
        if (database && database.close) {
            await database.close();
            console.log('🔌 Database connection closed');
        }
        
        process.exit(0);
    }
}

// Handle command line arguments
if (process.argv[2] === '--postgres') {
    process.env.USE_POSTGRESQL = 'true';
    console.log('🐘 Forcing PostgreSQL connection...\n');
}

testDatabase();