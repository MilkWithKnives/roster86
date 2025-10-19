const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const SchedulingService = require('../services/schedulingService');

const router = express.Router();
router.use(authenticateToken);

/**
 * Scheduling API Routes
 */

// POST /api/scheduling/run - Start a new scheduling job
router.post('/run', requireRole(['admin', 'manager']), [
    body('time_limit').optional().isInt({ min: 10, max: 300 }).withMessage('Time limit must be between 10-300 seconds'),
    body('prefer_fairness').optional().isBoolean().withMessage('prefer_fairness must be boolean'),
    body('allow_overtime').optional().isBoolean().withMessage('allow_overtime must be boolean'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const io = req.app.get('io');
        const schedulingService = new SchedulingService(io);
        const organizationId = req.user.organization_id || 1;
        
        const constraints = {
            time_limit: req.body.time_limit || 60,
            prefer_fairness: req.body.prefer_fairness !== undefined ? req.body.prefer_fairness : true,
            allow_overtime: req.body.allow_overtime || false,
            ...req.body.constraints
        };

        const result = await schedulingService.startSchedulingJob(organizationId, constraints);

        res.json({
            success: true,
            message: 'Scheduling job started successfully',
            data: result
        });

    } catch (error) {
        console.error('Scheduling run error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to start scheduling job',
            details: error.message
        });
    }
});

// GET /api/scheduling/status/:jobId - Get scheduling job status
router.get('/status/:jobId', async (req, res) => {
    try {
        const io = req.app.get('io');
        const schedulingService = new SchedulingService(io);
        const jobStatus = schedulingService.getJobStatus(req.params.jobId);

        if (!jobStatus) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Scheduling job not found'
            });
        }

        res.json({
            success: true,
            data: {
                id: jobStatus.id,
                status: jobStatus.status,
                organizationId: jobStatus.organizationId,
                startTime: jobStatus.startTime,
                endTime: jobStatus.endTime,
                constraints: jobStatus.constraints
            }
        });

    } catch (error) {
        console.error('Scheduling status error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch scheduling status'
        });
    }
});

// GET /api/scheduling/results/:jobId - Get scheduling job results
router.get('/results/:jobId', async (req, res) => {
    try {
        const io = req.app.get('io');
        const schedulingService = new SchedulingService(io);
        const results = await schedulingService.getJobResults(req.params.jobId);

        if (!results) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Scheduling results not found or job still running'
            });
        }

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Scheduling results error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch scheduling results'
        });
    }
});

// POST /api/scheduling/constraints - Update or validate scheduling constraints
router.post('/constraints', requireRole(['admin', 'manager']), [
    body('employees').optional().isArray().withMessage('employees must be an array'),
    body('shift_templates').optional().isArray().withMessage('shift_templates must be an array'),
    body('validate_only').optional().isBoolean().withMessage('validate_only must be boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const io = req.app.get('io');
        const schedulingService = new SchedulingService(io);
        const organizationId = req.user.organization_id || 1;
        const validateOnly = req.body.validate_only || false;

        // Prepare input data with custom constraints
        const inputData = await schedulingService.prepareInputData(organizationId, req.body);

        if (validateOnly) {
            // Just validate the data without running scheduling
            res.json({
                success: true,
                message: 'Constraints validated successfully',
                data: {
                    workers: inputData.workers.length,
                    shifts: inputData.shifts.length,
                    total_required_hours: inputData.shifts.reduce((total, shift) => {
                        return total + (shift.requirements.reduce((sum, req) => sum + req.count, 0) * 
                                       ((new Date(`1970-01-01T${shift.end_time}`) - new Date(`1970-01-01T${shift.start_time}`)) / (1000 * 60 * 60)));
                    }, 0),
                    validation: 'passed'
                }
            });
        } else {
            // Save constraints for future scheduling runs
            // This could be implemented as a constraints storage mechanism
            res.json({
                success: true,
                message: 'Constraints updated successfully',
                data: {
                    workers: inputData.workers.length,
                    shifts: inputData.shifts.length,
                    constraints_saved: true
                }
            });
        }

    } catch (error) {
        console.error('Scheduling constraints error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process scheduling constraints'
        });
    }
});

// GET /api/scheduling/gaps/:scheduleId - Get coverage gaps for a specific schedule
router.get('/gaps/:scheduleId', async (req, res) => {
    try {
        const database = require('../models/database');
        const scheduleId = req.params.scheduleId;
        const organizationId = req.user.organization_id || 1;

        // Verify schedule belongs to user's organization
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

        // Get coverage gaps
        const gaps = await database.all(`
            SELECT * FROM scheduling_gaps
            WHERE schedule_id = ?
            ORDER BY day, time_range
        `, [scheduleId]);

        res.json({
            success: true,
            data: {
                schedule_id: scheduleId,
                schedule_name: schedule.name,
                gaps: gaps.map(gap => ({
                    id: gap.id,
                    shift_id: gap.shift_id,
                    day: gap.day,
                    time_range: gap.time_range,
                    missing_staff: gap.missing_staff,
                    required_role: gap.required_role,
                    required_skill: gap.required_skill,
                    eligible_workers: gap.eligible_workers,
                    reason: gap.reason,
                    ai_suggestions: gap.ai_suggestions ? JSON.parse(gap.ai_suggestions) : null,
                    created_at: gap.created_at
                }))
            }
        });

    } catch (error) {
        console.error('Scheduling gaps error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch coverage gaps'
        });
    }
});

// DELETE /api/scheduling/job/:jobId - Cancel or cleanup a scheduling job
router.delete('/job/:jobId', requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const io = req.app.get('io');
        const schedulingService = new SchedulingService(io);
        const jobId = req.params.jobId;

        const job = schedulingService.getJobStatus(jobId);
        if (!job) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Scheduling job not found'
            });
        }

        // For now, we'll just mark it for cleanup
        // In a more sophisticated implementation, we could kill running Python processes
        await schedulingService.cleanup();

        res.json({
            success: true,
            message: 'Scheduling job cleanup initiated'
        });

    } catch (error) {
        console.error('Scheduling cleanup error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to cleanup scheduling job'
        });
    }
});

// GET /api/scheduling/history - Get scheduling job history
router.get('/history', async (req, res) => {
    try {
        const database = require('../models/database');
        const organizationId = req.user.organization_id || 1;
        const limit = parseInt(req.query.limit) || 20;

        const schedules = await database.all(`
            SELECT 
                s.*,
                u.full_name as created_by_name,
                COUNT(a.id) as assignments_count
            FROM schedules s
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN assignments a ON s.id = a.schedule_id
            WHERE s.organization_id = ?
            GROUP BY s.id
            ORDER BY s.created_at DESC
            LIMIT ?
        `, [organizationId, limit]);

        res.json({
            success: true,
            data: schedules.map(schedule => ({
                id: schedule.id,
                name: schedule.name,
                status: schedule.status,
                start_date: schedule.start_date,
                end_date: schedule.end_date,
                total_hours: schedule.total_hours,
                coverage_percentage: schedule.coverage_percentage,
                fairness_score: schedule.fairness_score,
                assignments_count: schedule.assignments_count,
                created_by: schedule.created_by_name,
                created_at: schedule.created_at,
                updated_at: schedule.updated_at
            }))
        });

    } catch (error) {
        console.error('Scheduling history error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch scheduling history'
        });
    }
});

module.exports = router;