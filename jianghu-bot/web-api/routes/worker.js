const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const WorkerContract = require('../../models/WorkerContract');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);const workers = await WorkerContract.find({ guildId, status: 'available' }).lean();

        // Inject NPC System Worker as a static option so frontend can render it
        const npcWorker = {
           _id: 'NPC_SYSTEM',
           workerName: 'NPC Worker (Sistem)',
           pricePerHour: 5,
           maxDurationHours: 72, // Arbitrary high max
           isNpc: true
        };

        res.json({ success: true, data: [npcWorker, ...workers] });
    } catch (error) {
        console.error('[API-WORKER] Error fetching workers:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});


const { calculateProgress } = require('../../utils/assetProgress');
const LockManager = require('../utils/lockManager');

router.post('/stop-mandiri', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const lockKey = `worker_stop_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        let found = false;
        for (const owned of player.assets) {
            if (owned.assignedWorkers) {
                const myIndex = owned.assignedWorkers.findIndex(w => w.workerId === userId);
                if (myIndex !== -1) {
                    owned.progressAccumulated = (owned.progressAccumulated || 0) + calculateProgress(owned);
                    owned.lastProgressUpdate = new Date();
                    owned.assignedWorkers.splice(myIndex, 1);
                    found = true;
                }
            }
        }

        if (!found) {
            return res.status(400).json({ error: 'Kamu tidak sedang bekerja secara mandiri di aset mana pun milikmu.' });
        }

        player.customStatus = null;
        await player.save();

        res.json({ success: true, message: 'Kamu berhenti bekerja di asetmu.' });
    } catch (error) {
        console.error('[API-WORKER] Stop mandiri error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        releaseLock();
    }
});

module.exports = router;
