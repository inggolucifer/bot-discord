const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middlewares/auth');
const BarterOffer = require('../../models/BarterOffer');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const { withTransaction } = require('../utils/dbTransaction');
const LockManager = require('../utils/lockManager');
const { hasEnoughCurrency, payCurrency, RATE_TO_COPPER } = require('../../utils/currency');
const { logTransaction } = require('../../utils/logger'); // We will use this or adapt for transaction log

// Helper to check if both players are at the same exact location
function isSameLocation(loc1, loc2) {
    if (!loc1 || !loc2) return false;
    return loc1.regionSlug === loc2.regionSlug &&
           loc1.settlementName === loc2.settlementName &&
           (loc1.buildingName || null) === (loc2.buildingName || null);
}

// Helper to check if a player has enough of an item in inventory
function getInventoryItemQuantity(inventory, itemId) {
    const itemStr = itemId.toString();
    const inventoryItem = inventory.find(i => i.itemId && (i.itemId._id ? i.itemId._id.toString() : i.itemId.toString()) === itemStr);
    return inventoryItem ? inventoryItem.quantity : 0;
}

// Helper to validate offer structure and check if empty
function isOfferEmpty(offer) {
    if (!offer) return true;
    const hasItems = offer.items && offer.items.length > 0;
    const hasCurrency = offer.currency && (offer.currency.copper > 0 || offer.currency.silver > 0 || offer.currency.gold > 0 || offer.currency.jade > 0 || offer.currency.spirit > 0);
    return !hasItems && !hasCurrency;
}

// Endpoint: POST /api/barter/offer
router.post('/offer', authenticateToken, async (req, res) => {
    const initiatorId = req.user.userId;
    const { targetId, initiatorOffer, targetOffer } = req.body;

    if (!targetId || targetId === initiatorId) {
        return res.status(400).json({ error: 'Target pemain tidak valid.' });
    }

    if (isOfferEmpty(initiatorOffer) && isOfferEmpty(targetOffer)) {
        return res.status(400).json({ error: 'Tawaran barter tidak boleh kosong untuk kedua belah pihak.' });
    }

    // Input quantity validation for items
    if (initiatorOffer && initiatorOffer.items) {
        if (initiatorOffer.items.some(item => !item.itemId || item.quantity <= 0)) {
            return res.status(400).json({ error: 'Jumlah item pada penawaran Anda tidak valid.' });
        }
    }
    if (targetOffer && targetOffer.items) {
        if (targetOffer.items.some(item => !item.itemId || item.quantity <= 0)) {
            return res.status(400).json({ error: 'Jumlah item pada permintaan Anda tidak valid.' });
        }
    }

    try {
        const guildId = req.user.guildId || req.user.userId; // fallback

        // 1. Load players
        const initiator = await Player.findOne({ discordId: initiatorId }).lean();
        const target = await Player.findOne({ discordId: targetId }).lean();

        if (!initiator || !target) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        }

        // 2. Validate Locations (lazy check)
        if (!isSameLocation(initiator.currentLocation, target.currentLocation)) {
            return res.status(400).json({ error: 'Anda dan target harus berada di lokasi yang sama persis.' });
        }

        // 3. Check for existing pending offers
        const existingOffer = await BarterOffer.findOne({
            guildId: initiator.guildId,
            status: 'pending',
            $or: [
                { initiatorId, targetId },
                { initiatorId: targetId, targetId: initiatorId }
            ]
        }).lean();

        if (existingOffer) {
            return res.status(400).json({ error: 'Masih ada tawaran barter yang tertunda dengan pemain ini.' });
        }

        // 4. Validate Initiator has the offered items and currency
        if (initiatorOffer) {
            // Currency check
            if (initiatorOffer.currency) {
                const totalCopperNeeded =
                    (initiatorOffer.currency.copper || 0) * RATE_TO_COPPER.copper +
                    (initiatorOffer.currency.silver || 0) * RATE_TO_COPPER.silver +
                    (initiatorOffer.currency.gold || 0) * RATE_TO_COPPER.gold +
                    (initiatorOffer.currency.jade || 0) * RATE_TO_COPPER.jade +
                    (initiatorOffer.currency.spirit || 0) * RATE_TO_COPPER.spirit;

                if (totalCopperNeeded > 0) {
                    if (!hasEnoughCurrency(initiator.currency, totalCopperNeeded, 'copper')) {
                        return res.status(400).json({ error: 'Uang Anda tidak cukup untuk penawaran ini.' });
                    }
                }
            }

            // Item check
            if (initiatorOffer.items && initiatorOffer.items.length > 0) {
                for (const item of initiatorOffer.items) {
                    const availableQty = getInventoryItemQuantity(initiator.inventory, item.itemId);
                    if (availableQty < item.quantity) {
                        return res.status(400).json({ error: `Jumlah item (ID: ${item.itemId}) yang ditawarkan melebihi jumlah yang kamu miliki (${availableQty}).` });
                    }
                }
            }
        }

        // 5. Create Barter Offer
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

        const barterOffer = new BarterOffer({
            guildId: initiator.guildId,
            initiatorId,
            targetId,
            initiatorOffer: initiatorOffer || {},
            targetOffer: targetOffer || {},
            locationSnapshot: initiator.currentLocation,
            expiresAt
        });

        await barterOffer.save();

        res.json({ success: true, message: 'Tawaran barter berhasil diajukan.', data: barterOffer });

    } catch (error) {
        console.error('[API-BARTER] Error creating offer:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat membuat tawaran barter.' });
    }
});

