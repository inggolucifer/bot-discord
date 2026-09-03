const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Auction = require('../../models/Auction');
const authenticateToken = require('../middleware/auth');
const LockManager = require('../utils/lockManager');
const mongoose = require('mongoose');

// Bid on an auction
router.post('/auctions/:id/bid', authenticateToken, async (req, res) => {
    const auctionId = req.params.id;
    const { bidAmount } = req.body;
    const userId = req.user.id;

    if (!bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
        return res.status(400).json({ message: 'Jumlah tawaran tidak valid.' });
    }

    const lockKey = `auction_${auctionId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ message: 'Sistem sedang sibuk memproses lelang, coba lagi.' });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const auction = await Auction.findById(auctionId).session(session);
        if (!auction) {
            return res.status(404).json({ message: 'Lelang tidak ditemukan.' });
        }

        if (auction.status !== 'active') {
             return res.status(400).json({ message: 'Lelang sudah ditutup atau tidak aktif.' });
        }

        if (new Date(auction.endTime) < new Date()) {
             return res.status(400).json({ message: 'Waktu lelang telah habis.' });
        }

        if (auction.sellerId === userId) {
            return res.status(400).json({ message: 'Kamu tidak bisa menawar barangmu sendiri.' });
        }

        if (bidAmount <= auction.currentBid) {
            return res.status(400).json({ message: 'Tawaran harus lebih tinggi dari penawaran saat ini.' });
        }

        const player = await Player.findOne({ discordId: userId }).session(session);
        // Using generic wealth check, assuming some unified currency or specifically checking the bid currency
        // Let's assume the bid is in a specific currency for the sake of simplicity, or total wealth.
        // Assuming gold for auctions or a specific currency.
        if (player.copper < bidAmount) {
             return res.status(400).json({ message: 'Uang tidak cukup.' });
        }

        // Deduct from current bidder and refund previous
        if (auction.highestBidderId) {
             const previousBidder = await Player.findOne({ discordId: auction.highestBidderId }).session(session);
             if (previousBidder) {
                 previousBidder.copper += auction.currentBid; // Refund
                 await previousBidder.save({ session });
             }
        }

        // Deduct from new bidder
        player.copper -= bidAmount;

        // Update auction
        auction.currentBid = bidAmount;
        auction.highestBidderId = userId;

        await player.save({ session });
        await auction.save({ session });
        await session.commitTransaction();

        const io = req.app.get('io');
        if (io) {
            io.emit('auction_updated', {
                auctionId: auction._id,
                currentBid: bidAmount,
                highestBidderId: userId
            });
        }

        return res.json({ message: 'Penawaran berhasil.' });
    } catch (err) {
        await session.abortTransaction();
        console.error('Error bidding:', err);
        return res.status(500).json({ message: 'Internal error' });
    } finally {
        session.endSession();
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
