const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  category: { type: String, enum: ['item', 'pet', 'asset'], required: true },
  refId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID ke Item/Pet/Asset
  refModel: { type: String, enum: ['Item', 'Pet', 'Asset'], required: true },
  price: { type: Number, required: true },
  priceCurrency: { type: String, enum: ['copper', 'silver', 'gold', 'jade', 'spirit'], default: 'silver' },
  stock: { type: Number, default: -1 }, // -1 = unlimited
  isActive: { type: Boolean, default: true },
  addedBy: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);
