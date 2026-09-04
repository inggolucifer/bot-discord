const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  fromUserId: { type: String, required: true, index: true },
  toUserId: { type: String, required: true, index: true },
  type: { type: String, enum: ['item', 'currency'], required: true },

  // For item transfers
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  quantity: { type: Number, default: 0 },

  // For currency transfers
  currencyType: { type: String, enum: ['copper', 'silver', 'gold', 'jade', 'spirit'], default: null },
  amount: { type: Number, default: 0 },

  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  taxAmount: { type: Number, default: 0 }, // Assuming we need to store tax
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('TransferRequest', transferRequestSchema);
