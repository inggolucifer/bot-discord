const mongoose = require('mongoose');

const barterOfferSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  fromUserId: { type: String, required: true, index: true },
  toUserId: { type: String, required: true, index: true },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'expired'],
    default: 'pending'
  },

  offer: {
    copper: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    items: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
      itemName: String,
      quantity: { type: Number, min: 1 }
    }]
  },

  request: {
    copper: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    items: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
      itemName: String,
      quantity: { type: Number, min: 1 }
    }]
  },

  locationKey: String,
  expiresAt: { type: Date, required: true },
  resolvedAt: { type: Date, default: null },
  cancelReason: { type: String, default: null }
}, { timestamps: true });

barterOfferSchema.index({ guildId: 1, fromUserId: 1, status: 1 });
barterOfferSchema.index({ guildId: 1, toUserId: 1, status: 1 });
barterOfferSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('BarterOffer', barterOfferSchema);
