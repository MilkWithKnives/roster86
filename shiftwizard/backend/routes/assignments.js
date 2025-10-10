const express = require('express');
const database = require('../models/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/assignments
router.get('/', async(req, res) => {
    try {
        const { schedule_id, employee_id, date, status, orderBy, limit } = req.query;

        // Build WHERE clause dynamically based on query params
        const whereClauses = [];
        const params = [];

        if (schedule_id) {
            whereClauses.push('a.schedule_id = ?');
            params.push(schedule_id);
        }
        if (employee_id) {
            whereClauses.push('a.employee_id = ?');
            params.push(employee_id);
        }
        if (date) {
            whereClauses.push('a.date = ?');
            params.push(date);
        }
        if (status) {
            whereClauses.push('a.status = ?');
            params.push(status);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const orderClause = orderBy || 'a.date DESC, a.start_time ASC';
        const limitClause = limit ? `LIMIT ${parseInt(limit)}` : '';

        const query = `
            SELECT a.*, e.full_name as employee_name, s.name as schedule_name, st.name as shift_template_name
            FROM assignments a
            LEFT JOIN employees e ON a.employee_id = e.id
            LEFT JOIN schedules s ON a.schedule_id = s.id
            LEFT JOIN shift_templates st ON a.shift_template_id = st.id
            ${whereClause}
            ORDER BY ${orderClause}
            ${limitClause}
        `;

        const assignments = await database.all(query, params);
        res.json(assignments);
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch assignments' });
    }
});

// GET /api/assignments/:id
router.get('/:id', async(req, res) => {
    try {
        const assignment = await database.get('SELECT * FROM assignments WHERE id = ?', [req.params.id]);
        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        res.json(assignment);
    } catch (error) {
        console.error('Get assignment error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch assignment' });
    }
});

// POST /api/assignments
router.post('/', requireRole(['admin', 'manager']), async(req, res) => {
    try {
        const { schedule_id, employee_id, shift_template_id, date, start_time, end_time, break_duration = 0, status = 'scheduled', notes } = req.body;

        const result = await database.run(
            'INSERT INTO assignments (schedule_id, employee_id, shift_template_id, date, start_time, end_time, break_duration, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [schedule_id, employee_id, shift_template_id, date, start_time, end_time, break_duration, status, notes]
        );

        const newAssignment = await database.get('SELECT * FROM assignments WHERE id = ?', [result.id]);
        res.status(201).json(newAssignment);
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create assignment' });
    }
});

// PUT /api/assignments/:id
router.put('/:id', requireRole(['admin', 'manager']), async(req, res) => {
    try {
        const { schedule_id, employee_id, shift_template_id, date, start_time, end_time, break_duration, status, notes } = req.body;

        await database.run(
            'UPDATE assignments SET schedule_id = ?, employee_id = ?, shift_template_id = ?, date = ?, start_time = ?, end_time = ?, break_duration = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [schedule_id, employee_id, shift_template_id, date, start_time, end_time, break_duration, status, notes, req.params.id]
        );

        const updatedAssignment = await database.get('SELECT * FROM assignments WHERE id = ?', [req.params.id]);
        res.json(updatedAssignment);
    } catch (error) {
        console.error('Update assignment error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update assignment' });
    }
});

// DELETE /api/assignments/:id
router.delete('/:id', requireRole(['admin', 'manager']), async(req, res) => {
    try {
        await database.run('DELETE FROM assignments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error('Delete assignment error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete assignment' });
    }
});

module.exports = router;