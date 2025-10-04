const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation middleware
const validateEmployee = [
    body('employee_id').trim().notEmpty().withMessage('Employee ID is required'),
    body('full_name').trim().isLength({ min: 2 }).withMessage('Full name is required'),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('department').optional().trim(),
    body('position').optional().trim(),
    body('hire_date').optional().isISO8601().withMessage('Invalid hire date'),
    body('hourly_rate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    body('max_hours_per_week').optional().isInt({ min: 1, max: 168 }).withMessage('Max hours per week must be between 1 and 168'),
    body('availability').optional().isJSON().withMessage('Availability must be valid JSON'),
    body('skills').optional().isJSON().withMessage('Skills must be valid JSON'),
    body('status').optional().isIn(['active', 'inactive', 'terminated']).withMessage('Invalid status')
];

// GET /api/employees - Get all employees
router.get('/', async(req, res) => {
    try {
        const { department, status, search } = req.query;
        let sql = 'SELECT * FROM employees WHERE 1=1';
        const params = [];

        if (department) {
            sql += ' AND department = ?';
            params.push(department);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        if (search) {
            sql += ' AND (full_name LIKE ? OR email LIKE ? OR employee_id LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        sql += ' ORDER BY full_name ASC';

        const employees = await database.all(sql, params);

        // Parse JSON fields
        const formattedEmployees = employees.map(emp => ({
            ...emp,
            availability: emp.availability ? JSON.parse(emp.availability) : null,
            skills: emp.skills ? JSON.parse(emp.skills) : null
        }));

        res.json(formattedEmployees);

    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch employees'
        });
    }
});

// GET /api/employees/:id - Get employee by ID
router.get('/:id', async(req, res) => {
    try {
        const employee = await database.get(
            'SELECT * FROM employees WHERE id = ?', [req.params.id]
        );

        if (!employee) {
            return res.status(404).json({
                error: 'Employee not found',
                message: 'Employee with this ID does not exist'
            });
        }

        // Parse JSON fields
        const formattedEmployee = {
            ...employee,
            availability: employee.availability ? JSON.parse(employee.availability) : null,
            skills: employee.skills ? JSON.parse(employee.skills) : null
        };

        res.json(formattedEmployee);

    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch employee'
        });
    }
});

