const mongoose = require('mongoose');

const npcPlayerRelationSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  npcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Npc', required: true, index: true },
  affinity: { type: Number, default: 0, min: -100, max: 100 },
  interactionCountDaily: {
    chat: { type: Number, default: 0 },
    gift: { type: Number, default: 0 },
    spar: { type: Number, default: 0 },
    date: { type: String, default: () => new Date().toISOString().slice(0, 10) }
  },
  history: [{
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    delta: { type: Number, default: 0 },
    note: { type: String, default: '' }
  }],
  specialStatus: {
    isDaoCompanion: { type: Boolean, default: false },
    isMaster: { type: Boolean, default: false },
    isApprentice: { type: Boolean, default: false },
    isSwornSibling: { type: Boolean, default: false }
  }
}, { timestamps: true });

npcPlayerRelationSchema.index({ playerId: 1, npcId: 1 }, { unique: true });

module.exports = mongoose.model('NpcPlayerRelation', npcPlayerRelationSchema);
