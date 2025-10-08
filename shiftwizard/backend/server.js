const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const database = require('./models/database');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const shiftTemplateRoutes = require('./routes/shift-templates');
const scheduleRoutes = require('./routes/schedules');
const assignmentRoutes = require('./routes/assignments');
const appSettingsRoutes = require('./routes/app-settings');
const integrationRoutes = require('./routes/integrations');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/shift-templates', shiftTemplateRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/app-settings', appSettingsRoutes);
app.use('/api', integrationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.message
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token'
        });
    }

    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});

// Start server
async function startServer() {
    try {
        // Initialize database first
        await database.init();
        console.log('✅ Database initialized successfully');

        app.listen(PORT, () => {
            console.log(`🚀 ShiftWizard Backend running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5175'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();