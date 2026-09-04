const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Auction = require('../../models/Auction');
const authenticateToken = require('../middleware/auth');
const LockManager = require('../utils/lockManager');
const { withTransaction } = require('../utils/dbTransaction');
const CustomError = require('../utils/customError');

router.post('/auctions/:id/bid', authenticateToken, async (req, res) => {
    const auctionId = req.params.id;
    const { bidAmount } = req.body;
    const userId = req.user.userId;

    if (!bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
        return res.status(400).json({ error: 'Jumlah tawaran tidak valid.' });
    }

    const lockKey = `auction_${auctionId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Sistem sedang sibuk memproses lelang, coba lagi.' });

    try {
        let msg = '';
        let bidResult = null;

        await withTransaction(async (session) => {
            const auction = await Auction.findById(auctionId).session(session);
            if (!auction) throw new CustomError('Lelang tidak ditemukan.', 404);

            if (auction.status !== 'active') throw new CustomError('Lelang sudah ditutup atau tidak aktif.', 400);
            if (new Date(auction.endTime) < new Date()) throw new CustomError('Waktu lelang telah habis.', 400);
            if (auction.sellerId === userId) throw new CustomError('Kamu tidak bisa menawar barangmu sendiri.', 400);
            if (bidAmount <= auction.currentBid) throw new CustomError('Tawaran harus lebih tinggi dari penawaran saat ini.', 400);

            const player = await Player.findOne({ discordId: userId }).session(session);
            if (player.currency[auction.currencyType] < bidAmount) {
                 throw new CustomError('Uang tidak cukup.', 400);
            }

            if (auction.highestBidderId) {
                 const previousBidder = await Player.findOne({ discordId: auction.highestBidderId }).session(session);
                 if (previousBidder) {
                     previousBidder.currency[auction.currencyType] += auction.currentBid; // Refund
                     previousBidder.markModified('currency');
                     await previousBidder.save({ session });
                 }
            }

            player.currency[auction.currencyType] -= bidAmount;

            auction.currentBid = bidAmount;
            auction.highestBidderId = userId;

            player.markModified('currency');
            await player.save({ session });
            await auction.save({ session });

            bidResult = {
                auctionId: auction._id,
                currentBid: bidAmount,
                highestBidderId: userId
            };

            msg = 'Penawaran berhasil.';
        });

        const io = req.app.get('io');
        if (io && bidResult) {
            io.emit('auction_updated', bidResult);
        }

        return res.json({ success: true, message: msg });
    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
        console.error('Error bidding:', err);
        return res.status(500).json({ error: 'Internal error' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
