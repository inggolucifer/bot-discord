// Data karakter player, terikat permanen ke discordId + guildId
const mongoose = require('mongoose');
const { normalizeCurrency } = require('../utils/currencyNormalize');


const playerManualSchema = new mongoose.Schema({
  manualId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manual', required: true },
  level: { type: Number, default: 0 }, // Level 0 means just learned, haven't finished first upgrade
  isComprehending: { type: Boolean, default: false },
  comprehendStartTime: { type: Date, default: null }
}, { _id: false });

const playerStatsSchema = new mongoose.Schema({
  baseHp: { type: Number, default: 100 },
  baseAtk: { type: Number, default: 15 },
  baseDef: { type: Number, default: 10 },
  baseSpd: { type: Number, default: 10 }
}, { _id: false });

const playerConditionsSchema = new mongoose.Schema({
  poison: { type: Number, default: 0, min: 0 },
  injury: { type: Number, default: 0, min: 0 },
  bleed: { type: Number, default: 0, min: 0 },
  intox: { type: Number, default: 0, min: 0 },
  frozen: { type: Number, default: 0, min: 0 },
  psychosis: { type: Number, default: 0, min: 0 },
  burn: { type: Number, default: 0, min: 0 },
  knockback: { type: Number, default: 0, min: 0 }
}, { _id: false });

const extendedStatsSchema = new mongoose.Schema({
  // === GENERAL ===
  maxLifespan:   { type: Number, default: 100 },
  mood:          { type: Number, default: 100, min: 0, max: 100 },
  luck:          { type: Number, default: 10 },
  insight:       { type: Number, default: 10 },
  vitality:      { type: Number, default: 100 },
  maxVitality:   { type: Number, default: 100 },
  innerEnergy:   { type: Number, default: 100 },
  maxInnerEnergy: { type: Number, default: 100 },
  focus:         { type: Number, default: 100 },
  maxFocus:      { type: Number, default: 100 },

  // === COMBAT ===
  critRate:      { type: Number, default: 5 },
  critResist:    { type: Number, default: 0 },
  comboRate:     { type: Number, default: 5 },
  agility:       { type: Number, default: 10 },
  critDmg:       { type: Number, default: 150 },
  critDmgReduce: { type: Number, default: 0 },
  travelSpeed:   { type: Number, default: 100 },
  martialRes:    { type: Number, default: 0 },
  spiritualRes:  { type: Number, default: 0 },

  // === SPIRITUAL ROOT (Semua Player Start dari 0) ===
  spiritualRoot: {
    fire:      { type: Number, default: 0 },
    water:     { type: Number, default: 0 },
    lightning: { type: Number, default: 0 },
    wind:      { type: Number, default: 0 },
    earth:     { type: Number, default: 0 },
    wood:      { type: Number, default: 0 }
  },

  // === ARTISANSHIP (Sistem Terpadu dengan Kemahiran Profesi) ===
  artisanship: {
    alchemy:   { type: Number, default: 1 },
    forge:     { type: Number, default: 1 },
    talismans: { type: Number, default: 1 },
    herbology: { type: Number, default: 1 },
    mining:    { type: Number, default: 1 }
  }
}, { _id: false });

const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, default: 1 },
  // Fields for crafted items / tools
  creatorName: { type: String, default: null },
  qualityMultiplier: { type: Number, default: 1.0 },
  durability: { type: Number, default: null }, // Current durability for tools
  maxDurability: { type: Number, default: null },
  isEquipped: { type: Boolean, default: false },
});

const professionSchema = new mongoose.Schema({
  isUnlocked: { type: Boolean, default: false },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 }
}, { _id: false });

const farmPlotSchema = new mongoose.Schema({
  isUnlocked: { type: Boolean, default: false },
  cropId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  recipeKey: { type: String, default: null },
  plantedAt: { type: Date, default: null },
  harvestAt: { type: Date, default: null },
  isDepleted: { type: Boolean, default: false },
  depletedUntil: { type: Date, default: null },
  fertilizerApplied: { type: Boolean, default: false },
  fertilizerItemName: { type: String, default: null }
}, { _id: false });

