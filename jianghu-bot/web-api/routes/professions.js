const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const LockManager = require('../utils/lockManager');
const { RATE_TO_COPPER } = require('../../utils/currencyNormalize');
const RECIPES = require('../../utils/professionsRecipes');

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

        player.currency.copper -= PROFESSION_COST_COPPER;

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

const activeSessions = new Map();

router.post('/start', verifyToken, async (req, res) => {
    const { profession, recipeId, toolItemId } = req.body;

    const lockKey = `professions_start_${req.user.userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses, harap tunggu...' });

    try {
        const player = await Player.findOne({ discordId: req.user.userId }).populate('inventory.itemId');
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        if (!player.professions || !player.professions[profession] || !player.professions[profession].isUnlocked) {
            return res.status(403).json({ error: `Kamu belum membuka profesi ${profession}.` });
        }

        // Energy Check (Moved to point 4, but doing basic check here to integrate smoothly)
        // Energy manager will be used here. For now, checking inline if energy manager not built.
        const energyManager = require('../../utils/energyManager');
        const currentEnergy = energyManager.calculateEnergy(player);
        if (currentEnergy < 10) {
            return res.status(400).json({ error: 'Energy tidak cukup. Butuh 10 Energy.' });
        }

        // Recipe Check
        const recipe = RECIPES[recipeId];
        if (!recipe || recipe.profession !== profession) {
            return res.status(400).json({ error: 'Resep tidak valid untuk profesi ini.' });
        }

        // Validate Tool
        const toolInInventory = player.inventory.find(i => i.itemId._id.toString() === toolItemId);
        if (!toolInInventory) {
             return res.status(400).json({ error: `Alat tidak ditemukan di inventory.` });
        }

        if (toolInInventory.itemId.toolType !== recipe.toolType) {
             return res.status(400).json({ error: `Alat tidak cocok untuk resep ini.` });
        }

        if (toolInInventory.durability <= 0) {
             return res.status(400).json({ error: `Alat ini sudah rusak dan tidak bisa digunakan.` });
        }

        // Validate Materials
        let missingMaterials = [];
        for (const mat of recipe.materials) {
            const matInInv = player.inventory.find(i => i.itemId.name === mat.name);
            const qty = matInInv ? matInInv.quantity : 0;
            if (qty < mat.quantity) {
                missingMaterials.push(`${mat.name} (Butuh ${mat.quantity}, punya ${qty})`);
            }
        }

        if (missingMaterials.length > 0) {
            return res.status(400).json({ error: `Material tidak cukup: ${missingMaterials.join(', ')}` });
        }

        // Deduct Energy
        player.energy.current = currentEnergy - 10;
        player.energy.lastUpdated = new Date();

        // Lock / Deduct Materials Immediately to prevent double spending
        for (const mat of recipe.materials) {
            const matIndex = player.inventory.findIndex(i => i.itemId.name === mat.name);
            player.inventory[matIndex].quantity -= mat.quantity;
            if (player.inventory[matIndex].quantity <= 0) {
                player.inventory.splice(matIndex, 1);
            }
        }

        await player.save();

        const sessionId = Math.random().toString(36).substring(2, 15);
        activeSessions.set(req.user.userId, {
             sessionId,
             profession,
             recipeId,
             toolItemId: toolInInventory.itemId._id.toString(),
             startTime: Date.now()
        });

        res.json({ message: 'Minigame dimulai!', sessionId, energy: player.energy.current });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/complete', verifyToken, async (req, res) => {
    const { sessionId, telemetryData } = req.body;

    const lockKey = `professions_complete_${req.user.userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses, harap tunggu...' });

    try {
        const session = activeSessions.get(req.user.userId);
        if (!session || session.sessionId !== sessionId) {
            return res.status(400).json({ error: 'Sesi minigame tidak valid atau sudah kadaluarsa.' });
        }

        const elapsedTime = Date.now() - session.startTime;
        if (elapsedTime < 2000) {
            // Anti-Bot/Hack: Terlalu cepat!
            activeSessions.delete(req.user.userId);
            return res.status(400).json({ error: 'Peringatan Sistem: Deteksi manipulasi kecepatan/bot.' });
        }

        activeSessions.delete(req.user.userId);

        const player = await Player.findOne({ discordId: req.user.userId });
        const profLevel = player.professions[session.profession].level || 1;
        const recipe = RECIPES[session.recipeId];

        // Kurangi durability alat
        let toolBroken = false;
        const toolIndex = player.inventory.findIndex(i => i.itemId.toString() === session.toolItemId);
        if (toolIndex !== -1) {
             player.inventory[toolIndex].durability -= 1;
             if (player.inventory[toolIndex].durability <= 0) {
                 player.inventory.splice(toolIndex, 1);
                 toolBroken = true;
             }
        }

        // Calculate success using Math.random modulated by profession level and telemetry
        // e.g., higher level means higher base chance. Telemetry could provide a small bonus.
        const baseChance = Math.min(0.5 + (profLevel * 0.05), 0.9); // 55% at lv1, up to 90% at lv8+

        let telemetryBonus = 0;
        if (telemetryData && telemetryData.accuracy !== undefined) {
             // Let's assume accuracy is 0-1
             telemetryBonus = telemetryData.accuracy * 0.1;
        }

        const isSuccess = Math.random() < (baseChance + telemetryBonus);

        if (isSuccess) {
            // Masterpiece calculation
            const masterpieceChance = Math.min(0.01 + (profLevel * 0.005), 0.05); // 1.5% at lv1, up to 5% max
            const isMasterpiece = Math.random() < masterpieceChance;

            let finalQuality = 1.0;
            if (isMasterpiece) {
                finalQuality = 2.0;
            } else {
                const baseQuality = 0.8 + (profLevel * 0.05);
                const randBonus = Math.random() * 0.2;
                finalQuality = Number((baseQuality + randBonus).toFixed(2));
            }

            const outputItem = await Item.findOne({ name: recipe.output.name, guildId: player.guildId });
            if (!outputItem) {
                return res.status(500).json({ error: `Item ${recipe.output.name} tidak ditemukan di database.` });
            }

            // Check if item exists in inventory (stacking)
            const existingOutputIndex = player.inventory.findIndex(i =>
                i.itemId.toString() === outputItem._id.toString() &&
                i.qualityMultiplier === finalQuality &&
                i.creatorName === player.characterName
            );

            if (existingOutputIndex !== -1) {
                player.inventory[existingOutputIndex].quantity += recipe.output.quantity;
            } else {
                player.inventory.push({
                    itemId: outputItem._id,
                    quantity: recipe.output.quantity,
                    creatorName: player.characterName,
                    qualityMultiplier: finalQuality
                });
            }

            player.professions[session.profession].exp += 10;
            if (player.professions[session.profession].exp >= profLevel * 100) {
                player.professions[session.profession].level += 1;
                player.professions[session.profession].exp = 0;
            }

            await player.save();

            // Broadcasing masterpiece
            if (isMasterpiece && req.discordClient) {
                const channelId = process.env.GLOBAL_ANNOUNCEMENT_CHANNEL_ID; // Replace or ensure this is handled
                if (channelId) {
                     const channel = req.discordClient.channels.cache.get(channelId);
                     if (channel) {
                          channel.send(`🌟 **PENGUMUMAN GLOBAL** 🌟\
Telah lahir karya agung! **${player.characterName}** berhasil menempa **${recipe.output.name}** dengan kualitas MASTERPIECE!`);
                     }
                }

                if (req.io) {
                    req.io.emit('global_announcement', {
                        message: `Telah lahir karya agung! ${player.characterName} berhasil menempa ${recipe.output.name} dengan kualitas MASTERPIECE!`,
                        type: 'masterpiece'
                    });
                }
            }

            return res.json({
                success: true,
                message: `Berhasil! Mendapatkan ${recipe.output.quantity}x ${recipe.output.name} dengan kualitas ${finalQuality}x.`,
                quality: finalQuality,
                isMasterpiece,
                toolBroken
            });
        } else {
            // Failed
            const junkItem = await Item.findOne({ name: "Junk (Sampah)", guildId: player.guildId });
            if (junkItem) {
                const existingJunkIndex = player.inventory.findIndex(i => i.itemId.toString() === junkItem._id.toString());
                if (existingJunkIndex !== -1) {
                    player.inventory[existingJunkIndex].quantity += 1;
                } else {
                    player.inventory.push({
                        itemId: junkItem._id,
                        quantity: 1
                    });
                }
            }

            await player.save();
            return res.json({
                success: false,
                message: `Gagal... Bahan hangus dan menjadi Junk.`,
                toolBroken
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