// Endpoint: GET /api/barter/list
router.get('/list', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const guildId = req.user.guildId || userId;

        // Auto expire old pending offers
        await BarterOffer.updateMany({
            guildId,
            status: 'pending',
            expiresAt: { $lt: new Date() }
        }, {
            $set: { status: 'expired' }
        });

        const offers = await BarterOffer.find({
            guildId,
            status: 'pending',
            $or: [{ initiatorId: userId }, { targetId: userId }]
        }).populate('initiatorOffer.items.itemId').populate('targetOffer.items.itemId').sort({ createdAt: -1 }).lean();

        // Populate player names
        const playerIds = [...new Set(offers.flatMap(o => [o.initiatorId, o.targetId]))];
        const players = await Player.find({ discordId: { $in: playerIds }, guildId }).select('discordId characterName').lean();
        const playerMap = Object.fromEntries(players.map(p => [p.discordId, p.characterName]));

        const formattedOffers = offers.map(offer => ({
            ...offer,
            initiatorName: playerMap[offer.initiatorId] || 'Unknown',
            targetName: playerMap[offer.targetId] || 'Unknown',
            isInitiator: offer.initiatorId === userId
        }));

        res.json({ success: true, data: formattedOffers });

    } catch (error) {
        console.error('[API-BARTER] Error fetching offers:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data barter.' });
    }
});

// Endpoint: GET /api/barter/:id
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const offerId = req.params.id;
        const userId = req.user.userId;

        const offer = await BarterOffer.findById(offerId)
            .populate('initiatorOffer.items.itemId')
            .populate('targetOffer.items.itemId')
            .lean();

        if (!offer) return res.status(404).json({ error: 'Tawaran barter tidak ditemukan.' });
        if (offer.initiatorId !== userId && offer.targetId !== userId) {
            return res.status(403).json({ error: 'Akses ditolak.' });
        }

        const players = await Player.find({ discordId: { $in: [offer.initiatorId, offer.targetId] } }).select('discordId characterName').lean();
        const playerMap = Object.fromEntries(players.map(p => [p.discordId, p.characterName]));

        res.json({
            success: true,
            data: {
                ...offer,
                initiatorName: playerMap[offer.initiatorId] || 'Unknown',
                targetName: playerMap[offer.targetId] || 'Unknown',
                isInitiator: offer.initiatorId === userId
            }
        });

    } catch (error) {
        console.error('[API-BARTER] Error fetching offer:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat mengambil detail barter.' });
    }
});

