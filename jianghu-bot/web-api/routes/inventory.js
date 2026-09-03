const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const authenticateToken = require('../middleware/auth');
const LockManager = require('../utils/lockManager');
const mongoose = require('mongoose');

// Endpoint: Apply Time-Skip Item (e.g., Insight Pill)
router.post('/use-time-skip', authenticateToken, async (req, res) => {
    const { itemId } = req.body;
    const userId = req.user.id;
    const guildId = req.user.guildId; // or appropriate retrieval

    if (!itemId) {
        return res.status(400).json({ message: 'Missing itemId parameter.' });
    }

    const lockKey = `inventory_use_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
        return res.status(429).json({ message: 'Terlalu banyak permintaan berurutan. Tunggu sebentar.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const player = await Player.findOne({ discordId: userId }).session(session);
        if (!player) {
            throw new Error('Player not found');
        }

        const invItemIndex = player.inventory.findIndex(i => i.itemId === itemId);
        if (invItemIndex === -1 || player.inventory[invItemIndex].quantity < 1) {
            return res.status(400).json({ message: 'Item tidak ditemukan di inventarismu atau jumlah tidak cukup.' });
        }

        // We need to fetch the Item to see if it's a time skip
        const itemDef = await Item.findOne({ id: itemId, guildId: player.guildId }).session(session);
        if (!itemDef) {
            return res.status(404).json({ message: 'Definisi item tidak ditemukan.' });
        }

        if (!itemDef.effect || !itemDef.effect.startsWith('time_skip_')) {
            return res.status(400).json({ message: 'Item ini bukan item time-skip (konsumsi) yang valid.' });
        }

        // Example format: time_skip_12
        const hoursToSkip = parseInt(itemDef.effect.split('_')[2]);
        if (isNaN(hoursToSkip) || hoursToSkip <= 0) {
            return res.status(400).json({ message: 'Efek time-skip tidak valid.' });
        }

        // Perform time skip logic. For example, if they are cultivating, adjust breakthroughEndTime or meditationEndTime.
        // Assuming `meditationEndTime` is what time-skip applies to.
        if (!player.meditationEndTime || player.meditationEndTime < Date.now()) {
            return res.status(400).json({ message: 'Kamu tidak sedang bermeditasi/kultivasi.' });
        }

        const currentEndTime = new Date(player.meditationEndTime).getTime();
        const now = Date.now();
        const msLeft = currentEndTime - now;
        const hoursLeft = msLeft / (1000 * 60 * 60);

        // Overkill check
        if (hoursToSkip > hoursLeft + 2) {
             return res.status(400).json({ message: 'Membuang-buang efek! Waktu skip melebihi sisa waktu terlalu banyak (overkill > 2 jam).' });
        }

        const newEndTime = new Date(currentEndTime - (hoursToSkip * 60 * 60 * 1000));
        player.meditationEndTime = newEndTime < now ? new Date(now - 1000) : newEndTime; // if it goes negative, finish immediately

        // Deduct item
        player.inventory[invItemIndex].quantity -= 1;
        if (player.inventory[invItemIndex].quantity <= 0) {
            player.inventory.splice(invItemIndex, 1);
        }

        await player.save({ session });
        await session.commitTransaction();

        const io = req.app.get('io');
        if (io) io.to(userId).emit('user_update', { message: `Menggunakan ${itemDef.name}, waktu terpotong ${hoursToSkip} jam!` });

        return res.json({ message: `Berhasil menggunakan ${itemDef.name}. Waktu kultivasi berkurang ${hoursToSkip} jam.` });
    } catch (err) {
        await session.abortTransaction();
        console.error('Error in /inventory/use-time-skip:', err);
        return res.status(500).json({ message: 'Terjadi kesalahan internal server.' });
    } finally {
        session.endSession();
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
