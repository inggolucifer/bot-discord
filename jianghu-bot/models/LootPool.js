// Aset player yang statusnya "mati" dipindahkan ke sini, ditujukan ke 1 player tertentu
const mongoose = require('mongoose');

const lootPoolSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  deceasedUserId: { type: String, required: true },
  deceasedCharacterName: { type: String, required: true },
  targetUserId: { type: String, required: true }, // yang berhak /loot

  currency: {
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    jade: { type: Number, default: 0 },
    spirit: { type: Number, default: 0 },
  },
  inventory: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    quantity: { type: Number, default: 1 },
  }],
  pets: [{
    petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
    nickname: { type: String, default: null },
    quantity: { type: Number, default: 1 },
  }],

  claimed: { type: Boolean, default: false },
  claimedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('LootPool', lootPoolSchema);