// Endpoint: POST /api/barter/accept/:id
router.post('/accept/:id', authenticateToken, async (req, res) => {
    const offerId = req.params.id;
    const userId = req.user.userId;
    const guildId = req.user.guildId || userId;

    const lockKey1 = `barter_${userId}`;
    const releaseLock1 = await LockManager.acquire(lockKey1);
    if (!releaseLock1) return res.status(429).json({ error: 'Sistem sedang sibuk. Coba lagi.' });

    let releaseLock2 = null;

    try {
        const offer = await BarterOffer.findById(offerId);

        if (!offer) return res.status(404).json({ error: 'Tawaran barter tidak ditemukan.' });
        if (offer.status !== 'pending') return res.status(400).json({ error: `Tawaran sudah tidak valid (status: ${offer.status}).` });
        if (offer.targetId !== userId) return res.status(403).json({ error: 'Hanya target yang bisa menerima tawaran ini.' });
        if (new Date() > offer.expiresAt) {
            offer.status = 'expired';
            await offer.save();
            return res.status(400).json({ error: 'Tawaran barter sudah kadaluarsa.' });
        }

        const lockKey2 = `barter_${offer.initiatorId}`;
        releaseLock2 = await LockManager.acquire(lockKey2);
        if (!releaseLock2) return res.status(429).json({ error: 'Pemain lain sedang sibuk. Coba lagi.' });

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const initiator = await Player.findOne({ discordId: offer.initiatorId }).session(session);
            const target = await Player.findOne({ discordId: offer.targetId }).session(session);

            if (!initiator || !target) throw new CustomError(404, 'Salah satu karakter tidak ditemukan.');

            // Validate Locations again!
            if (!isSameLocation(initiator.currentLocation, offer.locationSnapshot) ||
                !isSameLocation(target.currentLocation, offer.locationSnapshot) ||
                !isSameLocation(initiator.currentLocation, target.currentLocation)) {

                offer.status = 'expired';
                await offer.save({ session });
                throw new CustomError(400, 'Tawaran batal otomatis karena salah satu pemain sudah berpindah lokasi.');
            }

            // 1. Verify Target has the requested items/currency
            const targetOffer = offer.targetOffer;
            let targetTotalCopperCost = 0;
            if (targetOffer && targetOffer.currency) {
                targetTotalCopperCost =
                    (targetOffer.currency.copper || 0) * RATE_TO_COPPER.copper +
                    (targetOffer.currency.silver || 0) * RATE_TO_COPPER.silver +
                    (targetOffer.currency.gold || 0) * RATE_TO_COPPER.gold +
                    (targetOffer.currency.jade || 0) * RATE_TO_COPPER.jade +
                    (targetOffer.currency.spirit || 0) * RATE_TO_COPPER.spirit;

                if (targetTotalCopperCost > 0) {
                    if (!hasEnoughCurrency(target.currency, targetTotalCopperCost, 'copper')) {
                        throw new CustomError(400, 'Anda tidak memiliki cukup uang untuk memenuhi tawaran ini.');
                    }
                }
            }

            if (targetOffer && targetOffer.items && targetOffer.items.length > 0) {
                for (const item of targetOffer.items) {
                    const availableQty = getInventoryItemQuantity(target.inventory, item.itemId);
                    if (availableQty < item.quantity) {
                        throw new CustomError(400, `Jumlah item (ID: ${item.itemId}) yang ditawarkan melebihi jumlah yang kamu miliki (${availableQty}).`);
                    }
                }
            }

            // 2. Verify Initiator still has the offered items/currency
            const initiatorOffer = offer.initiatorOffer;
            let initiatorTotalCopperCost = 0;
            if (initiatorOffer && initiatorOffer.currency) {
                initiatorTotalCopperCost =
                    (initiatorOffer.currency.copper || 0) * RATE_TO_COPPER.copper +
                    (initiatorOffer.currency.silver || 0) * RATE_TO_COPPER.silver +
                    (initiatorOffer.currency.gold || 0) * RATE_TO_COPPER.gold +
                    (initiatorOffer.currency.jade || 0) * RATE_TO_COPPER.jade +
                    (initiatorOffer.currency.spirit || 0) * RATE_TO_COPPER.spirit;

                if (initiatorTotalCopperCost > 0) {
                    if (!hasEnoughCurrency(initiator.currency, initiatorTotalCopperCost, 'copper')) {
                        throw new CustomError(400, 'Initiator sudah tidak memiliki cukup uang.');
                    }
                }
            }

            if (initiatorOffer && initiatorOffer.items && initiatorOffer.items.length > 0) {
                for (const item of initiatorOffer.items) {
                    const availableQty = getInventoryItemQuantity(initiator.inventory, item.itemId);
                    if (availableQty < item.quantity) {
                        throw new CustomError(400, `Jumlah item (ID: ${item.itemId}) yang ditawarkan melebihi jumlah yang dimiliki initiator.`);
                    }
                }
            }

            // Helper to move item
            const moveItem = (fromPlayer, toPlayer, itemId, quantity) => {
                const fromIdx = fromPlayer.inventory.findIndex(i => i.itemId.toString() === itemId.toString());
                if (fromIdx !== -1) {
                    fromPlayer.inventory[fromIdx].quantity -= quantity;
                    if (fromPlayer.inventory[fromIdx].quantity <= 0) {
                        fromPlayer.inventory.splice(fromIdx, 1);
                    }
                }

                const toIdx = toPlayer.inventory.findIndex(i => i.itemId.toString() === itemId.toString());
                if (toIdx !== -1) {
                    toPlayer.inventory[toIdx].quantity += quantity;
                } else {
                    toPlayer.inventory.push({ itemId, quantity });
                }
            };

            // 3. Process the swap
            // Deduct Target, Add to Initiator
            if (targetTotalCopperCost > 0) {
                payCurrency(target.currency, targetTotalCopperCost, 'copper');
                initiator.currency.copper += targetTotalCopperCost;
            }
            if (targetOffer && targetOffer.items) {
                for (const item of targetOffer.items) {
                    moveItem(target, initiator, item.itemId, item.quantity);
                }
            }

            // Deduct Initiator, Add to Target
            if (initiatorTotalCopperCost > 0) {
                payCurrency(initiator.currency, initiatorTotalCopperCost, 'copper');
                target.currency.copper += initiatorTotalCopperCost;
            }
            if (initiatorOffer && initiatorOffer.items) {
                for (const item of initiatorOffer.items) {
                    moveItem(initiator, target, item.itemId, item.quantity);
                }
            }

            // Save players
            await initiator.save({ session });
            await target.save({ session });

            // Mark offer as accepted
            offer.status = 'accepted';
            await offer.save({ session });

            // Log Transaction
            const appClient = req.app.get('client');
            if (appClient) {
                try {
                    await logTransaction(appClient, {
                        guildId: offer.guildId,
                        type: 'barter',
                        fromUserId: initiator.discordId,
                        toUserId: target.discordId,
                        currency: 'copper',
                        amount: targetTotalCopperCost,
                        itemDescription: `Barter sukses. Initiator -> Target: ${initiatorTotalCopperCost}c & ${initiatorOffer.items?.length||0} items. Target -> Initiator: ${targetTotalCopperCost}c & ${targetOffer.items?.length||0} items.`,
                        note: `Offer ID: ${offer._id}`,
                        session
                    });
                    await logTransaction(appClient, {
                        guildId: offer.guildId,
                        type: 'barter',
                        fromUserId: target.discordId,
                        toUserId: initiator.discordId,
                        currency: 'copper',
                        amount: initiatorTotalCopperCost,
                        itemDescription: `Barter refund log for clarity.`,
                        note: `Offer ID: ${offer._id}`,
                        session
                    });
                } catch(e) { console.error('Failed to log barter tx:', e); }
            }
            await session.commitTransaction();
            session.endSession();
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }

        res.json({ success: true, message: 'Barter berhasil dilakukan!' });

    } catch (error) {
        console.error('[API-BARTER] Error accepting offer:', error);
        if (error instanceof CustomError) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Terjadi kesalahan server saat memproses barter.' });
        }
    } finally {
        if (typeof releaseLock1 === 'function') releaseLock1();
        if (typeof releaseLock2 === 'function') releaseLock2();
    }
});

