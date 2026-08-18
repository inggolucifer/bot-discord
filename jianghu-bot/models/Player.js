// Data karakter player, terikat permanen ke discordId + guildId
const mongoose = require('mongoose');
const { normalizeCurrency } = require('../utils/currencyNormalize');

const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, default: 1 },
}, { _id: false });

const petOwnedSchema = new mongoose.Schema({
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  nickname: { type: String, default: null },
  quantity: { type: Number, default: 1 },
}, { _id: false });

const assetOwnedSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  quantity: { type: Number, default: 1 },
  lastClaimAt: { type: Date, default: null },
  constructionCompleteAt: { type: Date, default: null },
}, { _id: false });

const playerSchema = new mongoose.Schema({
  discordId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },

  characterName: { type: String, required: true },

  realm: { type: String, default: 'Mortal' },
  stage: { type: String, default: '-' },

  age: { type: Number, default: 16 },
  gender: { type: String, enum: ['Laki-laki', 'Perempuan', null], default: null },

  sect: { type: String, default: 'Tanpa Sekte (Rogue Cultivator)' },

  characterImage: { type: String, default: null },

  currency: {
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    jade: { type: Number, default: 0 },
    spirit: { type: Number, default: 0 },
  },

  inventory: { type: [inventoryItemSchema], default: [] },
  pets: { type: [petOwnedSchema], default: [] },
  assets: { type: [assetOwnedSchema], default: [] },

  status: {
    type: String,
    enum: ['active', 'frozen', 'dead'],
    default: 'active',
  },

  lastDailyClaim: { type: Date, default: null },
  registeredAt: { type: Date, default: Date.now },

  totalWealth: { type: Number, default: 0, index: true },
}, { timestamps: true });

playerSchema.index({ discordId: 1, guildId: 1 }, { unique: true });

// Setiap kali player disimpan: (1) currency dinormalisasi otomatis (100 Silver->1 Gold, dst),
// (2) totalWealth dihitung ulang dari currency yang SUDAH dinormalisasi.
playerSchema.pre('save', function (next) {
  normalizeCurrency(this.currency);
  const c = this.currency || {};
  this.totalWealth = (c.silver || 0) + (c.gold || 0) * 100 + (c.jade || 0) * 10000 + (c.spirit || 0) * 1000000;
  next();
});

module.exports = mongoose.model('Player', playerSchema);

