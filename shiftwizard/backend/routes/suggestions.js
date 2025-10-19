const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const AIService = require('../services/aiService');

const router = express.Router();
router.use(authenticateToken);

/**
 * AI Suggestions API Routes
 */

// POST /api/suggestions/generate - Generate AI suggestions for coverage gaps
router.post('/generate', requireRole(['admin', 'manager']), [
    body('schedule_id').isInt().withMessage('schedule_id must be a valid integer'),
    body('coverage_gaps').isArray().withMessage('coverage_gaps must be an array'),
    body('coverage_gaps.*.shift_id').notEmpty().withMessage('Each gap must have a shift_id'),
    body('coverage_gaps.*.missing_staff').isInt({ min: 1 }).withMessage('missing_staff must be at least 1')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const aiService = new AIService();
        const organizationId = req.user.organization_id || 1;
        const { schedule_id, coverage_gaps } = req.body;

        console.log(`🤖 Generating AI suggestions for schedule ${schedule_id} with ${coverage_gaps.length} gaps`);

        const suggestions = await aiService.generateSuggestions(
            schedule_id,
            coverage_gaps,
            organizationId
        );

        res.json({
            success: true,
            message: `Generated AI suggestions for ${suggestions.length} coverage gaps`,
            data: {
                schedule_id,
                suggestions_count: suggestions.length,
                suggestions
            }
        });

    } catch (error) {
        console.error('AI suggestions generation error:', error);
        
        if (error.message.includes('AI service not available')) {
            return res.status(503).json({
                error: 'Service Unavailable',
                message: 'AI suggestion service is not configured. Please check OPENAI_API_KEY.',
                details: error.message
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to generate AI suggestions',
            details: error.message
        });
    }
});

// GET /api/suggestions/schedule/:scheduleId - Get AI suggestions for a specific schedule
router.get('/schedule/:scheduleId', async (req, res) => {
    try {
        const aiService = new AIService();
        const organizationId = req.user.organization_id || 1;
        const scheduleId = parseInt(req.params.scheduleId);

        if (isNaN(scheduleId)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid schedule ID'
            });
        }

        const suggestions = await aiService.getSuggestionsForSchedule(scheduleId, organizationId);

        res.json({
            success: true,
            data: {
                schedule_id: scheduleId,
                gaps_with_suggestions: suggestions.length,
                suggestions
            }
        });

    } catch (error) {
        console.error('Get AI suggestions error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve AI suggestions'
        });
    }
});

