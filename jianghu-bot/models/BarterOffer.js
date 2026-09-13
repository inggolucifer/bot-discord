const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    quantity: { type: Number, min: 1, default: 1 }
  }],
  currency: {
    copper: { type: Number, default: 0, min: 0 },
    silver: { type: Number, default: 0, min: 0 },
    gold: { type: Number, default: 0, min: 0 },
    jade: { type: Number, default: 0, min: 0 },
    spirit: { type: Number, default: 0, min: 0 }
  }
}, { _id: false });

const barterOfferSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  initiatorId: { type: String, required: true, index: true },
  targetId: { type: String, required: true, index: true },
  initiatorOffer: { type: offerSchema, default: () => ({}) },
  targetOffer: { type: offerSchema, default: () => ({}) },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },
  locationSnapshot: {
    regionSlug: { type: String, required: true },
    settlementName: { type: String, required: true },
    buildingName: { type: String, default: null }
  },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Compound index for finding pending offers between specific players
barterOfferSchema.index({ guildId: 1, initiatorId: 1, targetId: 1, status: 1 });

module.exports = mongoose.model('BarterOffer', barterOfferSchema);
