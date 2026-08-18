// Sistem barter aman antar player, dengan timeout 5 menit
const mongoose = require('mongoose');

const barterOfferItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, default: 1 },
}, { _id: false });

const barterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  fromUserId: { type: String, required: true },
  toUserId: { type: String, required: true },

  offerItems: { type: [barterOfferItemSchema], default: [] },
  offerCurrency: {
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    jade: { type: Number, default: 0 },
    spirit: { type: Number, default: 0 },
  },

  requestItems: { type: [barterOfferItemSchema], default: [] },
  requestCurrency: {
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    jade: { type: Number, default: 0 },
    spirit: { type: Number, default: 0 },
  },

  status: { type: String, enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'], default: 'pending' },
  expiresAt: { type: Date, required: true },
  messageId: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Barter', barterSchema);
