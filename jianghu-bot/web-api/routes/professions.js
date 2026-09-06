const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const LockManager = require('../utils/lockManager');
const { RATE_TO_COPPER } = require('../../utils/currencyNormalize');

const PROFESSION_COST_COPPER = 50 * RATE_TO_COPPER.silver; // 50 Silver

router.post('/unlock', verifyToken, async (req, res) => {
    const { profession } = req.body;
    const validProfessions = ['farming', 'fishing', 'cooking', 'alchemy', 'smithing'];

    if (!validProfessions.includes(profession)) {
        return res.status(400).json({ error: 'Profesi tidak valid.' });
    }

    const lockKey = `professions_unlock_${req.user.userId}`;
    const releaseLock = LockManager.acquire(lockKey);
    if (!releaseLock) {
        return res.status(429).json({ error: 'Transaksi sedang diproses, harap tunggu...' });
    }

    try {
        const player = await Player.findOne({ discordId: req.user.userId });
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        if (player.professions && player.professions[profession] && player.professions[profession].isUnlocked) {
            return res.status(400).json({ error: `Profesi ${profession} sudah terbuka.` });
        }

        // Just deduct from copper, Mongoose pre-save hook handles normalization
        player.currency.copper -= PROFESSION_COST_COPPER;

        // Let's do a basic check if negative wealth would happen
        const c = player.currency;
        const totalCopper = c.copper + c.silver * 100 + c.gold * 10000 + c.jade * 1000000 + c.spirit * 100000000;
        if (totalCopper < 0) {
             return res.status(400).json({ error: `Uang tidak cukup. Butuh 50 Silver.` });
        }

        if (!player.professions) player.professions = {};
        if (!player.professions[profession]) player.professions[profession] = {};

        player.professions[profession].isUnlocked = true;
        await player.save();

        res.json({ message: `Profesi ${profession} berhasil dibuka!`, professions: player.professions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});


// Sesi Minigame
// In-memory cache for active minigame sessions
const activeSessions = new Map();

router.post('/start', verifyToken, async (req, res) => {
    const { profession, recipeId, toolItemId } = req.body; // Client tells us what they want to craft

    // In a real implementation, you'd check a "Recipe" collection here
    // For now, we simulate starting a session

    const lockKey = `professions_start_${req.user.userId}`;
    const releaseLock = LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses, harap tunggu...' });

    try {
        const player = await Player.findOne({ discordId: req.user.userId }).populate('inventory.itemId');
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        if (!player.professions || !player.professions[profession] || !player.professions[profession].isUnlocked) {
            return res.status(403).json({ error: `Kamu belum membuka profesi ${profession}.` });
        }

        // Validate Tool
        const toolInInventory = player.inventory.find(i => i.itemId._id.toString() === toolItemId);
        if (!toolInInventory) {
             return res.status(400).json({ error: `Alat tidak ditemukan di inventory.` });
        }

        // Validate tool type
        const toolMap = {
            'farming': 'farming_tool',
            'fishing': 'fishing_rod',
            'cooking': 'kitchen_tool',
            'alchemy': 'furnace',
            'smithing': 'forge'
        };

        if (toolInInventory.itemId.toolType !== toolMap[profession]) {
             return res.status(400).json({ error: `Alat tidak cocok untuk profesi ini.` });
        }

        if (toolInInventory.durability <= 0) {
             return res.status(400).json({ error: `Alat ini sudah rusak dan tidak bisa digunakan.` });
        }

        // We would also deduct materials here based on recipe.

        // Generate session
        const sessionId = Math.random().toString(36).substring(2, 15);
        activeSessions.set(req.user.userId, {
             sessionId,
             profession,
             toolItemId: toolInInventory.itemId._id.toString(),
             startTime: Date.now()
        });

        res.json({ message: 'Minigame dimulai!', sessionId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/complete', verifyToken, async (req, res) => {
    const { sessionId, score } = req.body; // score from frontend minigame (0-100)

    const lockKey = `professions_complete_${req.user.userId}`;
    const releaseLock = LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses, harap tunggu...' });

    try {
        const session = activeSessions.get(req.user.userId);
        if (!session || session.sessionId !== sessionId) {
            return res.status(400).json({ error: 'Sesi minigame tidak valid atau sudah kadaluarsa.' });
        }

        activeSessions.delete(req.user.userId); // Hapus sesi

        const player = await Player.findOne({ discordId: req.user.userId });
        const profLevel = player.professions[session.profession].level || 1;

        // Kalkulasi sukses
        const isSuccess = score > 50; // Simple threshold for now

        // Kurangi durability alat
        const toolIndex = player.inventory.findIndex(i => i.itemId.toString() === session.toolItemId);
        if (toolIndex !== -1) {
             player.inventory[toolIndex].durability -= 1;
             if (player.inventory[toolIndex].durability <= 0) {
                 player.inventory.splice(toolIndex, 1); // Alat Hancur
                 // Notify frontend tool broken
             }
        }

        if (isSuccess) {
            // Berhasil
            // Kalkulasi Quality berdasarkan level dan skor
            const baseQuality = 0.8 + (profLevel * 0.05); // Newbie (lv1) = 0.85, Master (lv10) = 1.3
            const scoreMultiplier = (score / 100) * 0.2; // Bonus up to 0.2
            const finalQuality = Number((baseQuality + scoreMultiplier).toFixed(2));

            // Kita butuh itemId untuk hasilnya, misalnya item Dummy
            // Di implementasi asli, ini ditarik dari "Recipe"
            // Untuk seed, kita skip insert item ke inventory jika gak ada ID

            // Tambah EXP
            player.professions[session.profession].exp += 10;
            if (player.professions[session.profession].exp >= profLevel * 100) {
                player.professions[session.profession].level += 1;
                player.professions[session.profession].exp = 0;
            }

            await player.save();
            return res.json({
                success: true,
                message: `Berhasil! Item dibuat dengan kualitas ${finalQuality}x.`,
                quality: finalQuality,
                creatorName: player.characterName
            });
        } else {
            // Gagal -> Junk
            await player.save();
            return res.json({
                success: false,
                message: `Gagal... Bahan hangus dan menjadi Junk.`
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
