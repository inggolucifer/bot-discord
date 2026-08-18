const mongoose = require('mongoose');

const playerListingSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  sellerId: { type: String, required: true },
  sellerName: { type: String, required: true },

  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: false },
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },

  pricePerUnit: { type: Number, required: true, min: 1 },
  currency: { type: String, enum: ['silver', 'gold', 'jade', 'spirit'], required: true },

  type: { type: String, enum: ['item', 'pet', 'asset'], default: 'item' },
  refId: { type: mongoose.Schema.Types.ObjectId, required: false },
  status: { type: String, enum: ['active', 'sold', 'cancelled'], default: 'active' },
  buyerId: { type: String, default: null },
}, { timestamps: true });

playerListingSchema.index({ guildId: 1, status: 1 });
playerListingSchema.index({ guildId: 1, sellerId: 1, status: 1 });

module.exports = mongoose.model('PlayerListing', playerListingSchema);

