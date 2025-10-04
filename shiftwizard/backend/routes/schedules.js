const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/schedules
router.get('/', async(req, res) => {
    try {
        const schedules = await database.all(
            'SELECT * FROM schedules ORDER BY start_date DESC'
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
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('start_date').isISO8601().withMessage('Invalid start date'),
    body('end_date').isISO8601().withMessage('Invalid end date')
], async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation Error', details: errors.array() });
        }

        const { name, start_date, end_date, description, status = 'draft' } = req.body;

        const result = await database.run(
            'INSERT INTO schedules (name, start_date, end_date, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?)', [name, start_date, end_date, description, status, req.user.id]
        );

        const newSchedule = await database.get('SELECT * FROM schedules WHERE id = ?', [result.id]);
        res.status(201).json({ message: 'Schedule created successfully', schedule: newSchedule });
    } catch (error) {
        console.error('Create schedule error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create schedule' });
    }
});

// PUT /api/schedules/:id
router.put('/:id', requireRole(['admin', 'manager']), async(req, res) => {
    try {
        const { name, start_date, end_date, description, status } = req.body;

        await database.run(
            'UPDATE schedules SET name = ?, start_date = ?, end_date = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, start_date, end_date, description, status, req.params.id]
        );

        const updatedSchedule = await database.get('SELECT * FROM schedules WHERE id = ?', [req.params.id]);
        res.json({ message: 'Schedule updated successfully', schedule: updatedSchedule });
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