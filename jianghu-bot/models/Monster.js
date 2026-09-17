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
  tierSize: { type: String, enum: ['small', 'medium', 'large', 'boss'], default: 'small' },
  element: { type: String, enum: ['fire', 'water', 'wood', 'metal', 'earth', 'lightning', 'dark', 'light', 'neutral'], default: 'neutral' },
  minRealmIndex: { type: Number, default: 0 },
  baseExp: { type: Number, default: 20 },
  baseKungfuExp: {
    discipline: { type: String, default: 'fist' },
    amount: { type: Number, default: 10 }
  },
  statBlock: {
    hp: { type: Number, default: 100 },
    atk: { type: Number, default: 10 },
    def: { type: Number, default: 5 },
    spd: { type: Number, default: 5 }
  },
  skills: [{
    skillId: { type: String, default: 'basic_attack' },
    name: { type: String, default: 'Serangan Liar' },
    description: { type: String, default: '' },
    type: { type: String, enum: ['attack', 'heal', 'buff', 'debuff', 'defend'], default: 'attack' },
    power: { type: Number, default: 12 },
    qiCost: { type: Number, default: 0 },
    cooldown: { type: Number, default: 0 },
    element: { type: String, default: 'neutral' },
    debuffChance: { type: Number, default: 0 },
    debuffType: { type: String, default: null }
  }],
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
