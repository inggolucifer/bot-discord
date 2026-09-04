const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const authenticateToken = require('../middleware/auth');
const LockManager = require('../utils/lockManager');
const { withTransaction } = require('../utils/dbTransaction');
const CustomError = require('../utils/customError');

router.post('/release', authenticateToken, async (req, res) => {
    const { instanceId, confirmText } = req.body;
    const userId = req.user.userId;

    if (!instanceId) return res.status(400).json({ error: 'Missing instanceId' });
    if (confirmText !== 'LEPASKAN') return res.status(400).json({ error: 'Konfirmasi tidak valid.' });

    const lockKey = `pet_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Sibuk.' });

    try {
        let msg = '';
        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player) throw new CustomError('Player tidak ditemukan', 404);

            const idx = player.pets.findIndex(p => p.instanceId === instanceId);
            if (idx === -1) throw new CustomError('Pet tidak ditemukan.', 404);

            const petName = player.pets[idx].name || 'Pet';
            player.pets.splice(idx, 1);
            player.markModified('pets');
            await player.save({ session });
            msg = `Berhasil melepaskan pet ${petName}.`;
        });
        return res.json({ success: true, message: msg });
    } catch (e) {
        if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
        console.error(e);
        return res.status(500).json({ error: 'Internal error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/rename', authenticateToken, async (req, res) => {
    const { instanceId, newName } = req.body;
    const userId = req.user.userId;

    if (!instanceId || !newName) return res.status(400).json({ error: 'Missing params' });

    const lockKey = `pet_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Sibuk.' });

    try {
        let msg = '';
        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player) throw new CustomError('Player tidak ditemukan', 404);

            const idx = player.pets.findIndex(p => p.instanceId === instanceId);
            if (idx === -1) throw new CustomError('Pet tidak ditemukan.', 404);

            player.pets[idx].name = newName;
            player.markModified('pets');
            await player.save({ session });
            msg = `Berhasil mengganti nama pet menjadi ${newName}.`;
        });
        return res.json({ success: true, message: msg });
    } catch (e) {
        if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
        console.error(e);
        return res.status(500).json({ error: 'Internal error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
