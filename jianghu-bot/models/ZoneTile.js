const mongoose = require('mongoose');

const zoneTileSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  zoneId: { type: String, required: true },
  tileX: { type: Number, required: true },
  tileY: { type: Number, required: true },
  tileType: {
    type: String,
    enum: [
      'poi', 
      'resource_node', 
      'buildable_plot', 
      'npc_spawn', 
      'dungeon_entrance', 
      'hazard',
      'ground',
      'water',
      'road',
      'door',
      'wall'
    ],
    default: 'ground',
    required: true
  },
  linkedRefId: { type: mongoose.Schema.Types.ObjectId, default: null },
  label: { type: String, default: null },
  isOccupied: { type: Boolean, default: false },
  hidden: { type: Boolean, default: false },

  // Field Resource Node (FASE G6 / G8)
  resourceType: { 
    type: String, 
    enum: ['wood', 'ore', 'herb', 'fish', null], 
    default: null 
  },
  nodeRespawnAt: { type: Date, default: null },
  harvestCooldownSeconds: { type: Number, default: 60 },

  // Field Farming Plot (FASE G6)
  cropPlantedAt: { type: Date, default: null },
  cropReadyAt: { type: Date, default: null },
  cropType: { type: String, default: null },

  // Field Kepemilikan & Bangunan Pemain (FASE G4 & G5)
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
  isPubliclyVisible: { type: Boolean, default: true },

  // Blueprint Spasial & Termodinamika Jianghu
  terrainType: {
    type: String,
    enum: ['plains', 'forest', 'mountain', 'swamp', 'glacial', 'volcanic', 'settlement', 'sect', 'claimable', 'water', 'road'],
    default: 'plains'
  },
  isSolid: { type: Boolean, default: false },
  isClaimable: { type: Boolean, default: false },
  isDoor: { type: Boolean, default: false },
  staminaCostMultiplier: { type: Number, default: 1.0 },
  baseTemperature: { type: Number, default: 20 },
  spiritualQiDensity: { type: Number, default: 10 },
  ambushRiskRate: { type: Number, default: 0.05 },
  propertyStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyStructure', default: null },
  targetInteriorStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyStructure', default: null }
}, { timestamps: true });

zoneTileSchema.index({ guildId: 1, zoneId: 1, tileX: 1, tileY: 1 }, { unique: true });

module.exports = mongoose.model('ZoneTile', zoneTileSchema);
