const mongoose = require('mongoose');

const statBonusSchema = new mongoose.Schema({
  hp: { type: Number, default: 0 },
  atk: { type: Number, default: 0 },
  def: { type: Number, default: 0 },
  spd: { type: Number, default: 0 }
}, { _id: false });

const lawSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  element: { type: String, default: 'Netral' },
  description: { type: String, default: '-' },

  // Flat stat bonuses granted by understanding this Law
  flatBonus: { type: statBonusSchema, default: () => ({}) },

  // Multiplier stat bonuses granted (e.g. 0.1 for +10%)
  multiplierBonus: { type: statBonusSchema, default: () => ({}) },

  createdBy: { type: String, default: null }
}, { timestamps: true });

lawSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Law', lawSchema);
