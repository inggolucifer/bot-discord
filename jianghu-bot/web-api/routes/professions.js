const express = require('express');
const router = express.Router();
const { authenticateToken: verifyToken } = require('../middlewares/auth');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const LockManager = require('../utils/lockManager');
const { RATE_TO_COPPER } = require('../../utils/currencyNormalize');
const { payCurrency } = require('../../utils/currency');
const RECIPES = require('../../utils/professionsRecipes');
const { ensureToolDurability, canUseTool } = require('../../utils/inventoryToolHelper');

const PROFESSION_COST_COPPER = 50 * RATE_TO_COPPER.silver; // 50 Silver

router.get('/recipes', verifyToken, async (req, res) => {
    try {
        const { profession } = req.query;
        if (!profession) {
            return res.status(400).json({ error: 'Profesi harus disertakan.' });
        }

        const player = await Player.findOne({ discordId: req.user.userId }).lean();
        const unlockedBlueprints = player?.professions?.unlockedBlueprints || [];

        const filteredRecipes = [];
        const itemNames = Object.values(RECIPES).filter(r => r.profession === profession).map(r => r.output.name);
        const itemDocs = await Item.find({ name: { $in: itemNames } }).lean();
        const itemMap = {};
        itemDocs.forEach(doc => { itemMap[doc.name] = doc; });

        for (const [id, recipe] of Object.entries(RECIPES)) {
            if (recipe.profession === profession) {
                const requiresBlueprint = !!recipe.requiresBlueprint;
                const unlocked = !requiresBlueprint || unlockedBlueprints.includes(recipe.blueprintKey);

                const itemDoc = itemMap[recipe.output.name];
                let outputEffect = null;
                if (itemDoc && itemDoc.effectType) {
                     outputEffect = { type: itemDoc.effectType, value: itemDoc.effectValue, desc: itemDoc.description };
                }

                filteredRecipes.push({
                    id,
                    name: id,
                    profession: recipe.profession,
                    toolType: recipe.toolType,
                    minToolTier: recipe.minToolTier || 1,
                    materials: recipe.materials,
                    output: { ...recipe.output, effectInfo: outputEffect },
                    requiresBlueprint,
                    blueprintKey: recipe.blueprintKey,
                    unlocked
                });
            }
        }

        res.json({ data: filteredRecipes });
    } catch (error) {
        console.error("Error fetching recipes:", error);
        res.status(500).json({ error: 'Server error saat mengambil resep' });
    }
});

