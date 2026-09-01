const mongoose = require('mongoose');
const CURRENCY_ENUM = ['copper', 'silver', 'gold', 'jade', 'spirit'];

const statBonusSchema = new mongoose.Schema({
  hp: { type: Number, default: 0 },
  atk: { type: Number, default: 0 },
  def: { type: Number, default: 0 },
  spd: { type: Number, default: 0 }
}, { _id: false });

const manualSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '-' },

  maxLevel: { type: Number, default: 10 },

  // Base duration required to comprehend 1 level (in hours)
  timeToComprehendHours: { type: Number, default: 20 },

  // Currency cost to upgrade 1 level
  baseCost: { type: Number, default: 5 },
  costCurrency: { type: String, enum: CURRENCY_ENUM, default: 'gold' },

  // Flat stat bonuses granted PER LEVEL
  flatBonusPerLevel: { type: statBonusSchema, default: () => ({}) },

  // Multiplier stat bonuses granted PER LEVEL (e.g. 0.05 for +5% per level)
  multiplierBonusPerLevel: { type: statBonusSchema, default: () => ({}) },

  // Unique skill effects
  effectType: { type: String, enum: ['damage', 'lifesteal', 'stun', 'poison'], default: 'damage' },
  effectValue: { type: Number, default: 1.2 },

  createdBy: { type: String, default: null }
}, { timestamps: true });

manualSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Manual', manualSchema);
