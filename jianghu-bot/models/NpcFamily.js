const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema({
  npcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Npc', required: true },
  role: {
    type: String,
    enum: ['patriarch', 'matriarch', 'elder', 'parent', 'child', 'spouse', 'sibling', 'relative'],
    default: 'relative'
  },
  generation: { type: Number, default: 1 }
}, { _id: false });

const npcFamilySchema = new mongoose.Schema({
  familyName: { type: String, required: true },
  headNpcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Npc', default: null },
  members: [familyMemberSchema],
  homeAnchorId: { type: String, default: '' },
  clanPrestige: { type: Number, default: 100 }
}, { timestamps: true });

npcFamilySchema.index({ homeAnchorId: 1 });

module.exports = mongoose.models.NpcFamily || mongoose.model('NpcFamily', npcFamilySchema);
