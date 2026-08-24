const express = require('express');
const router = express.Router();
const Tournament = require('../../models/Tournament');
const { authenticateToken } = require('../middlewares/auth');
const Player = require('../../models/Player');

// Dapatkan tournament aktif/terbaru
router.get('/', authenticateToken, async (req, res) => {
    try {
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);

        if (!guildId) {
            return res.status(400).json({ error: 'Guild ID tidak ditemukan di sesi Anda.' });
        }

        // Cari tournament yang belum cancelled (prioritaskan ongoing/registration, jika tidak ada cari finished terbaru)
        let tournament = await Tournament.findOne({ guildId, status: { $in: ['registration', 'ongoing'] } }).sort({ createdAt: -1 }).lean();

        if (!tournament) {
            tournament = await Tournament.findOne({ guildId, status: 'finished' }).sort({ createdAt: -1 }).lean();
        }

        if (!tournament) {
             return res.json({ tournament: null, message: 'Tidak ada turnamen aktif saat ini.' });
        }

        res.json({ tournament });

    } catch (error) {
        console.error('[API-TOURNAMENT] Error fetching tournament:', error);
        res.status(500).json({ error: 'Gagal mengambil data turnamen.' });
    }
});

module.exports = router;
