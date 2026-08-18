const mongoose = require('mongoose');
const { RANKS } = require('./Item');

const CURRENCY_ENUM = ['silver', 'gold', 'jade', 'spirit'];

const petSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  rank: { type: String, enum: RANKS, default: 'Common' },
  tier: { type: Number, min: 1, max: 9, default: 1 },
  description: { type: String, default: '-' },
  imageUrl: { type: String, default: null },
  effect: { type: String, default: null },
  origin: { type: String, default: null },

  basePrice: { type: Number, default: 0, min: 0 },
  priceCurrency: { type: String, enum: CURRENCY_ENUM, default: 'silver' },

  createdBy: { type: String, default: null },
}, { timestamps: true });

petSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Pet', petSchema);
