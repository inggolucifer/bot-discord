const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const LockManager = require('../utils/lockManager');

// POST /api/equipment/equip
router.post('/equip', authenticateToken, async (req, res) => {
    const { inventoryId } = req.body;
    if (!inventoryId) {
        return res.status(400).json({ error: 'inventoryId is required' });
    }

    const lockKey = `equip:${req.user.userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
        return res.status(429).json({ error: 'Terlalu banyak permintaan. Silakan tunggu.' });
    }

    try {
        const player = await Player.findOne({ discordId: req.user.userId }).populate('inventory.itemId');
        if (!player) return res.status(404).json({ error: 'Player not found' });

        const invItem = player.inventory.id(inventoryId);
        if (!invItem) return res.status(404).json({ error: 'Item not found in inventory' });

        const item = invItem.itemId;
        if (!item) return res.status(404).json({ error: 'Item details not found' });

        // Map item category to equipment slot
        let slot = null;
        if (item.category === 'weapon') slot = 'weapon';
        else if (item.category === 'armor' || item.category === 'cloth') slot = 'armor';
        else if (item.category === 'helmet') slot = 'helmet';
        else if (item.category === 'pants') slot = 'pants';
        else if (item.category === 'boots') slot = 'boots';
        else if (item.category === 'accessories') slot = 'accessory';

        if (!slot) {
            return res.status(400).json({ error: 'Item cannot be equipped' });
        }

        // Unequip currently equipped item in the same slot if any
        if (player.equipment && player.equipment[slot]) {
            const currentEquippedId = player.equipment[slot].toString();
            const currentEquippedInvItem = player.inventory.id(currentEquippedId);
            if (currentEquippedInvItem) {
                currentEquippedInvItem.isEquipped = false;
            }
        }

        if (!player.equipment) player.equipment = {};
        player.equipment[slot] = invItem._id;
        invItem.isEquipped = true;
        player.markModified('inventory');
        player.markModified('equipment');

        await player.save();

        if (req.io) {
            req.io.emit('user_update', { userId: player.discordId, type: 'EQUIPMENT_UPDATED' });
        }

        res.json({ message: 'Item equipped successfully', equipment: player.equipment });
    } catch (error) {
        console.error('[API] Equip error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// POST /api/equipment/unequip
router.post('/unequip', authenticateToken, async (req, res) => {
    const { slot } = req.body;
    if (!slot) {
        return res.status(400).json({ error: 'slot is required' });
    }

    const validSlots = ['weapon', 'armor', 'helmet', 'pants', 'boots', 'accessory'];
    if (!validSlots.includes(slot)) {
        return res.status(400).json({ error: 'Invalid slot' });
    }

    const lockKey = `unequip:${req.user.userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
        return res.status(429).json({ error: 'Terlalu banyak permintaan. Silakan tunggu.' });
    }

    try {
        const player = await Player.findOne({ discordId: req.user.userId });
        if (!player) return res.status(404).json({ error: 'Player not found' });

        if (!player.equipment || !player.equipment[slot]) {
            return res.status(400).json({ error: 'No item equipped in this slot' });
        }

        const equippedInvId = player.equipment[slot];
        const invItem = player.inventory.id(equippedInvId);

        if (invItem) {
            invItem.isEquipped = false;
        }

        player.equipment[slot] = null;
        player.markModified('inventory');
        player.markModified('equipment');

        await player.save();

        if (req.io) {
            req.io.emit('user_update', { userId: player.discordId, type: 'EQUIPMENT_UPDATED' });
        }

        res.json({ message: 'Item unequipped successfully', equipment: player.equipment });
    } catch (error) {
        console.error('[API] Unequip error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
