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
                refId: shop.refId
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
                quantity: auction.quantity
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

    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const auction = await Auction.findById(auctionId).populate('itemId');
        if (!auction) return res.status(404).json({ error: 'Lelang tidak ditemukan.' });

        if (auction.status !== 'active') {
            return res.status(400).json({ error: 'Lelang ini sudah tidak aktif.' });
        }

        if (new Date() > auction.expiresAt) {
             auction.status = 'pending'; // Should be handled by cron but just in case
             await auction.save();
             return res.status(400).json({ error: 'Waktu lelang telah habis.' });
        }

        // Cek jika penawar adalah orang yang sama (tidak boleh bid berkali2)
        if (auction.highestBidderId && auction.highestBidderId.toString() === player._id.toString()) {
            return res.status(400).json({ error: 'Anda sudah memegang bid tertinggi saat ini.' });
        }

        // Cek jika penjual mencoba menawar barangnya sendiri
        if (auction.sellerId && auction.sellerId.toString() === player._id.toString()) {
            return res.status(400).json({ error: 'Anda tidak bisa menawar barang lelang sendiri.' });
        }

        const minBid = auction.highestBid > 0 ? auction.highestBid + 1 : auction.startingBid;
        if (bidAmount < minBid) {
            return res.status(400).json({ error: `Bid harus lebih besar dari tertinggi saat ini! Minimal bid: ${minBid} Silver.` });
        }

        if (player.totalWealth < bidAmount) {
            return res.status(400).json({ error: `Kekayaanmu tidak cukup. Total kekayaanmu setara dengan ${player.totalWealth} Silver.` });
        }

        // Refund the previous highest bidder
        if (auction.highestBidderId) {
            const prevBidder = await Player.findById(auction.highestBidderId);
            if (prevBidder) {
                prevBidder.currency.silver += auction.highestBid;
                await prevBidder.save();

                await TransactionLog.create({
                    guildId: auction.guildId,
                    type: 'LELANG_REFUND',
                    description: `Refund bid lelang ${auction._id} sebesar ${auction.highestBid} Silver ke [${prevBidder.characterName}] karena dikalahkan.`,
                });
            }
        }

        // Cut money from current player
        let remainingToPay = bidAmount;
        if (player.currency.silver >= remainingToPay) {
            player.currency.silver -= remainingToPay;
        } else {
            let total = (player.currency.silver || 0) +
                        (player.currency.gold || 0) * 100 +
                        (player.currency.jade || 0) * 10000 +
                        (player.currency.spirit || 0) * 1000000;

            total -= remainingToPay;

            player.currency.spirit = Math.floor(total / 1000000);
            total %= 1000000;
            player.currency.jade = Math.floor(total / 10000);
            total %= 10000;
            player.currency.gold = Math.floor(total / 100);
            player.currency.silver = total % 100;
        }
        await player.save();

        auction.highestBid = bidAmount;
        auction.highestBidderId = player._id;
        await auction.save();

        await TransactionLog.create({
            guildId: auction.guildId,
            type: 'LELANG_BID',
            description: `[${player.characterName}] bid ${bidAmount} Silver pada lelang ${auctionId}.`,
        });

        // (We can emit Socket event here to live reload web-dashboard if we use socket, or discord message logic)

        res.json({ success: true, message: `Berhasil melakukan bid sebesar ${bidAmount} Silver.` });
    } catch (error) {
        console.error('[API-MARKET] Bid error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat bid.' });
    } finally {
        releaseLock();
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
    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const shopItem = await Shop.findById(shopId);
        if (!shopItem || !shopItem.isActive) return res.status(404).json({ error: 'Barang tidak ditemukan di toko.' });
        if (shopItem.stock !== -1 && shopItem.stock < quantity) {
            return res.status(400).json({ error: 'Stok barang tidak mencukupi.' });
        }

        const totalPrice = shopItem.price * quantity;
        const currencyType = shopItem.priceCurrency;

        if (player.currency[currencyType] < totalPrice) {
            // Note: Simplification for exact currency match instead of calculating totalWealth.
            // Better matching should deduct total wealth properly or require exact currency match.
            return res.status(400).json({ error: `Uang ${currencyType} tidak cukup. Butuh ${totalPrice}.` });
        }

        player.currency[currencyType] -= totalPrice;

        if (shopItem.stock !== -1) {
            shopItem.stock -= quantity;
            await shopItem.save();
        }

        if (shopItem.category === 'item') {
            const existingItem = player.inventory.find(i => i.itemId.equals(shopItem.refId));
            if (existingItem) existingItem.quantity += quantity;
            else player.inventory.push({ itemId: shopItem.refId, quantity: quantity });
        } else if (shopItem.category === 'asset') {
            const existingAsset = player.assets.find(a => a.assetId.equals(shopItem.refId));
            if (existingAsset) existingAsset.quantity += quantity;
            else player.assets.push({ assetId: shopItem.refId, quantity: quantity });
        } // Pets simplified out for now

        await player.save();

        res.json({ success: true, message: `Berhasil membeli ${quantity} barang.` });
    } catch (error) {
        console.error('[API-MARKET] Buy error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat membeli.' });
    } finally {
        releaseLock();
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
                type: listing.type
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
    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const PlayerListing = require('../../models/PlayerListing');
        const TransactionLog = require('../../models/TransactionLog');
        const listing = await PlayerListing.findById(listingId);

        if (!listing || listing.status !== 'active') return res.status(404).json({ error: 'Barang tidak ditemukan atau sudah terjual.' });
        if (listing.quantity < quantity) {
            return res.status(400).json({ error: 'Kuantitas barang yang diminta melebihi stok yang ada.' });
        }

        if (listing.sellerId === userId) {
            return res.status(400).json({ error: 'Kamu tidak bisa membeli barangmu sendiri.' });
        }

        const totalPrice = listing.pricePerUnit * quantity;
        const currencyType = listing.currency;

        if (player.currency[currencyType] < totalPrice) {
            return res.status(400).json({ error: `Uang ${currencyType} tidak cukup. Butuh ${totalPrice}.` });
        }

        const seller = await Player.findOne({ discordId: listing.sellerId });
        if (!seller) return res.status(404).json({ error: 'Penjual tidak ditemukan.' });

        // Proses Pemotongan dan Penambahan Uang
        player.currency[currencyType] -= totalPrice;
        seller.currency[currencyType] += totalPrice;

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
            const petDoc = await Pet.findById(listing.refId);
            if(petDoc) {
                 player.pets.push({
                     instanceId: `PET_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
                     petId: petDoc._id,
                 })
            }
        }

        // Update Stok
        listing.quantity -= quantity;
        if (listing.quantity <= 0) {
            listing.status = 'sold';
            listing.buyerId = userId;
        }
        await listing.save();
        await player.save();
        await seller.save();

        await TransactionLog.create({
            guildId: listing.guildId,
            type: 'MARKET_PLAYER_BUY',
            description: `[${player.characterName}] membeli ${quantity}x ${listing.itemName} dari [${seller.characterName}] seharga ${totalPrice} ${currencyType}.`,
        });

        res.json({ success: true, message: `Berhasil membeli ${quantity} barang.` });
    } catch (error) {
        console.error('[API-MARKET] Player Shop Buy error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat membeli.' });
    } finally {
        releaseLock();
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
                type: listing.type
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
    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const PlayerListing = require('../../models/PlayerListing');
        const TransactionLog = require('../../models/TransactionLog');
        const target = await PlayerListing.findById(listingId);

        if (!target) return res.status(404).json({ error: 'Listing tidak ditemukan.' });
        if (target.sellerId !== userId) return res.status(403).json({ error: 'Ini bukan listing milikmu.' });
        if (target.status !== 'active') return res.status(400).json({ error: `Listing sudah dalam status ${target.status}.` });

        // Kembalikan barang ke inventory
        if (target.type === 'item') {
            const owned = player.inventory.find((i) => i.itemId.equals(target.itemId));
            if (owned) owned.quantity += target.quantity;
            else player.inventory.push({ itemId: target.itemId, quantity: target.quantity });
        } else if (target.type === 'asset') {
            const owned = player.assets.find((a) => a.assetId.equals(target.refId));
            if (owned) owned.quantity += target.quantity;
            else player.assets.push({ assetId: target.refId, quantity: target.quantity });
        } else if (target.type === 'pet') {
            const Pet = require('../../models/Pet');
            const petDoc = await Pet.findById(target.refId);
            if (petDoc) {
                for (let i = 0; i < target.quantity; i++) {
                    player.pets.push({
                        instanceId: `PET_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
                        petId: petDoc._id,
                    });
                }
            }
        }

        await player.save();

        target.status = 'cancelled';
        await target.save();

        await TransactionLog.create({
            guildId: target.guildId,
            type: 'MARKET_PLAYER_CANCEL',
            description: `[${player.characterName}] membatalkan listing ${target.quantity}x ${target.itemName}.`,
        });

        res.json({ success: true, message: `Listing berhasil dibatalkan. ${target.quantity}x ${target.itemName} dikembalikan.` });
    } catch (error) {
        console.error('[API-MARKET] Player Shop Cancel error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat membatalkan listing.' });
    } finally {
        releaseLock();
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
    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const PlayerListing = require('../../models/PlayerListing');
        const Item = require('../../models/Item');
        const TransactionLog = require('../../models/TransactionLog');

        const MAX_LISTING_PER_PLAYER = 10;
        const activeCount = await PlayerListing.countDocuments({ guildId: player.guildId, sellerId: userId, status: 'active' });

        if (activeCount >= MAX_LISTING_PER_PLAYER) {
            return res.status(400).json({ error: `Kamu sudah punya ${activeCount} listing aktif (maksimal ${MAX_LISTING_PER_PLAYER}).` });
        }

        const owned = player.inventory.find(i => i.itemId.toString() === itemId);
        if (!owned || owned.quantity < quantity) {
            return res.status(400).json({ error: 'Item di inventory tidak cukup.' });
        }

        const item = await Item.findById(itemId);
        if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });

        // Escrow item
        owned.quantity -= quantity;
        if (owned.quantity <= 0) {
            player.inventory = player.inventory.filter(i => i.itemId.toString() !== itemId);
        }

        await player.save();

        const listing = await PlayerListing.create({
            guildId: player.guildId,
            sellerId: userId,
            sellerName: player.characterName,
            type: 'item',
            refId: item._id,
            itemName: item.name,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            currency: currency,
        });

        await TransactionLog.create({
            guildId: player.guildId,
            type: 'MARKET_PLAYER_SELL',
            description: `[${player.characterName}] menjual ${quantity}x ${item.name} @ ${pricePerUnit} ${currency}`,
        });

        res.json({ success: true, message: 'Berhasil menambahkan item ke Toko Player.' });
    } catch (error) {
        console.error('[API-MARKET] Player Shop Sell error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat menjual item.' });
    } finally {
        releaseLock();
    }
});

module.exports = router;
