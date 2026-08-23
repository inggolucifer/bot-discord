const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Sect = require('../../models/Sect');
const { authenticateToken } = require('../middlewares/auth');

// Endpoint to fetch sect info for the current user
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId }).lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        }

        if (!player.sect || player.sect === 'Tanpa Sekte (Rogue Cultivator)') {
             return res.json({ success: true, data: null });
        }

        const sect = await Sect.findOne({ name: player.sect, guildId: player.guildId }).lean();

        if (!sect) {
            // Player has sect name but document is missing
            return res.json({ success: true, data: null });
        }

        // Determine user's role
        let role = 'Anggota';
        if (sect.leaderId === userId) role = 'Ketua';
        else if (sect.viceLeaderId === userId) role = 'Wakil Ketua';
        else if (sect.elderIds && sect.elderIds.includes(userId)) role = 'Tetua';

        res.json({
            success: true,
            data: {
                id: sect._id,
                name: sect.name,
                description: sect.description,
                imageUrl: sect.imageUrl,
                role: role,
                currency: sect.currency,
                totalWealth: sect.totalWealth,
                memberCount: 1 + (sect.viceLeaderId ? 1 : 0) + (sect.elderIds ? sect.elderIds.length : 0) + (sect.memberIds ? sect.memberIds.length : 0),
            }
        });

    } catch (error) {
        console.error('[API-SECT] Error fetching sect profile:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

module.exports = router;
