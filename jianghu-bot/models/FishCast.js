const mongoose = require('mongoose');

const fishCastSchema = new mongoose.Schema({
  castId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  playerId: {
    type: String,
    required: true,
    index: true
  },
  fishName: {
    type: String,
    required: true
  },
  difficulty: {
    type: Number,
    required: true
  },
  startedAt: {
    type: Date,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  resolved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// TTL index to automatically purge expired casts from MongoDB
fishCastSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('FishCast', fishCastSchema);
