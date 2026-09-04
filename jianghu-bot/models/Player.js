// Data karakter player, terikat permanen ke discordId + guildId
const mongoose = require('mongoose');
const { normalizeCurrency } = require('../utils/currencyNormalize');


const playerManualSchema = new mongoose.Schema({
  manualId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manual', required: true },
  level: { type: Number, default: 0 }, // Level 0 means just learned, haven't finished first upgrade
  isComprehending: { type: Boolean, default: false },
  comprehendStartTime: { type: Date, default: null }
}, { _id: false });

const playerStatsSchema = new mongoose.Schema({
  baseHp: { type: Number, default: 100 },
  baseAtk: { type: Number, default: 15 },
  baseDef: { type: Number, default: 10 },
  baseSpd: { type: Number, default: 10 }
}, { _id: false });

const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, default: 1 },
}, { _id: false });

const petOwnedSchema = new mongoose.Schema({
  instanceId: { type: String, required: true }, // unique string
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  nickname: { type: String, default: null },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  hp: { type: Number, default: 50 },
  maxHp: { type: Number, default: 50 },
  atk: { type: Number, default: 10 },
  def: { type: Number, default: 5 },
  spd: { type: Number, default: 8 },
  hunger: { type: Number, default: 100 }, // 0-100
  element: { type: String, default: 'Netral' },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  lastFedAt: { type: Date, default: null },
  lastBattledAt: { type: Date, default: null },
  isLocked: { type: Boolean, default: false }, // true saat sedang battle
  affinity: { type: Number, default: 0 }, // max 100
  statMultipliers: {
    hp: { type: Number, default: 1.0 },
    atk: { type: Number, default: 1.0 },
    def: { type: Number, default: 1.0 },
    spd: { type: Number, default: 1.0 }
  }
}, { _id: false });

const assetOwnedSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  quantity: { type: Number, default: 1 },
  lastClaimAt: { type: Date, default: null },
  constructionCompleteAt: { type: Date, default: null },
  assignedWorkers: { type: [{ workerId: String, endTime: { type: Date, default: null } }], default: [] },
  progressAccumulated: { type: Number, default: 0 },
  lastProgressUpdate: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'building', 'active'], default: 'active' },
  isHalted: { type: Boolean, default: false },
  lastWarningSentAt: { type: Date, default: null },
  isDamaged: { type: Boolean, default: false },
  damageType: { type: String, enum: ['bandit', 'disaster', null], default: null },
  guardEndTime: { type: Date, default: null },
  toolDurabilityUsage: { type: Map, of: Number, default: {} },
}, { _id: false });

const playerSchema = new mongoose.Schema({
  discordId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },

  characterName: { type: String, required: true },

  realm: { type: String, default: 'Mortal' },
  stage: { type: String, default: '-' },

  systemCultivation: {
    realm: { type: String, default: 'Fondasi Fana (Mortal Foundation)' },
    stage: { type: Number, default: 0 }, // 1-9 untuk realm selain Mortal
    qi: { type: Number, default: 0 },
    lastSyncAt: { type: Date, default: Date.now }
  },

  age: { type: Number, default: 16 },
  gender: { type: String, enum: ['Laki-laki', 'Perempuan', null], default: null },


  stats: { type: playerStatsSchema, default: () => ({}) },
  laws: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Law' }], default: [] },
  manuals: { type: [playerManualSchema], default: [] },
  isNormalCultivator: { type: Boolean, default: false },

  sect: { type: String, default: 'Tanpa Sekte (Rogue Cultivator)' },

  characterImage: { type: String, default: null },

  currency: {
    copper: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    jade: { type: Number, default: 0 },
    spirit: { type: Number, default: 0 },
  },

  inventory: { type: [inventoryItemSchema], default: [] },
  petSlots: { type: Number, default: 2 },
  pets: {
    type: [petOwnedSchema],
    default: [],
    validate: {
      validator: function(v) { return v.length <= this.petSlots; },
      message: 'Melebihi maksimal pet slot'
    }
  },
  assetSlots: { type: Number, default: 1 },
  assets: {
    type: [assetOwnedSchema],
    default: [],
    validate: {
      validator: function(v) {
        const totalAssets = v.reduce((sum, asset) => sum + (asset.quantity || 1), 0);
        return totalAssets <= this.assetSlots;
      },
      message: 'Melebihi maksimal asset slot'
    }
  },

  customStatus: { type: String, default: null },

  status: {
    type: String,
    enum: ['active', 'frozen', 'dead'],
    default: 'active',
  },

  lastDailyClaim: { type: Date, default: null },
  dailyStreak: { type: Number, default: 0 },
  registeredAt: { type: Date, default: Date.now },

  hasCompletedTour: { type: Boolean, default: false },

  lastDisasterHitAt: { type: Date, default: null },
  lastBanditHitAt: { type: Date, default: null },

  totalWealth: { type: Number, default: 0, index: true },
}, { timestamps: true });

playerSchema.index({ discordId: 1, guildId: 1 }, { unique: true });
playerSchema.index({ guildId: 1, "pets.instanceId": 1 }); // Index untuk pencarian pet instance yang efisien

// Setiap kali player disimpan: (1) currency dinormalisasi otomatis (100 Silver->1 Gold, dst),
// (2) totalWealth dihitung ulang dari currency yang SUDAH dinormalisasi.
playerSchema.pre('save', function (next) {
  normalizeCurrency(this.currency);
  const c = this.currency || {};
  this.totalWealth = ((c.copper || 0) / 100) + (c.silver || 0) + (c.gold || 0) * 100 + (c.jade || 0) * 10000 + (c.spirit || 0) * 1000000;
  next();
});

module.exports = mongoose.model('Player', playerSchema);
