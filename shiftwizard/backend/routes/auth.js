const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const database = require('../models/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateRegistration = [
    body('email').isEmail().normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'i')
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    body('full_name').trim().isLength({ min: 2 }).withMessage('Full name is required'),
    body('role').optional().isIn(['admin', 'manager', 'employee']).withMessage('Invalid role')
];

const validateLogin = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
];

// Register new user
router.post('/register', validateRegistration, async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { email, password, full_name, role = 'employee' } = req.body;

        // Check if user already exists
        const existingUser = await database.get(
            'SELECT id FROM users WHERE email = ?', [email]
        );

        if (existingUser) {
            return res.status(409).json({
                error: 'User already exists',
                message: 'A user with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await database.run(
            'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)', [email, password_hash, full_name, role]
        );

        const user = await database.get(
            'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?', [result.id]
        );

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create user'
        });
    }
});

// Login user
router.post('/login', validateLogin, async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user by email
        const user = await database.get(
            'SELECT id, email, password_hash, full_name, role FROM users WHERE email = ?', [email]
        );

        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to login'
        });
    }
});

// Get current user profile
router.get('/me', authenticateToken, async(req, res) => {
    try {
        const user = await database.get(
            'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?', [req.user.id]
        );

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User profile not found'
            });
        }

        res.json(user);

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get user profile'
        });
    }
});

// Update user profile
router.put('/profile', authenticateToken, [
    body('full_name').optional().trim().isLength({ min: 2 }),
    body('email').optional().isEmail().normalizeEmail()
], async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { full_name, email } = req.body;
        const updates = {};
        const params = [];

        if (full_name) {
            updates.full_name = '?';
            params.push(full_name);
        }

        if (email) {
            // Check if email is already taken by another user
            const existingUser = await database.get(
                'SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]
            );

            if (existingUser) {
                return res.status(409).json({
                    error: 'Email already taken',
                    message: 'This email is already in use by another user'
                });
            }

            updates.email = '?';
            params.push(email);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: 'No updates provided',
                message: 'Please provide data to update'
            });
        }

        // Add updated_at and user ID
        updates.updated_at = 'CURRENT_TIMESTAMP';
        params.push(req.user.id);

        const setClause = Object.keys(updates).map(key => `${key} = ${updates[key]}`).join(', ');

        await database.run(
            `UPDATE users SET ${setClause} WHERE id = ?`,
            params
        );

        // Get updated user
        const updatedUser = await database.get(
            'SELECT id, email, full_name, role, updated_at FROM users WHERE id = ?', [req.user.id]
        );

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update profile'
        });
    }
});

// Change password
router.put('/change-password', authenticateToken, [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async(req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.array()
            });
        }

        const { current_password, new_password } = req.body;

        // Get current user with password hash
        const user = await database.get(
            'SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]
        );

        // Verify current password
        const isValidPassword = await bcrypt.compare(current_password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid password',
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const new_password_hash = await bcrypt.hash(new_password, saltRounds);

        // Update password
        await database.run(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [new_password_hash, req.user.id]
        );

        res.json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to change password'
        });
    }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', authenticateToken, async(req, res) => {
    try {
        // In a real app, you might want to blacklist the token
        // For now, we'll just acknowledge the logout
        res.json({
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to logout'
        });
    }
});

module.exports = router;