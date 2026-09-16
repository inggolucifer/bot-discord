const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  discordId: { type: String, required: true, index: true },
  actionType: { 
    type: String, 
    enum: [
      'land_buy', 
      'asset_build', 
      'farm_plant', 
      'farm_harvest', 
      'fish_catch', 
      'smith_craft', 
      'cook_dish', 
      'forage_gather', 
      'expedition_loot',
      'training_session'
    ],
    required: true 
  },
  details: { type: mongoose.Schema.Types.Mixed, required: true },
  serverValidated: { type: Boolean, default: true },
  itemOriginLogged: { type: Boolean, default: false }
}, { timestamps: true });

activityLogSchema.index({ guildId: 1, discordId: 1, actionType: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