// POST /api/suggestions/apply - Apply an AI suggestion
router.post('/apply', requireRole(['admin', 'manager']), [
    body('schedule_id').isInt().withMessage('schedule_id must be a valid integer'),
    body('gap_id').isInt().withMessage('gap_id must be a valid integer'),
    body('suggestion_id').isInt().withMessage('suggestion_id must be a valid integer'),
    body('implementation_notes').optional().isString().withMessage('implementation_notes must be a string')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const database = require('../models/database');
        const organizationId = req.user.organization_id || 1;
        const { schedule_id, gap_id, suggestion_id, implementation_notes } = req.body;

        // Verify the schedule belongs to the user's organization
        const schedule = await database.get(`
            SELECT * FROM schedules 
            WHERE id = ? AND organization_id = ?
        `, [schedule_id, organizationId]);

        if (!schedule) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Schedule not found'
            });
        }

        // Get the gap with its AI suggestions
        const gap = await database.get(`
            SELECT * FROM scheduling_gaps
            WHERE id = ? AND schedule_id = ?
        `, [gap_id, schedule_id]);

        if (!gap) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Coverage gap not found'
            });
        }

        const aiSuggestions = gap.ai_suggestions ? JSON.parse(gap.ai_suggestions) : [];
        const suggestion = aiSuggestions.find(s => s.id === suggestion_id);

        if (!suggestion) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'AI suggestion not found'
            });
        }

        // Create a suggestion application record
        await database.run(`
            CREATE TABLE IF NOT EXISTS suggestion_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                schedule_id INTEGER,
                gap_id INTEGER,
                suggestion_id INTEGER,
                suggestion_title TEXT,
                suggestion_type TEXT,
                cost_impact REAL,
                implementation_notes TEXT,
                applied_by INTEGER,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'pending',
                FOREIGN KEY (schedule_id) REFERENCES schedules(id),
                FOREIGN KEY (gap_id) REFERENCES scheduling_gaps(id),
                FOREIGN KEY (applied_by) REFERENCES users(id)
            )
        `);

        const applicationResult = await database.run(`
            INSERT INTO suggestion_applications (
                schedule_id, gap_id, suggestion_id, suggestion_title, 
                suggestion_type, cost_impact, implementation_notes, applied_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            schedule_id, gap_id, suggestion_id, suggestion.title,
            suggestion.type, suggestion.cost_impact, 
            implementation_notes || '', req.user.id
        ]);

        // Emit real-time update about suggestion application
        const io = req.app.get('io');
        if (io) {
            io.to('scheduling').emit('suggestion-applied', {
                schedule_id,
                gap_id,
                suggestion: suggestion.title,
                type: suggestion.type,
                applied_by: req.user.full_name,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'AI suggestion applied successfully',
            data: {
                application_id: applicationResult.id,
                suggestion_title: suggestion.title,
                suggestion_type: suggestion.type,
                cost_impact: suggestion.cost_impact
            }
        });

    } catch (error) {
        console.error('Apply AI suggestion error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to apply AI suggestion'
        });
    }
});

// GET /api/suggestions/applications/:scheduleId - Get applied suggestions for a schedule
router.get('/applications/:scheduleId', async (req, res) => {
    try {
        const database = require('../models/database');
        const organizationId = req.user.organization_id || 1;
        const scheduleId = parseInt(req.params.scheduleId);

        if (isNaN(scheduleId)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid schedule ID'
            });
        }

        // Verify schedule belongs to organization
        const schedule = await database.get(`
            SELECT * FROM schedules 
            WHERE id = ? AND organization_id = ?
        `, [scheduleId, organizationId]);

        if (!schedule) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Schedule not found'
            });
        }

        // Get applied suggestions
        const applications = await database.all(`
            SELECT 
                sa.*,
                u.full_name as applied_by_name,
                sg.day,
                sg.time_range,
                sg.required_role
            FROM suggestion_applications sa
            INNER JOIN users u ON sa.applied_by = u.id
            INNER JOIN scheduling_gaps sg ON sa.gap_id = sg.id
            WHERE sa.schedule_id = ?
            ORDER BY sa.applied_at DESC
        `, [scheduleId]);

        res.json({
            success: true,
            data: {
                schedule_id: scheduleId,
                applications_count: applications.length,
                applications: applications.map(app => ({
                    id: app.id,
                    suggestion_title: app.suggestion_title,
                    suggestion_type: app.suggestion_type,
                    cost_impact: app.cost_impact,
                    implementation_notes: app.implementation_notes,
                    status: app.status,
                    applied_by: app.applied_by_name,
                    applied_at: app.applied_at,
                    gap_details: {
                        day: app.day,
                        time_range: app.time_range,
                        required_role: app.required_role
                    }
                }))
            }
        });

    } catch (error) {
        console.error('Get suggestion applications error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve suggestion applications'
        });
    }
});

// PUT /api/suggestions/feedback - Provide feedback on AI suggestions
router.put('/feedback', requireRole(['admin', 'manager']), [
    body('application_id').isInt().withMessage('application_id must be a valid integer'),
    body('effectiveness_rating').isInt({ min: 1, max: 5 }).withMessage('effectiveness_rating must be 1-5'),
    body('feedback_notes').optional().isString().withMessage('feedback_notes must be a string')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const database = require('../models/database');
        const { application_id, effectiveness_rating, feedback_notes } = req.body;

        // Create feedback table if it doesn't exist
        await database.run(`
            CREATE TABLE IF NOT EXISTS suggestion_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                application_id INTEGER,
                effectiveness_rating INTEGER,
                feedback_notes TEXT,
                feedback_by INTEGER,
                feedback_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (application_id) REFERENCES suggestion_applications(id),
                FOREIGN KEY (feedback_by) REFERENCES users(id)
            )
        `);

        // Insert feedback
        await database.run(`
            INSERT INTO suggestion_feedback (
                application_id, effectiveness_rating, feedback_notes, feedback_by
            ) VALUES (?, ?, ?, ?)
        `, [application_id, effectiveness_rating, feedback_notes || '', req.user.id]);

        res.json({
            success: true,
            message: 'Feedback recorded successfully',
            data: {
                application_id,
                effectiveness_rating,
                feedback_notes
            }
        });

    } catch (error) {
        console.error('AI suggestion feedback error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to record feedback'
        });
    }
});

// GET /api/suggestions/test - Test AI service connectivity
router.get('/test', requireRole(['admin']), async (req, res) => {
    try {
        const aiService = new AIService();
        const testResult = await aiService.testConnection();

        res.json({
            success: testResult.success,
            message: testResult.success ? 'AI service is working correctly' : 'AI service test failed',
            data: testResult
        });

    } catch (error) {
        console.error('AI service test error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to test AI service'
        });
    }
});

module.exports = router;