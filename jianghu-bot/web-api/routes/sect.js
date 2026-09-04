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




const LockManager = require('../utils/lockManager');
const { withTransaction } = require('../utils/dbTransaction');
const CustomError = require('../utils/CustomError');
const { CURRENCIES, CURRENCY_LABEL, RATE_TO_COPPER } = require('../../utils/currency');

// Endpoint: POST /api/sect/donate
router.post('/donate', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { type, amount } = req.body;

    if (!type || !amount || amount <= 0 || !Number.isInteger(amount)) {
        return res.status(400).json({ error: 'Input tidak valid.' });
    }

    if (!CURRENCIES.includes(type)) {
        return res.status(400).json({ error: 'Mata uang tidak valid.' });
    }

    // Check limit max 1 Gold worth per day
    const priceCopper = Math.round(amount * (RATE_TO_COPPER[type] || 0));
    const maxCopperLimit = 1 * RATE_TO_COPPER.gold; // 1 Gold = 10000 copper

    if (priceCopper > maxCopperLimit) {
         return res.status(400).json({ error: 'Maksimal donasi adalah setara 1 Gold per hari.' });
    }

    const lockKey = `sect_donate_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Transaksi sedang diproses. Mohon tunggu." });

    try {
        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
            const player = await Player.findOne({ discordId: userId, guildId }).session(session);

            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
            if (!player.sect || player.sect === 'Tanpa Sekte (Rogue Cultivator)') {
                throw new CustomError('Kamu tidak sedang bergabung dalam sekte manapun.', 400);
            }

            const sect = await Sect.findOne({ name: player.sect, guildId }).session(session);
            if (!sect) throw new CustomError('Sekte tidak ditemukan.', 404);

            // Fetch today's donations
            const TransactionLog = require('../../models/TransactionLog');
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const todaysDonations = await TransactionLog.find({
                guildId,
                type: 'sect_donate',
                fromUserId: userId,
                createdAt: { $gte: startOfDay }
            }).session(session);

            let todayTotalCopper = 0;
            for (let t of todaysDonations) {
                todayTotalCopper += (t.amount || 0) * (RATE_TO_COPPER[t.currency] || 0);
            }

            if (todayTotalCopper + priceCopper > maxCopperLimit) {
                const sisaCopper = Math.max(0, maxCopperLimit - todayTotalCopper);
                const sisaSilver = Math.floor(sisaCopper / RATE_TO_COPPER.silver);
                throw new CustomError(`Melebihi limit harian (1 Gold/hari). Sisa kuota donasi hari ini: ${sisaSilver} Silver.`, 400);
            }

            const { payCurrency } = require('../../utils/currency');
            if (!payCurrency(player.currency, amount, type)) {
                throw new CustomError(`Uang kamu tidak cukup. Butuh setara dengan ${amount} ${CURRENCY_LABEL[type]}.`, 400);
            }

            player.markModified('currency');
            await player.save({ session });

            if (!sect.currency[type]) sect.currency[type] = 0;
            sect.currency[type] += amount;
            sect.markModified('currency');
            await sect.save({ session });

            await TransactionLog.create([{
                guildId,
                type: 'sect_donate',
                fromUserId: userId,
                currency: type,
                amount: amount,
                balanceAfter: player.currency,
                note: `[WEB] ${player.characterName} donasi ${amount} ${type} ke sekte ${sect.name}`,
            }], { session });
        });

        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: `Berhasil donasi ke sekte.` });
        res.json({ success: true, message: `Berhasil donasi ${amount} ${type} ke sekte.` });
    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-SECT] Donate error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});


module.exports = router;
