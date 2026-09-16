const mongoose = require('mongoose');

const gridZoneSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  zoneId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  regionSlug: { type: String, required: true, index: true },
  settlementSlug: { type: String, default: null },
  zoneType: { 
    type: String, 
    enum: ['settlement', 'wilderness', 'expedition'], 
    default: 'settlement' 
  },
  width: { type: Number, required: true, default: 32, min: 8, max: 128 },
  height: { type: Number, required: true, default: 32, min: 8, max: 128 },
  spawnPoint: { 
    x: { type: Number, default: 16 }, 
    y: { type: Number, default: 16 } 
  },
  climate: {
    baseTemperature: { type: Number, default: 20 },
    spiritualQiDensity: { type: Number, default: 10 },
    defaultTerrain: { 
      type: String, 
      enum: ['plains', 'forest', 'mountain', 'swamp', 'glacial', 'volcanic', 'settlement', 'sect', 'claimable', 'water', 'road'],
      default: 'settlement' 
    }
  },
  dangerTier: { type: Number, default: 1, min: 1, max: 10 },
  minRealmIndex: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

gridZoneSchema.index({ guildId: 1, zoneId: 1 }, { unique: true });

module.exports = mongoose.model('GridZone', gridZoneSchema);
