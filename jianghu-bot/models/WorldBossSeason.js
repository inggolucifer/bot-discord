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
