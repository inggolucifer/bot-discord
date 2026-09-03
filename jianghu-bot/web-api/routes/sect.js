const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Sect = require('../../models/Sect'); // Assuming Sect model exists
const Asset = require('../../models/Asset'); // Assuming Sect Asset model or shared Asset model
const Item = require('../../models/Item');
const authenticateToken = require('../middleware/auth');
const LockManager = require('../utils/lockManager');
const mongoose = require('mongoose');
const { checkMaterials, consumeMaterials } = require('../../utils/crafting');

// Use this to fetch sect assets, items, etc.
// For now, focusing on Deposit and Build

router.post('/deposit-resource', authenticateToken, async (req, res) => {
    const { itemId, quantity } = req.body;
    const userId = req.user.id;

    if (!itemId || !quantity || quantity <= 0) {
        return res.status(400).json({ message: 'Parameter tidak valid.' });
    }

    const lockKey = `sect_deposit_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ message: 'Harap tunggu.' });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const player = await Player.findOne({ discordId: userId }).session(session);
        if (!player || !player.sectId) {
            return res.status(400).json({ message: 'Kamu tidak memiliki sekte.' });
        }

        const sect = await Sect.findOne({ id: player.sectId }).session(session);
        if (!sect) {
            return res.status(404).json({ message: 'Sekte tidak ditemukan.' });
        }

        // Deduct from player
        const invIndex = player.inventory.findIndex(i => i.itemId === itemId);
        if (invIndex === -1 || player.inventory[invIndex].quantity < quantity) {
            return res.status(400).json({ message: 'Item di inventory tidak cukup.' });
        }

        player.inventory[invIndex].quantity -= quantity;
        if (player.inventory[invIndex].quantity === 0) player.inventory.splice(invIndex, 1);

        // Add to sect storage
        const sectInvIndex = sect.storage.findIndex(i => i.itemId === itemId);
        if (sectInvIndex > -1) {
            sect.storage[sectInvIndex].quantity += quantity;
        } else {
            sect.storage.push({ itemId, quantity });
        }

        await player.save({ session });
        await sect.save({ session });
        await session.commitTransaction();

        const io = req.app.get('io');
        if (io) io.to(userId).emit('user_update', { message: `Berhasil deposit ${quantity}x item.` });

        return res.json({ message: 'Deposit berhasil' });
    } catch (err) {
        await session.abortTransaction();
        console.error(err);
        return res.status(500).json({ message: 'Internal error' });
    } finally {
        session.endSession();
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/build-asset', authenticateToken, async (req, res) => {
    const { assetId } = req.body;
    const userId = req.user.id;

    const lockKey = `sect_build_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ message: 'Harap tunggu.' });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const player = await Player.findOne({ discordId: userId }).session(session);
        if (!player || !player.sectId) return res.status(400).json({ message: 'Tidak ada sekte.' });

        // Validate role (assuming Sect model has roles or player has role)
        const sect = await Sect.findOne({ id: player.sectId }).session(session);
        if (!sect) return res.status(404).json({ message: 'Sekte tidak ditemukan.' });

        const member = sect.members.find(m => m.discordId === userId);
        if (!member || (member.role !== 'Ketua' && member.role !== 'Tetua')) {
             return res.status(403).json({ message: 'Hanya Ketua atau Tetua yang dapat membangun.' });
        }

        const assetDef = await Asset.findOne({ id: assetId, guildId: player.guildId }).session(session);
        if (!assetDef || assetDef.type !== 'sect') {
            return res.status(400).json({ message: 'Aset tidak valid atau bukan aset sekte.' });
        }

        // Deduct from sect storage using utility (assuming utility works for sect storage as well, or implement inline)
        const buildReqs = assetDef.buildRequirements || [];
        for (const req of buildReqs) {
            const hasMaterial = sect.storage.find(s => s.itemId === req.itemId && s.quantity >= req.quantity);
            if (!hasMaterial) {
                return res.status(400).json({ message: 'Material di sekte tidak cukup.' });
            }
        }

        // Deduct
        for (const req of buildReqs) {
            const sItem = sect.storage.find(s => s.itemId === req.itemId);
            sItem.quantity -= req.quantity;
        }
        sect.storage = sect.storage.filter(s => s.quantity > 0);

        // Build
        const buildTimeMs = assetDef.buildTimeHours * 60 * 60 * 1000;
        sect.assets.push({
            assetId: assetDef.id,
            status: 'building',
            endTime: new Date(Date.now() + buildTimeMs)
        });

        await sect.save({ session });
        await session.commitTransaction();

        const io = req.app.get('io');
        // optionally emit to a room for the sect
        if (io) io.to(userId).emit('user_update', { message: `Mulai membangun ${assetDef.name}` });

        return res.json({ message: 'Pembangunan sekte dimulai.' });
    } catch (err) {
        await session.abortTransaction();
        console.error(err);
        return res.status(500).json({ message: 'Internal error' });
    } finally {
        session.endSession();
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
