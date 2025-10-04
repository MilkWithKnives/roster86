const express = require('express');
const database = require('../models/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/app-settings
router.get('/', async(req, res) => {
    try {
        const settings = await database.all('SELECT * FROM app_settings ORDER BY key');
        const settingsObject = {};
        settings.forEach(setting => {
            settingsObject[setting.key] = setting.value;
        });
        res.json(settingsObject);
    } catch (error) {
        console.error('Get app settings error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch app settings' });
    }
});

// PUT /api/app-settings
router.put('/', requireRole(['admin']), async(req, res) => {
    try {
        const settings = req.body;

        for (const [key, value] of Object.entries(settings)) {
            await database.run(
                'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, value]
            );
        }

        const updatedSettings = await database.all('SELECT * FROM app_settings ORDER BY key');
        const settingsObject = {};
        updatedSettings.forEach(setting => {
            settingsObject[setting.key] = setting.value;
        });

        res.json({ message: 'Settings updated successfully', settings: settingsObject });
    } catch (error) {
        console.error('Update app settings error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update app settings' });
    }
});

module.exports = router;