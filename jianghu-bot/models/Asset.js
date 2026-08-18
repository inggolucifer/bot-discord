const mongoose = require('mongoose');
const { RANKS } = require('./Item');

const CURRENCY_ENUM = ['silver', 'gold', 'jade', 'spirit'];

const recipeMaterialSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const recipeSchema = new mongoose.Schema({
  recipeName: { type: String, required: true },
  resultItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  resultItemName: { type: String, required: true },
  resultQuantity: { type: Number, default: 1, min: 1 },
  materials: { type: [recipeMaterialSchema], default: [] },
});

const assetSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '-' },
  imageUrl: { type: String, default: null },

  // === Tipe 1: Income (claim currency harian) ===
  dailyProfit: { type: Number, default: 0 },
  profitCurrency: { type: String, enum: CURRENCY_ENUM, default: 'silver' },

  // === Tipe 2: Crafting Station ===
  isCraftingStation: { type: Boolean, default: false },
  recipes: { type: [recipeSchema], default: [] },

  // === Tipe 3: Worker (claim MATERIAL/ITEM harian, mis. lahan batu bata -> batu bata, peternakan -> susu) ===
  workerOutputItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  workerOutputItemName: { type: String, default: null },
  workerOutputQuantity: { type: Number, default: 0, min: 0 },

  // Harga beli di shop (opsional)
  basePrice: { type: Number, default: 0, min: 0 },
  priceCurrency: { type: String, enum: CURRENCY_ENUM, default: 'silver' },

  rank: { type: String, enum: [...RANKS, null], default: null },

  constructionTimeHours: { type: Number, default: 0, min: 0 },

  // === Bangun Mandiri (player/sekte bisa membangun aset ini sendiri pakai material, tanpa beli pakai currency) ===
  buildable: { type: Boolean, default: false },
  buildRequirements: { type: [recipeMaterialSchema], default: [] },

  createdBy: { type: String, default: null },
}, { timestamps: true });

assetSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Asset', assetSchema);

