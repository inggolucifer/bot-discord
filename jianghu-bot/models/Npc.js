const mongoose = require('mongoose');

const npcInventoryItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemModel: { type: String, default: 'Item' },
  name: { type: String, default: '' },
  category: { type: String, default: 'misc' },
  quantity: { type: Number, default: 1 },
  equippedSlot: { type: String, default: null },
  qualityTier: { type: String, default: 'common' }
}, { _id: false });

const npcSchema = new mongoose.Schema({
  // Legacy Core Fields (Preserved for 100% backward compatibility)
  guildId: { type: String, default: 'global', index: true },
  name: { type: String, required: true },
  title: { type: String, default: 'Warga Jianghu' },
  description: { type: String, default: '' },
  regionSlug: { type: String, default: 'wilayah_fana' },
  settlementName: { type: String, default: 'Desa Bunga Persik' },
  buildingName: { type: String, default: null },
  portraitUrl: { type: String, default: null },
  imageUrl: { type: String, default: null },
  greeting: { type: String, default: 'Ada perlu, pengembara?' },
  dialogLines: [{
    id: { type: String },
    text: { type: String },
    responses: [{ label: String, nextId: String }]
  }],
  questIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quest' }],
  isActive: { type: Boolean, default: true },
  minRealmIndexToTalk: { type: Number, default: 0 },
  zoneId: { type: String, default: null },
  tileX: { type: Number, default: null },
  tileY: { type: Number, default: null },

  // V27 Living NPC Extensions
  gender: { type: String, enum: ['male', 'female', 'neutral'], default: 'male' },

  personality: {
    primary: { type: String, default: 'righteous' },
    secondary: { type: String, default: 'honest' },
    morality: { type: Number, default: 75, min: 0, max: 100 },
    temperament: { type: Number, default: 50, min: 0, max: 100 }
  },

  dao: {
    traits: { type: [String], default: [] },
    comprehensionLevel: { type: Number, default: 1 },
    heartState: { type: String, default: 'serene' }
  },

  destiny: {
    innate: { type: [String], default: [] },
    acquired: { type: [String], default: [] }
  },

  lifespan: {
    currentAge: { type: Number, default: 20 },
    maxAge: { type: Number, default: 100 },
    deathTimestamp: { type: Date, default: null },
    isImmortal: { type: Boolean, default: false }
  },

  attributes: {
    hp: { type: Number, default: 100 },
    maxHp: { type: Number, default: 100 },
    attack: { type: Number, default: 15 },
    defense: { type: Number, default: 10 },
    agility: { type: Number, default: 10 },
    vitality: { type: Number, default: 100 },
    energy: { type: Number, default: 100 },
    focus: { type: Number, default: 10 },
    luck: { type: Number, default: 10 },
    insight: { type: Number, default: 10 },
    critRate: { type: Number, default: 5 },
    critRes: { type: Number, default: 0 },
    critDmg: { type: Number, default: 150 },
    travelSpeed: { type: Number, default: 10 },
    martialRes: { type: Number, default: 0 },
    spiritualRes: { type: Number, default: 0 },
    roots: {
      fire: { type: Number, default: 0 },
      water: { type: Number, default: 0 },
      lightning: { type: Number, default: 0 },
      wind: { type: Number, default: 0 },
      earth: { type: Number, default: 0 },
      wood: { type: Number, default: 0 }
    },
    kungfuSkills: {
      blade: { type: Number, default: 0 },
      spear: { type: Number, default: 0 },
      sword: { type: Number, default: 0 },
      fist: { type: Number, default: 0 },
      palm: { type: Number, default: 0 },
      finger: { type: Number, default: 0 }
    },
    professions: {
      alchemy: { type: Number, default: 0 },
      smithing: { type: Number, default: 0 },
      farming: { type: Number, default: 0 },
      mining: { type: Number, default: 0 },
      fishing: { type: Number, default: 0 },
      cooking: { type: Number, default: 0 },
      talismans: { type: Number, default: 0 }
    }
  },

  inventory: { type: [npcInventoryItemSchema], default: [] },

  cultivation: {
    realmIndex: { type: Number, default: 0, min: 0, max: 8 },
    stage: { type: Number, default: 1, min: 1, max: 10 },
    exp: { type: Number, default: 0 },
    breakthroughRate: { type: Number, default: 0.5 },
    bottlenecks: { type: Boolean, default: false }
  },

  schedule: {
    currentAnchorId: { type: String, default: '' },
    currentFacility: { type: String, default: '' },
    homeAnchorId: { type: String, default: '' },
    tileX: { type: Number, default: 0 },
    tileY: { type: Number, default: 0 },
    activityState: { type: String, default: 'idle' },
    targetDestination: { type: mongoose.Schema.Types.Mixed, default: null }
  },

  social: {
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'NpcFamily', default: null },
    sectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sect', default: null },
    sectRank: { type: String, default: 'none' },
    masterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Npc', default: null },
    apprentices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Npc' }],
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Npc', default: null },
    swornBrothers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Npc' }]
  },

  vitalStatus: {
    isAlive: { type: Boolean, default: true, index: true },
    isInjured: { type: Boolean, default: false },
    injurySeverity: { type: Number, default: 0 },
    isMissing: { type: Boolean, default: false },
    isEssential: { type: Boolean, default: false },
    essentialRole: { type: String, default: '' },
    downedUntil: { type: Date, default: null }
  }
}, { timestamps: true });

npcSchema.index({ guildId: 1, settlementName: 1, buildingName: 1 });
npcSchema.index({ guildId: 1, name: 1 });
npcSchema.index({ guildId: 1, zoneId: 1 });
npcSchema.index({ 'schedule.currentAnchorId': 1, 'vitalStatus.isAlive': 1 });
npcSchema.index({ 'schedule.tileX': 1, 'schedule.tileY': 1 });

module.exports = mongoose.models.Npc || mongoose.model('Npc', npcSchema);
