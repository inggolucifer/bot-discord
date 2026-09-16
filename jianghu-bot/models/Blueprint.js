const mongoose = require('mongoose');

const blueprintMaterialSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const blueprintSchema = new mongoose.Schema({
  blueprintId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['residence', 'shop', 'blacksmith', 'farm_barn', 'fish_pond', 'dojo'], 
    required: true 
  },
  description: { type: String, default: '' },
  footprintWidth: { type: Number, default: 2 },
  footprintHeight: { type: Number, default: 2 },
  requiredMaterials: { type: [blueprintMaterialSchema], default: [] },
  requiredSilver: { type: Number, default: 50 },
  buildDurationSeconds: { type: Number, default: 300 }, // Default 5 menit
  minRealmIndex: { type: Number, default: 0 },
  defaultInteriorTier: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Blueprint', blueprintSchema);
