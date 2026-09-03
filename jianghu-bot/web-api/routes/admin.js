const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Sect = require('../../models/Sect');
const { authenticateToken } = require('../middlewares/auth');
const CustomError = require('../utils/CustomError');

// Protected middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    const ownerIds = (process.env.OWNER_IDS || '').split(',').map(id => id.trim());
    if (!ownerIds.includes(req.user.userId)) {
         return res.status(403).json({ error: 'Akses Ditolak: Fitur ini hanya untuk Developer (Admin).' });
    }
    next();
};

// Endpoint: GET /api/admin/oracle
router.get('/oracle', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const guildId = req.user.guildId || req.user.userId;

        const players = await Player.find({ guildId, status: 'active' }).select('currency totalWealth characterName status').lean();
        const sects = await Sect.find({ guildId }).select('currency totalWealth name').lean();

        let totalEconomy = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
        let totalWealthValue = 0;

        players.forEach(p => {
             const c = p.currency || {};
             totalEconomy.copper += c.copper || 0;
             totalEconomy.silver += c.silver || 0;
             totalEconomy.gold += c.gold || 0;
             totalEconomy.jade += c.jade || 0;
             totalEconomy.spirit += c.spirit || 0;
             totalWealthValue += p.totalWealth || 0;
        });

        sects.forEach(s => {
             const c = s.currency || {};
             totalEconomy.copper += c.copper || 0;
             totalEconomy.silver += c.silver || 0;
             totalEconomy.gold += c.gold || 0;
             totalEconomy.jade += c.jade || 0;
             totalEconomy.spirit += c.spirit || 0;
             totalWealthValue += s.totalWealth || 0;
        });

        // Top 5 sects by wealth
        const topSects = sects.sort((a, b) => (b.totalWealth || 0) - (a.totalWealth || 0)).slice(0, 5);

        // Top 5 players by wealth
        const topPlayers = players.sort((a, b) => (b.totalWealth || 0) - (a.totalWealth || 0)).slice(0, 5);

        res.json({
            success: true,
            data: {
                totalPlayers: players.length,
                totalSects: sects.length,
                economy: totalEconomy,
                totalWealth: totalWealthValue,
                topSects,
                topPlayers
            }
        });
    } catch (error) {
        console.error('[API-ADMIN] Oracle error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memuat data oracle.' });
    }
});

module.exports = router;
