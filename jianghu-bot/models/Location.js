const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  regionSlug: { type: String, required: true },
  settlementName: { type: String, required: true },
  buildingName: { type: String, required: true },
  buildingType: {
    type: String,
    enum: ['shop', 'dojo', 'sect_hall', 'blacksmith', 'residence', 'farm', 'tavern', 'npc_house', 'plaza'],
    required: true
  },
  npcIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Npc' }],
  linkedShopIds: [{ type: mongoose.Schema.Types.ObjectId }],
  linkedAssetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  linkedSectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sect', default: null },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  imageUrl: { type: String, default: null },
  shopTag: { type: String, default: null },
  mapX: { type: Number, min: 0, default: null },
  mapY: { type: Number, min: 0, default: null },
  zoneId: { type: String, default: null, index: true },
  mapIconType: {
    type: String,
    enum: ['city', 'village', 'sect_hall', 'dojo', 'danger_zone', 'landmark', null],
    default: null
  }
}, { timestamps: true });

locationSchema.index({ guildId: 1, regionSlug: 1, settlementName: 1, buildingName: 1 });

module.exports = mongoose.model('Location', locationSchema);
