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
        const guildId = req.user.guildId || req.user.userId; // fallback jika butuh guildId

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

module.exports = router;