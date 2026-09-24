const mongoose = require('mongoose');

// Rank diurutkan dari terendah ke tertinggi. Dipakai juga oleh Pet & Asset.
const RANKS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];
const CURRENCY_ENUM = ['copper', 'silver', 'gold', 'jade', 'spirit'];

const itemSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  rank: { type: String, enum: RANKS, default: 'Common' },
  category: { type: String, enum: ['weapon', 'armor', 'helmet', 'pants', 'boots', 'herb', 'pill', 'consume', 'material', 'artifact', 'talisman', 'accessories', 'law', 'manual', 'tool', 'mount', 'none'], default: 'none' },
  tier: { type: Number, min: 1, max: 9, default: 1 },
  toolType: { type: String, enum: ['fishing_rod', 'furnace', 'forge', 'kitchen_tool', 'farming_tool', null], default: null },
  weaponType: { type: String, enum: ['sword', 'saber', 'staff', 'fist', 'finger', 'hiddenWeapon', 'special', null], default: null },
  requiredKungfuSkill: { type: String, enum: ['sword', 'saber', 'staff', 'fist', 'finger', 'special', 'forging', 'qimen', 'melody', 'healing', 'wineArt', 'hiddenWeapon', 'stealing', 'core', null], default: null },
  requiredKungfuLevel: { type: Number, default: 0 },
  baseAtk: { type: Number, default: 0 },
  baseDef: { type: Number, default: 0 },
  baseHp: { type: Number, default: 0 },
  baseSpd: { type: Number, default: 0 },
  maxDurability: { type: Number, default: null }, // Used when generating an inventory instance of this tool
  description: { type: String, default: '-' },
  imageUrl: { type: String, default: null },
  effect: { type: String, default: null },
  effectType: { type: String, default: null },
  effectValue: { type: Number, default: null },
  effectTierGate: { type: Number, default: null },
  origin: { type: String, default: null },
  coldResistance: { type: Number, default: 0, min: 0 },
  heatResistance: { type: Number, default: 0, min: 0 },

  usableInBattle: { type: Boolean, default: false },
  restoresHp: { type: Number, default: 0 },
  restoresStamina: { type: Number, default: 0 },
  restoresVitality: { type: Number, default: 0 },
  restoresMood: { type: Number, default: 0 },

  weight: { type: Number, default: 1, min: 0 },
  capacityBonus: { type: Number, default: 0 },
  capacityMode: { type: String, enum: ['always', 'travel_only', null], default: null },
  travelSpeedBonus: { type: Number, default: 0 },
  capacityType: { type: String, enum: ['cart', 'horse', 'storage_ring', null], default: null },

  // Mount Attributes
  mountType: { type: String, default: null }, // e.g. 'ferghana_horse', 'spirit_horned_horse', 'shadow_tiger', 'flying_sword', 'ship'
  staminaReduction: { type: Number, default: 0 }, // Pengurangan stamina tetap per petak (misal 0.5 s/d 2.0)
  staminaReductionPercent: { type: Number, default: 0 }, // Pengurangan stamina persentase (misal 20 = diskon 20%)

  // Cultivation Law & Companion Attributes
  lawType: { type: String, default: null },
  isLawManual: { type: Boolean, default: false },
  canBecomeArtifact: { type: Boolean, default: false },
  beastTokenType: { type: String, default: null },
  demonicAffinity: { type: String, default: null },

  // Harga dasar, dipakai untuk jual-beli di shop DAN sebagai basis harga jual-balik (/jual) ke sistem (20% dari basePrice)
  minRealmIndex: { type: Number, default: 0 },
  basePrice: { type: Number, default: 0, min: 0 },
  priceCurrency: { type: String, enum: CURRENCY_ENUM, default: 'silver' },

  createdBy: { type: String, default: null },
}, { timestamps: true });

itemSchema.index({ guildId: 1, name: 1 }, { unique: true });

const ItemModel = mongoose.model('Item', itemSchema);
ItemModel.RANKS = RANKS;
module.exports = ItemModel;
