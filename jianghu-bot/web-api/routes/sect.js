const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Sect = require('../../models/Sect');
const Asset = require('../../models/Asset');
const { authenticateToken } = require('../middlewares/auth');
const { isUnderConstruction } = require('../../utils/crafting');
const { isClaimedToday } = require('../../utils/timezone');
const { splitSectProfit } = require('../../utils/sectProfitSplit');
const { logTransaction } = require('../../utils/logger');
const { getPlayerSect } = require('../../utils/sectUtils');

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

// Endpoint to fetch sect assets
router.get('/assets', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId }).lean();
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        if (!player.sect || player.sect === 'Tanpa Sekte (Rogue Cultivator)') {
            return res.json({ success: true, data: [] });
        }

        const sect = await Sect.findOne({ name: player.sect, guildId: player.guildId }).populate('assets.assetId').lean();
        if (!sect) return res.json({ success: true, data: [] });

        const assets = sect.assets.map(asset => {
            let statusLabel = 'Aktif';
            let underConstruction = false;

            if (isUnderConstruction(asset)) {
                underConstruction = true;
                statusLabel = 'Dalam Pembangunan';
            } else if (asset.isHalted) {
                statusLabel = 'Halted (Terhenti)';
            }

            let profitAvailable = false;
            if (asset.assetId && !underConstruction && !asset.isHalted) {
                if (!isClaimedToday(asset.lastClaimAt)) {
                    profitAvailable = true;
                }
            }

            return {
                id: asset.assetId ? asset.assetId._id : null,
                name: asset.assetId ? asset.assetId.name : 'Unknown Asset',
                description: asset.assetId ? asset.assetId.description : '',
                imageUrl: asset.assetId ? asset.assetId.imageUrl : null,
                quantity: asset.quantity,
                status: statusLabel,
                underConstruction: underConstruction,
                constructionCompleteAt: asset.constructionCompleteAt,
                profitAvailable: profitAvailable,
                lastClaimAt: asset.lastClaimAt,
                isCraftingStation: asset.assetId ? asset.assetId.isCraftingStation : false
            };
        });

        res.json({ success: true, data: assets });
    } catch (error) {
        console.error('[API-SECT] Error fetching sect assets:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});



module.exports = router;
