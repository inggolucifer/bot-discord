const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Sect = require('../../models/Sect');
const Asset = require('../../models/Asset');
const authenticateToken = require('../middleware/auth');
const LockManager = require('../utils/lockManager');
const { withTransaction } = require('../utils/dbTransaction');
const CustomError = require('../utils/customError');

router.post('/deposit-resource', authenticateToken, async (req, res) => {
    const { itemId, quantity } = req.body;
    const userId = req.user.userId;

    if (!itemId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Parameter tidak valid.' });
    }

    const lockKey = `sect_deposit_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Harap tunggu.' });

    try {
        let msg = '';
        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player || !player.sect) throw new CustomError('Kamu tidak memiliki sekte.', 400);

            const sect = await Sect.findOne({ name: player.sect, guildId: player.guildId }).session(session);
            if (!sect) throw new CustomError('Sekte tidak ditemukan.', 404);

            const invItem = player.inventory.find(i => i.itemId.toString() === itemId.toString());
            if (!invItem || invItem.quantity < quantity) {
                throw new CustomError('Item di inventory tidak cukup.', 400);
            }

            invItem.quantity -= quantity;
            if (invItem.quantity <= 0) {
                player.inventory = player.inventory.filter(i => i.itemId.toString() !== itemId.toString());
            }

            const sectInvItem = sect.storage.find(i => i.itemId.toString() === itemId.toString());
            if (sectInvItem) {
                sectInvItem.quantity += quantity;
            } else {
                sect.storage.push({ itemId: itemId, quantity });
            }

            player.markModified('inventory');
            sect.markModified('storage');

            await player.save({ session });
            await sect.save({ session });

            msg = `Berhasil deposit ${quantity}x item ke gudang sekte.`;
        });

        return res.json({ success: true, message: msg });
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        return res.status(500).json({ error: 'Internal error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/build-asset', authenticateToken, async (req, res) => {
    const { assetId } = req.body;
    const userId = req.user.userId;

    const lockKey = `sect_build_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Harap tunggu.' });

    try {
        let msg = '';
        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player || !player.sect) throw new CustomError('Tidak ada sekte.', 400);

            const sect = await Sect.findOne({ name: player.sect, guildId: player.guildId }).session(session);
            if (!sect) throw new CustomError('Sekte tidak ditemukan.', 404);

            const member = sect.members.find(m => m.userId === userId);
            if (!member || (member.role !== 'Ketua' && member.role !== 'Tetua')) {
                 throw new CustomError('Hanya Ketua atau Tetua yang dapat membangun.', 403);
            }

            const assetDef = await Asset.findOne({ _id: assetId, guildId: player.guildId }).session(session);
            if (!assetDef || assetDef.type !== 'sect') {
                throw new CustomError('Aset tidak valid atau bukan aset sekte.', 400);
            }

            const buildReqs = assetDef.buildRequirements || [];
            for (const req of buildReqs) {
                const hasMaterial = sect.storage.find(s => s.itemId.toString() === req.itemId.toString() && s.quantity >= req.quantity);
                if (!hasMaterial) {
                    throw new CustomError('Material di sekte tidak cukup.', 400);
                }
            }

            for (const req of buildReqs) {
                const sItem = sect.storage.find(s => s.itemId.toString() === req.itemId.toString());
                sItem.quantity -= req.quantity;
            }
            sect.storage = sect.storage.filter(s => s.quantity > 0);

            const buildTimeMs = assetDef.buildTimeHours * 60 * 60 * 1000;
            sect.assets.push({
                assetId: assetDef._id,
                status: 'building',
                assignedWorkers: [],
                endTime: new Date(Date.now() + buildTimeMs)
            });

            sect.markModified('storage');
            sect.markModified('assets');
            await sect.save({ session });

            msg = `Pembangunan sekte ${assetDef.name} dimulai.`;
        });

        return res.json({ success: true, message: msg });
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
        console.error(err);
        return res.status(500).json({ error: 'Internal error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