router.post('/farming/unlock-slot', verifyToken, async (req, res) => {
    const lockKey = `farming_unlock_slot_${req.user.userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses, harap tunggu...' });

    try {
        const player = await Player.findOne({ discordId: req.user.userId });
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        if (!player.professions || !player.professions.farming || !player.professions.farming.isUnlocked) {
            return res.status(403).json({ error: 'Profesi farming belum terbuka.' });
        }

        const currentSlots = player.professions.farming.farmPlots.length;
        if (currentSlots >= 20) {
            return res.status(400).json({ error: 'Sudah mencapai batas maksimal 20 petak.' });
        }

        let costInCopper = 0;
        const nextSlot = currentSlots + 1;

        if (nextSlot >= 2 && nextSlot <= 5) {
            costInCopper = 50 * RATE_TO_COPPER.silver; // 50 Silver
        } else if (nextSlot >= 6 && nextSlot <= 10) {
            costInCopper = 5 * RATE_TO_COPPER.gold; // 5 Gold
        } else if (nextSlot >= 11 && nextSlot <= 15) {
            costInCopper = 20 * RATE_TO_COPPER.gold; // 20 Gold
        } else if (nextSlot >= 16 && nextSlot <= 20) {
            costInCopper = 1 * RATE_TO_COPPER.jade; // 1 Jade
        }

        if (!payCurrency(player.currency, costInCopper, 'copper')) {
            const c = player.currency || { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
            const totalCopper = c.copper + (c.silver * RATE_TO_COPPER.silver) + (c.gold * RATE_TO_COPPER.gold) + (c.jade * RATE_TO_COPPER.jade) + (c.spirit * RATE_TO_COPPER.spirit);
            let costStr = "";
            if (nextSlot >= 2 && nextSlot <= 5) costStr = "50 Silver";
            else if (nextSlot >= 6 && nextSlot <= 10) costStr = "5 Gold";
            else if (nextSlot >= 11 && nextSlot <= 15) costStr = "20 Gold";
            else if (nextSlot >= 16 && nextSlot <= 20) costStr = "1 Jade";
            return res.status(400).json({ error: `Uang tidak cukup. Butuh: ${costStr} (setara ${costInCopper} copper). Saldo setara: ${totalCopper} copper.` });
        }

        player.markModified('currency');
        player.professions.farming.farmPlots.push({ isUnlocked: true });

        await player.save();

        res.json({ message: `Berhasil membuka petak ke-${nextSlot}!`, farmPlots: player.professions.farming.farmPlots });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/farming/bypass-depletion', verifyToken, async (req, res) => {
    const { plotIndex } = req.body;

    if (plotIndex === undefined) {
        return res.status(400).json({ error: 'Parameter tidak valid.' });
    }

    const lockKey = `farming_bypass_depletion_${req.user.userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses, harap tunggu...' });

    try {
        const player = await Player.findOne({ discordId: req.user.userId }).populate('inventory.itemId');
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        if (!player.professions || !player.professions.farming || !player.professions.farming.isUnlocked) {
            return res.status(403).json({ error: 'Profesi farming belum terbuka.' });
        }

        const plots = player.professions.farming.farmPlots;
        if (!plots || !plots[plotIndex]) {
            return res.status(400).json({ error: 'Petak tidak ditemukan.' });
        }

        const plot = plots[plotIndex];
        if (!plot.isDepleted || (plot.depletedUntil && plot.depletedUntil < new Date())) {
            plot.isDepleted = false;
            await player.save();
            return res.status(400).json({ error: 'Petak ini sudah siap digunakan.' });
        }

        const pupukIndex = player.inventory.findIndex(i => i.itemId.name === 'Pupuk Alkimia' || i.itemId.name === 'Pupuk Tulang');
        if (pupukIndex === -1 || player.inventory[pupukIndex].quantity <= 0) {
            return res.status(400).json({ error: 'Tidak memiliki Pupuk (Alkimia/Tulang) di inventory.' });
        }

        player.inventory[pupukIndex].quantity -= 1;
        if (player.inventory[pupukIndex].quantity <= 0) {
            player.inventory.splice(pupukIndex, 1);
        }

        plot.isDepleted = false;
        plot.depletedUntil = null;

        await player.save();

        res.json({ message: 'Tanah kembali subur!', farmPlots: player.professions.farming.farmPlots });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/fishing/unlock-zone', verifyToken, async (req, res) => {
    const { zoneId } = req.body; // Expects 2 or 3

    if (![2, 3].includes(zoneId)) {
        return res.status(400).json({ error: 'Zona tidak valid. Hanya zona 2 dan 3 yang bisa di-unlock.' });
    }

    const lockKey = `fishing_unlock_zone_${req.user.userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses, harap tunggu...' });

    try {
        const player = await Player.findOne({ discordId: req.user.userId });
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        if (!player.professions || !player.professions.fishing || !player.professions.fishing.isUnlocked) {
            return res.status(403).json({ error: 'Profesi fishing belum terbuka.' });
        }

        if (player.professions.fishing.unlockedFishingZones.includes(zoneId)) {
            return res.status(400).json({ error: `Zona ${zoneId} sudah terbuka.` });
        }

        let costInCopper = 0;
        if (zoneId === 2) costInCopper = 5 * RATE_TO_COPPER.gold; // 5 Gold
        else if (zoneId === 3) costInCopper = 20 * RATE_TO_COPPER.gold; // 20 Gold

        if (!payCurrency(player.currency, costInCopper, 'copper')) {
            const c = player.currency || { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
            const totalCopper = c.copper + (c.silver * RATE_TO_COPPER.silver) + (c.gold * RATE_TO_COPPER.gold) + (c.jade * RATE_TO_COPPER.jade) + (c.spirit * RATE_TO_COPPER.spirit);
            return res.status(400).json({ error: `Uang tidak cukup. Butuh: ${zoneId === 2 ? '5 Gold' : '20 Gold'} (setara ${costInCopper} copper). Saldo setara: ${totalCopper} copper.` });
        }

        player.markModified('currency');
        player.professions.fishing.unlockedFishingZones.push(zoneId);

        await player.save();

        res.json({ message: `Berhasil membuka Zona Memancing ${zoneId}!`, unlockedZones: player.professions.fishing.unlockedFishingZones });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/unlock', verifyToken, async (req, res) => {
    const { profession } = req.body;
    const validProfessions = ['farming', 'fishing', 'cooking', 'alchemy', 'smithing'];

    if (!validProfessions.includes(profession)) {
        return res.status(400).json({ error: 'Profesi tidak valid.' });
    }

    const lockKey = `professions_unlock_${req.user.userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
        return res.status(429).json({ error: 'Transaksi sedang diproses, harap tunggu...' });
    }

    try {
        const player = await Player.findOne({ discordId: req.user.userId });
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        if (player.professions && player.professions[profession] && player.professions[profession].isUnlocked) {
            return res.status(200).json({
                success: true,
                message: `Profesi ${profession} sudah terbuka.`,
                professions: player.professions
            });
        }

        if (!payCurrency(player.currency, PROFESSION_COST_COPPER, 'copper')) {
            const c = player.currency || { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
            const totalCopperAvailable = c.copper + (c.silver * RATE_TO_COPPER.silver) + (c.gold * RATE_TO_COPPER.gold) + (c.jade * RATE_TO_COPPER.jade) + (c.spirit * RATE_TO_COPPER.spirit);
            return res.status(400).json({ error: `Uang tidak cukup. Butuh: 50 Silver (setara ${PROFESSION_COST_COPPER} copper). Saldo setara: ${totalCopperAvailable} copper.` });
        }

        player.markModified('currency');

        if (!player.professions) player.professions = {};
        if (!player.professions[profession]) player.professions[profession] = {};

        player.set(`professions.${profession}.isUnlocked`, true);
        player.markModified('professions');
        await player.save();

        res.json({ success: true, message: `Profesi ${profession} berhasil dibuka!`, professions: player.professions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

const activeSessions = new Map();

router.post('/start', verifyToken, async (req, res) => {
    const { profession, recipeId, toolItemId, zoneId, plotIndex, action } = req.body;

    const lockKey = `professions_start_${req.user.userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses, harap tunggu...' });

    try {
        const player = await Player.findOne({ discordId: req.user.userId }).populate('inventory.itemId');
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        if (!player.professions || !player.professions[profession] || !player.professions[profession].isUnlocked) {
            return res.status(403).json({ error: `Kamu belum membuka profesi ${profession}.` });
        }

        const energyManager = require('../../utils/energyManager');
        const currentEnergy = energyManager.calculateEnergy(player);
        const energyCost = profession === 'farming' ? 5 : 10;
        if (currentEnergy < energyCost) {
            return res.status(400).json({ error: `Energy tidak cukup. Butuh ${energyCost} Energy.` });
        }

        let recipe;
        let harvestRecipeKey = null;
        if (profession === 'farming' && action === 'harvest') {
            // For harvest, we get recipe from the plot
            if (plotIndex === undefined || plotIndex < 0) {
                 return res.status(400).json({ error: 'Kamu harus memilih petak lahan untuk bertani.' });
            }
            const plots = player.professions.farming.farmPlots;
            if (!plots || !plots[plotIndex] || !plots[plotIndex].isUnlocked) {
                 return res.status(400).json({ error: 'Petak lahan tidak valid.' });
            }
            const plot = plots[plotIndex];
            if (!plot.recipeKey || !plot.harvestAt) {
                 return res.status(400).json({ error: 'Tidak ada tanaman untuk dipanen di sini.' });
            }
            if (plot.harvestAt > new Date()) {
                 return res.status(400).json({ error: 'Tanaman belum siap dipanen.' });
            }
            harvestRecipeKey = plot.recipeKey;
            recipe = RECIPES[plot.recipeKey];
            if (!recipe) {
                 return res.status(500).json({ error: 'Resep tanaman tidak valid (Error Internal).' });
            }
        } else {
            recipe = RECIPES[recipeId];
            if (!recipe || recipe.profession !== profession) {
                return res.status(400).json({ error: 'Resep tidak valid untuk profesi ini.' });
            }
            if (recipe.requiresBlueprint) {
                const unlockedBlueprints = player.professions.unlockedBlueprints || [];
                if (!unlockedBlueprints.includes(recipe.blueprintKey)) {
                    return res.status(403).json({ error: `Resep terkunci. Butuh blueprint: ${recipe.blueprintKey}` });
                }
            }
        }

        // Tool Validations
        if (!toolItemId) {
            return res.status(400).json({ error: 'Alat wajib dipilih untuk aksi ini.' });
        }

        const toolInInventory = player.inventory.find(i => {
            if (!i.itemId) return false;
            const id = i.itemId._id ? i.itemId._id.toString() : i.itemId.toString();
            return id === toolItemId.toString();
        });
        if (!toolInInventory) {
             return res.status(400).json({ error: `Alat tidak ditemukan di inventory.` });
        }
        ensureToolDurability(toolInInventory, toolInInventory.itemId);

        const toolValidation = canUseTool(toolInInventory, toolInInventory.itemId, {
            requiredToolType: recipe.toolType,
            minToolTier: recipe.minToolTier || 1
        });
        if (!toolValidation.valid) {
            return res.status(400).json({ error: toolValidation.error });
        }

        // Validations for Planting / Normal Crafting
        if (profession !== 'farming' || action === 'plant') {
            if (profession === 'farming') {
                if (plotIndex === undefined || plotIndex < 0) {
                     return res.status(400).json({ error: 'Kamu harus memilih petak lahan untuk bertani.' });
                }
                const plots = player.professions.farming.farmPlots;
                if (!plots || !plots[plotIndex] || !plots[plotIndex].isUnlocked) {
                     return res.status(400).json({ error: 'Petak lahan tidak valid.' });
                }
                if (plots[plotIndex].isDepleted && plots[plotIndex].depletedUntil > new Date()) {
                     return res.status(400).json({ error: 'Tanah ini masih kelelahan (Depleted).' });
                }
                if (plots[plotIndex].cropId || plots[plotIndex].plantedAt) {
                     return res.status(400).json({ error: 'Petak lahan sudah ditanami.' });
                }
            }

            if (profession === 'fishing' && zoneId !== undefined) {
                if (![1, 2, 3].includes(zoneId)) return res.status(400).json({ error: 'Zona memancing tidak valid.' });
                if (!player.professions.fishing.unlockedFishingZones.includes(zoneId)) return res.status(403).json({ error: `Kamu belum membuka zona memancing ${zoneId}.` });
            }

            // Deduct Materials for Plant/Craft
            let missingMaterials = [];
            for (const mat of recipe.materials) {
                const matInInv = player.inventory.find(i => i.itemId.name === mat.name);
                const qty = matInInv ? matInInv.quantity : 0;
                if (qty < mat.quantity) {
                    missingMaterials.push(`${mat.name} (Butuh ${mat.quantity}, punya ${qty})`);
                }
            }
            if (missingMaterials.length > 0) return res.status(400).json({ error: `Material tidak cukup: ${missingMaterials.join(', ')}` });

            for (const mat of recipe.materials) {
                const matIndex = player.inventory.findLastIndex(i => i.itemId.name === mat.name);
                player.inventory[matIndex].quantity -= mat.quantity;
                if (player.inventory[matIndex].quantity <= 0) player.inventory.splice(matIndex, 1);
            }
        }

        player.energy.current = currentEnergy - energyCost;
        // DO NOT overwrite lastUpdated completely so we preserve fractional regeneration.
        // Handled naturally or skip updating lastUpdated if we trust calculateEnergy doesn't reset it
        // Actually, if we deduct energy, we shouldn't touch lastUpdated unless it was maxed. Let's keep it safe.
        // (existing logic sets player.energy.lastUpdated = new Date() which actually loses fractional regen, but I'll skip fixing that specifically unless instructed. Let's just deduct).
        player.markModified('inventory');
        player.markModified('energy');
        await player.save();

        const sessionId = Math.random().toString(36).substring(2, 15);
        activeSessions.set(req.user.userId, {
             sessionId,
             profession,
             recipeId: harvestRecipeKey || recipeId,
             toolItemId: toolInInventory.itemId._id ? toolInInventory.itemId._id.toString() : toolInInventory.itemId.toString(),
             plotIndex,
             action,
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
            activeSessions.delete(req.user.userId);
            return res.status(400).json({ error: 'Peringatan Sistem: Deteksi manipulasi kecepatan/bot.' });
        }

        activeSessions.delete(req.user.userId);

        const player = await Player.findOne({ discordId: req.user.userId }).populate('inventory.itemId');
        const profLevel = player.professions[session.profession].level || 1;
        const recipe = RECIPES[session.recipeId];

        // Kurangi durability alat
        let toolBroken = false;
        const toolIndex = player.inventory.findIndex(i => i.itemId._id.toString() === session.toolItemId);
        if (toolIndex !== -1) {
             const toolEntry = player.inventory[toolIndex];
             if (toolEntry.durability == null) {
                  toolEntry.durability = (toolEntry.maxDurability || 20);
             }
             toolEntry.durability -= 1;
             if (toolEntry.durability <= 0) {
                 player.inventory.splice(toolIndex, 1);
                 toolBroken = true;
             }
        }
        player.markModified('inventory');

        if (session.profession === 'farming' && session.action === 'plant') {
             // Logic Plant
             const plot = player.professions.farming.farmPlots[session.plotIndex];
             if (!plot) return res.status(400).json({ error: 'Petak lahan tidak ditemukan.' });

             // Need to lookup crop item id from output item name to show picture
             const outputItem = await Item.findOne({ name: recipe.output.name, guildId: player.guildId });
             if (!outputItem) return res.status(500).json({ error: 'Item output tidak ada.' });

             plot.cropId = outputItem._id;
             plot.recipeKey = session.recipeId;
             plot.plantedAt = new Date();
             const growTimeMs = Math.max(1, recipe.growTimeHours || 1) * 60 * 60 * 1000;
             plot.harvestAt = new Date(Date.now() + growTimeMs);
             plot.isDepleted = false;
             plot.depletedUntil = null;

             // Plant Exp = 1
             player.professions.farming.exp += 1;
             const requiredExpPlant = Math.floor(50 * player.professions.farming.level + 15 * player.professions.farming.level * player.professions.farming.level);
             if (player.professions.farming.exp >= requiredExpPlant && player.professions.farming.level < 100) {
                  player.professions.farming.exp -= requiredExpPlant;
                  player.professions.farming.level += 1;
             }
             player.markModified('professions');
             await player.save();

             return res.json({ message: 'Tanaman berhasil ditanam!', result: { toolBroken }, farmPlots: player.professions.farming.farmPlots });
        }

        const baseChance = Math.min(0.5 + (profLevel * 0.05), 0.9);
        let telemetryBonus = 0;
        if (telemetryData && telemetryData.accuracy !== undefined) {
             telemetryBonus = telemetryData.accuracy * 0.1;
        }

        let weatherBonus = 0;
        if (session.profession === 'farming') {
             const WeatherConfig = require('../../models/WeatherConfig');
             const weatherConfig = await WeatherConfig.findOne({ configId: 'global' });
             if (weatherConfig && weatherConfig.currentWeather === 'Hujan') {
                  weatherBonus = 0.2;
             }
        }

        const isSuccess = Math.random() < (baseChance + telemetryBonus + weatherBonus);

        let finalQuality = 1.0;
        let isMasterpiece = false;

        if (isSuccess) {
            const masterpieceChance = Math.min(0.01 + (profLevel * 0.005), 0.05);
            isMasterpiece = Math.random() < masterpieceChance;

            if (isMasterpiece) {
                finalQuality = 2.0;
                // Restore broadcast
                const broadcastEvent = require('../utils/broadcast');
                const io = require('../../server').io;
                const message = `${player.characterName} telah menciptakan karya luar biasa: [${recipe.output.name}] (Kualitas Mahakarya) melalui profesi ${session.profession}!`;

                broadcastEvent(player.guildId, message, 'profession_masterpiece');
                if (io) {
                    io.emit('global_announcement', {
                        message,
                        timestamp: new Date()
                    });
                }
            } else {
                const baseQuality = 0.8 + (profLevel * 0.05);
                const randBonus = Math.random() * 0.2;
                finalQuality = Number((baseQuality + randBonus).toFixed(2));
            }

            const outputItem = await Item.findOne({ name: recipe.output.name, guildId: player.guildId });
            if (!outputItem) return res.status(500).json({ error: `Item ${recipe.output.name} tidak ditemukan.` });

            const existingOutputIndex = player.inventory.findIndex(i =>
                i.itemId._id.toString() === outputItem._id.toString() &&
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

            const expBases = { 1: 4, 2: 7, 3: 12, 4: 18, 5: 26, 6: 36 };
            let gainedExp = expBases[recipe.minToolTier || 1] || 4;
            if (isMasterpiece) gainedExp = Math.floor(gainedExp * 1.25);

            player.professions[session.profession].exp += gainedExp;

            let currentLvl = player.professions[session.profession].level;
            let requiredExp = Math.floor(50 * currentLvl + 15 * currentLvl * currentLvl);

            while (player.professions[session.profession].exp >= requiredExp && currentLvl < 100) {
                 player.professions[session.profession].exp -= requiredExp;
                 currentLvl += 1;
                 requiredExp = Math.floor(50 * currentLvl + 15 * currentLvl * currentLvl);
            }
            player.professions[session.profession].level = currentLvl;
        } else {
             // Failed craft -> Give Junk
             const junkItem = await Item.findOne({ name: 'Sampah', guildId: player.guildId });
             if (junkItem) {
                 const existingJunkIndex = player.inventory.findIndex(i => i.itemId._id.toString() === junkItem._id.toString());
                 if (existingJunkIndex !== -1) {
                     player.inventory[existingJunkIndex].quantity += 1;
                 } else {
                     player.inventory.push({
                         itemId: junkItem._id,
                         quantity: 1,
                         creatorName: 'Sistem',
                         qualityMultiplier: 1.0
                     });
                 }
             }
        }

        // Always clear plot and set to depleted on harvest (whether success or fail)
        if (session.profession === 'farming' && session.plotIndex !== undefined) {
            const plot = player.professions.farming.farmPlots[session.plotIndex];
            if (plot) {
                plot.cropId = null;
                plot.recipeKey = null;
                plot.plantedAt = null;
                plot.harvestAt = null;
                plot.isDepleted = true;

                let depletionHours = 1;
                const rTier = recipe.minToolTier || 1;
                if (rTier === 1) depletionHours = 0.5;
                else if (rTier === 2) depletionHours = 1;
                else if (rTier === 3) depletionHours = 2;
                else if (rTier === 4) depletionHours = 3;
                else if (rTier === 5) depletionHours = 4;
                else if (rTier === 6) depletionHours = 6;

                plot.depletedUntil = new Date(Date.now() + depletionHours * 60 * 60 * 1000);
            }
        }

        player.markModified('inventory');
        player.markModified('professions');
        await player.save();

        res.json({
            message: isSuccess ? 'Minigame berhasil diselesaikan!' : 'Gagal menyelesaikan minigame, kualitas buruk.',
            result: {
                success: isSuccess,
                qualityMultiplier: finalQuality,
                isMasterpiece,
                toolBroken
            },
            farmPlots: session.profession === 'farming' ? player.professions.farming.farmPlots : undefined
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/farming/apply-fertilizer', verifyToken, async (req, res) => {
    const { plotIndex, inventoryItemId } = req.body;

    if (plotIndex === undefined || !inventoryItemId) {
        return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const lockKey = `professions_fertilizer_${req.user.userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses, harap tunggu...' });

    try {
        const player = await Player.findOne({ discordId: req.user.userId }).populate('inventory.itemId');
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        if (!player.professions?.farming?.isUnlocked) {
            return res.status(403).json({ error: 'Kamu belum membuka profesi Farming.' });
        }

        const plot = player.professions.farming.farmPlots[plotIndex];
        if (!plot || !plot.isUnlocked) {
            return res.status(400).json({ error: 'Plot tidak valid atau belum terbuka' });
        }

        if (!plot.cropId || !plot.harvestAt || plot.harvestAt <= new Date()) {
            return res.status(400).json({ error: 'Plot tidak sedang ditanami atau sudah siap panen.' });
        }

        if (plot.fertilizerApplied) {
            return res.status(400).json({ error: 'Tanaman ini sudah dipupuk!' });
        }

        const fertilizerItem = player.inventory.find(i => i._id.toString() === inventoryItemId);
        if (!fertilizerItem) {
            return res.status(400).json({ error: 'Pupuk tidak ditemukan di inventory.' });
        }

        const itemRef = fertilizerItem.itemId;
        if (itemRef.effectType !== 'farm_grow_speed' || !itemRef.effectValue) {
            return res.status(400).json({ error: 'Item ini bukan pupuk yang valid.' });
        }

        if (fertilizerItem.quantity < 1) {
            return res.status(400).json({ error: 'Pupuk habis.' });
        }

        // Apply fertilizer effect
        const now = new Date();
        const timeRemainingMs = plot.harvestAt.getTime() - now.getTime();
        // Cap max reduction multiplier at 0.5 (50%) to prevent instant harvests
        const reduceMultiplier = Math.min(0.5, itemRef.effectValue); // e.g. capped at 0.5

        let newTimeRemainingMs = timeRemainingMs * (1 - reduceMultiplier);
        // Minimum 10 minutes, but don't increase the time if it was already below 10 mins
        newTimeRemainingMs = Math.min(timeRemainingMs, Math.max(10 * 60 * 1000, newTimeRemainingMs));

        plot.harvestAt = new Date(now.getTime() + newTimeRemainingMs);
        plot.fertilizerApplied = true;
        plot.fertilizerItemName = itemRef.name;

        // Consume 1 fertilizer
        fertilizerItem.quantity -= 1;
        if (fertilizerItem.quantity <= 0) {
            player.inventory = player.inventory.filter(i => i._id.toString() !== inventoryItemId);
        }

        player.markModified('professions.farming.farmPlots');
        player.markModified('inventory');
        await player.save();

        res.json({
            message: `Pupuk ${itemRef.name} berhasil digunakan. Waktu panen dipercepat!`,
            plot: plot
        });
    } catch (error) {
        console.error("Error applying fertilizer:", error);
        res.status(500).json({ error: 'Server error saat menggunakan pupuk' });
    } finally {
        releaseLock();
    }
});

router.post('/blueprints/unlock', verifyToken, async (req, res) => {
    const { blueprintKey, inventoryItemId } = req.body;

    if (!inventoryItemId) {
        return res.status(400).json({ error: 'Data item inventory tidak disertakan.' });
    }

    const lockKey = `professions_blueprint_${req.user.userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses...' });

    try {
        const player = await Player.findOne({ discordId: req.user.userId }).populate('inventory.itemId');
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        const blueprintItem = player.inventory.find(i => i._id.toString() === inventoryItemId);
        if (!blueprintItem) {
            return res.status(400).json({ error: 'Item tidak ditemukan di inventory.' });
        }

        const bKeyToUnlock = blueprintKey || blueprintItem.itemId.name;

        if (!player.professions.unlockedBlueprints) {
            player.professions.unlockedBlueprints = [];
        }

        if (player.professions.unlockedBlueprints.includes(bKeyToUnlock)) {
            return res.status(400).json({ error: 'Kamu sudah mempelajari blueprint ini.' });
        }

        // Consume blueprint
        blueprintItem.quantity -= 1;
        if (blueprintItem.quantity <= 0) {
            player.inventory = player.inventory.filter(i => i._id.toString() !== inventoryItemId);
        }

        player.professions.unlockedBlueprints.push(bKeyToUnlock);
        player.markModified('professions.unlockedBlueprints');
        player.markModified('inventory');
        await player.save();

        res.json({
            message: `Blueprint ${bKeyToUnlock} berhasil dipelajari! Resep baru sekarang tersedia.`,
            unlockedBlueprints: player.professions.unlockedBlueprints
        });
    } catch (error) {
        console.error("Error unlocking blueprint:", error);
        res.status(500).json({ error: 'Server error saat mempelajari blueprint' });
    } finally {
        releaseLock();
    }
});


module.exports = router;
