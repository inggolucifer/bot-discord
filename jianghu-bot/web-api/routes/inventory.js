const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const authenticateToken = require('../middleware/auth');
const LockManager = require('../utils/lockManager');
const { withTransaction } = require('../utils/dbTransaction');
const CustomError = require('../utils/customError');

router.post('/use-time-skip', authenticateToken, async (req, res) => {
    const { itemId } = req.body;
    const userId = req.user.userId;

    if (!itemId) {
        return res.status(400).json({ error: 'Missing itemId parameter.' });
    }

    const lockKey = `inventory_use_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
        return res.status(429).json({ error: 'Terlalu banyak permintaan berurutan. Tunggu sebentar.' });
    }

    try {
        let msg = '';
        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player) throw new CustomError('Player not found', 404);

            const invItem = player.inventory.find(i => i.itemId.toString() === itemId.toString());
            if (!invItem || invItem.quantity < 1) {
                throw new CustomError('Item tidak ditemukan di inventarismu atau jumlah tidak cukup.', 400);
            }

            const itemDef = await Item.findOne({ _id: itemId, guildId: player.guildId }).session(session);
            if (!itemDef) {
                throw new CustomError('Definisi item tidak ditemukan.', 404);
            }

            if (!itemDef.effect || !itemDef.effect.startsWith('time_skip_')) {
                throw new CustomError('Item ini bukan item time-skip (konsumsi) yang valid.', 400);
            }

            const hoursToSkip = parseInt(itemDef.effect.split('_')[2]);
            if (isNaN(hoursToSkip) || hoursToSkip <= 0) {
                throw new CustomError('Efek time-skip tidak valid.', 400);
            }

            // Using meditation timer for system cultivation
            let isSkipping = false;
            let currentEndTime = 0;

            if (player.systemCultivation && player.systemCultivation.meditationEndTime && player.systemCultivation.meditationEndTime > new Date()) {
                 currentEndTime = player.systemCultivation.meditationEndTime.getTime();
                 isSkipping = true;
            }

            if (!isSkipping) {
                throw new CustomError('Kamu tidak sedang bermeditasi/kultivasi.', 400);
            }

            const now = Date.now();
            const msLeft = currentEndTime - now;
            const hoursLeft = msLeft / (1000 * 60 * 60);

            if (hoursToSkip > hoursLeft + 2) {
                 throw new CustomError('Membuang-buang efek! Waktu skip melebihi sisa waktu terlalu banyak (overkill > 2 jam).', 400);
            }

            const newEndTime = new Date(currentEndTime - (hoursToSkip * 60 * 60 * 1000));
            player.systemCultivation.meditationEndTime = newEndTime < now ? new Date(now - 1000) : newEndTime;

            invItem.quantity -= 1;
            if (invItem.quantity <= 0) {
                player.inventory = player.inventory.filter(i => i.itemId.toString() !== itemId.toString());
            }

            player.markModified('systemCultivation');
            player.markModified('inventory');
            await player.save({ session });

            msg = `Berhasil menggunakan ${itemDef.name}. Waktu kultivasi berkurang ${hoursToSkip} jam.`;
        });

        return res.json({ success: true, message: msg });
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
        console.error('Error in /inventory/use-time-skip:', err);
        return res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
