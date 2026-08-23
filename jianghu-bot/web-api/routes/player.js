const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const { authenticateToken } = require('../middlewares/auth');
const { calculateProgress } = require('../../utils/assetProgress');
const { isUnderConstruction } = require('../../utils/crafting');
const { syncWorkerContracts } = require('../../utils/workerManager');

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

            if (isUnderConstruction(asset)) {
                underConstruction = true;
                statusLabel = 'Dalam Pembangunan';
            } else if (asset.status === 'pending') {
                statusLabel = 'Pending';
            } else if (asset.status === 'building') {
                statusLabel = 'Membangun';
            } else if (asset.isHalted) {
                statusLabel = 'Halted (Terhenti)';
            }

            let progressHours = 0;
            if (asset.assetId && !underConstruction && !asset.isHalted && asset.status === 'active') {
                const progressMs = calculateProgress(asset) + (asset.progressAccumulated || 0);
                progressHours = Math.floor(progressMs / 3600000);
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

router.post('/assets/claim-profit', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        if (player.status !== 'active') return res.status(400).json({ error: `Karaktermu berstatus ${player.status}, tidak bisa klaim.` });

        if (!player.assets.length) {
            return res.status(400).json({ error: 'Kamu belum memiliki aset apapun.' });
        }

        await syncWorkerContracts(req.discordClient, player.guildId);

        const assetDocs = await Asset.find({ _id: { $in: player.assets.map(a => a.assetId) } });
        const currencyTotals = {};
        const claimedNow = [];
        const alreadyClaimed = [];
        const underConstruction = [];

        for (const owned of player.assets) {
            const doc = assetDocs.find(d => d._id.equals(owned.assetId));
            if (!doc) continue;

            if (isUnderConstruction(owned)) {
                underConstruction.push(`${doc.name} 🚧 (Sedang dibangun / butuh worker)`);
                continue;
            }

            let hasActiveWorker = false;
            if (owned.assignedWorkers && owned.assignedWorkers.length > 0) {
                hasActiveWorker = owned.assignedWorkers.some(w => !w.endTime || w.endTime.getTime() > Date.now());
            }

            if (!doc.isCraftingStation && !hasActiveWorker) {
                underConstruction.push(`${doc.name} ⚠️ (Tidak beroperasi, butuh worker)`);
                continue;
            }

            let claimedSomething = false;
            const progressMs = calculateProgress(owned) + (owned.progressAccumulated || 0);
            const hoursPassed = Math.floor(progressMs / 3600000);

            if (hoursPassed < 1) {
                alreadyClaimed.push(doc.name);
                continue;
            }

            if (doc.dailyProfit > 0) {
                const profit = hoursPassed * doc.dailyProfit * owned.quantity;
                currencyTotals[doc.profitCurrency] = (currencyTotals[doc.profitCurrency] || 0) + profit;
                claimedNow.push(`${doc.name} x${owned.quantity} -> ${profit} ${doc.profitCurrency}`);
                claimedSomething = true;
            }

            if (doc.workerOutputItemId && doc.workerOutputQuantity > 0) {
                if (doc.workerInputMaterials && doc.workerInputMaterials.length > 0) {
                    underConstruction.push(`${doc.name} ⚙️ (Diproses otomatis)`);
                    continue;
                }

                const hasil = hoursPassed * doc.workerOutputQuantity * owned.quantity;
                const ownedItem = player.inventory.find(i => i.itemId.equals(doc.workerOutputItemId));
                if (ownedItem) ownedItem.quantity += hasil;
                else player.inventory.push({ itemId: doc.workerOutputItemId, quantity: hasil });

                claimedNow.push(`${doc.name} x${owned.quantity} -> ${hasil}x ${doc.workerOutputItemName}`);
                claimedSomething = true;
            }

            if (claimedSomething) {
                const leftoverMs = progressMs - (hoursPassed * 3600000);
                owned.progressAccumulated = leftoverMs;
                owned.lastProgressUpdate = new Date();
            }
        }

        for (const [currency, amount] of Object.entries(currencyTotals)) {
            player.currency[currency] += amount;
        }

        await player.save();

        res.json({
            success: true,
            data: {
                claimed: claimedNow,
                waiting: alreadyClaimed,
                other: underConstruction
            }
        });

    } catch (error) {
        console.error('[API-PLAYER] Error claiming profit:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat klaim profit.' });
    }
});

module.exports = router;