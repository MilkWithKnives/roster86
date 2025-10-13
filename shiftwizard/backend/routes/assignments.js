const express = require('express');
const database = require('../models/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/assignments - Restrict access based on user role
router.get('/', async(req, res) => {
    try {
        const { schedule_id, employee_id, date, status, orderBy, limit } = req.query;
        
        // If user is not admin/manager, restrict to their own assignments
        const isManagerRole = ['admin', 'manager'].includes(req.user.role);
        let actualEmployeeId = employee_id;
        
        if (!isManagerRole) {
            // Non-managers can only see their own assignments
            // Find the employee record for this user
            const employeeRecord = await database.get(
                'SELECT id FROM employees WHERE id = ? OR email = ?', 
                [req.user.id, req.user.email]
            );
            
            if (!employeeRecord) {
                return res.json([]); // No assignments if no employee record
            }
            
            actualEmployeeId = employeeRecord.id;
        }

        // Build WHERE clause dynamically based on query params
        const whereClauses = [];
        const params = [];

        if (schedule_id) {
            whereClauses.push('a.schedule_id = ?');
            params.push(schedule_id);
        }
        if (actualEmployeeId) {
            whereClauses.push('a.employee_id = ?');
            params.push(actualEmployeeId);
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
        
        // Handle orderBy parameter - convert frontend format to SQL
        let orderClause = 'a.date DESC, a.start_time ASC';
        if (orderBy) {
            if (orderBy === '-created_date' || orderBy === '-created_at') {
                orderClause = 'a.created_at DESC';
            } else if (orderBy === 'created_date' || orderBy === 'created_at') {
                orderClause = 'a.created_at ASC';
            } else if (orderBy === '-date') {
                orderClause = 'a.date DESC';
            } else if (orderBy === 'date') {
                orderClause = 'a.date ASC';
            } else {
                orderClause = orderBy; // Use as-is for other formats
            }
        }
        
        const limitClause = limit ? `LIMIT ${parseInt(limit)}` : '';

        const query = `
            SELECT a.*, 
                   COALESCE(e.full_name, 'Unknown Employee') as employee_name, 
                   COALESCE(s.name, 'Unknown Schedule') as schedule_name, 
                   COALESCE(st.name, 'No Template') as shift_template_name
            FROM assignments a
            LEFT JOIN employees e ON a.employee_id = e.id
            LEFT JOIN schedules s ON a.schedule_id = s.id
            LEFT JOIN shift_templates st ON a.shift_template_id = st.id
            ${whereClause}
            ORDER BY ${orderClause}
            ${limitClause}
        `;

        const assignments = await database.all(query, params);
        
        // Return empty array if no assignments found - this is normal
        res.json(assignments || []);
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch assignments' });
    }
});

// GET /api/assignments/:id - Restrict access to own assignments for non-managers
router.get('/:id', async(req, res) => {
    try {
        const assignment = await database.get('SELECT * FROM assignments WHERE id = ?', [req.params.id]);
        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        // Check authorization - non-managers can only see their own assignments
        const isManagerRole = ['admin', 'manager'].includes(req.user.role);
        
        if (!isManagerRole) {
            const employeeRecord = await database.get(
                'SELECT id FROM employees WHERE id = ? OR email = ?', 
                [req.user.id, req.user.email]
            );
            
            if (!employeeRecord || assignment.employee_id !== employeeRecord.id) {
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'You can only view your own assignments'
                });
            }
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