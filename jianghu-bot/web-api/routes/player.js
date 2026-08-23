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

        // Inject Discord Avatar URL from the JWT payload as fallback
        const discordAvatarUrl = req.user.avatar; // Assuming we passed it during auth

        res.json({
            success: true,
            data: {
                ...player,
                discordAvatar: discordAvatarUrl || null
            }
        });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching profile:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Endpoint to fetch player's assets
router.get('/assets', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId })
            .populate('assets.assetId')
            .lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        }

        const assets = player.assets.map(asset => {
            let statusLabel = 'Aktif';
            let underConstruction = false;

            if (asset.constructionCompleteAt && new Date(asset.constructionCompleteAt) > new Date()) {
                underConstruction = true;
                statusLabel = 'Dalam Pembangunan';
            } else if (asset.status === 'pending') {
                statusLabel = 'Pending';
            } else if (asset.status === 'building') {
                statusLabel = 'Membangun';
            } else if (asset.isHalted) {
                statusLabel = 'Halted (Terhenti)';
            }

            // Hitung progress profit secara kasar berdasarkan jam berjalan (opsional)
            let progressHours = 0;
            if (asset.assetId && !underConstruction && !asset.isHalted && asset.status === 'active' && asset.lastClaimAt) {
                 const diff = Date.now() - new Date(asset.lastClaimAt).getTime();
                 progressHours = Math.floor(diff / 3600000);
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
                assignedWorkers: asset.assignedWorkers,
                progressHours: progressHours
            };
        });

        res.json({ success: true, data: assets });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching assets:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

module.exports = router;