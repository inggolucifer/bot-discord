/**
 * models/InstancedZoneSession.js
 * Model Mongoose untuk Sesi Zona Instans V25 (Server-Authoritative & Persistent)
 */

const mongoose = require('mongoose');

const InstancedZoneSessionSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.Mixed, // Mendukung ObjectId Mongoose maupun String ID
    ref: 'Player',
    required: true,
    index: true
  },
  discordId: {
    type: String,
    required: true,
    index: true
  },
  zoneId: {
    type: String,
    required: true
  },
  zoneName: {
    type: String,
    default: ''
  },
  zoneType: {
    type: String,
    enum: ['spirit_valley', 'land_of_spirits', 'defense_circle', 'elemental_land'],
    required: true
  },
  dangerTier: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  requiredRealmIndex: {
    type: Number,
    default: 0
  },
  sessionSeed: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'claimed', 'abandoned', 'failed'],
    default: 'active',
    index: true
  },
  stepIndex: {
    type: Number,
    default: 0
  },
  sessionData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  rewards: {
    type: Array,
    default: []
  },
  claimedRewards: {
    type: Array,
    default: []
  },
  claimedAt: {
    type: Date,
    default: null
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes untuk kecepatan kueri & integritas data
InstancedZoneSessionSchema.index({ playerId: 1, zoneId: 1, status: 1 });
InstancedZoneSessionSchema.index({ discordId: 1, status: 1 });
InstancedZoneSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('InstancedZoneSession', InstancedZoneSessionSchema);
