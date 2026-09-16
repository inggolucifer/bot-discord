const mongoose = require('mongoose');

const expeditionSessionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  zoneId: { type: String, required: true },
  leaderDiscordId: { type: String, required: true, index: true },
  dangerTier: { type: Number, required: true, default: 2 },
  minRealmIndex: { type: Number, required: true, default: 1 },
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  staminaCostMultiplier: { type: Number, default: 1.5 },
  status: { 
    type: String, 
    enum: ['active', 'cleared', 'escaped', 'timed_out'], 
    default: 'active' 
  },
  collectedLoot: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    itemName: { type: String, required: true },
    quantity: { type: Number, default: 1 }
  }]
}, { timestamps: true });

module.exports = mongoose.model('ExpeditionSession', expeditionSessionSchema);
