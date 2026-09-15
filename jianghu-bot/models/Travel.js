const mongoose = require('mongoose');

const travelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  discordId: { type: String, required: true, index: true },
  fromLocation: {
    regionSlug: { type: String, required: true },
    settlementName: { type: String, required: true }
  },
  toLocation: {
    regionSlug: { type: String, required: true },
    settlementName: { type: String, required: true }
  },
  startTime: { type: Date, required: true },
  arrivalTime: { type: Date, required: true },
  mode: { type: String, default: 'jalan_kaki' },
  status: { type: String, enum: ['traveling', 'ambushed', 'arrived', 'cancelled'], default: 'traveling' },
  usedEscortLetter: { type: Boolean, default: false },
  ambushResolved: { type: Boolean, default: false },
  ambushResult: {
    happened: { type: Boolean, default: false },
    banditGroupSize: { type: Number, default: 0 },
    currencyLost: {
      copper: { type: Number, default: 0 },
      silver: { type: Number, default: 0 },
      gold: { type: Number, default: 0 },
      jade: { type: Number, default: 0 },
      spirit: { type: Number, default: 0 }
    },
    message: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Travel', travelSchema);
