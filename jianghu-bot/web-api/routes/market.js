const express = require('express');
const router = express.Router();
const Shop = require('../../models/Shop');
const Auction = require('../../models/Auction');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const Pet = require('../../models/Pet');
const Asset = require('../../models/Asset');
const TransactionLog = require('../../models/TransactionLog');
const LockManager = require('../utils/lockManager');
const { authenticateToken } = require('../middlewares/auth');
const { withTransaction } = require('../utils/dbTransaction');
const CustomError = require('../utils/CustomError');

// Helper to determine emoji based on item/asset type
function getEmojiForShopItem(itemType, category) {
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
}

// 1. GET /api/market/shop
router.get('/shop', authenticateToken, async (req, res) => {
    try {
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);

        // Populate refId sesuai dengan refModel
        const shopList = await Shop.find({ isActive: true }).lean();

        let formattedShopItems = [];

        for (const shop of shopList) {
            let model;
            if (shop.refModel === 'Item') model = Item;
            else if (shop.refModel === 'Pet') model = Pet;
            else if (shop.refModel === 'Asset') model = Asset;
            else continue;

            const doc = await model.findById(shop.refId).lean();
            if (!doc) continue;

            formattedShopItems.push({
                id: shop._id,
                name: doc.name,
                type: shop.category === 'item' ? (doc.category || 'Barang') : shop.category,
                price: shop.price,
                currency: shop.priceCurrency,
                emoji: getEmojiForShopItem(doc.category, shop.category),
                stock: shop.stock,
                refId: shop.refId,
                rank: doc.rank || 'Common'
            });
        }

        res.json({ success: true, data: formattedShopItems });
    } catch (error) {
        console.error('[API-MARKET] Error fetching shop:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// 2. GET /api/market/auctions
router.get('/auctions', authenticateToken, async (req, res) => {
    try {
        const auctions = await Auction.find({ status: 'active' })
            .populate('itemId')
            .populate('sellerId', 'characterName')
            .lean();

        const formattedAuctions = auctions.map(auction => {
            return {
                id: auction._id,
                name: auction.itemId.name,
                seller: auction.sellerId ? auction.sellerId.characterName : 'Sistem / Admin',
                currentBid: auction.highestBid > 0 ? auction.highestBid : auction.startingBid,
                currency: 'silver', // Semua lelang berjalan dengan base price silver (sesuai normalisasi)
                timeLeft: auction.expiresAt, // bisa di-format di sisi frontend
                emoji: getEmojiForShopItem(auction.itemId.category, 'item'),
                quantity: auction.quantity,
                rank: auction.itemId.rank || 'Common'
            };
        });

        res.json({ success: true, data: formattedAuctions });
    } catch (error) {
         console.error('[API-MARKET] Error fetching auctions:', error);
         res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// 3. POST /api/market/auctions/:id/bid
router.post('/auctions/:id/bid', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const auctionId = req.params.id;
    const { bidAmount } = req.body;

    if (!bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
        return res.status(400).json({ error: 'Jumlah penawaran tidak valid.' });
    }

    // 🔒 MUTEX LOCK: Cegah race condition
    const lockKey = `market_auction_bid_${auctionId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Transaksi sedang diproses. Mohon tunggu." });

    try {
        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

            const auction = await Auction.findById(auctionId).populate('itemId').session(session);
            if (!auction) throw new CustomError('Lelang tidak ditemukan.', 404);

            if (auction.status !== 'active') {
                throw new CustomError('Lelang ini sudah tidak aktif.', 400);
            }

            if (new Date() > auction.expiresAt) {
                 auction.status = 'pending'; // Should be handled by cron but just in case
                 await auction.save({ session });
                 throw new CustomError('Waktu lelang telah habis.', 400);
            }

            // Cek jika penawar adalah orang yang sama (tidak boleh bid berkali2)
            if (auction.highestBidderId && auction.highestBidderId.toString() === player._id.toString()) {
                throw new CustomError('Anda sudah memegang bid tertinggi saat ini.', 400);
            }

            // Cek jika penjual mencoba menawar barangnya sendiri
            if (auction.sellerId && auction.sellerId.toString() === player._id.toString()) {
                throw new CustomError('Anda tidak bisa menawar barang lelang sendiri.', 400);
            }

            const minBid = auction.highestBid > 0 ? auction.highestBid + 1 : auction.startingBid;
            if (bidAmount < minBid) {
                throw new CustomError(`Bid harus lebih besar dari tertinggi saat ini! Minimal bid: ${minBid} Silver.`, 400);
            }

            const { hasEnoughCurrency } = require('../../utils/currency');
            if (!hasEnoughCurrency(player.currency, bidAmount, 'silver')) {
                throw new CustomError(`Kekayaanmu tidak cukup. Total kekayaanmu setara dengan ${player.totalWealth} Silver.`, 400);
            }

            // Refund the previous highest bidder
            if (auction.highestBidderId) {
                // Using findOneAndUpdate to atomically increment the refunded player's silver
                const prevBidder = await Player.findOneAndUpdate(
                    { _id: auction.highestBidderId },
                    { $inc: { 'currency.silver': auction.highestBid } },
                    { new: true, session }
                );

                if (prevBidder) {
                    await TransactionLog.create([{
                        guildId: auction.guildId,
                        type: 'auction_refund',
                        description: `Refund bid lelang ${auction._id} sebesar ${auction.highestBid} Silver ke [${prevBidder.characterName}] karena dikalahkan.`,
                    }], { session });
                }
            }

            // Cut money from current player. We will use the object approach here since we might have to convert wealth
            const { payCurrency } = require('../../utils/currency');

            if (!payCurrency(player.currency, bidAmount, 'silver')) {
                 throw new CustomError(`Saldo tidak cukup meskipun total kekayaan setara ${player.totalWealth} Silver.`, 400);
            }
            await player.save({ session });

            auction.highestBid = bidAmount;
            auction.highestBidderId = player._id;
            await auction.save({ session });

            await TransactionLog.create([{
                guildId: auction.guildId,
                type: 'auction_bid',
                description: `[${player.characterName}] bid ${bidAmount} Silver pada lelang ${auctionId}.`,
            }], { session });
        });

        // (We can emit Socket event here to live reload web-dashboard if we use socket, or discord message logic)

        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: `Berhasil melakukan bid sebesar ${bidAmount} Silver.` });
        res.json({ success: true, message: `Berhasil melakukan bid sebesar ${bidAmount} Silver.` });
    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-MARKET] Bid error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat bid.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});


// POST /api/market/shop/sell-to-system
router.post('/shop/sell-to-system', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { itemId, quantity } = req.body;

    if (!itemId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Data tidak valid.' });
    }

    const lockKey = `player_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
        return res.status(429).json({ error: 'Sistem sedang sibuk. Coba lagi dalam beberapa saat.' });
    }

    try {
        const result = await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player) throw new CustomError('Player tidak ditemukan', 404);

            const inventoryItem = player.inventory.find(i => i.itemId.toString() === itemId);
            if (!inventoryItem) throw new CustomError('Kamu tidak memiliki item ini.', 400);
            if (inventoryItem.quantity < quantity) throw new CustomError('Jumlah item tidak mencukupi.', 400);

            const item = await Item.findById(itemId).session(session);
            if (!item) throw new CustomError('Item tidak ditemukan di database.', 404);
            if (!item.basePrice || item.basePrice <= 0) {
                throw new CustomError('Item ini tidak memiliki harga dasar dan tidak bisa dijual ke sistem.', 400);
            }

            const SELL_RATE = 0.2;
            const totalHarga = Math.floor(item.basePrice * quantity * SELL_RATE);
            const currencyType = item.priceCurrency || 'copper';

            // Deduct Item
            inventoryItem.quantity -= quantity;
            if (inventoryItem.quantity <= 0) {
                player.inventory = player.inventory.filter(i => i.itemId.toString() !== itemId);
            }

            // Add Currency
            player.currency[currencyType] += totalHarga;
            await player.save({ session });

            await new TransactionLog({
                guildId: player.guildId,
                type: 'sell_to_system',
                fromUserId: userId,
                currency: currencyType,
                amount: totalHarga,
                itemDescription: `${quantity}x ${item.name} (item) dijual ke sistem melalui web`,
                balanceAfter: player.currency
            }).save({ session });

            return {
                currency: currencyType,
                amount: totalHarga,
                itemName: item.name,
                soldQuantity: quantity
            };
        });

        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: `Berhasil menjual ${result.soldQuantity}x ${result.itemName}.` });
        res.json({ success: true, data: result, message: `Berhasil menjual ${result.soldQuantity}x ${result.itemName} seharga ${result.amount} ${result.currency}` });
    } catch (err) {
        console.error('Error sell to system via web:', err);
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message || 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// 4. POST /api/market/shop/buy
router.post('/shop/buy', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { shopId, quantity } = req.body;

    if (!shopId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Data tidak valid.' });
    }

    const lockKey = `market_shop_buy_${shopId}_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Transaksi sedang diproses. Mohon tunggu." });
    try {
        await withTransaction(async (session) => {
            const shopItem = await Shop.findById(shopId).session(session);
            if (!shopItem || !shopItem.isActive) throw new CustomError('Barang tidak ditemukan di toko.', 404);
            if (shopItem.stock !== -1 && shopItem.stock < quantity) {
                throw new CustomError('Stok barang tidak mencukupi.', 400);
            }

            const totalPrice = shopItem.price * quantity;
            const currencyType = shopItem.priceCurrency;

            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

            const { payCurrency } = require('../../utils/currency');
            if (!payCurrency(player.currency, totalPrice, currencyType)) {
                 throw new CustomError(`Uang tidak cukup. Butuh setara dengan ${totalPrice} ${currencyType}.`, 400);
            }

            await player.save({ session });

            // Deduct stock if not unlimited
            if (shopItem.stock !== -1) {
                shopItem.stock -= quantity;
                await shopItem.save({ session });
            }

            // Add to player inventory
            if (shopItem.category === 'item') {
                const existingItem = player.inventory.find(i => i.itemId.equals(shopItem.refId));
                if (existingItem) existingItem.quantity += quantity;
                else player.inventory.push({ itemId: shopItem.refId, quantity: quantity });
            } else if (shopItem.category === 'asset') {
                const existingAsset = player.assets.find(a => a.assetId.equals(shopItem.refId));
                if (existingAsset) existingAsset.quantity += quantity;
                else player.assets.push({ assetId: shopItem.refId, quantity: quantity });
            } // Pets simplified out for now

            await player.save({ session });
        });

        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: `Berhasil membeli ${quantity} barang.` });
        res.json({ success: true, message: `Berhasil membeli ${quantity} barang.` });
    } catch (error) {
        if (error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-MARKET] Buy error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat membeli.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// 5. GET /api/market/player-shop
router.get('/player-shop', authenticateToken, async (req, res) => {
    try {
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);

        const PlayerListing = require('../../models/PlayerListing');

        // Populate refId sesuai dengan refModel
        const listings = await PlayerListing.find({ guildId, status: 'active' }).populate('itemId').lean();

        const formattedListings = listings.map(listing => {
            return {
                id: listing._id,
                name: listing.itemId ? listing.itemId.name : listing.itemName,
                sellerId: listing.sellerId,
                sellerName: listing.sellerName,
                price: listing.pricePerUnit,
                currency: listing.currency,
                emoji: getEmojiForShopItem(listing.itemId ? listing.itemId.category : null, listing.type),
                quantity: listing.quantity,
                type: listing.type,
                rank: listing.itemId ? listing.itemId.rank : 'Common'
            };
        });

        res.json({ success: true, data: formattedListings });
    } catch (error) {
        console.error('[API-MARKET] Error fetching player shop:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// 6. POST /api/market/player-shop/buy
router.post('/player-shop/buy', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { listingId, quantity } = req.body;

    if (!listingId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Data tidak valid.' });
    }

    const lockKey = `market_playershop_${listingId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Transaksi sedang diproses. Mohon tunggu." });
    try {
        await withTransaction(async (session) => {
            const PlayerListing = require('../../models/PlayerListing');
            const TransactionLog = require('../../models/TransactionLog');
            const listing = await PlayerListing.findById(listingId).session(session);

            if (!listing || listing.status !== 'active') throw new CustomError('Barang tidak ditemukan atau sudah terjual.', 404);
            if (listing.quantity < quantity) {
                throw new CustomError('Kuantitas barang yang diminta melebihi stok yang ada.', 400);
            }

            if (listing.sellerId === userId) {
                throw new CustomError('Kamu tidak bisa membeli barangmu sendiri.', 400);
            }

            const totalPrice = listing.pricePerUnit * quantity;
            const currencyType = listing.currency;

            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

            const { payCurrency } = require('../../utils/currency');
            if (!payCurrency(player.currency, totalPrice, currencyType)) {
                 throw new CustomError(`Uang tidak cukup. Butuh setara dengan ${totalPrice} ${currencyType}.`, 400);
            }
            await player.save({ session });

            // Add money to seller atomically
            const addQuery = {};
            addQuery[`currency.${currencyType}`] = totalPrice;
            const seller = await Player.findOneAndUpdate(
                { discordId: listing.sellerId },
                { $inc: addQuery },
                { new: true, session }
            );

            if (!seller) throw new CustomError('Penjual tidak ditemukan (mungkin sudah dihapus).', 404);

            // Proses Pindah Barang
            if (listing.type === 'item') {
                const existingItem = player.inventory.find(i => i.itemId.equals(listing.itemId));
                if (existingItem) existingItem.quantity += quantity;
                else player.inventory.push({ itemId: listing.itemId, quantity: quantity });
            } else if (listing.type === 'asset') {
                const existingAsset = player.assets.find(a => a.assetId.equals(listing.refId));
                if (existingAsset) existingAsset.quantity += quantity;
                else player.assets.push({ assetId: listing.refId, quantity: quantity });
            } else if (listing.type === 'pet') {
                const Pet = require('../../models/Pet');
                const petDoc = await Pet.findById(listing.refId).session(session);
                if(petDoc) {
                    for (let i = 0; i < quantity; i++) {
                        player.pets.push({
                            instanceId: `PET_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
                            petId: petDoc._id,
                        });
                    }
                }
            }

            // Update Stok
            listing.quantity -= quantity;
            if (listing.quantity <= 0) {
                listing.status = 'sold';
                listing.buyerId = userId;
            }

            await listing.save({ session });
            await player.save({ session });
            // seller sudah disave lewat findOneAndUpdate

            await TransactionLog.create([{
                guildId: listing.guildId,
                type: 'player_listing_sale',
                description: `[${player.characterName}] membeli ${quantity}x ${listing.itemName} dari [${seller.characterName}] seharga ${totalPrice} ${currencyType}.`,
            }], { session });
        });

        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: `Berhasil membeli ${quantity} barang.` });
        res.json({ success: true, message: `Berhasil membeli ${quantity} barang.` });
    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-MARKET] Player Shop Buy error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat membeli.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// 7. GET /api/market/player-shop/my-listings
router.get('/player-shop/my-listings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const PlayerListing = require('../../models/PlayerListing');

        // Populate refId sesuai dengan refModel
        const listings = await PlayerListing.find({ guildId, sellerId: userId, status: 'active' }).populate('itemId').lean();

        const formattedListings = listings.map(listing => {
            return {
                id: listing._id,
                kodeListing: listing._id.toString().slice(-6).toUpperCase(),
                name: listing.itemId ? listing.itemId.name : listing.itemName,
                price: listing.pricePerUnit,
                currency: listing.currency,
                emoji: getEmojiForShopItem(listing.itemId ? listing.itemId.category : null, listing.type),
                quantity: listing.quantity,
                type: listing.type,
                rank: listing.itemId ? listing.itemId.rank : 'Common'
            };
        });

        res.json({ success: true, data: formattedListings });
    } catch (error) {
        console.error('[API-MARKET] Error fetching my listings:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// 8. POST /api/market/player-shop/my-listings/cancel
router.post('/player-shop/my-listings/cancel', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { listingId } = req.body;

    if (!listingId) {
        return res.status(400).json({ error: 'Data tidak valid.' });
    }

    const lockKey = `market_playershop_${listingId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Transaksi sedang diproses. Mohon tunggu." });
    try {
        let successMessage = '';
        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

            const PlayerListing = require('../../models/PlayerListing');
            const TransactionLog = require('../../models/TransactionLog');
            const target = await PlayerListing.findById(listingId).session(session);

            if (!target) throw new CustomError('Listing tidak ditemukan.', 404);
            if (target.sellerId !== userId) throw new CustomError('Ini bukan listing milikmu.', 403);
            if (target.status !== 'active') throw new CustomError(`Listing sudah dalam status ${target.status}.`, 400);

            // Kembalikan barang ke inventory
            const targetId = target.refId || target.itemId;

            if (target.type === 'item') {
                if (!targetId) throw new CustomError('Data listing tidak memiliki ID item/ref.', 400);
                const owned = player.inventory.find((i) => i.itemId && i.itemId.equals(targetId));
                if (owned) owned.quantity += target.quantity;
                else player.inventory.push({ itemId: targetId, quantity: target.quantity });
            } else if (target.type === 'asset') {
                if (!targetId) throw new CustomError('Data listing tidak memiliki ID asset/ref.', 400);
                const owned = player.assets.find((a) => a.assetId && a.assetId.equals(targetId));
                if (owned) owned.quantity += target.quantity;
                else player.assets.push({ assetId: targetId, quantity: target.quantity });
            } else if (target.type === 'pet') {
                if (!targetId) throw new CustomError('Data listing tidak memiliki ID pet/ref.', 400);
                const Pet = require('../../models/Pet');
                const petDoc = await Pet.findById(targetId).session(session);
                if (petDoc) {
                    for (let i = 0; i < target.quantity; i++) {
                        player.pets.push({
                            instanceId: `PET_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
                            petId: petDoc._id,
                        });
                    }
                }
            }

            await player.save({ session });

            target.status = 'cancelled';
            await target.save({ session });

            await TransactionLog.create([{
                guildId: target.guildId,
                type: 'player_listing_cancel',
                description: `[${player.characterName}] membatalkan listing ${target.quantity}x ${target.itemName}.`,
            }], { session });

            successMessage = `Listing berhasil dibatalkan. ${target.quantity}x ${target.itemName} dikembalikan.`;
        });

        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: successMessage });
        res.json({ success: true, message: successMessage });
    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-MARKET] Player Shop Cancel error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat membatalkan listing.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});


// POST /api/market/player-shop/my-listings/sell
router.post('/player-shop/my-listings/sell', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { itemId, quantity, pricePerUnit, currency } = req.body;

    if (!itemId || !quantity || quantity <= 0 || !pricePerUnit || pricePerUnit <= 0 || !currency) {
        return res.status(400).json({ error: 'Data tidak valid.' });
    }

    const lockKey = `market_playershop_sell_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Transaksi sedang diproses. Mohon tunggu." });
    try {
        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

            const PlayerListing = require('../../models/PlayerListing');
            const Item = require('../../models/Item');
            const TransactionLog = require('../../models/TransactionLog');

            const MAX_LISTING_PER_PLAYER = 10;
            const activeCount = await PlayerListing.countDocuments({ guildId: player.guildId, sellerId: userId, status: 'active' }).session(session);

            if (activeCount >= MAX_LISTING_PER_PLAYER) {
                throw new CustomError(`Kamu sudah punya ${activeCount} listing aktif (maksimal ${MAX_LISTING_PER_PLAYER}).`, 400);
            }

            const owned = player.inventory.find(i => i.itemId.toString() === itemId);
            if (!owned || owned.quantity < quantity) {
                throw new CustomError('Item di inventory tidak cukup.', 400);
            }

            const item = await Item.findById(itemId).session(session);
            if (!item) throw new CustomError('Item tidak ditemukan.', 404);

            // Escrow item
            owned.quantity -= quantity;
            if (owned.quantity <= 0) {
                player.inventory = player.inventory.filter(i => i.itemId.toString() !== itemId);
            }

            await player.save({ session });

            const listing = await PlayerListing.create([{
                guildId: player.guildId,
                sellerId: userId,
                sellerName: player.characterName,
                type: 'item',
                itemId: item._id,
                refId: item._id,
                itemName: item.name,
                quantity: quantity,
                pricePerUnit: pricePerUnit,
                currency: currency,
            }], { session });

            await TransactionLog.create([{
                guildId: player.guildId,
                type: 'player_listing_create',
                description: `[${player.characterName}] menjual ${quantity}x ${item.name} @ ${pricePerUnit} ${currency}`,
            }], { session });
        });

        res.json({ success: true, message: 'Berhasil menambahkan item ke Toko Player.' });
    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-MARKET] Player Shop Sell error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat menjual item.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});


module.exports = router;
