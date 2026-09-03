const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const authenticateToken = require('../middleware/auth');
const LockManager = require('../utils/lockManager');
const mongoose = require('mongoose');

router.post('/release', authenticateToken, async (req, res) => {
    const { instanceId } = req.body;
    const userId = req.user.id;

    if (!instanceId) return res.status(400).json({ message: 'Missing instanceId' });

    const lockKey = `pet_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ message: 'Sibuk.' });

    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ message: 'Player tidak ditemukan' });

        const idx = player.pets.findIndex(p => p.instanceId === instanceId);
        if (idx === -1) return res.status(404).json({ message: 'Pet tidak ditemukan.' });

        const petName = player.pets[idx].name || player.pets[idx].petId;
        player.pets.splice(idx, 1);
        await player.save();

        const io = req.app.get('io');
        if (io) io.to(userId).emit('user_update', { message: `Melepaskan pet ${petName}.` });

        return res.json({ message: `Berhasil melepaskan pet.` });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Internal error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/rename', authenticateToken, async (req, res) => {
    const { instanceId, newName } = req.body;
    const userId = req.user.id;

    if (!instanceId || !newName) return res.status(400).json({ message: 'Missing params' });

    const lockKey = `pet_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ message: 'Sibuk.' });

    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ message: 'Player tidak ditemukan' });

        const idx = player.pets.findIndex(p => p.instanceId === instanceId);
        if (idx === -1) return res.status(404).json({ message: 'Pet tidak ditemukan.' });

        player.pets[idx].name = newName;
        await player.save();

        const io = req.app.get('io');
        if (io) io.to(userId).emit('user_update', { message: `Mengganti nama pet menjadi ${newName}.` });

        return res.json({ message: `Berhasil mengganti nama pet.` });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Internal error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
