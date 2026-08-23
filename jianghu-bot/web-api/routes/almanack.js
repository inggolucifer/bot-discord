const express = require('express');
const router = express.Router();
const Item = require('../../models/Item');
const Asset = require('../../models/Asset');
const Player = require('../../models/Player');
const { checkMaterials, consumeMaterials } = require('../../utils/crafting');
const { logTransaction } = require('../../utils/logger');
const { authenticateToken } = require('../middlewares/auth');

// Public route to fetch items (No auth required for viewing)
router.get('/items', async (req, res) => {
    try {
        const items = await Item.find({}).sort({ rank: -1, name: 1 }).lean();

        // Find usages of items in Asset buildRequirements or Asset recipes
        const assets = await Asset.find({}).lean();

        for (const item of items) {
            let usages = [];

            // Check if item is used to build any asset
            for (const asset of assets) {
                if (asset.buildable && asset.buildRequirements) {
                    const isReq = asset.buildRequirements.find(req => req.itemId.toString() === item._id.toString());
                    if (isReq) {
                        usages.push(`Bahan untuk membangun ${asset.name}`);
                    }
                }

                // Check if item is used in any crafting station recipes
                if (asset.isCraftingStation && asset.recipes) {
                    for (const recipe of asset.recipes) {
                        if (recipe.materials) {
                            const isMat = recipe.materials.find(mat => mat.itemId.toString() === item._id.toString());
                            if (isMat) {
                                usages.push(`Bahan untuk meracik ${recipe.recipeName} di ${asset.name}`);
                            }
                        }
                    }
                }
            }

            item.usedFor = usages.length > 0 ? [...new Set(usages)] : null; // Remove duplicates if any
        }

        res.json({ success: true, data: items });
    } catch (error) {
        console.error('[API-ALMANACK] Error fetching items:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat memuat item.' });
    }
});

// Public route to fetch assets
router.get('/assets', async (req, res) => {
    try {
        const assets = await Asset.find({}).sort({ buildable: -1, name: 1 }).lean();
        res.json({ success: true, data: assets });
    } catch (error) {
        console.error('[API-ALMANACK] Error fetching assets:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat memuat aset.' });
    }
});

// Protected route to build asset
router.post('/build-asset', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const guildId = req.user.guildId || req.user.userId;
        const { assetId } = req.body;

        if (!assetId) {
            return res.status(400).json({ error: 'Asset ID tidak valid.' });
        }

        const player = await Player.findOne({ discordId: userId, guildId: guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        if (player.status !== 'active') return res.status(400).json({ error: `Karaktermu berstatus ${player.status}.` });

        const asset = await Asset.findById(assetId);
        if (!asset) return res.status(404).json({ error: 'Aset tidak ditemukan.' });
        if (!asset.buildable) return res.status(400).json({ error: 'Aset ini tidak bisa dibangun mandiri.' });

        const currentTotalAssets = player.assets.reduce((sum, a) => sum + (a.quantity || 1), 0);
        const maxAssetSlots = player.assetSlots || 1;

        if (currentTotalAssets + 1 > maxAssetSlots) {
            return res.status(400).json({ error: `Lahan aset penuh (${currentTotalAssets}/${maxAssetSlots}). Beli lahan baru di bot via /asset tambah-slot.` });
        }

        if (!asset.buildRequirements || asset.buildRequirements.length === 0) {
            return res.status(400).json({ error: 'Aset ini belum memiliki syarat material.' });
        }

        const fakeRecipe = { materials: asset.buildRequirements };
        const check = checkMaterials(player.inventory, fakeRecipe);
        if (!check.ok) {
            const missingLines = check.missing.map((m) => `${m.itemName}: Butuh ${m.need}, Punya ${m.have}`).join(', ');
            return res.status(400).json({ error: `Material tidak cukup: ${missingLines}` });
        }

        // Consume materials
        player.inventory = consumeMaterials(player.inventory, fakeRecipe);

        const constructionCompleteAt = asset.constructionTimeHours > 0
            ? new Date(Date.now() + asset.constructionTimeHours * 60 * 60 * 1000)
            : null;

        const owned = player.assets.find((a) => a.assetId.equals(asset._id));
        if (owned) {
            owned.quantity += 1;
        } else {
            player.assets.push({
                assetId: asset._id,
                quantity: 1,
                lastClaimAt: null,
                constructionCompleteAt,
                status: 'pending',
                progressAccumulated: 0,
                lastProgressUpdate: new Date(),
                assignedWorkers: []
            });
        }

        await player.save();

        await logTransaction(req.discordClient, {
            guildId: guildId,
            type: 'player_build_asset_web',
            fromUserId: userId,
            itemDescription: `Membangun ${asset.name} dari web almanack`,
        });

        res.json({ success: true, message: `Berhasil mulai membangun ${asset.name}!` });

    } catch (error) {
        console.error('[API-ALMANACK] Error building asset:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat membangun aset.' });
    }
});

module.exports = router;
