const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },

  // Siapa yang menjual. Kalau null, artinya dari Sistem/Admin.
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null, index: true },

  // Barang yang dijual
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, required: true, min: 1 },

  // Info Bid
  startingBid: { type: Number, required: true, min: 0 }, // Menggunakan nilai dasar normalized (silver)
  highestBid: { type: Number, default: 0 },
  highestBidderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },

  // Waktu
  expiresAt: { type: Date, required: true, index: true },

  // Status Lelang
  status: {
    type: String,
    enum: ['pending', 'active', 'finished', 'cancelled', 'rejected'],
    default: 'pending'
  },

  // Discord Message ID di Auction Channel agar bisa di-update/edit
  messageId: { type: String, default: null },

  // Pajak (biasanya 10%)
  taxRate: { type: Number, default: 0.1 },

}, { timestamps: true });

module.exports = mongoose.model('Auction', auctionSchema);
