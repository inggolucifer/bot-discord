const mongoose = require('mongoose');

const hutVisitSchema = new mongoose.Schema({
  guildId: { type: String, default: 'global', index: true },
  playerId: { type: String, required: true, index: true }, // discordId
  hutKey: { type: String, required: true, index: true }, // format "x_y"
  zoneId: { type: String, default: 'tianyuan_world_map' },
  tileX: { type: Number, required: true },
  tileY: { type: Number, required: true },
  lastVisitedAt: { type: Date, default: Date.now },
  lastLootAt: { type: Date, default: null },
  lootCountToday: { type: Number, default: 0 },
  lastRestAt: { type: Date, default: null },
  firstDiscoveredAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound unique index untuk mencegah duplikasi riwayat per pemain per pondok
hutVisitSchema.index({ playerId: 1, hutKey: 1 }, { unique: true });
hutVisitSchema.index({ playerId: 1, lastLootAt: 1 });

module.exports = mongoose.model('HutVisit', hutVisitSchema);
