const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const TransferRequest = require('../../models/TransferRequest');
const authenticateToken = require('../middleware/auth');
const LockManager = require('../utils/lockManager');
const mongoose = require('mongoose');

// Request transfer
router.post('/transfer-item-request', authenticateToken, async (req, res) => {
    const { targetUserId, itemId, quantity } = req.body;
    const userId = req.user.id;
    if (!targetUserId || !itemId || !quantity) return res.status(400).json({ message: 'Missing params' });

    const player = await Player.findOne({ discordId: userId });
    const target = await Player.findOne({ discordId: targetUserId });

    if (!player || !target) return res.status(404).json({ message: 'Player not found' });

    const item = player.inventory.find(i => i.itemId === itemId);
    if (!item || item.quantity < quantity) return res.status(400).json({ message: 'Not enough items' });

    const tr = new TransferRequest({
        senderId: userId,
        receiverId: targetUserId,
        senderName: player.name,
        receiverName: target.name,
        itemId,
        quantity,
        status: 'pending'
    });
    await tr.save();

    return res.json({ message: 'Transfer request sent' });
});

// Respond
router.post('/transfer-item-respond', authenticateToken, async (req, res) => {
    const { requestId, accept } = req.body;
    const userId = req.user.id;

    const lockKey = `transfer_${requestId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ message: 'Busy' });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const tr = await TransferRequest.findById(requestId).session(session);
        if (!tr || tr.receiverId !== userId || tr.status !== 'pending') {
            return res.status(400).json({ message: 'Invalid request' });
        }

        tr.status = accept ? 'accepted' : 'rejected';
        await tr.save({ session });

        if (accept) {
            const sender = await Player.findOne({ discordId: tr.senderId }).session(session);
            const receiver = await Player.findOne({ discordId: tr.receiverId }).session(session);

            const itemIdx = sender.inventory.findIndex(i => i.itemId === tr.itemId);
            if (itemIdx === -1 || sender.inventory[itemIdx].quantity < tr.quantity) {
                throw new Error('Sender does not have item anymore');
            }

            sender.inventory[itemIdx].quantity -= tr.quantity;
            if (sender.inventory[itemIdx].quantity <= 0) sender.inventory.splice(itemIdx, 1);

            const rItemIdx = receiver.inventory.findIndex(i => i.itemId === tr.itemId);
            if (rItemIdx > -1) {
                receiver.inventory[rItemIdx].quantity += tr.quantity;
            } else {
                receiver.inventory.push({ itemId: tr.itemId, quantity: tr.quantity });
            }

            await sender.save({ session });
            await receiver.save({ session });
        }

        await session.commitTransaction();
        return res.json({ message: 'Success' });
    } catch (e) {
        await session.abortTransaction();
        console.error(e);
        return res.status(500).json({ message: 'Error' });
    } finally {
        session.endSession();
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/restart-karakter', authenticateToken, async (req, res) => {
    const { characterName, confirmText } = req.body;
    const userId = req.user.id;

    if (confirmText !== 'RESTART') return res.status(400).json({ message: 'Konfirmasi salah.' });

    const lockKey = `restart_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ message: 'Busy' });

    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player || player.name !== characterName) return res.status(400).json({ message: 'Nama tidak cocok' });

        await Player.deleteOne({ discordId: userId });
        return res.json({ message: 'Karakter dihapus' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