const farmingProfessionSchema = new mongoose.Schema({
  isUnlocked: { type: Boolean, default: false },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  farmPlots: { type: [farmPlotSchema], default: () => [{ isUnlocked: true }] } // Default 1 slot terbuka
}, { _id: false });

const fishingProfessionSchema = new mongoose.Schema({
  isUnlocked: { type: Boolean, default: false },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  unlockedFishingZones: { type: [Number], default: [1] } // Default zona 1 terbuka
}, { _id: false });

const professionsSchema = new mongoose.Schema({
  farming: { type: farmingProfessionSchema, default: () => ({}) },
  fishing: { type: fishingProfessionSchema, default: () => ({}) },
  cooking: { type: professionSchema, default: () => ({}) },
  alchemy: { type: professionSchema, default: () => ({}) },
  smithing: { type: professionSchema, default: () => ({}) },
  woodcutting: { type: professionSchema, default: () => ({}) },
  mining: { type: professionSchema, default: () => ({}) },
  unlockedBlueprints: { type: [String], default: [] }
}, { _id: false });

const petOwnedSchema = new mongoose.Schema({
  instanceId: { type: String, required: true }, // unique string
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  nickname: { type: String, default: null },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  hp: { type: Number, default: 50 },
  maxHp: { type: Number, default: 50 },
  atk: { type: Number, default: 10 },
  def: { type: Number, default: 5 },
  spd: { type: Number, default: 8 },
  hunger: { type: Number, default: 100 }, // 0-100
  element: { type: String, default: 'Netral' },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  lastFedAt: { type: Date, default: null },
  lastBattledAt: { type: Date, default: null },
  isLocked: { type: Boolean, default: false }, // true saat sedang battle
  affinity: { type: Number, default: 0 }, // max 100
  statMultipliers: {
    hp: { type: Number, default: 1.0 },
    atk: { type: Number, default: 1.0 },
    def: { type: Number, default: 1.0 },
    spd: { type: Number, default: 1.0 }
  }
}, { _id: false });

const assetOwnedSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  quantity: { type: Number, default: 1 },
  lastClaimAt: { type: Date, default: null },
  constructionCompleteAt: { type: Date, default: null },
  assignedWorkers: { type: [{ workerId: String, endTime: { type: Date, default: null } }], default: [] },
  progressAccumulated: { type: Number, default: 0 },
  lastProgressUpdate: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'building', 'active'], default: 'active' },
  isHalted: { type: Boolean, default: false },
  lastWarningSentAt: { type: Date, default: null },
  isDamaged: { type: Boolean, default: false },
  damageType: { type: String, enum: ['bandit', 'disaster', null], default: null },
  guardEndTime: { type: Date, default: null },
  toolDurabilityUsage: { type: Map, of: Number, default: {} },
  activeCrafts: { type: [{ recipeName: String, targetQuantity: Number, progressHours: { type: Number, default: 0 } }], default: [] },
  placement: {
    zoneId: { type: String, default: null },
    tileX: { type: Number, default: null },
    tileY: { type: Number, default: null },
  },
  isOpenToPublic: { type: Boolean, default: true },
  isPubliclyVisible: { type: Boolean, default: true },
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════
// CULTIVATION LAW SYSTEM — 15 Jalur Hukum Semesta (90 Stages / 9 Ranks)
// Referensi: implementation_plan.md §11.3
// ═══════════════════════════════════════════════════════════════════════

const LAW_TYPE_ENUM = [
  'element_phoenix_fire', 'element_azure_water', 'element_xuanwu_earth',
  'element_qingdi_wood', 'element_roc_wind', 'element_godthunder_light',
  'body_tempering', 'gu_master', 'natal_artifact', 'natal_beast',
  'demonic_turbid_core', 'demonic_blood_soul', 'demonic_myriad_venom',
  'demonic_abyssal_pact', 'demonic_nether_darkness',
  null
];

