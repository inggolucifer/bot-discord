const mongoose = require('mongoose');

const arenaSeasonConfigSchema = new mongoose.Schema({
  seasonNumber: { type: Number, default: 1 },
  currentMonthKey: { type: String, default: () => new Date().toISOString().slice(0, 7) }, // Format: YYYY-MM
  nextSettlementAt: { type: Date, required: true },
  rewardTiers: [{
    tierId: { type: String, required: true },
    label: { type: String, required: true },
    minRank: { type: Number, required: true },
    maxRank: { type: Number, required: true },
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    spiritStones: { type: Number, default: 0 },
    meritTokens: { type: Number, default: 0 },
    items: [{
      itemId: String,
      name: String,
      quantity: Number
    }]
  }],
  lastSettlementHistory: [{
    monthKey: String,
    settledAt: { type: Date, default: Date.now },
    topRankers: [{
      rank: Number,
      characterName: String,
      discordId: String,
      sect: String,
      realm: String
    }]
  }]
}, { timestamps: true });

module.exports = mongoose.model('ArenaSeasonConfig', arenaSeasonConfigSchema);
