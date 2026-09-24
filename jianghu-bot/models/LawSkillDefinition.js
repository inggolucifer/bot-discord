// Model definisi skill pohon untuk 15 Jalur Law Kultivasi
// Setiap Law memiliki 14 skill (Tier 1-5) yang dapat dibuka dengan Skill Points
// Referensi: implementation_plan.md §6, §11.3
const mongoose = require('mongoose');

const statusEffectSchema = new mongoose.Schema({
  effect: { type: String, required: true },           // 'burn', 'freeze', 'stun', 'poison', 'shield', 'defense_up', 'fear'
  chancePercent: { type: Number, default: 100 },
  durationTurns: { type: Number, default: 2 },
  value: { type: Number, default: 0 }                 // Besaran efek (misal: damage/ronde untuk DoT, %DR untuk shield)
}, { _id: false });

const lawSkillDefinitionSchema = new mongoose.Schema({
  // === IDENTITAS SKILL ===
  skillId: { type: String, required: true, unique: true, index: true },  // contoh: 'phoenix_nirvana_flame'
  lawType: {
    type: String,
    required: true,
    index: true,
    enum: [
      'element_phoenix_fire', 'element_azure_water', 'element_xuanwu_earth',
      'element_qingdi_wood', 'element_roc_wind', 'element_godthunder_light',
      'body_tempering', 'gu_master', 'natal_artifact', 'natal_beast',
      'demonic_turbid_core', 'demonic_blood_soul', 'demonic_myriad_venom',
      'demonic_abyssal_pact', 'demonic_nether_darkness'
    ]
  },
  tier: { type: Number, required: true, min: 1, max: 5 },               // Tier 1 = dasar, Tier 5 = Rank 8 ultimate
  name: { type: String, required: true },
  icon: { type: String, default: '⚡' },
  description: { type: String, required: true },

  // === TIPE SKILL ===
  isPassive: { type: Boolean, default: false },         // true = efek otomatis tanpa aktivasi manual
  maxLevel: { type: Number, default: 5 },               // Level 1-5 per skill (investasi skill points)

  // === SYARAT BUKA ===
  requiredRank: { type: Number, default: 0, min: 0, max: 8 },           // Rank Law minimum untuk unlock
  requiredParentSkillId: { type: String, default: null },                // Skill prerequisite (skill tree branching)
  skillPointCost: { type: Number, default: 1 },                          // Biaya skill point per level

  // === PARAMETER TEMPUR (Untuk Skill Aktif) ===
  costType: {
    type: String,
    enum: ['qi', 'true_qi', 'hp', 'stamina', 'none'],
    default: 'qi'
  },
  baseCost: { type: Number, default: 15 },              // Biaya Qi/True Qi per cast
  costPerLevel: { type: Number, default: 2 },           // Tambahan biaya per level skill (+2 per lv)
  cooldownTurns: { type: Number, default: 3 },          // Cooldown dalam jumlah ronde tempur
  targetType: {
    type: String,
    enum: ['single_enemy', 'all_enemies', 'self', 'ally_beast', 'random_enemy', 'ally_and_self'],
    default: 'single_enemy'
  },

  // === DAMAGE & SCALING ===
  damageMultiplier: { type: Number, default: 1.0 },     // 1.0 = 100% ATK base
  damagePerLevel: { type: Number, default: 0.1 },       // +10% per level skill
  element: {
    type: String,
    default: 'Physical',
    enum: ['Physical', 'Fire', 'Water', 'Earth', 'Wood', 'Wind', 'Lightning', 'Dark', 'Poison', 'Holy', 'Neutral']
  },

  // === STATUS EFFECTS (Buff/Debuff yang ditimbulkan) ===
  statusEffects: { type: [statusEffectSchema], default: [] },

  // === PARAMETER PASIF (Untuk isPassive === true) ===
  passiveStatBonus: {
    type: String,
    default: null                                       // Contoh: 'atk_percent', 'def_flat', 'crit_rate', 'hp_regen'
  },
  passiveBonusPerLevel: { type: Number, default: 0 },   // Besaran bonus per level (misal: +5% per lv)

  // === PARAMETER KHUSUS ===
  specialMechanic: { type: String, default: null },     // Penanda mekanik unik: 'nirvana_revive', 'soul_summon', 'beast_transform', 'fusion', 'aoe_sweep'
  transformDuration: { type: Number, default: 0 },      // Durasi ronde transformasi (jika ada)
  summonCount: { type: Number, default: 0 }             // Jumlah entitas yang dipanggil (spectral beasts, soul copies, dll)
}, { timestamps: true });

lawSkillDefinitionSchema.index({ lawType: 1, tier: 1 });

module.exports = mongoose.model('LawSkillDefinition', lawSkillDefinitionSchema);
