const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const { authenticateToken } = require('../middlewares/auth');

// Dapatkan top 10 player (Leaderboard) berdasarkan totalWealth
router.get('/', authenticateToken, async (req, res) => {
    try {
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);
        if (!guildId) {
             return res.status(400).json({ error: 'Guild ID tidak ditemukan di sesi Anda.' });
        }

        const topPlayers = await Player.find({ guildId, status: 'active' })
            .select('discordId characterName currency totalWealth characterImage sect stage realm')
            .sort({ totalWealth: -1 })
            .limit(10)
            .lean();

        res.json(topPlayers);
    } catch (error) {
        console.error('[API-LEADERBOARD] Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Gagal mengambil data leaderboard.' });
    }
});

module.exports = router;
