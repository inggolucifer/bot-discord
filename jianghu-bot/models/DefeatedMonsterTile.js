const mongoose = require('mongoose');

const defeatedMonsterTileSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  zoneId: { type: String, required: true },
  tileKey: { type: String, required: true }, // e.g. '2452,2481'
  monsterKey: { type: String, default: null },
  defeatedAt: { type: Date, default: Date.now },
  respawnAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 60 * 60 * 1000), // Default respawn: 1 jam
    index: true 
  }
}, { timestamps: true });

defeatedMonsterTileSchema.index({ guildId: 1, zoneId: 1, tileKey: 1 }, { unique: true });

module.exports = mongoose.model('DefeatedMonsterTile', defeatedMonsterTileSchema);
