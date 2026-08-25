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
    instanceId: { type: String, required: true },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
    nickname: { type: String, default: null },
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    hp: { type: Number, default: 50 },
    maxHp: { type: Number, default: 50 },
    atk: { type: Number, default: 10 },
    def: { type: Number, default: 5 },
    spd: { type: Number, default: 8 },
    hunger: { type: Number, default: 100 },
    element: { type: String, default: 'Netral' },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    lastFedAt: { type: Date, default: null },
    lastBattledAt: { type: Date, default: null },
    isLocked: { type: Boolean, default: false },
    affinity: { type: Number, default: 0 },
    statMultipliers: {
      hp: { type: Number, default: 1.0 },
      atk: { type: Number, default: 1.0 },
      def: { type: Number, default: 1.0 },
      spd: { type: Number, default: 1.0 }
    }
  }],

  claimed: { type: Boolean, default: false },
  claimedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('LootPool', lootPoolSchema);
