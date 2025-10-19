const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const database = require('./models/database');
const MetricsService = require('./services/metricsService');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const shiftTemplateRoutes = require('./routes/shift-templates');
const scheduleRoutes = require('./routes/schedules');
const assignmentRoutes = require('./routes/assignments');
const appSettingsRoutes = require('./routes/app-settings');
const integrationRoutes = require('./routes/integrations');
const paymentRoutes = require('./routes/payments');
const metricsRoutes = require('./routes/metrics');
const schedulingRoutes = require('./routes/scheduling');
const suggestionsRoutes = require('./routes/suggestions');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
    cors: {
        origin: [
            ...(process.env.NODE_ENV === 'development' ? [
                'http://localhost:5173',
                'http://localhost:5174',
                'http://localhost:3000'
            ] : []),
            'https://roster86.com',
            'https://www.roster86.com',
            process.env.FRONTEND_URL
        ].filter(Boolean),
        credentials: true
    }
});

// ⚠️ IMPORTANT: Stripe webhooks must be registered BEFORE express.json() middleware
// because Stripe needs the raw request body to verify signatures
const webhookRoutes = require('./routes/webhooks');
app.use('/api/webhooks', webhookRoutes);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());

// CORS configuration - allow multiple origins
const allowedOrigins = [
    // Only include localhost origins in development
    ...(process.env.NODE_ENV === 'development' ? [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000'
    ] : []),
    'https://roster86.com',
    'https://www.roster86.com',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
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
app.use('/api/payments', paymentRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api', integrationRoutes);

// Error handling middleware
// eslint-disable-next-line no-unused-vars
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

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join dashboard room for real-time metrics
    socket.on('join-dashboard', () => {
        socket.join('dashboard');
        console.log(`📊 Client ${socket.id} joined dashboard room`);
    });

    // Join scheduling room for algorithm updates
    socket.on('join-scheduling', () => {
        socket.join('scheduling');
        console.log(`⚙️ Client ${socket.id} joined scheduling room`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Make io available to routes
app.set('io', io);

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

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 ShiftWizard Backend running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🔌 WebSocket server enabled`);
            console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5175'}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

            // Initialize metrics service for periodic updates
            const metricsService = new MetricsService(io);
            
            // Update metrics every 30 seconds for real-time dashboard
            setInterval(async () => {
                try {
                    if (io.engine.clientsCount > 0) {
                        await metricsService.calculateMetrics(1); // Default org ID
                    }
                } catch (error) {
                    console.error('Periodic metrics update error:', error);
                }
            }, 30000);
            
            console.log(`📊 Real-time metrics enabled (30s intervals)`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();