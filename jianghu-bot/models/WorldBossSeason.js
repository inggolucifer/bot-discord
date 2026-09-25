const mongoose = require('mongoose');

const worldBossSeasonSchema = new mongoose.Schema({
  seasonNumber: { type: Number, required: true, unique: true },
  bossId: { type: String, required: true, default: 'boss_flame_kirin' },
  bossName: { type: String, required: true, default: 'Raja Qilin Api Purba' },
  maxHp: { type: Number, required: true, default: 400000000 },
  currentHp: { type: Number, required: true, default: 400000000 },
  phase: { type: Number, default: 1, min: 1, max: 3 },
  status: { type: String, enum: ['scheduled', 'active', 'defeated', 'concluded'], default: 'active' },
  windowStart: { type: Date, required: true },
  windowEnd: { type: Date, required: true },
  dailyAttemptsLimit: { type: Number, default: 3 },
  dailyAttempts: [{
    discordId: { type: String, required: true },
    dateStr: { type: String, required: true },
    attemptsUsed: { type: Number, default: 0 }
  }],
  bossImageUrl: { type: String, default: null },
  bossStats: {
    hp: { type: Number, default: 400000000 },
    atk: { type: Number, default: 120 },
    def: { type: Number, default: 60 },
    spd: { type: Number, default: 25 }
  },
  rewardTiers: [{
    tierId: { type: String, required: true },
    label: { type: String, required: true },
    minRank: { type: Number, required: true },
    maxRank: { type: Number, required: true },
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    spiritStones: { type: Number, default: 0 },
    exp: { type: Number, default: 0 },
    items: [{
      itemId: String,
      name: String,
      quantity: Number
    }]
  }],
  contributions: [{
    discordId: { type: String, required: true, index: true },
    characterName: { type: String, required: true },
    sect: { type: String, default: 'Pengelana Bebas' },
    damage: { type: Number, default: 0 },
    attackCount: { type: Number, default: 0 },
    lastAttackedAt: { type: Date, default: Date.now },
    rewardsClaimed: { type: Boolean, default: false }
  }],
  rewardsDistributed: { type: Boolean, default: false }
}, { timestamps: true });

worldBossSeasonSchema.index({ status: 1, windowStart: 1, windowEnd: 1 });
module.exports = mongoose.model('WorldBossSeason', worldBossSeasonSchema);
