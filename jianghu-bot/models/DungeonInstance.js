const mongoose = require('mongoose');

const dungeonTileSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  isWall: { type: Boolean, default: false },
  isEntrance: { type: Boolean, default: false },
  isExit: { type: Boolean, default: false },
  trapType: { type: String, enum: ['spike', 'poison', null], default: null },
  isTrapTriggered: { type: Boolean, default: false },
  chest: {
    isChest: { type: Boolean, default: false },
    opened: { type: Boolean, default: false },
    lootTier: { type: Number, default: 1 },
    lootPreview: { type: String, default: null }
  },
  monster: {
    key: { type: String, default: null },
    name: { type: String, default: null },
    hp: { type: Number, default: 0 },
    atk: { type: Number, default: 0 },
    def: { type: Number, default: 0 },
    spd: { type: Number, default: 0 },
    defeated: { type: Boolean, default: false },
    isBoss: { type: Boolean, default: false }
  }
}, { _id: false });

const dungeonInstanceSchema = new mongoose.Schema({
  discordId: { type: String, required: true, index: true },
  guildId: { type: String, required: true },
  dungeonKey: { type: String, required: true },
  dungeonName: { type: String, required: true },
  rank: { type: String, enum: ['Rank_1_8x8', 'Rank_2_20x20', 'Rank_3_40x40'], default: 'Rank_1_8x8' },
  gridWidth: { type: Number, required: true },
  gridHeight: { type: Number, required: true },
  playerPos: {
    x: { type: Number, default: 1 },
    y: { type: Number, default: 1 }
  },
  exitPos: {
    x: { type: Number, default: 6 },
    y: { type: Number, default: 6 }
  },
  tiles: [dungeonTileSchema],
  exploredTiles: { type: [String], default: ['1,1'] }, // Koordinat format "x,y" yang sudah disingkap Fog of War
  accumulatedLoot: {
    silver: { type: Number, default: 0 },
    spiritStones: { type: Number, default: 0 },
    items: [{
      name: String,
      quantity: { type: Number, default: 1 },
      rank: { type: String, default: 'Common' }
    }]
  },
  status: { type: String, enum: ['exploring', 'completed', 'escaped', 'defeated'], default: 'exploring' }
}, { timestamps: true });

dungeonInstanceSchema.index({ discordId: 1, status: 1 });

module.exports = mongoose.model('DungeonInstance', dungeonInstanceSchema);
