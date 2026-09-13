const mongoose = require('mongoose');

const questSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  key: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  giverNpcId: { type: mongoose.Schema.Types.ObjectId, ref: 'Npc', default: null },
  minRealmIndex: { type: Number, default: 0 },
  requiresQuestKeysCompleted: [{ type: String }],
  objectives: [{
    type: {
      type: String,
      enum: [
        'talk_to_npc',
        'reach_settlement',
        'reach_building',
        'submit_item',
        'wait_time'
      ]
    },
    targetNpcId: mongoose.Schema.Types.ObjectId,
    targetSettlementName: String,
    targetBuildingName: String,
    itemName: String,
    itemId: mongoose.Schema.Types.ObjectId,
    quantity: { type: Number, default: 1 },
    durationHours: { type: Number, default: 1 },
    description: String
  }],
  rewards: {
    copper: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    jade: { type: Number, default: 0 },
    spirit: { type: Number, default: 0 },
    qiBonus: { type: Number, default: 0 },
    items: [{
      itemId: mongoose.Schema.Types.ObjectId,
      itemName: String,
      quantity: { type: Number, default: 1 }
    }]
  },
  repeatable: { type: Boolean, default: false },
  cooldownHours: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

questSchema.index({ guildId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Quest', questSchema);
