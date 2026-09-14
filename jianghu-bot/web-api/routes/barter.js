const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middlewares/auth');
const LockManager = require('../utils/lockManager');
const { withTransaction } = require('../utils/dbTransaction');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const BarterOffer = require('../../models/BarterOffer');
const Travel = require('../../models/Travel');
const TransactionLog = require('../../models/TransactionLog');
const CustomError = require('../utils/CustomError');
const barterConfig = require('../../config/barterConfig');
const { getTotalCopper, hasEnoughCurrency, payCurrency, RATE_TO_COPPER } = require('../../utils/currency');

// Helper to calculate total copper value for a currency object {copper, silver, gold}
const getOfferCopperValue = (currencyObj) => {
    let total = 0;
    if (currencyObj.copper) total += currencyObj.copper * (RATE_TO_COPPER.copper || 1);
    if (currencyObj.silver) total += currencyObj.silver * (RATE_TO_COPPER.silver || 100);
    if (currencyObj.gold) total += currencyObj.gold * (RATE_TO_COPPER.gold || 10000);
    return total;
};

const addCurrency = (playerCurrency, amountObj) => {
    let currentTotal = getTotalCopper(playerCurrency);
    let toAdd = getOfferCopperValue(amountObj);
    let newTotal = currentTotal + toAdd;

    // Use default values if constants are somehow missing
    const rateSpirit = RATE_TO_COPPER.spirit || 100000000;
    const rateJade = RATE_TO_COPPER.jade || 1000000;
    const rateGold = RATE_TO_COPPER.gold || 10000;
    const rateSilver = RATE_TO_COPPER.silver || 100;

    playerCurrency.spirit = Math.floor(newTotal / rateSpirit);
    newTotal %= rateSpirit;

    playerCurrency.jade = Math.floor(newTotal / rateJade);
    newTotal %= rateJade;

    playerCurrency.gold = Math.floor(newTotal / rateGold);
    newTotal %= rateGold;

    playerCurrency.silver = Math.floor(newTotal / rateSilver);
    newTotal %= rateSilver;

    playerCurrency.copper = Math.round(newTotal);
};

// Helper: Remove item
const removePlayerItem = (player, itemId, quantity) => {
    const invItem = player.inventory.find(i => i.itemId.toString() === itemId.toString());
    if (!invItem || invItem.quantity < quantity) {
        return false;
    }
    invItem.quantity -= quantity;
    if (invItem.quantity <= 0) {
        player.inventory = player.inventory.filter(i => i.itemId.toString() !== itemId.toString());
    }
    return true;
};

// Helper: Add item
const addPlayerItem = (player, itemId, quantity) => {
    const invItem = player.inventory.find(i => i.itemId.toString() === itemId.toString());
    if (invItem) {
        invItem.quantity += quantity;
    } else {
        player.inventory.push({ itemId, quantity });
    }
};

const formatCurrencyText = (obj) => {
    let text = [];
    if (obj.gold) text.push(`${obj.gold} Gold`);
    if (obj.silver) text.push(`${obj.silver} Silver`);
    if (obj.copper) text.push(`${obj.copper} Copper`);
    return text.join(', ') || '0 Copper';
};

const formatItemText = (items) => {
    if (!items || items.length === 0) return '';
    return items.map(i => `${i.quantity}x ${i.itemName || 'Item'}`).join(', ');
};

