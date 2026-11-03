const mongoose = require('mongoose');

/**
 * JIANGHU BOT & IMMORTAL-X — PLAYER BUILDING MODEL
 * V21 F3: Model bangunan mandiri pemain di alam liar / pemukiman
 */
const playerBuildingSchema = new mongoose.Schema({
  ownerId: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true }, // 'hermit_hut', 'herb_garden', 'meditation_pavilion', dll.
  locationKey: { type: String, required: true }, // format: 'region:settlement' atau 'world:wild'
  chunkX: { type: Number, required: true },
  chunkY: { type: Number, required: true },
  cellX: { type: Number, required: true },
  cellY: { type: Number, required: true },
  visibility: { type: String, enum: ['public', 'sect', 'private'], default: 'public' },
  sectId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

playerBuildingSchema.index({ chunkX: 1, chunkY: 1 });
playerBuildingSchema.index({ ownerId: 1 });
playerBuildingSchema.index({ locationKey: 1, visibility: 1 });

module.exports = mongoose.model('PlayerBuilding', playerBuildingSchema);