const boundEntitySchema = new mongoose.Schema({
  entityType: { type: String, enum: ['artifact', 'beast', null], default: null },
  baseItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  originalName: { type: String, default: null },       // Contoh: "Pedang Besi Karatan" atau "Anak Anjing Kampung"
  customName: { type: String, default: null },         // Nama pemberian pemain (misal: "Bilah Pelindung Jiwa")
  rankLevel: { type: Number, default: 0 },             // Mengikuti Law Rank
  evolutionStage: { type: String, default: 'Mortal' }, // Mortal -> Spirit -> Earth -> Heaven -> Primordial
  essence: { type: Number, default: 0 },               // Beast Essence Bar / Artifact Infusion Bar
  maxEssence: { type: Number, default: 100 },
  beastCurrentHp: { type: Number, default: 100 },
  beastMaxHp: { type: Number, default: 100 },
  beastAtk: { type: Number, default: 15 },
  beastDef: { type: Number, default: 10 },
  beastSpd: { type: Number, default: 12 },
  lastFeedAt: { type: Date, default: null }
}, { _id: false });

const demonicDataSchema = new mongoose.Schema({
  turbidCoresConsumed: { type: Number, default: 0 },
  balefulAura: { type: Number, default: 0 },           // Penumpukan hawa kotor (0-100)
  bloodEssenceVials: { type: Number, default: 0 },
  soulBannerCaptures: { type: Number, default: 0 },    // Jumlah arwah terserap
  infamy: { type: Number, default: 0 },                // Poin buronan sekte ortodoks
  venomToxinLevel: { type: Number, default: 0 },       // Toleransi racun
  venomTypesConsumed: { type: Number, default: 0 },    // Berapa jenis racun telah diminum
  abyssalPactTier: { type: Number, default: 0 },
  abyssalTributeDueAt: { type: Date, default: null },  // Tenggat waktu upeti iblis
  corruptionIndex: { type: Number, default: 0 }        // +1% ATK per 10 corruption (bonus Demonic)
}, { _id: false });

const lawDailyDataSchema = new mongoose.Schema({
  channelMinutesToday: { type: Number, default: 0 },   // Base cap: 90 mnt + streak bonus
  lastDailyResetAt: { type: Date, default: Date.now },
  lastEpiphanyClaimAt: { type: Date, default: null },  // Klaim pencerahan harian (+10% Qi cap instan)
  lastMaintenanceAt: { type: Date, default: null },    // Perawatan harian law (pakan/asah/mandi)
  dailyMissionsCompleted: { type: Number, default: 0 },
  dailyMissionIds: { type: [String], default: [] },    // 3 misi acak hari ini
  lastDailyChestClaimAt: { type: Date, default: null },
  weeklyMissionsCount: { type: Number, default: 0 },
  lastWeeklyChestClaimAt: { type: Date, default: null }
}, { _id: false });

const cultivationLawSchema = new mongoose.Schema({
  // Jalur Law terpilih (hanya bisa diisi saat realmIndex === 0, PERMANEN setelah dipilih)
  activeLawType: { type: String, enum: LAW_TYPE_ENUM, default: null },
  boundAt: { type: Date, default: null },              // Timestamp saat Law pertama kali diikat

  // Progres Kultivasi Law
  rank: { type: Number, default: 0, min: 0, max: 8 },      // Rank 0 s/d 8
  stage: { type: Number, default: 0, min: 0, max: 9 },     // Stage 0 s/d 9 per rank (Total 90 stages)
  qi: { type: Number, default: 0, min: 0 },                // Akumulasi Qi (atau True Qi untuk Body Tempering)
  maxQi: { type: Number, default: 756 },                   // Target Qi stage saat ini (dihitung dari formula §2.4)

  // Channeling State
  isChanneling: { type: Boolean, default: false },
  lastChannelSyncAt: { type: Date, default: null },

  // Gating & Bonus Karakter
  lawLevelCapBonus: { type: Number, default: 0 },          // +2 per stage selesai (Max +180 dari 90 stage)
  lawSkillPoints: { type: Number, default: 0 },            // Poin pohon skill yang belum dialokasikan

  // Slot 2: Permanent Common Binding (Khusus Natal Artifact & Natal Beast)
  boundEntity: { type: boundEntitySchema, default: () => ({}) },

  // Demonic Laws Specific Trackers
  demonicData: { type: demonicDataSchema, default: () => ({}) },

  // Daily Channeling Cap, Streak, & Misi
  dailyData: { type: lawDailyDataSchema, default: () => ({}) },

  // Combat Loadout (Sistem 4+1: Basic Attack Senjata otomatis + 4 Jurus dari Skill Tree)
  unlockedSkillIds: { type: [String], default: [] },       // ID skill dari pohon yang telah diambil
  combatLoadout: { type: [String], default: [] },          // Maksimal 4 jurus aktif terpilih

  // Cooldowns Terobosan
  miniBreakthroughCooldownUntil: { type: Date, default: null },
  majorBreakthroughCooldownUntil: { type: Date, default: null },

  // Gu Master Specific (Aperture Slot)
  guSlots: [{
    guItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    guName: { type: String, default: null },
    guType: { type: String, enum: ['attack', 'defense', 'healing', 'support', null], default: null },
    level: { type: Number, default: 1 },
    hunger: { type: Number, default: 100 },            // 0-100; 0 = hibernasi (tidak bisa dipanggil bertarung)
    lastFedAt: { type: Date, default: null }
  }],

  // Body Tempering Specific (9 Body Parts Tempering Progress)
  bodyTemperingParts: {
    head: { type: Number, default: 0 },
    torso: { type: Number, default: 0 },
    leftArm: { type: Number, default: 0 },
    rightArm: { type: Number, default: 0 },
    leftLeg: { type: Number, default: 0 },
    rightLeg: { type: Number, default: 0 },
    spine: { type: Number, default: 0 },
    dantian: { type: Number, default: 0 },
    skin: { type: Number, default: 0 }
  }
}, { _id: false });

