const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/schedules
router.get('/', async(req, res) => {
    try {
        // Support orderBy query param for sorting
        const orderBy = req.query.orderBy || 'start_date';
        const limit = req.query.limit ? parseInt(req.query.limit) : null;

        // Map frontend field names to backend field names
        const orderByMap = {
            '-created_date': 'created_at DESC',
            'created_date': 'created_at ASC',
            '-start_date': 'start_date DESC',
            'start_date': 'start_date ASC'
        };

        const orderClause = orderByMap[orderBy] || 'start_date DESC';
        const limitClause = limit ? `LIMIT ${limit}` : '';

        const schedules = await database.all(
            `SELECT * FROM schedules ORDER BY ${orderClause} ${limitClause}`
        );
        res.json(schedules);
    } catch (error) {
        console.error('Get schedules error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch schedules' });
    }
});

// GET /api/schedules/:id
router.get('/:id', async(req, res) => {
    try {
        const schedule = await database.get('SELECT * FROM schedules WHERE id = ?', [req.params.id]);
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        res.json(schedule);
    } catch (error) {
        console.error('Get schedule error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch schedule' });
    }
});

// POST /api/schedules
router.post('/', requireRole(['admin', 'manager']), [
    body('start_date').optional().isISO8601().withMessage('Invalid start date'),
    body('week_start_date').optional().isISO8601().withMessage('Invalid week start date'),
    body('end_date').optional().isISO8601().withMessage('Invalid end date')
], async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation Error', details: errors.array() });
        }

        // Support both old and new field names for backward compatibility
        const start_date = req.body.start_date || req.body.week_start_date;
        const description = req.body.description || req.body.notes || '';

        if (!start_date) {
            return res.status(400).json({ error: 'Validation Error', details: [{ msg: 'start_date or week_start_date is required' }] });
        }

        // Calculate end_date as 6 days after start_date if not provided
        let end_date = req.body.end_date;
        if (!end_date) {
            const startDateObj = new Date(start_date);
            startDateObj.setDate(startDateObj.getDate() + 6);
            end_date = startDateObj.toISOString().split('T')[0];
        }

        // Generate a name if not provided
        const name = req.body.name || `Schedule for week of ${start_date}`;
        const status = req.body.status || 'draft';
        const total_hours = req.body.total_hours || 0;
        const coverage_percentage = req.body.coverage_percentage || 0;
        const fairness_score = req.body.fairness_score || 0;

        const result = await database.run(
            'INSERT INTO schedules (name, start_date, end_date, description, status, total_hours, coverage_percentage, fairness_score, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, start_date, end_date, description, status, total_hours, coverage_percentage, fairness_score, req.user.id]
        );

        const newSchedule = await database.get('SELECT * FROM schedules WHERE id = ?', [result.id]);
        res.status(201).json(newSchedule);
    } catch (error) {
        console.error('Create schedule error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create schedule' });
    }
});

// PUT /api/schedules/:id
router.put('/:id', requireRole(['admin', 'manager']), async(req, res) => {
    try {
        // Get the existing schedule first
        const existing = await database.get('SELECT * FROM schedules WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Support both old and new field names, keep existing values if not provided
        const name = req.body.name || existing.name;
        const start_date = req.body.start_date || req.body.week_start_date || existing.start_date;
        const end_date = req.body.end_date || existing.end_date;
        const description = req.body.description || req.body.notes || existing.description;
        const status = req.body.status || existing.status;
        const total_hours = req.body.total_hours !== undefined ? req.body.total_hours : existing.total_hours;
        const coverage_percentage = req.body.coverage_percentage !== undefined ? req.body.coverage_percentage : existing.coverage_percentage;
        const fairness_score = req.body.fairness_score !== undefined ? req.body.fairness_score : existing.fairness_score;

        await database.run(
            'UPDATE schedules SET name = ?, start_date = ?, end_date = ?, description = ?, status = ?, total_hours = ?, coverage_percentage = ?, fairness_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, start_date, end_date, description, status, total_hours, coverage_percentage, fairness_score, req.params.id]
        );

        const updatedSchedule = await database.get('SELECT * FROM schedules WHERE id = ?', [req.params.id]);
        res.json(updatedSchedule);
    } catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update schedule' });
    }
});

// DELETE /api/schedules/:id
router.delete('/:id', requireRole(['admin', 'manager']), async(req, res) => {
    try {
        await database.run('DELETE FROM schedules WHERE id = ?', [req.params.id]);
        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete schedule' });
    }
});

module.exports = router;