// POST /api/employees - Create new employee
router.post('/', requireRole(['admin', 'manager']), validateEmployee, async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const {
            employee_id,
            full_name,
            email,
            phone,
            department,
            position,
            hire_date,
            hourly_rate,
            max_hours_per_week = 40,
            availability,
            skills,
            status = 'active'
        } = req.body;

        // Check if employee_id already exists
        const existingEmployee = await database.get(
            'SELECT id FROM employees WHERE employee_id = ?', [employee_id]
        );

        if (existingEmployee) {
            return res.status(409).json({
                error: 'Employee ID already exists',
                message: 'An employee with this ID already exists'
            });
        }

        // Check if email already exists (if provided)
        if (email) {
            const existingEmail = await database.get(
                'SELECT id FROM employees WHERE email = ?', [email]
            );

            if (existingEmail) {
                return res.status(409).json({
                    error: 'Email already exists',
                    message: 'An employee with this email already exists'
                });
            }
        }

        // Stringify JSON fields
        const availabilityJson = availability ? JSON.stringify(availability) : null;
        const skillsJson = skills ? JSON.stringify(skills) : null;

        const result = await database.run(
            `INSERT INTO employees (
        employee_id, full_name, email, phone, department, position, 
        hire_date, hourly_rate, max_hours_per_week, availability, 
        skills, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                employee_id, full_name, email, phone, department, position,
                hire_date, hourly_rate, max_hours_per_week, availabilityJson,
                skillsJson, status
            ]
        );

        const newEmployee = await database.get(
            'SELECT * FROM employees WHERE id = ?', [result.id]
        );

        // Parse JSON fields for response
        const formattedEmployee = {
            ...newEmployee,
            availability: newEmployee.availability ? JSON.parse(newEmployee.availability) : null,
            skills: newEmployee.skills ? JSON.parse(newEmployee.skills) : null
        };

        res.status(201).json({
            message: 'Employee created successfully',
            employee: formattedEmployee
        });

    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create employee'
        });
    }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', requireRole(['admin', 'manager']), validateEmployee, async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const employeeId = req.params.id;

        // Check if employee exists
        const existingEmployee = await database.get(
            'SELECT * FROM employees WHERE id = ?', [employeeId]
        );

        if (!existingEmployee) {
            return res.status(404).json({
                error: 'Employee not found',
                message: 'Employee with this ID does not exist'
            });
        }

        const {
            employee_id,
            full_name,
            email,
            phone,
            department,
            position,
            hire_date,
            hourly_rate,
            max_hours_per_week,
            availability,
            skills,
            status
        } = req.body;

        // Check if employee_id already exists (for different employee)
        if (employee_id && employee_id !== existingEmployee.employee_id) {
            const existingEmpId = await database.get(
                'SELECT id FROM employees WHERE employee_id = ? AND id != ?', [employee_id, employeeId]
            );

            if (existingEmpId) {
                return res.status(409).json({
                    error: 'Employee ID already exists',
                    message: 'Another employee with this ID already exists'
                });
            }
        }

        // Check if email already exists (for different employee)
        if (email && email !== existingEmployee.email) {
            const existingEmail = await database.get(
                'SELECT id FROM employees WHERE email = ? AND id != ?', [email, employeeId]
            );

            if (existingEmail) {
                return res.status(409).json({
                    error: 'Email already exists',
                    message: 'Another employee with this email already exists'
                });
            }
        }

        // Stringify JSON fields
        const availabilityJson = availability ? JSON.stringify(availability) : null;
        const skillsJson = skills ? JSON.stringify(skills) : null;

        await database.run(
            `UPDATE employees SET 
        employee_id = ?, full_name = ?, email = ?, phone = ?, 
        department = ?, position = ?, hire_date = ?, hourly_rate = ?, 
        max_hours_per_week = ?, availability = ?, skills = ?, 
        status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`, [
                employee_id, full_name, email, phone, department, position,
                hire_date, hourly_rate, max_hours_per_week, availabilityJson,
                skillsJson, status, employeeId
            ]
        );

        const updatedEmployee = await database.get(
            'SELECT * FROM employees WHERE id = ?', [employeeId]
        );

        // Parse JSON fields for response
        const formattedEmployee = {
            ...updatedEmployee,
            availability: updatedEmployee.availability ? JSON.parse(updatedEmployee.availability) : null,
            skills: updatedEmployee.skills ? JSON.parse(updatedEmployee.skills) : null
        };

        res.json({
            message: 'Employee updated successfully',
            employee: formattedEmployee
        });

    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update employee'
        });
    }
});

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', requireRole(['admin', 'manager']), async(req, res) => {
    try {
        const employeeId = req.params.id;

        // Check if employee exists
        const existingEmployee = await database.get(
            'SELECT id FROM employees WHERE id = ?', [employeeId]
        );

        if (!existingEmployee) {
            return res.status(404).json({
                error: 'Employee not found',
                message: 'Employee with this ID does not exist'
            });
        }

        // Check if employee has assignments
        const hasAssignments = await database.get(
            'SELECT id FROM assignments WHERE employee_id = ? LIMIT 1', [employeeId]
        );

        if (hasAssignments) {
            // Instead of deleting, mark as terminated
            await database.run(
                'UPDATE employees SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['terminated', employeeId]
            );

            res.json({
                message: 'Employee marked as terminated (has existing assignments)'
            });
        } else {
            // Safe to delete
            await database.run(
                'DELETE FROM employees WHERE id = ?', [employeeId]
            );

            res.json({
                message: 'Employee deleted successfully'
            });
        }

    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete employee'
        });
    }
});

module.exports = router;