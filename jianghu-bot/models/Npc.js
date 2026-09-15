const mongoose = require('mongoose');

const npcSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  regionSlug: { type: String, required: true },
  settlementName: { type: String, required: true },
  buildingName: { type: String, default: null },
  portraitUrl: { type: String, default: null },
  imageUrl: { type: String, default: null },
  greeting: { type: String, default: 'Ada perlu, pengembara?' },
  dialogLines: [{
    id: { type: String },
    text: { type: String },
    responses: [{ label: String, nextId: String }]
  }],
  questIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quest' }],
  isActive: { type: Boolean, default: true },
  minRealmIndexToTalk: { type: Number, default: 0 },
  zoneId: { type: String, default: null },
  tileX: { type: Number, default: null },
  tileY: { type: Number, default: null }
}, { timestamps: true });

npcSchema.index({ guildId: 1, settlementName: 1, buildingName: 1 });
npcSchema.index({ guildId: 1, name: 1 });
npcSchema.index({ guildId: 1, zoneId: 1 });

module.exports = mongoose.model('Npc', npcSchema);

