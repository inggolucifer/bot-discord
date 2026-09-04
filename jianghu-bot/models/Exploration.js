const mongoose = require('mongoose');

const explorationSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  discordId: { type: String, required: true, index: true },
  characterName: { type: String, required: true },
  location: { type: String, required: true },

  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, required: true },

  status: { type: String, enum: ['exploring', 'completed', 'claimed'], default: 'exploring' },

  // Accumulated drops to be claimed
  drops: {
    copper: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    items: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
      quantity: { type: Number, default: 1 },
    }]
  }
}, { timestamps: true });

module.exports = mongoose.model('Exploration', explorationSchema);
