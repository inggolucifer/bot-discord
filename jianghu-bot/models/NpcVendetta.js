const mongoose = require('mongoose');

const npcVendettaSchema = new mongoose.Schema({
  hunterNpcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Npc', required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  targetType: { type: String, enum: ['player', 'npc'], default: 'player' },
  grudgeLevel: { type: Number, default: 5, min: 1, max: 5 },
  reason: { type: String, required: true },
  victimNpcName: { type: String, default: '' },
  victimRelation: { type: String, default: '' },
  lastAmbushAt: { type: Date, default: null },
  resolved: { type: Boolean, default: false, index: true },
  resolvedAt: { type: Date, default: null },
  resolutionType: {
    type: String,
    enum: ['killed_target', 'hunter_died', 'forgiven', 'reconciled', null],
    default: null
  }
}, { timestamps: true });

npcVendettaSchema.index({ targetId: 1, resolved: 1 });
npcVendettaSchema.index({ hunterNpcId: 1, resolved: 1 });

module.exports = mongoose.models.NpcVendetta || mongoose.model('NpcVendetta', npcVendettaSchema);
