const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const TransferRequest = require('../../models/TransferRequest');
const authenticateToken = require('../middleware/auth');
const LockManager = require('../utils/lockManager');
const { withTransaction } = require('../utils/dbTransaction');
const CustomError = require('../utils/customError');

// Request transfer
router.post('/transfer-item-request', authenticateToken, async (req, res) => {
    const { targetUserId, itemId, quantity } = req.body;
    const userId = req.user.userId;
    if (!targetUserId || !itemId || !quantity) return res.status(400).json({ error: 'Missing params' });

    try {
        let msg = '';
        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).session(session);
            const target = await Player.findOne({ discordId: targetUserId }).session(session);

            if (!player || !target) throw new CustomError('Player not found', 404);

            const item = player.inventory.find(i => i.itemId.toString() === itemId.toString());
            if (!item || item.quantity < quantity) throw new CustomError('Not enough items', 400);

            const tr = new TransferRequest({
                guildId: player.guildId,
                fromUserId: userId,
                toUserId: targetUserId,
                itemId: itemId,
                quantity: quantity,
                taxAmount: 0, // Placeholder
                status: 'pending',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });
            await tr.save({ session });
            msg = 'Transfer request sent';
        });

        return res.json({ success: true, message: msg });
    } catch (e) {
        if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
        console.error(e);
        return res.status(500).json({ error: 'Error' });
    }
});

// Respond
router.post('/transfer-item-respond', authenticateToken, async (req, res) => {
    const { requestId, accept } = req.body;
    const userId = req.user.userId;

    const lockKey = `transfer_${requestId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Busy' });

    try {
        let msg = '';
        await withTransaction(async (session) => {
            const tr = await TransferRequest.findById(requestId).session(session);
            if (!tr || tr.toUserId !== userId || tr.status !== 'pending') {
                throw new CustomError('Invalid request', 400);
            }

            tr.status = accept ? 'accepted' : 'rejected';
            await tr.save({ session });

            if (accept) {
                const sender = await Player.findOne({ discordId: tr.fromUserId }).session(session);
                const receiver = await Player.findOne({ discordId: tr.toUserId }).session(session);

                const itemIdx = sender.inventory.findIndex(i => i.itemId.toString() === tr.itemId.toString());
                if (itemIdx === -1 || sender.inventory[itemIdx].quantity < tr.quantity) {
                    throw new CustomError('Sender does not have item anymore', 400);
                }

                sender.inventory[itemIdx].quantity -= tr.quantity;
                if (sender.inventory[itemIdx].quantity <= 0) {
                    sender.inventory = sender.inventory.filter(i => i.itemId.toString() !== tr.itemId.toString());
                }

                const rItemIdx = receiver.inventory.findIndex(i => i.itemId.toString() === tr.itemId.toString());
                if (rItemIdx > -1) {
                    receiver.inventory[rItemIdx].quantity += tr.quantity;
                } else {
                    receiver.inventory.push({ itemId: tr.itemId, quantity: tr.quantity });
                }

                sender.markModified('inventory');
                receiver.markModified('inventory');

                await sender.save({ session });
                await receiver.save({ session });
            }
            msg = accept ? 'Transfer accepted' : 'Transfer rejected';
        });

        return res.json({ success: true, message: msg });
    } catch (e) {
        if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
        console.error(e);
        return res.status(500).json({ error: 'Error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/restart-karakter', authenticateToken, async (req, res) => {
    const { characterName, confirmText } = req.body;
    const userId = req.user.userId;

    if (confirmText !== 'RESTART') return res.status(400).json({ error: 'Konfirmasi salah.' });

    const lockKey = `restart_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Busy' });

    try {
        let msg = '';
        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player || player.characterName !== characterName) {
                throw new CustomError('Nama tidak cocok', 400);
            }

            await Player.deleteOne({ discordId: userId }).session(session);
            msg = 'Karakter dihapus';
        });

        return res.json({ success: true, message: msg });
    } catch (e) {
        if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
        console.error(e);
        return res.status(500).json({ error: 'Error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
