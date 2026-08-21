const mongoose = require('mongoose');
const { RANKS } = require('./Item');

const CURRENCY_ENUM = ['silver', 'gold', 'jade', 'spirit'];
const ELEMENTS = ['Api', 'Air', 'Tanah', 'Angin', 'Petir', 'Cahaya', 'Kegelapan', 'Netral'];

const petSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  rank: { type: String, enum: RANKS, default: 'Common' },
  tier: { type: Number, min: 1, max: 9, default: 1 },
  description: { type: String, default: '-' },
  imageUrl: { type: String, default: null },
  effect: { type: String, default: null },
  origin: { type: String, default: null },

  // Base Stats RPG
  baseHp: { type: Number, default: 50 },
  baseAtk: { type: Number, default: 10 },
  baseDef: { type: Number, default: 5 },
  baseSpd: { type: Number, default: 8 },
  maxLevel: { type: Number, default: 100 },
  element: { type: String, enum: ELEMENTS, default: 'Netral' },
  growthRate: { type: Number, default: 1.0 },

  basePrice: { type: Number, default: 0, min: 0 },
  priceCurrency: { type: String, enum: CURRENCY_ENUM, default: 'silver' },

  createdBy: { type: String, default: null },
}, { timestamps: true });

petSchema.index({ guildId: 1, name: 1 }, { unique: true });

const PetModel = mongoose.model('Pet', petSchema);
PetModel.ELEMENTS = ELEMENTS;
module.exports = PetModel;
