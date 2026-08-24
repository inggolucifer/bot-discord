const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const Item = require('../../models/Item');
const { authenticateToken } = require('../middlewares/auth');

// Get My Pets
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);const player = await Player.findOne({ discordId: userId, guildId }).populate('pets.petId').lean();
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        res.json({
            success: true,
            data: {
                petSlots: player.petSlots,
                pets: player.pets
            }
        });
    } catch (error) {
        console.error('[API-PET] Error fetching pets:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Release Pet
router.post('/release', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);const { instanceId } = req.body;

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const petIndex = player.pets.findIndex(p => p.instanceId === instanceId);
        if (petIndex === -1) return res.status(404).json({ error: 'Pet tidak ditemukan di inventaris.' });

        const petData = player.pets[petIndex];
        if (petData.isLocked) return res.status(400).json({ error: 'Pet sedang terkunci (mungkin dalam battle).' });

        player.pets.splice(petIndex, 1);
        await player.save();

        res.json({ success: true, message: 'Pet berhasil dilepaskan ke alam bebas.' });
    } catch (error) {
        console.error('[API-PET] Error releasing pet:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

module.exports = router;
