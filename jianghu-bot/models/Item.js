const mongoose = require('mongoose');

// Rank diurutkan dari terendah ke tertinggi. Dipakai juga oleh Pet & Asset.
const RANKS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];
const CURRENCY_ENUM = ['silver', 'gold', 'jade', 'spirit'];

const itemSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  rank: { type: String, enum: RANKS, default: 'Common' },
  category: { type: String, enum: ['weapon', 'cloth', 'herb', 'pill', 'consume', 'material', 'artifact', 'accessories', 'none'], default: 'none' },
  tier: { type: Number, min: 1, max: 9, default: 1 },
  description: { type: String, default: '-' },
  imageUrl: { type: String, default: null },
  effect: { type: String, default: null },
  origin: { type: String, default: null },

  // Harga dasar, dipakai untuk jual-beli di shop DAN sebagai basis harga jual-balik (/jual) ke sistem (20% dari basePrice)
  basePrice: { type: Number, default: 0, min: 0 },
  priceCurrency: { type: String, enum: CURRENCY_ENUM, default: 'silver' },

  createdBy: { type: String, default: null },
}, { timestamps: true });

itemSchema.index({ guildId: 1, name: 1 }, { unique: true });

const ItemModel = mongoose.model('Item', itemSchema);
ItemModel.RANKS = RANKS;
module.exports = ItemModel;
