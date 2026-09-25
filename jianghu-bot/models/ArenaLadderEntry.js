const mongoose = require('mongoose');

const arenaLadderEntrySchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true, index: true },
  guildId: { type: String, required: true, index: true },
  characterName: { type: String, required: true },
  sect: { type: String, default: 'Pengelana Bebas' },
  realm: { type: String, default: 'Mortal' },
  realmIndex: { type: Number, default: 0 },
  rank: { type: Number, required: true, index: true }, // Posisi tangga peringkat: 1, 2, 3...
  peakRank: { type: Number, default: 9999 },
  avatar: { type: String, default: null },
  combatPower: { type: Number, default: 100 },
  statsSnapshot: {
    hp: { type: Number, default: 100 },
    atk: { type: Number, default: 20 },
    def: { type: Number, default: 10 },
    spd: { type: Number, default: 10 }
  },
  dailyChallengesUsed: { type: Number, default: 0 },
  lastChallengeDate: { type: String, default: '' }, // Format: YYYY-MM-DD
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  matchHistory: [{
    opponentDiscordId: String,
    opponentName: String,
    opponentRank: Number,
    isAttacker: { type: Boolean, default: true },
    outcome: { type: String, enum: ['win', 'loss'], required: true },
    rankBefore: Number,
    rankAfter: Number,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

arenaLadderEntrySchema.index({ guildId: 1, rank: 1 });

module.exports = mongoose.model('ArenaLadderEntry', arenaLadderEntrySchema);
