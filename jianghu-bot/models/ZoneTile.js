const mongoose = require('mongoose');

const zoneTileSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  zoneId: { type: String, required: true },
  tileX: { type: Number, required: true },
  tileY: { type: Number, required: true },
  tileType: {
    type: String,
    enum: ['poi', 'resource_node', 'buildable_plot', 'npc_spawn', 'dungeon_entrance', 'hazard'],
    required: true
  },
  linkedRefId: { type: mongoose.Schema.Types.ObjectId, default: null },
  label: { type: String, default: null },
  isOccupied: { type: Boolean, default: false },
  hidden: { type: Boolean, default: false },

  // Field Resource Node (FASE G6)
  resourceType: { type: String, enum: ['wood', 'ore', 'herb', null], default: null },
  nodeRespawnAt: { type: Date, default: null },

  // Field Kepemilikan & Bangunan Pemain (FASE G5 - GTA Wuxia)
  ownerType: { type: String, enum: ['player', 'sect', null], default: null },
  ownerId: { type: String, default: null },
  ownerName: { type: String, default: null },
  plotPriceSilver: { type: Number, default: 0 },
  buildingName: { type: String, default: null },
  buildingImageUrl: { type: String, default: null },
  buildingType: { type: String, default: null },
  constructionCompleteAt: { type: Date, default: null },
  isUnderConstruction: { type: Boolean, default: false },
  isOpenToPublic: { type: Boolean, default: true },
  isPubliclyVisible: { type: Boolean, default: true }
}, { timestamps: true });

zoneTileSchema.index({ guildId: 1, zoneId: 1, tileX: 1, tileY: 1 }, { unique: true });

module.exports = mongoose.model('ZoneTile', zoneTileSchema);
