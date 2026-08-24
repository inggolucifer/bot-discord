const express = require('express');
const router = express.Router();
const Barter = require('../../models/Barter');
const Player = require('../../models/Player');
const LockManager = require('../utils/lockManager');
const barterService = require('../../services/player/barterService');
const { authenticateToken } = require('../middlewares/auth');

// Ambil tawaran barter yang melibatkan user (sebagai pengirim atau penerima)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const guildId = req.user.guildId || req.user.userId;
        const userId = req.user.userId;

        if (!guildId) {
            return res.status(400).json({ error: 'Guild ID tidak ditemukan.' });
        }

        // Cari barter yang statusnya pending, dan user merupakan pengirim ATAU penerima
        const barters = await Barter.find({
            guildId,
            status: 'pending',
            $or: [{ fromUserId: userId }, { toUserId: userId }]
        }).populate('offerItems.itemId').populate('requestItems.itemId').sort({ createdAt: -1 }).lean();

        // Cari detail dari pemain lawan untuk UI
        for (const barter of barters) {
             const fromPlayer = await Player.findOne({ discordId: barter.fromUserId, guildId }).select('characterName').lean();
             const toPlayer = await Player.findOne({ discordId: barter.toUserId, guildId }).select('characterName').lean();
             barter.fromPlayerName = fromPlayer ? fromPlayer.characterName : 'Unknown';
             barter.toPlayerName = toPlayer ? toPlayer.characterName : 'Unknown';
        }

        res.json({ barters });
    } catch (error) {
         console.error('[API-BARTER] Error fetching barters:', error);
         res.status(500).json({ error: 'Gagal mengambil tawaran barter.' });
    }
});

// Respon terhadap barter (terima atau tolak)
router.post('/respond', authenticateToken, async (req, res) => {
    const { barterId, action } = req.body; // action: 'accept' atau 'decline'
    const userId = req.user.userId;
    const guildId = req.user.guildId || req.user.userId;

    if (!barterId || !['accept', 'decline'].includes(action)) {
        return res.status(400).json({ error: 'Data tidak valid.' });
    }

    const lockId = `barter_respond_${barterId}`;
    if (!LockManager.acquire(lockId)) {
        return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });
    }

    try {
         const barter = await Barter.findById(barterId).populate('offerItems.itemId').populate('requestItems.itemId');
         if (!barter) {
              return res.status(404).json({ error: 'Tawaran barter tidak ditemukan.' });
         }

         if (barter.guildId !== guildId) {
             return res.status(403).json({ error: 'Barter tidak berada di server yang sama.' });
         }

         if (barter.status !== 'pending') {
             return res.status(400).json({ error: `Barter sudah tidak aktif (Status: ${barter.status}).` });
         }

         // Validasi: yang bisa merespon adalah penerima tawaran
         if (barter.toUserId !== userId) {
             return res.status(403).json({ error: 'Hanya penerima yang bisa menerima/menolak tawaran ini.' });
         }

         if (action === 'accept') {
             const result = await barterService.acceptBarter(req.discordClient, guildId, barterId, userId);
             if (result.success) {
                  return res.json({ message: 'Barter berhasil diterima!' });
             } else {
                  return res.status(400).json({ error: result.reason || 'Gagal memproses barter.' });
             }
         } else {
             const result = await barterService.cancelBarter(req.discordClient, guildId, barterId, 'declined', userId);
             if (result.success) {
                 return res.json({ message: 'Barter ditolak.' });
             } else {
                 return res.status(400).json({ error: result.reason || 'Gagal menolak barter.' });
             }
         }

    } catch (error) {
        console.error('[API-BARTER] Error responding to barter:', error);
        res.status(500).json({ error: 'Terjadi kesalahan sistem saat memproses barter.' });
    } finally {
        LockManager.release(lockId);
    }
});

// Batalkan barter yang diajukan sendiri
router.post('/cancel', authenticateToken, async (req, res) => {
    const { barterId } = req.body;
    const userId = req.user.userId;
    const guildId = req.user.guildId || req.user.userId;

    if (!barterId) {
        return res.status(400).json({ error: 'Barter ID diperlukan.' });
    }

    const lockId = `barter_cancel_${barterId}`;
    if (!LockManager.acquire(lockId)) {
         return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });
    }

    try {
        const barter = await Barter.findById(barterId);
        if (!barter) {
             return res.status(404).json({ error: 'Tawaran barter tidak ditemukan.' });
        }

        if (barter.fromUserId !== userId) {
             return res.status(403).json({ error: 'Anda hanya bisa membatalkan barter yang Anda ajukan.' });
        }

        if (barter.status !== 'pending') {
             return res.status(400).json({ error: `Barter sudah tidak aktif (Status: ${barter.status}).` });
        }

        const result = await barterService.cancelBarter(req.discordClient, guildId, barterId, 'cancelled', userId);
        if (result.success) {
             res.json({ message: 'Barter berhasil dibatalkan.' });
        } else {
             res.status(400).json({ error: result.reason || 'Gagal membatalkan barter.' });
        }
    } catch (error) {
        console.error('[API-BARTER] Error cancelling barter:', error);
        res.status(500).json({ error: 'Terjadi kesalahan sistem saat membatalkan barter.' });
    } finally {
        LockManager.release(lockId);
    }
});

module.exports = router;