router.get('/nearby-players', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId }).lean();
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        if (!player.currentLocation || !player.currentLocation.regionSlug || !player.currentLocation.settlementName) {
            return res.status(400).json({ error: 'Lokasi saat ini tidak valid.' });
        }

        const travelingPlayers = await Travel.find({
            guildId: player.guildId,
            status: { $in: ['traveling', 'ambushed'] }
        }).select('discordId').lean();
        const travelingIds = travelingPlayers.map(t => t.discordId);

        const nearby = await Player.find({
            guildId: player.guildId,
            discordId: { $ne: userId, $nin: travelingIds },
            'currentLocation.regionSlug': player.currentLocation.regionSlug,
            'currentLocation.settlementName': player.currentLocation.settlementName,
            status: 'active'
        }).select('discordId characterName guildId characterImage').lean();

        res.json({ success: true, data: nearby });
    } catch (error) {
        console.error('[API-BARTER] Error /nearby-players:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/offers', authenticateToken, async (req, res) => {
    const { toUserId, offer, request } = req.body;
    const userId = req.user.userId;

    if (!toUserId) return res.status(400).json({ error: 'Penerima tidak valid.' });
    if (toUserId === userId) return res.status(400).json({ error: 'Tidak bisa barter dengan diri sendiri.' });

    const cleanOffer = { copper: offer?.copper || 0, silver: offer?.silver || 0, gold: offer?.gold || 0, items: offer?.items || [] };
    const cleanRequest = { copper: request?.copper || 0, silver: request?.silver || 0, gold: request?.gold || 0, items: request?.items || [] };

    let isOfferEmpty = cleanOffer.copper === 0 && cleanOffer.silver === 0 && cleanOffer.gold === 0 && cleanOffer.items.length === 0;
    let isRequestEmpty = cleanRequest.copper === 0 && cleanRequest.silver === 0 && cleanRequest.gold === 0 && cleanRequest.items.length === 0;

    if (isOfferEmpty && isRequestEmpty) return res.status(400).json({ error: 'Offer dan Request tidak boleh sama-sama kosong.' });
    if (!barterConfig.ALLOW_ONE_SIDED_GIFT && (isOfferEmpty || isRequestEmpty)) return res.status(400).json({ error: 'Barter satu arah tidak diizinkan.' });

    if (cleanOffer.copper < 0 || cleanOffer.silver < 0 || cleanOffer.gold < 0) return res.status(400).json({ error: 'Currency negatif tidak diizinkan.' });
    if (cleanRequest.copper < 0 || cleanRequest.silver < 0 || cleanRequest.gold < 0) return res.status(400).json({ error: 'Currency negatif tidak diizinkan.' });

    // Aggregate items to prevent duplicates
    const aggregateItems = (items) => {
        const result = {};
        for (let i of items) {
            if (!i.itemId || !i.quantity || i.quantity <= 0) throw new Error('Item qty tidak valid.');
            if (result[i.itemId]) {
                result[i.itemId].quantity += Number(i.quantity);
            } else {
                result[i.itemId] = { itemId: i.itemId, itemName: i.itemName || 'Item', quantity: Number(i.quantity) };
            }
        }
        return Object.values(result);
    };

    try {
        cleanOffer.items = aggregateItems(cleanOffer.items);
        cleanRequest.items = aggregateItems(cleanRequest.items);
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }

    const lockKey = `barter_create_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses.' });

    try {
        await withTransaction(async (session) => {
            const player1 = await Player.findOne({ discordId: userId }).session(session);
            const player2 = await Player.findOne({ discordId: toUserId, guildId: player1.guildId }).session(session);

            if (!player2) throw new CustomError('Target pemain tidak ditemukan.', 404);
            if (player1.status !== 'active' || player2.status !== 'active') throw new CustomError('Pemain tidak aktif.', 400);

            if (player1.currentLocation.regionSlug !== player2.currentLocation.regionSlug ||
                player1.currentLocation.settlementName !== player2.currentLocation.settlementName) {
                throw new CustomError('Kalian tidak berada di lokasi yang sama.', 400);
            }

            const activeTravel = await Travel.findOne({
                discordId: { $in: [userId, toUserId] },
                status: { $in: ['traveling', 'ambushed'] }
            }).session(session);

            if (activeTravel) {
                const who = activeTravel.discordId === userId ? 'Kamu' : 'Target pemain';
                throw new CustomError(`${who} sedang dalam perjalanan atau disergap (traveling/ambushed).`, 400);
            }

            const pendingOffers = await BarterOffer.countDocuments({ fromUserId: userId, status: 'pending' }).session(session);
            if (pendingOffers >= barterConfig.MAX_PENDING_OFFERS_PER_PLAYER) {
                throw new CustomError(`Batas maksimal pending offer (${barterConfig.MAX_PENDING_OFFERS_PER_PLAYER}) tercapai.`, 400);
            }

            // Verify player1 has enough currency
            const offerCopper = getOfferCopperValue(cleanOffer);
            if (offerCopper > 0) {
                 if (getTotalCopper(player1.currency) < offerCopper) {
                     throw new CustomError('Uang kamu tidak cukup untuk offer.', 400);
                 }
            }

            // Verify player1 has items
            for (let i of cleanOffer.items) {
                const invItem = player1.inventory.find(inv => inv.itemId.toString() === i.itemId.toString());
                if (!invItem || invItem.quantity < i.quantity) {
                    throw new CustomError(`Kamu tidak memiliki cukup item untuk offer.`, 400);
                }
            }

            // Validate items exist in DB (prevent sending invalid ObjectIds)
            const itemIdsToCheck = [...cleanOffer.items.map(i => i.itemId), ...cleanRequest.items.map(i => i.itemId)];
            if (itemIdsToCheck.length > 0) {
                const itemsInDb = await Item.find({ _id: { $in: itemIdsToCheck } }).session(session);
                if (itemsInDb.length !== [...new Set(itemIdsToCheck)].length) {
                    throw new CustomError('Satu atau lebih Item ID tidak valid.', 400);
                }

                // Populate item names properly
                cleanOffer.items = cleanOffer.items.map(i => {
                    const dbItem = itemsInDb.find(db => db._id.toString() === i.itemId.toString());
                    return { ...i, itemName: dbItem ? dbItem.name : i.itemName };
                });
                cleanRequest.items = cleanRequest.items.map(i => {
                    const dbItem = itemsInDb.find(db => db._id.toString() === i.itemId.toString());
                    return { ...i, itemName: dbItem ? dbItem.name : i.itemName };
                });
            }

            const expiresAt = new Date(Date.now() + barterConfig.DEFAULT_EXPIRY_HOURS * 3600 * 1000);
            const locationKey = `${player1.currentLocation.regionSlug}_${player1.currentLocation.settlementName}`;

            await BarterOffer.create([{
                guildId: player1.guildId,
                fromUserId: userId,
                toUserId: toUserId,
                offer: cleanOffer,
                request: cleanRequest,
                locationKey,
                expiresAt
            }], { session });

        });

        res.json({ success: true, message: 'Barter offer berhasil dibuat.' });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-BARTER] Error creating offer:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.get('/offers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Lazy expiry check
        await BarterOffer.updateMany(
            { status: 'pending', expiresAt: { $lt: new Date() } },
            { $set: { status: 'expired' } }
        );

        const offers = await BarterOffer.find({
            $or: [{ fromUserId: userId }, { toUserId: userId }]
        }).sort({ createdAt: -1 }).lean();

        res.json({ success: true, data: offers });
    } catch (error) {
        console.error('[API-BARTER] Error listing offers:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/offers/:id/cancel', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        await withTransaction(async (session) => {
            const offer = await BarterOffer.findById(id).session(session);
            if (!offer) throw new CustomError('Offer tidak ditemukan.', 404);
            if (offer.fromUserId !== userId) throw new CustomError('Kamu tidak bisa cancel offer ini.', 403);
            if (offer.status !== 'pending') throw new CustomError(`Offer sudah berstatus ${offer.status}.`, 400);

            offer.status = 'cancelled';
            offer.resolvedAt = new Date();
            await offer.save({ session });
        });
        res.json({ success: true, message: 'Offer dibatalkan.' });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-BARTER] Error canceling offer:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/offers/:id/reject', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        await withTransaction(async (session) => {
            const offer = await BarterOffer.findById(id).session(session);
            if (!offer) throw new CustomError('Offer tidak ditemukan.', 404);
            if (offer.toUserId !== userId) throw new CustomError('Kamu tidak berhak reject offer ini.', 403);
            if (offer.status !== 'pending') throw new CustomError(`Offer sudah berstatus ${offer.status}.`, 400);

            offer.status = 'rejected';
            offer.resolvedAt = new Date();
            await offer.save({ session });
        });
        res.json({ success: true, message: 'Offer ditolak.' });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-BARTER] Error rejecting offer:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


router.post('/offers/:id/accept', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    const lockKey = `barter_accept_${id}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses.' });

    try {
        await withTransaction(async (session) => {
            const offer = await BarterOffer.findById(id).session(session);
            if (!offer) throw new CustomError('Offer tidak ditemukan.', 404);
            if (offer.toUserId !== userId) throw new CustomError('Akses ditolak.', 403);
            if (offer.status !== 'pending') throw new CustomError(`Offer sudah berstatus ${offer.status}.`, 400);
            if (offer.expiresAt < new Date()) {
                offer.status = 'expired';
                await offer.save({ session });
                throw new CustomError('Offer sudah expired.', 400);
            }

            const fromPlayer = await Player.findOne({ discordId: offer.fromUserId }).session(session);
            const toPlayer = await Player.findOne({ discordId: userId }).session(session);

            if (!fromPlayer || !toPlayer) throw new CustomError('Pemain tidak valid.', 400);
            if (fromPlayer.status !== 'active' || toPlayer.status !== 'active') throw new CustomError('Salah satu pemain tidak aktif/ambushed/mati.', 400);

            const locationKeyFrom = `${fromPlayer.currentLocation.regionSlug}_${fromPlayer.currentLocation.settlementName}`;
            const locationKeyTo = `${toPlayer.currentLocation.regionSlug}_${toPlayer.currentLocation.settlementName}`;
            if (locationKeyFrom !== locationKeyTo || locationKeyFrom !== offer.locationKey) {
                throw new CustomError('Lokasi tidak sesuai (salah satu pemain sudah pindah).', 400);
            }

            const activeTravel = await Travel.findOne({
                discordId: { $in: [fromPlayer.discordId, toPlayer.discordId] },
                status: { $in: ['traveling', 'ambushed'] }
            }).session(session);

            if (activeTravel) {
                const who = activeTravel.discordId === toPlayer.discordId ? 'Kamu' : 'Pemain lain';
                throw new CustomError(`${who} sedang dalam perjalanan atau disergap (traveling/ambushed).`, 400);
            }

            // Check and process request from Player 2 (the one accepting) FIRST
            // This ensures if they don't have enough, we fail early
            const reqCopper = getOfferCopperValue(offer.request);
            if (reqCopper > 0) {
                if(!payCurrency(toPlayer.currency, reqCopper, 'copper')) {
                     throw new CustomError('Kamu tidak memiliki cukup currency untuk request.', 400);
                }
            }
            for (let i of offer.request.items) {
                if (!removePlayerItem(toPlayer, i.itemId, i.quantity)) {
                    throw new CustomError(`Kamu tidak memiliki cukup item untuk request.`, 400);
                }
            }

            // Check and process offer from Player 1
            const offerCopper = getOfferCopperValue(offer.offer);
            if (offerCopper > 0) {
                if(!payCurrency(fromPlayer.currency, offerCopper, 'copper')) {
                     throw new CustomError('Pengirim tidak memiliki cukup currency untuk offer.', 400);
                }
            }
            for (let i of offer.offer.items) {
                if (!removePlayerItem(fromPlayer, i.itemId, i.quantity)) {
                    throw new CustomError(`Pengirim tidak memiliki cukup item.`, 400);
                }
            }

            // Perform Additions
            if (offerCopper > 0) addCurrency(toPlayer.currency, offer.offer);
            if (reqCopper > 0) addCurrency(fromPlayer.currency, offer.request);

            for (let i of offer.offer.items) {
                addPlayerItem(toPlayer, i.itemId, i.quantity);
            }
            for (let i of offer.request.items) {
                addPlayerItem(fromPlayer, i.itemId, i.quantity);
            }

            fromPlayer.markModified('currency');
            fromPlayer.markModified('inventory');
            toPlayer.markModified('currency');
            toPlayer.markModified('inventory');

            await fromPlayer.save({ session });
            await toPlayer.save({ session });

            offer.status = 'accepted';
            offer.resolvedAt = new Date();
            await offer.save({ session });

            // Generate nice strings for logging
            const offerCurrText = formatCurrencyText(offer.offer);
            const reqCurrText = formatCurrencyText(offer.request);
            const offerItemText = formatItemText(offer.offer.items);
            const reqItemText = formatItemText(offer.request.items);

            const offeredSummary = [offerCurrText !== '0 Copper' ? offerCurrText : '', offerItemText].filter(x => x).join(' dan ');
            const requestedSummary = [reqCurrText !== '0 Copper' ? reqCurrText : '', reqItemText].filter(x => x).join(' dan ');

            // Logs
            await TransactionLog.create([{
                guildId: offer.guildId,
                type: 'barter_transfer',
                fromUserId: offer.fromUserId,
                toUserId: offer.toUserId,
                currency: null,
                amount: 0,
                itemDescription: `[Barter] ${offer.fromUserId} memberikan (${offeredSummary || 'Tidak ada'}) ditukar dengan (${requestedSummary || 'Tidak ada'}) dari ${offer.toUserId}`,
                note: `Barter completed for Offer ${offer._id}`
            }], { session });

        });
        res.json({ success: true, message: 'Barter berhasil dilakukan!' });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-BARTER] Error accepting offer:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
