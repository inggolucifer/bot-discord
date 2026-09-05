const mongoose = require('mongoose');
const { normalizeCurrency } = require('../utils/currencyNormalize');

const sectAssetSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  quantity: { type: Number, default: 1 },
  lastClaimAt: { type: Date, default: null },
  constructionCompleteAt: { type: Date, default: null },
  isHalted: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'building', 'active'], default: 'active' },
  lastWarningSentAt: { type: Date, default: null },
  isDamaged: { type: Boolean, default: false },
  damageType: { type: String, enum: ['bandit', 'disaster', null], default: null },
  guardEndTime: { type: Date, default: null },
  toolDurabilityUsage: { type: Map, of: Number, default: {} },
}, { _id: false });

const sectResourceSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, default: 0 },
}, { _id: false });

const sectSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '-' },
  imageUrl: { type: String, default: null },

  leaderId: { type: String, default: null },
  viceLeaderId: { type: String, default: null },
  elderIds: { type: [String], default: [] },
  memberIds: { type: [String], default: [] },

  // Kekayaan sekte (dari donasi player + hasil lain di masa depan) -- TIDAK BISA diklaim balik ke pribadi.
  currency: {
    copper: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    jade: { type: Number, default: 0 },
    spirit: { type: Number, default: 0 },
  },
  totalWealth: { type: Number, default: 0, index: true }, // dipakai /sekte-leaderboard

  resources: { type: [sectResourceSchema], default: [] },
  assets: { type: [sectAssetSchema], default: [] },

  lastDisasterHitAt: { type: Date, default: null },
  lastBanditHitAt: { type: Date, default: null },

  createdBy: { type: String, required: true },
}, { timestamps: true });

sectSchema.index({ guildId: 1, name: 1 }, { unique: true });

sectSchema.pre('save', function (next) {
  normalizeCurrency(this.currency);
  const c = this.currency || {};
  this.totalWealth = ((c.copper || 0) / 100) + (c.silver || 0) + (c.gold || 0) * 100 + (c.jade || 0) * 10000 + (c.spirit || 0) * 1000000;
  next();
});

sectSchema.methods.getRoleOf = function (discordId) {
  if (this.leaderId === discordId) return 'Ketua';
  if (this.viceLeaderId === discordId) return 'Wakil Ketua';
  if (this.elderIds.includes(discordId)) return 'Tetua';
  if (this.memberIds.includes(discordId)) return 'Anggota';
  return null;
};

module.exports = mongoose.model('Sect', sectSchema);

