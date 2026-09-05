const Item = require('../../models/Item');
const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const LockManager = require('../utils/lockManager');
const { authenticateToken } = require('../middlewares/auth');
const Asset = require('../../models/Asset');
const { isUnderConstruction, checkMaterials, consumeMaterials } = require('../../utils/crafting');

// Endpoint to fetch player's inventory
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Populate the item details inside the inventory array
        const player = await Player.findOne({ discordId: userId })
            .populate('inventory.itemId')
            .lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        }

        // Format the output for the frontend

        const getEmojiForShopItem = (itemType, category) => {
            if (category === 'asset') return '🏯';
            if (category === 'pet') return '🐉';

            switch(itemType) {
              case 'weapon': return '🗡️';
              case 'cloth': return '👘';
              case 'herb': return '🌿';
              case 'pill': return '💊';
              case 'material': return '🧱';
              case 'artifact': return '🔮';
              case 'accessories': return '💍';
              default: return '📦';
            }
        };

        const formattedInventory = player.inventory.map(slot => ({
            id: slot.itemId._id,
            name: slot.itemId.name,
            description: slot.itemId.description,
            type: slot.itemId.category,
            category: slot.itemId.category,
            rarity: slot.itemId.rank, // Changed to match DB schema 'rank'
            quantity: slot.quantity,
            price: slot.itemId.basePrice, // Changed to match DB schema
            priceCurrency: slot.itemId.priceCurrency || 'copper',
            imageUrl: slot.itemId.imageUrl, // Include image URL
            emoji: getEmojiForShopItem(slot.itemId.category, 'item'),
            effect: slot.itemId.effect
        }));

        res.json({
            success: true,
            data: formattedInventory,
            meta: {
                totalSlots: player.inventory.length,
                maxSlots: 50 // Fixed capacity as mentioned in typical game rules, can be made dynamic from DB later
            }
        });
    } catch (error) {
        console.error('[API-INVENTORY] Error fetching inventory:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Example Anti-Cheat protected endpoint: Discarding an item
router.post('/discard', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { itemId, quantity } = req.body;

    if (!itemId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Parameter tidak valid.' });
    }

    // 🔒 MUTEX LOCK: Prevent race conditions (Spamming discard to trigger bugs)
    const lockKey = `inventory_discard_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
         return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });
    }

    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const inventoryIndex = player.inventory.findIndex(
            (i) => i.itemId.toString() === itemId
        );

        if (inventoryIndex === -1) {
            return res.status(400).json({ error: 'Item tidak ditemukan di inventory.' });
        }

        if (player.inventory[inventoryIndex].quantity < quantity) {
            return res.status(400).json({ error: 'Jumlah item tidak mencukupi.' });
        }

        // Apply changes
        player.inventory[inventoryIndex].quantity -= quantity;

        // Clean up if quantity hits 0
        if (player.inventory[inventoryIndex].quantity <= 0) {
            player.inventory.splice(inventoryIndex, 1);
        }

        await player.save();

        res.json({ success: true, message: 'Item berhasil dibuang.' });
    } catch (error) {
        console.error('[API-INVENTORY] Discard error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: GET /api/inventory/craft-recipes
router.get('/craft-recipes', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const player = await Player.findOne({ discordId: userId, guildId }).lean();
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const ownedAssetIds = player.assets.map((a) => a.assetId);
        const assets = await Asset.find({
            _id: { $in: ownedAssetIds },
            isCraftingStation: true
        }).lean();

        const stations = assets.map(asset => {
            const owned = player.assets.find(a => a.assetId.toString() === asset._id.toString());
            return {
                id: asset._id,
                name: asset.name,
                isUnderConstruction: isUnderConstruction(owned),
                recipes: asset.recipes || []
            };
        });

        res.json({ success: true, data: stations });
    } catch (error) {
        console.error('[API-INVENTORY] Error fetching craft recipes:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Endpoint: POST /api/inventory/craft
router.post('/craft', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { assetId, recipeName, times } = req.body;
    const multiplier = times && times > 0 ? times : 1;

    if (!assetId || !recipeName) {
        return res.status(400).json({ error: 'Parameter tidak valid.' });
    }

    const lockKey = `inventory_craft_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
         return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });
    }

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        if (player.status !== 'active') return res.status(403).json({ error: `Karaktermu berstatus ${player.status}.` });

        const asset = await Asset.findOne({ _id: assetId });
        if (!asset) return res.status(404).json({ error: 'Aset tidak ditemukan.' });
        if (!asset.isCraftingStation) return res.status(400).json({ error: 'Aset ini bukan stasiun crafting.' });

        const owned = player.assets.find((a) => a.assetId.equals(asset._id));
        if (!owned) return res.status(403).json({ error: `Kamu tidak memiliki aset ${asset.name}.` });
        if (isUnderConstruction(owned)) return res.status(400).json({ error: `Aset ${asset.name} masih dalam pembangunan.` });

        const recipe = asset.recipes.find((r) => r.recipeName.toLowerCase() === recipeName.toLowerCase());
        if (!recipe) return res.status(404).json({ error: 'Resep tidak ditemukan.' });

        // Multiply recipe requirements
        const scaledRecipe = {
            ...recipe.toObject(),
            resultQuantity: recipe.resultQuantity * multiplier,
            materials: recipe.materials.map(m => ({ ...m.toObject(), quantity: m.quantity * multiplier }))
        };

        const check = checkMaterials(player.inventory, recipe);
        if (!check.ok) {
            const missingLines = check.missing.map((m) => `${m.itemName}: butuh ${m.need}, kamu punya ${m.have}`).join(', ');
            return res.status(400).json({ error: `Bahan awal tidak cukup: ${missingLines}` });
        }

        if (!owned.activeCrafts) owned.activeCrafts = [];

        const existingCraft = owned.activeCrafts.find(c => c.recipeName === recipe.recipeName);
        if (existingCraft) {
            existingCraft.targetQuantity += multiplier;
        } else {
            owned.activeCrafts.push({
                recipeName: recipe.recipeName,
                targetQuantity: multiplier,
                progressHours: 0
            });
        }

        await player.save();

        const TransactionLog = require('../../models/TransactionLog');
        await TransactionLog.create({
            guildId,
            type: 'craft',
            description: `[${player.characterName}] menugaskan pembuatan ${multiplier}x ${recipe.resultItemName} di ${asset.name}.`
        });

        res.json({ success: true, message: `Berhasil mulai membuat ${multiplier}x ${recipe.resultItemName}. Butuh waktu dan pekerja.` });
    } catch (error) {
        console.error('[API-INVENTORY] Crafting error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat crafting.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: POST /api/inventory/use-time-skip
router.post('/use-time-skip', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { itemId, targetManualId } = req.body;

    if (!itemId || !targetManualId) {
        return res.status(400).json({ error: 'Parameter tidak valid.' });
    }

    const lockKey = `inventory_use_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
         return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });
    }

    try {
        const { withTransaction } = require('../utils/dbTransaction');
        const CustomError = require('../utils/CustomError');
        const TransactionLog = require('../../models/TransactionLog');

        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

            const player = await Player.findOne({ discordId: userId, guildId }).populate('manuals.manualId').populate('inventory.itemId').session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
            if (player.status !== 'active') throw new CustomError(`Karaktermu berstatus ${player.status}.`, 403);

            const inventoryIndex = player.inventory.findIndex(inv => inv.itemId && inv.itemId._id.toString() === itemId);
            if (inventoryIndex === -1 || player.inventory[inventoryIndex].quantity <= 0) {
                throw new CustomError('Kamu tidak memiliki item tersebut di inventory.', 400);
            }

            const item = player.inventory[inventoryIndex].itemId;
            if (!item.effect || !item.effect.startsWith('time_skip_')) {
                throw new CustomError(`Item **${item.name}** tidak bisa digunakan untuk mempercepat meditasi.`, 400);
            }

            const pm = player.manuals.find(m => m.manualId && m.manualId._id.toString() === targetManualId);
            if (!pm) throw new CustomError('Kamu tidak sedang memediasikan manual ini.', 400);
            if (!pm.isComprehending) throw new CustomError('Kamu belum memulai comprehend untuk manual ini.', 400);

            const msPassed = Date.now() - new Date(pm.comprehendStartTime).getTime();
            const hoursPassed = msPassed / (1000 * 60 * 60);
            if (hoursPassed >= pm.manualId.timeToComprehendHours) {
                throw new CustomError('Meditasimu sudah mencapai puncaknya!', 400);
            }

            const hoursToSkip = parseInt(item.effect.split('_')[2], 10);
            if (isNaN(hoursToSkip) || hoursToSkip <= 0) {
                throw new CustomError(`Data efek item **${item.name}** tidak valid.`, 400);
            }

            const hoursLeft = pm.manualId.timeToComprehendHours - hoursPassed;
            if (hoursToSkip > hoursLeft + 2) {
                throw new CustomError(`Hentikan! Meditasimu hanya tersisa **${hoursLeft.toFixed(1)} jam**. Menggunakan **${item.name}** (${hoursToSkip} Jam) akan membuang sebagian besar khasiatnya.`, 400);
            }

            // Deduct Item
            player.inventory[inventoryIndex].quantity -= 1;
            if (player.inventory[inventoryIndex].quantity <= 0) {
                player.inventory.splice(inventoryIndex, 1);
            }
            player.markModified('inventory');

            // Shift the start time to the past
            const currentStartTime = new Date(pm.comprehendStartTime);
            pm.comprehendStartTime = new Date(currentStartTime.getTime() - (hoursToSkip * 60 * 60 * 1000));
            player.markModified('manuals');

            await player.save({ session });

            await TransactionLog.create([{
                guildId,
                type: 'use_insight_pill',
                fromUserId: userId,
                note: `[WEB] Gunakan ${item.name} pada ${pm.manualId.name} (-${hoursToSkip} Jam)`
            }], { session });
        });

        res.json({ success: true, message: `Berhasil menggunakan item. Waktu meditasi dipersingkat!` });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-INVENTORY] Use time skip error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;

// Endpoint: POST /api/inventory/use-law
router.post('/use-law', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { itemId } = req.body;

    if (!itemId) return res.status(400).json({ error: 'Parameter tidak valid.' });

    const lockKey = `inventory_use_law_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });

    try {
        const { withTransaction } = require('../utils/dbTransaction');
        const CustomError = require('../utils/CustomError');
        const TransactionLog = require('../../models/TransactionLog');
        const Law = require('../../models/Law');
        const { getRealmIndex } = require('../../utils/cultivation');
        let lawName = '';
        let messageResponse = '';

        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

            const player = await Player.findOne({ discordId: userId, guildId }).populate('laws').populate('inventory.itemId').session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
            if (player.status !== 'active') throw new CustomError(`Karaktermu berstatus ${player.status}.`, 403);

            const realmIdx = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');
            if (player.isNormalCultivator || realmIdx > 0) {
                throw new CustomError('Terlambat! Tubuh fanamu sudah beradaptasi dengan Qi biasa. Kamu tidak bisa lagi mempelajari Hukum Alam (Hanya bisa di tahap Mortal).', 400);
            }

            const inventoryIndex = player.inventory.findIndex(inv => inv.itemId && inv.itemId._id.toString() === itemId);
            if (inventoryIndex === -1 || player.inventory[inventoryIndex].quantity <= 0) {
                throw new CustomError('Kamu tidak memiliki item tersebut di inventory.', 400);
            }

            const item = player.inventory[inventoryIndex].itemId;
            if (item.category !== 'law' || !item.effect || !item.effect.startsWith('learn_law_')) {
                throw new CustomError(`Item **${item.name}** tidak bisa digunakan untuk mempelajari Hukum Alam.`, 400);
            }

            const extractLawName = item.effect.replace('learn_law_', '');
            const { escapeRegex } = require('../../utils/escapeRegex');
            const lawToLearn = await Law.findOne({ guildId, name: new RegExp(`^\\s*${escapeRegex(extractLawName)}\\s*$`, 'i') }).session(session);

            if (!lawToLearn) throw new CustomError(`Hukum Alam **${extractLawName}** yang ada di kitab ini tidak ditemukan di dunia (hubungi admin).`, 404);

            if (player.laws.length >= 1) {
                const currentLaw = player.laws[0];
                throw new CustomError(`Jiwa fanamu hanya mampu menampung satu Hukum Alam semesta. Kamu sudah mengikat takdirmu dengan **${currentLaw.name}**.`, 400);
            }

            player.inventory[inventoryIndex].quantity -= 1;
            if (player.inventory[inventoryIndex].quantity <= 0) {
                player.inventory.splice(inventoryIndex, 1);
            }
            player.markModified('inventory');

            player.laws.push(lawToLearn._id);
            await player.save({ session });

            lawName = lawToLearn.name;
            messageResponse = `Luar biasa! Kamu menyerap intisari dari **${item.name}** dan berhasil memahami **${lawName}**.`;

            await TransactionLog.create([{
                guildId,
                type: 'learn_law',
                fromUserId: userId,
                note: `[WEB] Digunakan: ${item.name} untuk belajar ${lawName}`
            }], { session });
        });

        res.json({ success: true, message: messageResponse });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-INVENTORY] Use law error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: POST /api/inventory/use-manual