// Endpoint: POST /api/barter/reject/:id
router.post('/reject/:id', authenticateToken, async (req, res) => {
    try {
        const offerId = req.params.id;
        const userId = req.user.userId;

        const offer = await BarterOffer.findById(offerId);
        if (!offer) return res.status(404).json({ error: 'Tawaran barter tidak ditemukan.' });
        if (offer.status !== 'pending') return res.status(400).json({ error: `Tawaran sudah tidak valid (status: ${offer.status}).` });
        if (offer.targetId !== userId) return res.status(403).json({ error: 'Hanya target yang bisa menolak tawaran ini.' });

        offer.status = 'rejected';
        await offer.save();

        res.json({ success: true, message: 'Tawaran barter ditolak.' });
    } catch (error) {
        console.error('[API-BARTER] Error rejecting offer:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Endpoint: POST /api/barter/cancel/:id
router.post('/cancel/:id', authenticateToken, async (req, res) => {
    try {
        const offerId = req.params.id;
        const userId = req.user.userId;

        const offer = await BarterOffer.findById(offerId);
        if (!offer) return res.status(404).json({ error: 'Tawaran barter tidak ditemukan.' });
        if (offer.status !== 'pending') return res.status(400).json({ error: `Tawaran sudah tidak valid (status: ${offer.status}).` });
        if (offer.initiatorId !== userId) return res.status(403).json({ error: 'Hanya initiator yang bisa membatalkan tawaran ini.' });

        offer.status = 'cancelled';
        await offer.save();

        res.json({ success: true, message: 'Tawaran barter dibatalkan.' });
    } catch (error) {
        console.error('[API-BARTER] Error cancelling offer:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