const playerSchema = new mongoose.Schema({

  questLog: [{
    questId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quest' },
    questKey: { type: String },
    status: { type: String, enum: ['active', 'completed', 'claimed', 'failed'], default: 'active' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    claimedAt: { type: Date, default: null },
    objectiveProgress: [{
      index: Number,
      done: { type: Boolean, default: false },
      waitStartedAt: Date,
      waitDeadlineAt: Date,
      submittedQty: { type: Number, default: 0 }
    }],
    lastTouchedAt: Date
  }],
  discordId: { type: String, required: false, index: true, default: null },
  guildId: { type: String, required: false, index: true, default: null },
  email: { type: String, index: { unique: true, sparse: true }, default: null },
  passwordHash: { type: String, default: null },
  username: { type: String, index: { unique: true, sparse: true }, default: null },
  prologueCompleted: { type: Boolean, default: false },


  characterName: { type: String, required: true },

  currentLocation: {
    regionSlug: { type: String, default: 'central_plains' },
    settlementName: { type: String, default: 'Desa Xingcun' },
    buildingName: { type: String, default: null }
  },

  gridPosition: {
    zoneId: { type: String, default: 'central_plains_bamboo_forest' },
    tileX: { type: Number, default: 0 },
    tileY: { type: Number, default: 0 },
    interiorInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyStructure', default: null }
  },

  equippedMount: { type: String, default: null }, // ferghana_horse, spirit_horned_horse, shadow_tiger, flying_sword
  bodyTemperingLevel: { type: Number, default: 0 }, // Mengurangi stamina cost melangkah
  thermalState: {
    consecutiveBreachTicks: { type: Number, default: 0 },
    hasMeridianDamage: { type: Boolean, default: false },
    lastEvaluatedAt: { type: Date, default: null }
  },

  exploredTiles: [{
    zoneId: { type: String, required: true },
    tileIndexes: { type: [Number], default: [] }
  }],
  exploredChunks: { type: [String], default: [] },

  gridMove: {
    targetX: { type: Number, default: null },
    targetY: { type: Number, default: null },
    targetZoneId: { type: String, default: null },
    moveStartedAt: { type: Date, default: null },
    moveArrivesAt: { type: Date, default: null }
  },

  discoveredSecretTileIds: { type: [String], default: [] },
  lastGridSearchAt: { type: Date, default: null },

  // DEPRECATED — data historis narasi lama, sudah tidak dipakai logika manapun. Jangan tulis ke sini lagi.
  legacyRealm: { type: String, default: 'Mortal' },

  baseCarryCapacity: { type: Number, default: null },
  legacyStage: { type: String, default: '-' },

  systemCultivation: {
    realm: { type: String, default: 'Fondasi Fana (Mortal Foundation)' },
    stage: { type: Number, default: 0 }, // 1-9 untuk realm selain Mortal
    qi: { type: Number, default: 0 },
    lastSyncAt: { type: Date, default: Date.now },
    isFlawedFoundation: { type: Boolean, default: false }
  },

  // Sistem 15 Hukum Semesta (Law Cultivation) — 90 Stages / 9 Ranks
  cultivationLaw: { type: cultivationLawSchema, default: () => ({}) },


  talents: {
    str: { type: Number, default: 5 },
    agi: { type: Number, default: 5 },
    sta: { type: Number, default: 5 },
    pow: { type: Number, default: 5 },
    int: { type: Number, default: 5 },
    mor: { type: Number, default: 5 }
  },
  unallocatedTalentPoints: { type: Number, default: 0 },

  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },

  biography: { type: String, default: '', maxlength: 500 },
  nickname: { type: String, default: null },

  currentHp: { type: Number, default: null },
  deathRecoveryUntil: { type: Date, default: null },
  lastKilledAt: { type: Date, default: null },
  lastKilledByMonster: { type: String, default: null },
  currentStamina: { type: Number, default: 100 },
  maxStamina: { type: Number, default: 100 },
  rest: {
    status: { type: String, enum: ["idle", "resting"], default: "idle" },
    mode: { type: String, enum: ["tent", "open", null], default: null },
    startedAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    lastAppliedAt: { type: Date, default: null },
    usedTentItem: { type: Boolean, default: false }
  },
  conditions: { type: playerConditionsSchema, default: () => ({}) },
  combatConditions: [{
    type: {
      type: String,
      enum: ['poison', 'injury', 'bleed', 'intox', 'frozen', 'psychosis', 'burn', 'knockback']
    },
    severity: { type: Number, default: 1 },
    remainingTurns: { type: Number, default: 0 }
  }],
  currentMp: { type: Number, default: null },

  kungfuSkills: {
    sword: { type: Number, default: 0 },
    saber: { type: Number, default: 0 },
    staff: { type: Number, default: 0 },
    fist: { type: Number, default: 0 },
    finger: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    forging: { type: Number, default: 0 },
    qimen: { type: Number, default: 0 },
    melody: { type: Number, default: 0 },
    healing: { type: Number, default: 0 },
    wineArt: { type: Number, default: 0 },
    hiddenWeapon: { type: Number, default: 0 },
    stealing: { type: Number, default: 0 },
    core: { type: Number, default: 0 },
    practiceStartedAt: { type: Date, default: null },
    lastPracticeAt: { type: Date, default: null },
    activePracticeSkill: { type: String, default: null }
  },

  body: {
    face: { type: String, default: 'default_face_01' },
    hair: { type: String, default: 'default_hair_01' },
    cloth: { type: String, default: 'default_cloth_01' },
    mask: { type: String, default: null },
    spellAvatar: { type: String, default: null },
    title: { type: String, default: null },
    avatarBorder: { type: String, default: null },
    chatBorder: { type: String, default: null }
  },
  unlockedTitles: { type: [String], default: [] },

  age: { type: Number, default: 16 },
  gender: { type: String, enum: ['Pria', 'Wanita', 'Laki-laki', 'Perempuan', null], default: null },


  stats: { type: playerStatsSchema, default: () => ({}) },
  extendedStats: { type: extendedStatsSchema, default: () => ({}) },
  alignment: {
    righteous: { type: Number, default: 50 },
    demonic:   { type: Number, default: 0 }
  },
  destinyNature:  { type: [String], default: () => ['Dual Talents'] },
  destinyNurture: { type: [String], default: () => ['Taoist Mind Essence'] },
  personalityTags: { type: [String], default: () => ['Protective', 'Carefree'] },
  internalTraits: { type: String, default: 'Middle Way' },
  externalTraits: { type: String, default: 'Traditional Carefree' },
  charisma:       { type: String, default: 'Average' },
  interests:      { type: [String], default: () => ['Bambooware', 'Flute', 'Wine'] },
  race:           { type: String, default: 'Human' },
  reputation:     { type: Number, default: 100 },
  reputationTitle: { type: String, default: 'Novice Cultivator' },
  laws: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Law' }], default: [] },
  manuals: { type: [playerManualSchema], default: [] },
  isNormalCultivator: { type: Boolean, default: false },

  sect: { type: String, default: 'Tanpa Sekte (Rogue Cultivator)' },

  sectExamState: {
    activeSectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sect', default: null },
    activeType: { type: String, enum: ['combat', 'trial_task', null], default: null },
    trialAssignedAt: { type: Date, default: null },
    trialDeadlineAt: { type: Date, default: null },
    lastAttempts: [{
      sectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sect' },
      at: { type: Date },
      result: { type: String, enum: ['success', 'fail'] }
    }]
  },

  characterImage: { type: String, default: null },
  avatarUrl: { type: String, default: null },

  currency: {
    copper: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    jade: { type: Number, default: 0 },
    spirit: { type: Number, default: 0 },
  },

  equipment: {
    weapon: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    armor: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    helmet: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    pants: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    boots: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    accessory: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    mount: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    talisman: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    artifact: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null }
  },

  inventory: { type: [inventoryItemSchema], default: [] },
  discoveredLocations: { type: [String], default: ['central_plains|Desa Xingcun'] },
  discoveredRegions: { type: [String], default: ['central_plains'] },

  marriage: {
    status: { type: String, enum: ['single', 'proposed', 'married'], default: 'single' },
    spouseId: { type: String, default: null },
    marriageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Marriage', default: null }
  },
  petSlots: { type: Number, default: 2 },
  pets: {
    type: [petOwnedSchema],
    default: [],
    validate: {
      validator: function(v) { return v.length <= this.petSlots; },
      message: 'Melebihi maksimal pet slot'
    }
  },
  assetSlots: { type: Number, default: 1 },
  assets: {
    type: [assetOwnedSchema],
    default: [],
    validate: {
      validator: function(v) {
        const totalAssets = v.reduce((sum, asset) => sum + (asset.quantity || 1), 0);
        return totalAssets <= this.assetSlots;
      },
      message: 'Melebihi maksimal asset slot'
    }
  },

  customStatus: { type: String, default: null },

  status: {
    type: String,
    enum: ['active', 'frozen', 'dead'],
    default: 'active',
  },

  lastDailyClaim: { type: Date, default: null },
  dailyStreak: { type: Number, default: 0 },
  registeredAt: { type: Date, default: Date.now },

  hasCompletedTour: { type: Boolean, default: false },
  prologueCompleted: { type: Boolean, default: false },

  lastDisasterHitAt: { type: Date, default: null },
  energy: { current: { type: Number, default: 100 }, lastUpdated: { type: Date, default: Date.now } },
  lastBanditHitAt: { type: Date, default: null },

  professions: { type: professionsSchema, default: () => ({}) },

  totalWealth: { type: Number, default: 0, index: true },

  activeBuffs: {
    type: [{
      buffType: { type: String, enum: ['hp_boost', 'atk_boost', 'def_boost', 'exp_bonus', 'energy_regen', 'anti_poison'] },
      value: { type: Number },
      expiresAt: { type: Date }
    }],
    default: []
  },

  cooldowns: {
    remarry: { type: Date, default: null }
  },

  // Schema version for migrations & integrity
  schemaVersion: { type: Number, default: 2, index: true },
}, { timestamps: true });

playerSchema.index({ discordId: 1, guildId: 1 }, { unique: true, sparse: true });
playerSchema.index({ guildId: 1, "pets.instanceId": 1 }); // Index untuk pencarian pet instance yang efisien
playerSchema.index({ guildId: 1, 'gridPosition.zoneId': 1, 'gridPosition.tileX': 1, 'gridPosition.tileY': 1 });


// Setiap kali player disimpan: (1) currency dinormalisasi otomatis (100 Silver->1 Gold, dst),
// (2) totalWealth dihitung ulang dari currency yang SUDAH dinormalisasi.
playerSchema.pre('save', function (next) {
  normalizeCurrency(this.currency);
  const c = this.currency || {};
  this.totalWealth = ((c.copper || 0) / 100) + (c.silver || 0) + (c.gold || 0) * 100 + (c.jade || 0) * 10000 + (c.spirit || 0) * 1000000;
  next();
});

module.exports = mongoose.model('Player', playerSchema);
