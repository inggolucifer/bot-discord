const mongoose = require('mongoose');

const npcEventSchema = new mongoose.Schema({
  npcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Npc', required: true, index: true },
  eventType: {
    type: String,
    required: true,
    enum: [
      'breakthrough', 'spar', 'duel', 'death', 'vendetta_declared',
      'gift_received', 'marriage', 'divorce', 'promotion', 'migration', 'birth'
    ]
  },
  description: { type: String, required: true },
  relatedEntityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  relatedEntityType: { type: String, enum: ['player', 'npc', 'sect', null], default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

npcEventSchema.index({ npcId: 1, timestamp: -1 });

module.exports = mongoose.models.NpcEvent || mongoose.model('NpcEvent', npcEventSchema);
