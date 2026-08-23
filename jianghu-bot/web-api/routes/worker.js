const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const WorkerContract = require('../../models/WorkerContract');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const guildId = req.user.guildId || req.user.userId;

        const workers = await WorkerContract.find({ guildId, status: 'available' }).lean();

        res.json({ success: true, data: workers });
    } catch (error) {
        console.error('[API-WORKER] Error fetching workers:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

module.exports = router;
