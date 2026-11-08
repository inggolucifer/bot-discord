const mongoose = require('mongoose');

const npcRelationSchema = new mongoose.Schema({
  sourceNpcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Npc', required: true, index: true },
  targetNpcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Npc', required: true, index: true },
  relationType: {
    type: String,
    enum: ['friend', 'rival', 'enemy', 'lover', 'mentor', 'disciple', 'sworn_sibling', 'neutral'],
    default: 'neutral'
  },
  affinity: { type: Number, default: 0, min: -100, max: 100 },
  notes: { type: String, default: '' }
}, { timestamps: true });

npcRelationSchema.index({ sourceNpcId: 1, targetNpcId: 1 }, { unique: true });

module.exports = mongoose.models.NpcRelation || mongoose.model('NpcRelation', npcRelationSchema);
