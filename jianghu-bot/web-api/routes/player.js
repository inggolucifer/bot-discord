const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const { authenticateToken } = require('../middlewares/auth');

// Endpoint to fetch player's character profile and basic stats
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Note: For multi-guild support, we ideally need guildId from frontend.
        // For now, we fetch the first profile found for the user (assuming 1 main server)
        // In a full production scenario, the frontend should pass guildId.
        const player = await Player.findOne({ discordId: userId })
            .select('-inventory -pets -assets') // Exclude heavy arrays for the simple profile view
            .lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan. Pastikan Anda sudah register di Discord.' });
        }

        res.json({
            success: true,
            data: player
        });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching profile:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

module.exports = router;