const mongoose = require('mongoose');

const dropTableSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  itemName: { type: String, default: null },
  chance: { type: Number, default: 0, min: 0, max: 1 },
  quantityMin: { type: Number, default: 1 },
  quantityMax: { type: Number, default: 1 }
}, { _id: false });

const monsterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  key: { type: String, required: true },
  name: { type: String, required: true },
  regionSlug: { type: String, required: true },
  tier: { type: Number, default: 1, min: 1, max: 9 },
  minRealmIndex: { type: Number, default: 0 },
  statBlock: {
    hp: { type: Number, default: 100 },
    atk: { type: Number, default: 10 },
    def: { type: Number, default: 5 },
    spd: { type: Number, default: 5 }
  },
  dropTable: [dropTableSchema],
  currencyDrop: {
    copperMin: { type: Number, default: 0 },
    copperMax: { type: Number, default: 0 },
    silverMin: { type: Number, default: 0 },
    silverMax: { type: Number, default: 0 }
  },
  affiliation: { type: String, default: null },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  imageUrl: { type: String, default: null }
}, { timestamps: true });

monsterSchema.index({ guildId: 1, regionSlug: 1 });
monsterSchema.index({ guildId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Monster', monsterSchema);
