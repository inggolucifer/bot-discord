const mongoose = require('mongoose');

const regionMapSchema = new mongoose.Schema({
  regionSlug: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, required: true },
  regionMapImageUrl: { type: String, default: null }, // diisi Sub-fase B
  worldMapX: { type: Number, min: 0, max: 100, required: true },
  worldMapY: { type: Number, min: 0, max: 100, required: true },
  themeColor: { type: String, default: '#8B7355' },
  dangerTier: { type: Number, min: 1, max: 5, default: 1 },
  isWorldOverview: { type: Boolean, default: false } // opsional; atau world image di config
}, { timestamps: true });

module.exports = mongoose.model('RegionMap', regionMapSchema);
