const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

const validateShiftTemplate = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
    body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format'),
    body('break_duration').optional().isInt({ min: 0 }).withMessage('Break duration must be a positive number'),
    body('min_employees').optional().isInt({ min: 1 }).withMessage('Min employees must be at least 1'),
    body('max_employees').optional().isInt({ min: 1 }).withMessage('Max employees must be at least 1'),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color format')
];

// GET /api/shift-templates
router.get('/', async(req, res) => {
    try {
        const { department, is_active, orderBy, limit } = req.query;
        let sql = 'SELECT * FROM shift_templates WHERE 1=1';
        const params = [];

        if (department) {
            sql += ' AND department = ?';
            params.push(department);
        }

        if (is_active !== undefined) {
            sql += ' AND is_active = ?';
            params.push(is_active === 'true' ? 1 : 0);
        }

        // Handle orderBy parameter - convert frontend format to SQL
        let orderClause = 'name ASC'; // default
        if (orderBy) {
            if (orderBy === '-created_date' || orderBy === '-created_at') {
                orderClause = 'created_at DESC';
            } else if (orderBy === 'created_date' || orderBy === 'created_at') {
                orderClause = 'created_at ASC';
            } else if (orderBy === '-name') {
                orderClause = 'name DESC';
            } else if (orderBy === 'name') {
                orderClause = 'name ASC';
            } else {
                orderClause = orderBy; // Use as-is for other formats
            }
        }
        
        sql += ` ORDER BY ${orderClause}`;
        
        if (limit) {
            sql += ` LIMIT ${parseInt(limit)}`;
        }

        const templates = await database.all(sql, params);

        const formattedTemplates = templates.map(template => ({
            ...template,
            required_skills: template.required_skills ? JSON.parse(template.required_skills) : null,
            active: Boolean(template.is_active) // Frontend expects 'active'
        }));

        res.json(formattedTemplates);
    } catch (error) {
        console.error('Get shift templates error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch shift templates'
        });
    }
});

// GET /api/shift-templates/:id
router.get('/:id', async(req, res) => {
    try {
        const template = await database.get(
            'SELECT * FROM shift_templates WHERE id = ?', [req.params.id]
        );

        if (!template) {
            return res.status(404).json({
                error: 'Shift template not found',
                message: 'Shift template with this ID does not exist'
            });
        }

        const formattedTemplate = {
            ...template,
            required_skills: template.required_skills ? JSON.parse(template.required_skills) : null,
            active: Boolean(template.is_active) // Frontend expects 'active'
        };

        res.json(formattedTemplate);
    } catch (error) {
        console.error('Get shift template error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch shift template'
        });
    }
});

// POST /api/shift-templates
router.post('/', requireRole(['admin', 'manager']), validateShiftTemplate, async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const {
            name,
            description,
            start_time,
            end_time,
            break_duration = 0,
            required_skills,
            min_employees = 1,
            max_employees,
            department,
            color = '#3B82F6',
            is_active = true,
            active // Handle frontend sending 'active'
        } = req.body;
        
        // Use 'active' if provided, otherwise use 'is_active'
        const activeValue = active !== undefined ? active : is_active;

        const requiredSkillsJson = required_skills ? JSON.stringify(required_skills) : null;

        const result = await database.run(
            `INSERT INTO shift_templates (
        name, description, start_time, end_time, break_duration,
        required_skills, min_employees, max_employees, department,
        color, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                name, description, start_time, end_time, break_duration,
                requiredSkillsJson, min_employees, max_employees, department,
                color, activeValue ? 1 : 0
            ]
        );

        const newTemplate = await database.get(
            'SELECT * FROM shift_templates WHERE id = ?', [result.id]
        );

        const formattedTemplate = {
            ...newTemplate,
            required_skills: newTemplate.required_skills ? JSON.parse(newTemplate.required_skills) : null,
            active: Boolean(newTemplate.is_active) // Frontend expects 'active'
        };

        res.status(201).json({
            message: 'Shift template created successfully',
            template: formattedTemplate
        });
    } catch (error) {
        console.error('Create shift template error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create shift template'
        });
    }
});

// PUT /api/shift-templates/:id
router.put('/:id', requireRole(['admin', 'manager']), validateShiftTemplate, async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const templateId = req.params.id;
        const existingTemplate = await database.get(
            'SELECT id FROM shift_templates WHERE id = ?', [templateId]
        );

        if (!existingTemplate) {
            return res.status(404).json({
                error: 'Shift template not found',
                message: 'Shift template with this ID does not exist'
            });
        }

        const {
            name,
            description,
            start_time,
            end_time,
            break_duration,
            required_skills,
            min_employees,
            max_employees,
            department,
            color,
            is_active,
            active // Handle frontend sending 'active'
        } = req.body;
        
        // Use 'active' if provided, otherwise use 'is_active'
        const activeValue = active !== undefined ? active : is_active;

        const requiredSkillsJson = required_skills ? JSON.stringify(required_skills) : null;

        await database.run(
            `UPDATE shift_templates SET 
        name = ?, description = ?, start_time = ?, end_time = ?,
        break_duration = ?, required_skills = ?, min_employees = ?,
        max_employees = ?, department = ?, color = ?, is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`, [
                name, description, start_time, end_time, break_duration,
                requiredSkillsJson, min_employees, max_employees, department,
                color, activeValue ? 1 : 0, templateId
            ]
        );

        const updatedTemplate = await database.get(
            'SELECT * FROM shift_templates WHERE id = ?', [templateId]
        );

        const formattedTemplate = {
            ...updatedTemplate,
            required_skills: updatedTemplate.required_skills ? JSON.parse(updatedTemplate.required_skills) : null,
            active: Boolean(updatedTemplate.is_active) // Frontend expects 'active'
        };

        res.json({
            message: 'Shift template updated successfully',
            template: formattedTemplate
        });
    } catch (error) {
        console.error('Update shift template error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update shift template'
        });
    }
});

// DELETE /api/shift-templates/:id
router.delete('/:id', requireRole(['admin', 'manager']), async(req, res) => {
    try {
        const templateId = req.params.id;

        const existingTemplate = await database.get(
            'SELECT id FROM shift_templates WHERE id = ?', [templateId]
        );

        if (!existingTemplate) {
            return res.status(404).json({
                error: 'Shift template not found',
                message: 'Shift template with this ID does not exist'
            });
        }

        // Check if template is used in assignments
        const hasAssignments = await database.get(
            'SELECT id FROM assignments WHERE shift_template_id = ? LIMIT 1', [templateId]
        );

        if (hasAssignments) {
            // Mark as inactive instead of deleting
            await database.run(
                'UPDATE shift_templates SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [templateId]
            );

            res.json({
                message: 'Shift template marked as inactive (has existing assignments)'
            });
        } else {
            await database.run(
                'DELETE FROM shift_templates WHERE id = ?', [templateId]
            );

            res.json({
                message: 'Shift template deleted successfully'
            });
        }
    } catch (error) {
        console.error('Delete shift template error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete shift template'
        });
    }
});

module.exports = router;