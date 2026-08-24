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

router.post('/assets/claim-profit', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);const sect = await getPlayerSect(guildId, userId);
        if (!sect) return res.status(400).json({ error: 'Kamu tidak sedang bergabung dalam sekte manapun.' });

        const role = sect.getRoleOf(userId);
        if (role !== 'Ketua' && role !== 'Wakil Ketua' && role !== 'Tetua') {
            return res.status(403).json({ error: 'Hanya Ketua/Wakil/Tetua Sekte yang bisa melakukan ini!' });
        }

        if (!sect.assets.length) return res.status(400).json({ error: 'Sekte ini belum memiliki aset apapun.' });

        const assetDocs = await Asset.find({ _id: { $in: sect.assets.map((a) => a.assetId) } });
        let totalIncomeByCurrency = {};
        const materialClaimed = [];
        const currencyClaimedLines = [];
        const alreadyClaimed = [];
        const underConstruction = [];

        for (const owned of sect.assets) {
            const doc = assetDocs.find((d) => d._id.equals(owned.assetId));
            if (!doc) continue;

            if (isUnderConstruction(owned)) {
                underConstruction.push(`${doc.name} 🚧`);
                continue;
            }
            if (isClaimedToday(owned.lastClaimAt)) {
                alreadyClaimed.push(doc.name);
                continue;
            }

            let claimedSomething = false;

            if (doc.dailyProfit > 0) {
                const profit = doc.dailyProfit * owned.quantity;
                totalIncomeByCurrency[doc.profitCurrency] = (totalIncomeByCurrency[doc.profitCurrency] || 0) + profit;
                currencyClaimedLines.push(`${doc.name} x${owned.quantity} -> ${profit} ${doc.profitCurrency}`);
                claimedSomething = true;
            }

            if (doc.workerOutputItemId && doc.workerOutputQuantity > 0) {
                if (doc.workerInputMaterials && doc.workerInputMaterials.length > 0) {
                    underConstruction.push(`${doc.name} ⚙️ (Diproses otomatis)`);
                    continue;
                }

                const hasil = doc.workerOutputQuantity * owned.quantity;
                const ownedRes = sect.resources.find((r) => r.itemId.equals(doc.workerOutputItemId));
                if (ownedRes) ownedRes.quantity += hasil;
                else if (doc.workerOutputItemId) sect.resources.push({ itemId: doc.workerOutputItemId, quantity: hasil });
                materialClaimed.push(`${doc.name} x${owned.quantity} -> ${hasil}x ${doc.workerOutputItemName}`);
                claimedSomething = true;
            }

            if (claimedSomething) owned.lastClaimAt = new Date();
        }

        const distributionSummary = [];
        for (const [currency, totalAmount] of Object.entries(totalIncomeByCurrency)) {
            const shares = splitSectProfit(sect, totalAmount);
            if (!shares.length) continue;

            const byRole = {};
            for (const share of shares) {
                const p = await Player.findOne({ discordId: share.discordId, guildId: guildId });
                if (!p) continue;
                p.currency[currency] += share.amount;
                await p.save();

                if (!byRole[share.role]) byRole[share.role] = { count: 0, amountEach: share.amount };
                byRole[share.role].count += 1;
            }

            for (const [roleName, info] of Object.entries(byRole)) {
                distributionSummary.push(`${roleName}${info.count > 1 ? ` (${info.count} orang)` : ''}: ${info.amountEach} ${currency}/orang`);
            }
        }

        await sect.save();

        if (currencyClaimedLines.length || materialClaimed.length) {
            await logTransaction(req.discordClient, {
                guildId: guildId, type: 'sect_claim_profit', fromUserId: userId,
                note: `Klaim profit sekte ${sect.name} oleh user ${userId}`,
            });
        }

        res.json({
            success: true,
            data: {
                claimedCurrency: currencyClaimedLines,
                claimedMaterial: materialClaimed,
                distributionSummary: distributionSummary,
                waiting: alreadyClaimed,
                other: underConstruction
            }
        });

    } catch (error) {
        console.error('[API-SECT] Error claiming sect profit:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat klaim profit sekte.' });
    }
});

module.exports = router;
