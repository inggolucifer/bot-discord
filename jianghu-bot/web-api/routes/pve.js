const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const Exploration = require('../../models/Exploration');
const TransactionLog = require('../../models/TransactionLog');
const LockManager = require('../utils/lockManager');
const CustomError = require('../utils/CustomError');
const { authenticateToken } = require('../middlewares/auth');
const mongoose = require('mongoose');
const { escapeRegex } = require('../../utils/escapeRegex');

// Helper untuk Mongoose Transaction
const withTransaction = async (callback) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const result = await callback(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const LOCATIONS = [
    {
        id: 'hutan_bambu',
        name: 'Hutan Bambu Pinggiran',
        description: 'Area aman untuk pemula. Cocok untuk mencari material dasar.',
        minRealmLevel: 0,
        durations: [1, 3, 6], // in hours
        drops: {
            currency: { copper: [5, 15] },
            items: [
                { name: 'Batu Kasar', chance: 0.8, min: 1, max: 3 },
                { name: 'Kayu Mentah', chance: 0.8, min: 1, max: 3 },
                { name: 'Daun Herbal Pereda Nyeri', chance: 0.4, min: 1, max: 2 },
                { name: 'Buah Liar', chance: 0.6, min: 1, max: 2 }
            ]
        }
    },
    {
        id: 'lembah_iblis',
        name: 'Lembah Iblis Beracun',
        description: 'Tempat berbahaya yang penuh dengan racun dan monster. Risiko tinggi, hadiah tinggi.',
        minRealmLevel: 1,
        durations: [3, 6, 12],
        drops: {
            currency: { copper: [20, 50], silver: [0, 1] }, // low chance for 1 silver
            items: [
                { name: 'Jamur Beracun', chance: 0.7, min: 1, max: 4 },
                { name: 'Tulang Hewan', chance: 0.6, min: 1, max: 2 },
                { name: 'Akar Stamina', chance: 0.3, min: 1, max: 2 },
                { name: 'Kulit Mentah', chance: 0.5, min: 1, max: 2 }
            ]
        }
    },
    {
        id: 'gua_kristal',
        name: 'Gua Kristal Roh',
        description: 'Gua kuno yang mengandung energi Qi tebal. Sangat langka materialnya.',
        minRealmLevel: 2,
        durations: [6, 12, 24],
        drops: {
            currency: { silver: [1, 3] },
            items: [
                { name: 'Batu Bara', chance: 0.6, min: 2, max: 5 },
                { name: 'Bijih Besi', chance: 0.5, min: 1, max: 3 },
                { name: 'Batu Roh Kasar', chance: 0.1, min: 1, max: 1 },
                { name: 'Bunga Penurun Panas', chance: 0.4, min: 1, max: 2 }
            ]
        }
    }
];

// Helper to generate drops
async function generateDrops(location, durationHours, guildId) {
    const drops = { copper: 0, silver: 0, gold: 0, items: [] };

    // Calculate currency based on duration multiplier
    if (location.drops.currency.copper) {
        const [min, max] = location.drops.currency.copper;
        drops.copper = Math.floor(Math.random() * (max - min + 1) + min) * durationHours;
    }
    if (location.drops.currency.silver) {
         const [min, max] = location.drops.currency.silver;
         drops.silver = Math.floor(Math.random() * (max - min + 1) + min) * durationHours;
    }

    // Convert currency overflow
    let totalCopper = drops.copper + (drops.silver * 100);
    drops.silver = Math.floor(totalCopper / 100);
    drops.copper = totalCopper % 100;

    // Items
    for (let i = 0; i < durationHours; i++) {
        for (const dropItem of location.drops.items) {
            if (Math.random() <= dropItem.chance) {
                const qty = Math.floor(Math.random() * (dropItem.max - dropItem.min + 1)) + dropItem.min;

                // Cari ID Item dari DB (hanya mencari item yang ada)
                const itemRef = await Item.findOne({ guildId, name: new RegExp('^\\s*' + escapeRegex(dropItem.name) + '\\s*$', 'i') }).select('_id');
                if (itemRef) {
                    const existingItem = drops.items.find(i => i.itemId.toString() === itemRef._id.toString());
                    if (existingItem) {
                        existingItem.quantity += qty;
                    } else {
                        drops.items.push({ itemId: itemRef._id, quantity: qty });
                    }
                }
            }
        }
    }
    return drops;
}

router.get('/locations', authenticateToken, (req, res) => {
    res.json({ success: true, data: LOCATIONS });
});

router.get('/status', authenticateToken, async (req, res) => {
    try {
        const exploration = await Exploration.findOne({ discordId: req.user.userId, status: 'exploring' }).populate('drops.items.itemId');
        res.json({ success: true, data: exploration });
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil status eksplorasi.' });
    }
});

router.post('/start', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { locationId, durationHours } = req.body;

    if (!locationId || !durationHours) return res.status(400).json({ error: 'Data eksplorasi tidak lengkap.' });

    const location = LOCATIONS.find(l => l.id === locationId);
    if (!location) return res.status(400).json({ error: 'Lokasi tidak ditemukan.' });
    if (!location.durations.includes(Number(durationHours))) return res.status(400).json({ error: 'Durasi tidak valid.' });

    const lockKey = `explore_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Permintaan sedang diproses.' });

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId customStatus').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId, guildId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
            if (player.status !== 'active') throw new CustomError('Karakter tidak aktif.', 403);
            if (player.customStatus && player.customStatus.toLowerCase().includes('bekerja')) {
                throw new CustomError('Kamu sedang bekerja. Berhenti bekerja terlebih dahulu untuk eksplorasi.', 400);
            }
            if (player.customStatus && player.customStatus.toLowerCase().includes('eksplorasi')) {
                throw new CustomError('Kamu sedang melakukan eksplorasi lain.', 400);
            }

            // Validasi realm level sederhana
            if (player.systemCultivation.stage < location.minRealmLevel) {
                 throw new CustomError(`Kultivasi tidak cukup kuat untuk wilayah ini.`, 403);
            }

            const activeExp = await Exploration.findOne({ discordId: userId, status: 'exploring' }).session(session);
            if (activeExp) throw new CustomError('Kamu sudah memiliki eksplorasi aktif.', 400);

            const now = new Date();
            const endTime = new Date(now.getTime() + (durationHours * 60 * 60 * 1000));

            const generatedDrops = await generateDrops(location, durationHours, guildId);

            const exploration = new Exploration({
                guildId,
                discordId: userId,
                characterName: player.characterName,
                location: location.name,
                startTime: now,
                endTime,
                status: 'exploring',
                drops: generatedDrops
            });

            await exploration.save({ session });

            player.customStatus = `Sedang mengeksplorasi ${location.name}`;
            await player.save({ session });
        });

        res.json({ success: true, message: `Berhasil memulai eksplorasi ke ${location.name}.` });
    } catch (error) {
        if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-PVE] Start exploration error:', error);
        res.status(500).json({ error: 'Gagal memulai eksplorasi.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/claim', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const lockKey = `explore_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Permintaan sedang diproses.' });

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const result = await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId, guildId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

            const exploration = await Exploration.findOne({ discordId: userId, status: 'exploring' }).session(session);
            if (!exploration) throw new CustomError('Tidak ada eksplorasi aktif.', 404);

            if (new Date() < exploration.endTime) {
                throw new CustomError('Waktu eksplorasi belum selesai.', 400);
            }

            // Claim rewards
            player.currency.copper += exploration.drops.copper;
            player.currency.silver += exploration.drops.silver;
            player.currency.gold += exploration.drops.gold;

            for (const dropItem of exploration.drops.items) {
                const invItem = player.inventory.find(i => i.itemId.toString() === dropItem.itemId.toString());
                if (invItem) {
                    invItem.quantity += dropItem.quantity;
                } else {
                    player.inventory.push({ itemId: dropItem.itemId, quantity: dropItem.quantity });
                }
            }

            player.customStatus = null; // Clear status
            await player.save({ session });

            exploration.status = 'claimed';
            await exploration.save({ session });

            await TransactionLog.create([{
                guildId,
                type: 'admin_grant', // Using existing enum to log the drops
                description: `[${player.characterName}] klaim hadiah eksplorasi ${exploration.location}. (+${exploration.drops.copper} Copper, +${exploration.drops.silver} Silver)`
            }], { session });

            return exploration.drops;
        });

        res.json({ success: true, message: 'Berhasil mengklaim hasil eksplorasi.', drops: result });
    } catch (error) {
        if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-PVE] Claim exploration error:', error);
        res.status(500).json({ error: 'Gagal mengklaim hasil eksplorasi.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