router.post('/use-manual', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { itemId } = req.body;

    if (!itemId) return res.status(400).json({ error: 'Parameter tidak valid.' });

    const lockKey = `inventory_use_manual_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });

    try {
        const { withTransaction } = require('../utils/dbTransaction');
        const CustomError = require('../utils/CustomError');
        const TransactionLog = require('../../models/TransactionLog');
        const Manual = require('../../models/Manual');
        let manualName = '';
        let messageResponse = '';

        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

            const player = await Player.findOne({ discordId: userId, guildId }).populate('manuals.manualId').populate('inventory.itemId').session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
            if (player.status !== 'active') throw new CustomError(`Karaktermu berstatus ${player.status}.`, 403);

            const inventoryIndex = player.inventory.findIndex(inv => inv.itemId && inv.itemId._id.toString() === itemId);
            if (inventoryIndex === -1 || player.inventory[inventoryIndex].quantity <= 0) {
                throw new CustomError('Kamu tidak memiliki item tersebut di inventory.', 400);
            }

            const item = player.inventory[inventoryIndex].itemId;
            if (item.category !== 'manual' || !item.effect || !item.effect.startsWith('learn_manual_')) {
                throw new CustomError(`Item **${item.name}** tidak bisa digunakan untuk mempelajari Manual.`, 400);
            }

            const extractManualName = item.effect.replace('learn_manual_', '');
            const { escapeRegex } = require('../../utils/escapeRegex');
            const manualToLearn = await Manual.findOne({ guildId, name: new RegExp(`^\\s*${escapeRegex(extractManualName)}\\s*$`, 'i') }).session(session);

            if (!manualToLearn) throw new CustomError(`Manual **${extractManualName}** yang ada di kitab ini tidak ditemukan di dunia (hubungi admin).`, 404);

            if (player.manuals.some(m => m.manualId && m.manualId.equals(manualToLearn._id))) {
                throw new CustomError('Kamu sudah memiliki Manual ini.', 400);
            }

            player.inventory[inventoryIndex].quantity -= 1;
            if (player.inventory[inventoryIndex].quantity <= 0) {
                player.inventory.splice(inventoryIndex, 1);
            }
            player.markModified('inventory');

            player.manuals.push({
                manualId: manualToLearn._id,
                level: 0,
                isComprehending: false,
                comprehendStartTime: null
            });
            await player.save({ session });

            manualName = manualToLearn.name;
            messageResponse = `Kamu membuka **${item.name}** dan mulai membaca **${manualName}**.`;

            await TransactionLog.create([{
                guildId,
                type: 'learn_manual',
                fromUserId: userId,
                note: `[WEB] Digunakan: ${item.name} untuk belajar ${manualName}`
            }], { session });
        });

        res.json({ success: true, message: messageResponse });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-INVENTORY] Use manual error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});
