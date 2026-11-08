const mongoose = require('mongoose');

const npcAmbushSchema = new mongoose.Schema({
  hunterNpcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Npc', required: true, index: true },
  targetPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  status: {
    type: String,
    enum: ['stalking', 'triggered', 'resolved', 'escaped'],
    default: 'stalking',
    index: true
  },
  tileX: { type: Number, required: true },
  tileY: { type: Number, required: true },
  battleSessionId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 3600 * 1000) }
}, { timestamps: true });

npcAmbushSchema.index({ targetPlayerId: 1, status: 1 });
npcAmbushSchema.index({ tileX: 1, tileY: 1, status: 1 });

module.exports = mongoose.models.NpcAmbush || mongoose.model('NpcAmbush', npcAmbushSchema);
