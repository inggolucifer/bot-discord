const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const LockManager = require('../utils/lockManager');
const { authenticateToken } = require('../middlewares/auth');

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
        const formattedInventory = player.inventory.map(slot => ({
            id: slot.itemId._id,
            name: slot.itemId.name,
            description: slot.itemId.description,
            type: slot.itemId.type,
            rarity: slot.itemId.rarity,
            quantity: slot.quantity,
            price: slot.itemId.price,
            emoji: slot.itemId.emoji || '📦'
        }));

        res.json({
            success: true,
            data: formattedInventory
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
        releaseLock(); // 🔓 ALWAYS release the lock
    }
});

module.exports = router;