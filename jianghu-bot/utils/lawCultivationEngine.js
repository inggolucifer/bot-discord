/**
 * LAW CULTIVATION ENGINE — Mesin Kalkulasi Deterministik 15 Hukum Semesta
 * 
 * Modul otoritatif server-side untuk:
 * 1. Kalkulasi Qi / True Qi per stage & rank (formula §2.4)
 * 2. Daily Channeling Cap Manager (§2.5)
 * 3. Mini-Breakthrough Engine (§2.7)
 * 4. Major Breakthrough Engine (§2.8)
 * 5. Tribulasi Langit (§5.1 - §5.4)
 * 6. Level Cap Integration (§2.6)
 * 
 * Referensi: implementation_plan.md §2, §3, §5, §10, §11.3
 */

const { isClaimedToday, isClaimedYesterday } = require('./dailyClaim');

// ═══════════════════════════════════════════════════════════════
// KONSTANTA & KONFIGURASI
// ═══════════════════════════════════════════════════════════════

/**
 * 15 Law Enum & Metadata
 * pathMod: Semakin tinggi pathMod, semakin sulit petir tribulasi dan laju channel lebih lambat (LAW_BALANCE.CHANNEL_PATHMOD_MODE = 'penalty').
 * essence bar: Bar Konsumsi/Reservoir wajib > 0 untuk memperoleh Xiuwei / Qi kultivasi (Bar kosong = 0 Qi).
 */
const LAW_DEFINITIONS = {
  element_phoenix_fire:     { 
    name: 'Api Phoenix Sejati',      
    qiType: 'qi',      
    energyLabel: 'Samadhi Phoenix Qi',
    pathMod: 1.08, 
    category: 'element',  
    element: 'Fire', 
    rootKey: 'fire',
    stageBonus: { atk: 8, crit: 2, rootExp: 25, lifespan: 4 }
  },
  element_azure_water:      { 
    name: 'Samudra Naga Azure',      
    qiType: 'qi',      
    energyLabel: 'Azure Tide Qi',
    pathMod: 1.02, 
    category: 'element',  
    element: 'Water', 
    rootKey: 'water',
    stageBonus: { hp: 25, def: 4, rootExp: 25, lifespan: 5 }
  },
  element_xuanwu_earth:     { 
    name: 'Inti Bumi Xuanwu',        
    qiType: 'qi',      
    energyLabel: 'Leyline Heavy Qi',
    pathMod: 0.98, 
    category: 'element',  
    element: 'Earth', 
    rootKey: 'earth',
    stageBonus: { def: 7, hp: 20, martialRes: 3, rootExp: 25, lifespan: 4 }
  },
  element_qingdi_wood:      { 
    name: 'Pohon Hayat Qingdi',      
    qiType: 'qi',      
    energyLabel: 'Vitality Life Qi',
    pathMod: 1.00, 
    category: 'element',  
    element: 'Wood', 
    rootKey: 'wood',
    stageBonus: { hp: 35, vitality: 5, rootExp: 25, lifespan: 8 }
  },
  element_roc_wind:         { 
    name: 'Sayap Badai Roc Kuno',    
    qiType: 'qi',      
    energyLabel: 'Astral Gale Qi',
    pathMod: 1.05, 
    category: 'element',  
    element: 'Wind', 
    rootKey: 'wind',
    stageBonus: { agility: 5, travelSpeed: 3, rootExp: 25, lifespan: 3 }
  },
  element_godthunder_light: { 
    name: 'Petir Hukuman Dewa',      
    qiType: 'qi',      
    energyLabel: 'Heavenly Lightning Qi',
    pathMod: 1.15, 
    category: 'element',  
    element: 'Lightning', 
    rootKey: 'lightning',
    stageBonus: { atk: 10, crit: 3, rootExp: 25, lifespan: 3 }
  },
  body_tempering:           { 
    name: 'Penempaan Raga Suci',     
    qiType: 'true_qi', 
    energyLabel: 'True Qi (真气 - Raga Jasmani)',
    pathMod: 1.00, 
    category: 'physical', 
    element: 'Physical', 
    stageBonus: { hp: 35, def: 6, maxStamina: 5, vitality: 4, lifespan: 3 }
  },
  gu_master:                { 
    name: 'Rongga Sepuluh Ribu Gu',  
    qiType: 'qi',      
    energyLabel: 'Myriad Gu Venom Qi',
    pathMod: 1.20, 
    category: 'special',  
    element: 'Poison', 
    stageBonus: { atk: 6, spiritualRes: 3, lifespan: 3 }
  },
  natal_artifact:           { 
    name: 'Pusaka Jiwa Kelahiran',   
    qiType: 'qi',      
    energyLabel: 'Soul Resonance Qi',
    pathMod: 1.05, 
    category: 'bond',     
    element: 'Neutral', 
    stageBonus: { atk: 7, def: 3, lifespan: 3 }
  },
  natal_beast:              { 
    name: 'Satwa Roh Kelahiran',     
    qiType: 'qi',      
    energyLabel: 'Blood Oath Symbiotic Qi',
    pathMod: 1.10, 
    category: 'bond',     
    element: 'Neutral', 
    stageBonus: { hp: 20, atk: 5, lifespan: 3 }
  },
  demonic_turbid_core:      { 
    name: 'Pelebur Inti Siluman',    
    qiType: 'qi',      
    energyLabel: 'Baleful Beast Qi',
    pathMod: 1.40, 
    category: 'demonic',  
    element: 'Dark', 
    stageBonus: { atk: 8, def: 3, lifespan: 2 }
  },
  demonic_blood_soul:       { 
    name: 'Penghisap Darah & Jiwa',  
    qiType: 'qi',      
    energyLabel: 'Blood Essence Qi',
    pathMod: 1.55, 
    category: 'demonic',  
    element: 'Dark', 
    stageBonus: { atk: 9, hp: 15, lifespan: 2 }
  },
  demonic_myriad_venom:     { 
    name: 'Seribu Racun Pemusnah',   
    qiType: 'qi',      
    energyLabel: 'Corrosive Toxic Qi',
    pathMod: 1.35, 
    category: 'demonic',  
    element: 'Poison', 
    stageBonus: { def: 4, spiritualRes: 5, lifespan: 2 }
  },
  demonic_abyssal_pact:     { 
    name: 'Kontrak Iblis Abyss',     
    qiType: 'qi',      
    energyLabel: 'Abyssal Void Qi',
    pathMod: 1.50, 
    category: 'demonic',  
    element: 'Dark', 
    stageBonus: { atk: 9, lifespan: 2 }
  },
  demonic_nether_darkness:  { 
    name: 'Bayangan Sembilan Yin',   
    qiType: 'qi',      
    energyLabel: 'Nether Yin Qi',
    pathMod: 1.25, 
    category: 'demonic',  
    element: 'Dark', 
    stageBonus: { agility: 4, atk: 6, lifespan: 3 }
  },

  // ═══════════════════════════════════════════════════════════════
  // 5 RIGHTEOUS / ORTHODOX LAWS (Jalur Jasa, Yang, Pedang, Formasi, Karma)
  // ═══════════════════════════════════════════════════════════════
  righteous_heavenly_merit: {
    name: 'Hukum Jasa Langit',
    qiType: 'qi',
    energyLabel: 'Merit Qi',
    pathMod: 1.08,
    category: 'righteous',
    element: 'Merit',
    faction: 'righteous',
    stageBonus: { hp: 20, def: 4, spiritualRes: 3, lifespan: 5, rootExp: 0 }
  },
  righteous_pure_yang: {
    name: 'Kitab Yang Murni',
    qiType: 'qi',
    energyLabel: 'Pure Yang Qi',
    pathMod: 1.10,
    category: 'righteous',
    element: 'Yang',
    faction: 'righteous',
    stageBonus: { atk: 5, spiritualRes: 5, lifespan: 4 }
  },
  righteous_sword_heart: {
    name: 'Hati Pedang',
    qiType: 'qi',
    energyLabel: 'Sword Intent Qi',
    pathMod: 1.12,
    category: 'righteous',
    element: 'Metal',
    faction: 'righteous',
    stageBonus: { atk: 9, crit: 3, lifespan: 3 }
  },
  righteous_formation_array: {
    name: 'Formasi Bendera',
    qiType: 'qi',
    energyLabel: 'Array Qi',
    pathMod: 1.06,
    category: 'righteous',
    element: 'Earth',
    faction: 'righteous',
    stageBonus: { def: 8, hp: 25, martialRes: 3, lifespan: 4 }
  },
  righteous_karmic_mirror: {
    name: 'Cermin Karma',
    qiType: 'qi',
    energyLabel: 'Karma Clarity Qi',
    pathMod: 1.14,
    category: 'righteous',
    element: 'Spirit',
    faction: 'righteous',
    stageBonus: { spiritualRes: 6, def: 4, lifespan: 4 }
  }
};

/**
 * LAW_BALANCE (Master Plan §5.4 & Balance Pass)
 * Satu-satunya sumber kebenaran (Single Source of Truth) untuk konstanta perimbangan 15 Law.
 */
const LAW_BALANCE = {
  // Universal progression (semua law)
  STAT_MULT_PER_STAGE: 0.006,        // was 0.008 — turunkan sedikit anti explosion
  SPD_MULT_PER_STAGE_FACTOR: 0.5,    // spd dapat setengah dari hp/atk/def
  SKILL_TREE_MULT_PER_LEVEL: 0.003,  // was 0.004

  // Channel: pathMod mempengaruhi laju Qi (perbaiki inkonsistensi dokumentasi)
  // effectiveRate = baseRate * (1 / pathMod)  → pathMod tinggi = channel LEBIH LAMBAT (harga tribulasi+power)
  CHANNEL_PATHMOD_MODE: 'penalty',   // 'penalty' | 'bonus'
  // penalty: rate *= (1 / clamp(pathMod, 0.9, 1.6))
  // bonus:   rate *= clamp(pathMod, 0.9, 1.6)

  // Demonic stacking caps
  CORRUPTION_ATK_PERCENT_PER_10: 0.01,
  CORRUPTION_ATK_PERCENT_CAP: 0.06,      // max +6% dari corruption (bukan 10% full 100)
  DEMONIC_RANK_ATK_MULT: 0.03,           // was 0.05 / 0.035 — samakan ke elemen ofensif
  SOUL_BANNER_ATK_PER_CAPTURE: 2,        // was 3
  SOUL_BANNER_ATK_CAP_BASE: 20,
  SOUL_BANNER_ATK_CAP_PER_RANK: 35,      // cap = 20 + rank*35 (was rank*60+30 — lebih ketat)
  VENOM_ATK_PER_LEVEL: 1.5,              // was 2
  VENOM_ATK_CAP_BASE: 15,
  VENOM_ATK_CAP_PER_RANK: 30,

  // Daily anti-farm (per discordId, reset WIB sama seperti daily cap)
  DAILY_TURBID_ABSORB_MAX: 20,
  DAILY_BLOOD_HARVEST_MAX: 15,
  DAILY_SOUL_BANNER_MAX: 15,
  DAILY_VENOM_DRINK_MAX: 15,

  // Gu
  GU_COMBAT_MAX_ACTIVE_SLOTS: 3,         // dari max 5 equip, hanya 3 terkuat masuk combat
  GU_ATK_SCALE_PER_TIER: 0.85,           // multiplier ke bonusAtk efektif di combat
  GU_FUSION_SUCCESS_FLAT_QI: 100,        // was 150 jika masih 150

  // Body tempering
  BODY_RANK_HP_MULT: 0.035,              // was 0.06
  BODY_RANK_DEF_MULT: 0.035,             // was 0.06
  BODY_RANK_FLAT_HP: 55,                 // was 100
  BODY_MOVE_HARVEST_CHANCE: 0.12,        // was ~0.20–0.25 jika ada — turunkan passive

  // Elemen underpowered buffs
  EARTH_RANK_DEF_MULT: 0.045,            // sedikit di atas 0.04
  EARTH_RANK_FLAT_DEF: 8,                // per rank ke flat.def (rank * 8)
  WATER_RANK_HP_MULT: 0.035,
  WATER_RANK_DEF_MULT: 0.015,
  WOOD_RANK_HP_MULT: 0.03,
  WOOD_RANK_FLAT_HP: 70,                 // was 60
  WOOD_RANK_VITALITY_FLAT: 3,            // per rank ke extendedStats jika pipeline support

  // Thunder (tetap kuat tapi tidak dewa)
  THUNDER_RANK_ATK_MULT: 0.022,          // was 0.025
  THUNDER_RANK_SPD_MULT: 0.018,          // was 0.02

  // Fire / wind fine-tune
  FIRE_RANK_ATK_MULT: 0.028,             // was 0.03
  WIND_RANK_SPD_MULT: 0.038,

  // Natal
  NATAL_ARTIFACT_USE_BOUND_STATS_FIRST: true,
  NATAL_FALLBACK_ATK_PER_RANK: 12,       // was 25 — fallback tidak boleh lebih gila dari bound stats
  NATAL_FALLBACK_DEF_PER_RANK: 8,        // was 15
  NATAL_BEAST_HP_SHARE: 0.35,            // was 0.5 dari beastMaxHp
  NATAL_BEAST_FALLBACK_ATK_PER_RANK: 10, // was 15
  NATAL_BEAST_FALLBACK_DEF_PER_RANK: 7,

  // Infamy
  INFAMY_WANTED_THRESHOLD: 100,          // existing
  INFAMY_PER_BLOOD_ACTION: 5,
  INFAMY_PER_VENOM_ACTION: 3,
  INFAMY_STAT_PENALTY_START: 50,         // mulai -2% atk/def per 25 infamy di atas 50, cap -12%
  INFAMY_STAT_PENALTY_STEP: 25,
  INFAMY_STAT_PENALTY_PER_STEP: 0.02,
  INFAMY_STAT_PENALTY_CAP: 0.12,

  // Abyss / nether (pertahankan severity)
  ABYSS_CURSE_MULT_L1: 0.70,
  ABYSS_CURSE_MULT_L2: 0.40,
  NETHER_DEBUFF_MULT: 0.50,

  // Righteous
  MERIT_RANK_HP_MULT: 0.025,
  MERIT_RANK_DEF_MULT: 0.02,
  MERIT_VS_WANTED_ATK_MULT: 0.04,
  YANG_RANK_ATK_MULT: 0.02,
  YANG_RANK_SPIRIT_RES: 2,
  YANG_VS_CORRUPTION_ATK: 0.03,
  SWORD_RANK_ATK_MULT: 0.035,
  SWORD_RANK_CRIT: 0.5,
  SWORD_UNARMED_PENALTY: 0.85,
  ARRAY_RANK_DEF_MULT: 0.04,
  ARRAY_RANK_HP_MULT: 0.03,
  ARRAY_HOME_BONUS: 1.08,
  KARMA_RANK_DEF_MULT: 0.025,
  KARMA_REFLECT_PCT: 0.02,
  KARMA_INFAMY_SELF_PENALTY: 0.01
};

/**
 * ═══════════════════════════════════════════════════════════════
 * LAW PROGRESSION CONFIGURATION (RANK TARGET DAYS: 7D RANK 0, ~2.5Y TO RANK 8)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Filosofi Desain:
 * - Rank 0 (Mortal Law rank 0 -> major breakthrough Rank 1): WAJIB ~7 hari channeling rajin.
 * - Total Rank 0 -> 8: ~24–36 bulan (935 hari channeling efektif = ~2.56 tahun).
 * - Sumber kebenaran tunggal: tabel RANK_TARGET_DAYS non-linear, bukan satu eksponen global.
 */
const LAW_PROGRESSION = {
  // Target hari channel-efektif (esensi cukup, pathMod 1.0, full daily cap) untuk MENYELESAIKAN semua stage di rank tsb
  RANK_TARGET_DAYS: [
    7,    // rank 0 — onboarding (WAJIB ~7)
    18,   // rank 1
    35,   // rank 2
    55,   // rank 3 (tribulasi)
    80,   // rank 4
    110,  // rank 5
    150,  // rank 6
    200,  // rank 7
    280   // rank 8
  ],
  // sum = 935 hari ≈ 2.56 tahun channel-efektif; + farm esensi/gagal BT → wall-clock ~2.5–3.5 tahun

  BASE_CHANNEL_CAP_MINUTES: 70,  // sweet spot: cukup untuk “sesi harian”, tidak 24jam
  STREAK_BONUS_PER_DAY: 4,
  MAX_STREAK_DAYS: 7,            // cap max ~98 menit

  CHANNEL_BASE_RATE_RANK0: 28,   // rank 0 terasa cepat
  CHANNEL_BASE_RATE: 28,         // alias kompatibilitas
  // Rate growth lebih lambat dari kebutuhan Qi di rank tinggi
  CHANNEL_RATE_GROWTH: 1.42,

  ESSENCE_EMPTY_QI_MULTIPLIER: 0,  // WAJIB 0
  ESSENCE_DIGEST_BONUS: 1.0,
  ESSENCE_FULL_DIGEST_BONUS: 1.0,  // alias kompatibilitas

  DIGEST_BASE: 1.0,
  DIGEST_GROWTH: 1.28,

  MAX_ESSENCE_BASE: 100,
  MAX_ESSENCE_GROWTH: 1.75,

  // Pengisian Bar dari Konsumsi Bahan Spiritual (setelah tier affinity)
  FILL_ELEMENT_BASE: 18,
  FILL_DEMONIC_BASE: 22,
  FILL_GU_FEED_BASE: 15,
  FILL_NATAL_INFUSE_BASE: 16,
  FILL_BODY_TEMPER_TRUE_QI_TO_ESSENCE: 0,
  FILL_RIGHTEOUS_MERIT: 18,
  FILL_RIGHTEOUS_YANG: 18,
  FILL_RIGHTEOUS_SWORD: 17,
  FILL_RIGHTEOUS_ARRAY: 20,
  FILL_RIGHTEOUS_KARMA: 16,

  MAX_ESSENCE_GAIN_PER_ACTION: 35,
  BOOTSTRAP_ESSENCE: 40,  // rank 0 awal tidak frustrasi

  // Kebijakan Essence-First: Cultivation Qi utama berasal dari channel + digest bar
  INSTANT_QI_ON_ABSORB: 0,       // set 0 untuk ketat; absorb hanya mengisi bar esensi
  MAX_INSTANT_QI_PER_ACTION: 0,  // cap instant Qi per aksi absorb/feed
  DAILY_INSTANT_QI_CAP: 50,      // jika INSTANT > 0, cap harian total
};

/**
 * Nama Rank Unik per Law (Rank 0 s/d 8) — English Xianxia Unique Epithets
 * Setiap Law memiliki penamaan rank berbahasa Inggris unik sesuai jalur.
 * Format: LAW_RANK_NAMES[lawType][rankIndex] (index 0..8)
 * Rank 0: Initiate / Novice / Foundation of that specific Law path
 * Rank 8: Perfected state of that specific Law path
 */
const LAW_RANK_NAMES = {
  element_phoenix_fire:     ['Ember Initiate', 'Kindling Flame', 'Young Firewings', 'First Nirvana', 'Rising Phoenix Blaze', 'Inner Magma Heart', 'Celestial Flame Crown', 'Eternal Firebird', 'Perfected Phoenix'],
  element_azure_water:      ['Dewdrop Initiate', 'Silver Stream', 'Blue Sea Wave', 'Dragon Current', 'Clear Inner Ocean', 'Frozen Soul Glacier', 'Abyssal Maelstrom', 'Bottomless Sky Sea', 'Perfected Azure Dragon'],
  element_xuanwu_earth:     ['Pebble Initiate', 'Hardened Clay', 'Coral Bastion', 'Steel Cliff', 'Volcanic Core', 'Continental Plate', 'Leyline Foundation', 'Primordial Xuanwu Shell', 'Perfected Xuanwu'],
  element_qingdi_wood:      ['Sprout Initiate', 'Wildgrass Roots', 'Bamboo Trunk', 'Ancient Gnarled Tree', 'Living Wildwood', 'Worldroot Nexus', 'Flowering Tree of Life', 'Heaven-Canopy Grove', 'Perfected Green Emperor'],
  element_roc_wind:         ['Breeze Initiate', 'Dust Spiral', 'Gale of the Plains', 'Razor Tempest', 'Storm of the Firmament', 'Roc Wings Unfurled', 'Nine Heavens Tornado', 'Astral Boundary Wind', 'Perfected Ancient Roc'],
  element_godthunder_light: ['Static Initiate', 'Finger Lightning', 'Blackcloud Strike', 'First Heavenbolt', 'Blue Chain Lightning', 'Pure Violet Thunder', "Seventh Heaven's Judgment", 'Nine Sacred Bolts', 'Perfected Thunder God'],
  body_tempering:           ['Common Skin Initiate', 'Hardened Flesh', 'Ironbone Temper', 'Steel-Wire Muscle', 'Open Meridians', 'Pure Golden Organs', 'Dragonblood Flow', 'Vajra Impervious Body', 'Perfected Physique'],
  gu_master:                ['Worm Planter Initiate', 'Early Nest Keeper', 'Young Gu Breeder', 'Colony Controller', 'Gu Fusion Master', 'Aperture King', 'Lord of Ten Thousand', 'Primordial Chaos Cavity', 'Perfected Gu'],
  natal_artifact:           ['Mundane Vessel Initiate', 'Glimmering Relic', 'Young Spirit Weapon', 'Inner Core Artifact', 'Living Inner Relic', 'Breathing Relic', 'Soulbound Weapon', 'Heavenly Relic', 'Perfected Relic'],
  natal_beast:              ['Mundane Cub Initiate', 'Minor Spirit Beast', 'Gifted Young Beast', 'Growing Spirit Tiger', 'Metamorphic Beast', 'Awakened Ancient Spirit', 'Skyborne Spirit Beast', 'True Spirit Dragon', 'Perfected Spirit Beast'],
  demonic_turbid_core:      ['Faint Miasma Initiate', 'Filth Core Absorber', 'Young Core Purger', 'Beast Aura Smelter', 'Miasma Sovereign', 'Black Haze Devourer', 'Dark Core Tyrant', 'Beast-Core Demon King', 'Perfected Core Demon'],
  demonic_blood_soul:       ['Blood Sip Initiate', 'Mortal Blood Drinker', 'Weak Soul Binder', 'First Soul Banner', 'Silent Lifetaker', 'Surging Blood Sea', 'Nine-Soul Overlord', 'Blood Hell King', 'Perfected Blood Demon'],
  demonic_myriad_venom:     ['Mild Venom Initiate', 'Diluted Poison Drinker', 'Toxin-Tolerant Flesh', 'Venom Sac Formed', 'Thousandfold Venom', 'Death-Immune Flesh', 'Corrosive Venom Dragon', 'Annihilating Venom Sea', 'Perfected Venom Demon'],
  demonic_abyssal_pact:     ['Faint Whisper Initiate', 'First Contract', 'Blood Covenant', 'Young Demon Vessel', 'Fourth Seal Opened', "Demon's Right Hand", 'Abyss Incarnate', 'Abyssal Throne Heir', 'Perfected Pact Demon'],
  demonic_nether_darkness:  ['Fading Shadow Initiate', 'Thin Yin Mist', 'Creeping Dark', 'Eternal Night Cloak', 'Shadow Domain', 'Nether Yin Lord', 'Nine-Layer Void', 'Ancient Darkness King', 'Perfected Nether Demon'],
  righteous_heavenly_merit: ['Kindness Initiate', 'Merit Acolyte', 'Radiant Virtue', 'Early Heavenly Merit', 'Dharma Guardian', 'Inner Merit of Virtue', 'Sacred Crown of Virtue', 'Avatar of Heavenly Merit', 'Perfected Great Merit'],
  righteous_pure_yang:      ['Pure Yang Initiate', 'Dawn Breath', 'True Yang Flame', 'Pure Golden Blood', 'Untainted Yang Body', 'Inner Sun', 'Primordial Yang Light', 'Heavenly Yang Sovereign', 'Perfected Eternal Yang'],
  righteous_sword_heart:    ['Sword Intent Initiate', 'Steel Edge', 'Clear Blade Flash', 'United Sword Heart', 'Spirit Flying Blade', 'Lord of Nine Swords', 'Domain of a Thousand Blades', 'Primordial Ancient Sword', 'Perfected Sword God'],
  righteous_formation_array:['Banner Initiate', 'Basic Grid Pattern', 'Eight-Direction Seal', 'Firm Array Foundation', 'Leyline Controller', 'Grand Formation Domain', 'Star Matrix of Heaven', 'Primordial World Seal', 'Perfected Formation Master'],
  righteous_karmic_mirror:  ['Clear Reflection Initiate', 'Dustless Mirror', 'First Karmic Gleam', 'Cause-and-Effect Sight', 'Clear Heart Mirror', "Judge of Fate's Threads", 'Eye of Karmic Law', 'Flawless Heaven Mirror', 'Perfected Great Karma']
};

/**
 * Format tampilan ranah Hukum Semesta (English Title + Rank + Stage).
 * Contoh output:
 * "Tiny Worm Planter · Rank 0 · Stage 3/9"
 * atau compact: "Tiny Worm Planter (R0-S3)"
 *
 * @param {object} playerOrLaw - Player document atau cultivationLaw object
 * @param {object} [options]
 * @returns {object|null}
 */
function formatLawRealmDisplay(playerOrLaw, options = {}) {
  const law = playerOrLaw?.cultivationLaw || playerOrLaw;
  if (!law?.activeLawType) return null;

  const rank = Number(law.rank) || 0;
  const stage = Number(law.stage) || 0;
  const titles = LAW_RANK_NAMES[law.activeLawType];
  const title = (titles && titles[rank]) || `Rank ${rank}`;
  const lawName = LAW_DEFINITIONS[law.activeLawType]?.name || law.activeLawType;

  // Primary player-facing string
  // Wajib ada title + rank + stage
  return {
    title,                             // English epithet only
    lawName,
    rank,
    stage,
    stageMax: 9,
    rankMax: 8,
    display: `${title} · Rank ${rank} · Stage ${stage}/9`,
    displayCompact: `${title} (R${rank}-S${stage})`,
    displayFull: `${lawName} — ${title} · Rank ${rank} · Stage ${stage}/9`
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * PROFIL RESERVOIR ESENSI PER LAW (Satu Bar, Sumber Berbeda)
 * ═══════════════════════════════════════════════════════════════
 * Setiap Hukum Semesta memiliki penamaan Bar Esensi, tag material pengisi,
 * dan petunjuk unik saat reservoir kosong.
 */
const LAW_ESSENCE_PROFILE = {
  element_phoenix_fire: {
    barName: 'Samadhi Flame Reservoir',
    fillTags: ['fire_catalyst', 'fire_essence', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Serap intisari api / katalis api untuk mengisi bar.'
  },
  element_azure_water: {
    barName: 'Azure Tide Reservoir',
    fillTags: ['water_catalyst', 'water_essence', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Serap intisari air murni untuk mengisi bar.'
  },
  element_xuanwu_earth: {
    barName: 'Leyline Earth Reservoir',
    fillTags: ['earth_catalyst', 'earth_essence', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Serap saripati tanah kuno untuk mengisi bar.'
  },
  element_qingdi_wood: {
    barName: 'Life Wood Reservoir',
    fillTags: ['wood_catalyst', 'wood_essence', 'herb', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Serap getah pohon purba / herba kayu untuk mengisi bar.'
  },
  element_roc_wind: {
    barName: 'Astral Gale Reservoir',
    fillTags: ['wind_catalyst', 'wind_essence', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Serap bulu angin astral / hembusan langit untuk mengisi bar.'
  },
  element_godthunder_light: {
    barName: 'Heavenly Thunder Reservoir',
    fillTags: ['thunder_catalyst', 'thunder_essence', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Serap pecahan batu petir langit untuk mengisi bar.'
  },

  body_tempering: {
    barName: 'True Body Essence Reservoir',
    fillTags: ['body_essence', 'flesh', 'mineral', 'material', 'essence'],
    fillCategories: ['material'],
    usesBodyStorage: true,
    emptyHint: 'Tempa raga / konversi esensi alam untuk mengisi reservoir raga.'
  },

  gu_master: {
    barName: 'Gu Aperture Nutrition',
    fillTags: ['gu_food', 'gu_larva', 'material', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Beri pakan Gu / nutrisi aperture.'
  },

  natal_artifact: {
    barName: 'Soul Resonance Reservoir',
    fillTags: ['ore', 'whetstone', 'material', 'common_artifact', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Infus mineral / asah pusaka jiwa.'
  },
  natal_beast: {
    barName: 'Blood Oath Reservoir',
    fillTags: ['beast_food', 'meat', 'material', 'beast_egg', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Beri makan satwa roh.'
  },

  demonic_turbid_core: {
    barName: 'Turbid Qi Reservoir',
    fillTags: ['beast_core', 'turbid_core', 'core', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Serap inti siluman kotor.'
  },
  demonic_blood_soul: {
    barName: 'Blood Essence Reservoir',
    fillTags: ['blood_vial', 'blood', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Panen darah & jiwa (batas harian tetap).'
  },
  demonic_myriad_venom: {
    barName: 'Poison Saturation Reservoir',
    fillTags: ['venom_sac', 'poison', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Minum racun bertier (HP floor 1, batas harian).'
  },
  demonic_abyssal_pact: {
    barName: 'Abyssal Tribute Reservoir',
    fillTags: ['abyssal', 'blood_vial', 'obsidian', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Persembahan di atas Altar Abyss milikmu.'
  },
  demonic_nether_darkness: {
    barName: 'Darkness Reservoir',
    fillTags: ['yin_stone', 'nether', 'dark', 'essence'],
    fillCategories: ['material'],
    emptyHint: 'Serap batu Yin / esensi kegelapan.'
  },

  // ═══════════════════════════════════════════════════════════════
  // 5 RIGHTEOUS ESSENCE PROFILES
  // ═══════════════════════════════════════════════════════════════
  righteous_heavenly_merit: {
    barName: 'Merit Reservoir',
    fillTags: ['merit_seal', 'commendation_token', 'relief_receipt'],
    fillCategories: ['material'],
    emptyHint: 'Serap Segel Jasa / Token Pujian hasil quest resmi.',
    dailyAbsorbField: 'meritAbsorbsToday',
    dailyAbsorbMax: 25
  },
  righteous_pure_yang: {
    barName: 'Yang Purity Reservoir',
    fillTags: ['yang_crystal', 'sun_essence_pill', 'white_jade_fragment'],
    fillCategories: ['material'],
    emptyHint: 'Serap Kristal Yang / Pil Matahari / Pecahan Giok Putih. Tas harus bebas item demonic kotor.',
    dailyAbsorbField: 'yangAbsorbsToday',
    dailyAbsorbMax: 20,
    requireCleanInventory: true
  },
  righteous_sword_heart: {
    barName: 'Sword Intent Reservoir',
    fillTags: ['sword_oil', 'whetstone_spirit', 'broken_blade_shard', 'sword_manual_scrap'],
    fillCategories: ['material'],
    emptyHint: 'Asah bilah dengan minyak/batu asah roh atau pecahan pedang. Wajib menenteng pedang.',
    dailyAbsorbField: 'swordAbsorbsToday',
    dailyAbsorbMax: 20,
    requireEquippedSword: true
  },
  righteous_formation_array: {
    barName: 'Array Qi Reservoir',
    fillTags: ['array_flag', 'formation_plate', 'spirit_compass'],
    fillCategories: ['material'],
    emptyHint: 'Tanam intisari bendera/lempeng formasi di atas Formation Hub milikmu.',
    dailyAbsorbField: 'arrayAbsorbsToday',
    dailyAbsorbMax: 15,
    requireFormationHubTile: true
  },
  righteous_karmic_mirror: {
    barName: 'Karma Clarity Reservoir',
    fillTags: ['karma_mirror_shard', 'judgment_talisman', 'confessional_incense'],
    fillCategories: ['material'],
    emptyHint: 'Serap pecahan cermin karma / jimat vonis / dupa pengakuan.',
    dailyAbsorbField: 'karmaAbsorbsToday',
    dailyAbsorbMax: 15,
    rejectIfInfamyAbove: 30
  },
};

/**
 * Rank kultivasi yang memicu Tribulasi Langit (gelombang petir).
 * Rank lain hanya menggunakan roll RNG biasa.
 */
const TRIBULATION_RANKS = [3, 5, 7, 8];

/**
 * 22 Esensi Alam Primordial untuk Jalur Penempaan Raga Suci (Body Tempering)
 * Terhubung dengan kondisi cuaca dunia, waktu nyata, dan bioma peta.
 */
const NATURAL_ESSENCES = {
  // Domain 1: Angin, Cuaca & Badai
  gale: {
    key: 'gale',
    name: 'Angin Liar',
    fullName: 'Intisari Angin Liar (Gale Essence)',
    icon: '🌪️',
    domain: 'weather',
    statBonus: { agility: 2, travelSpeed: 1 },
    desc: 'Hembusan angin ngarai curam memperingan bobot langkah dan meningkatkan kelincahan.',
    weatherReq: ['Cerah', 'Mendung'],
    biomeReq: ['azure_mountain_range', 'central_plains'],
    epiphanyMsg: 'Hembusan angin ngarai menderu kencang menerpa wajahmu, pori-pori kulitmu menyerap 1x Intisari Angin Liar (Gale Essence)!'
  },
  typhoon: {
    key: 'typhoon',
    name: 'Topan Samudra',
    fullName: 'Intisari Pusaran Topan Samudra (Typhoon Essence)',
    icon: '⛈️',
    domain: 'weather',
    statBonus: { agility: 1, comboRate: 1 },
    desc: 'Pusaran daya sentrifugal topan laut memicu serangan beruntun bertubi-tubi.',
    weatherReq: ['Hujan', 'Badai Beracun'],
    biomeReq: ['eastern_sea_region'],
    epiphanyMsg: 'Deru ombak badai samudra memutar pusaran angin kencang, tubuhmu menyerap 1x Intisari Topan Samudra (Typhoon Essence)!'
  },
  thunder: {
    key: 'thunder',
    name: 'Petir Dewa',
    fullName: 'Intisari Petir Langit (Thunder Essence)',
    icon: '⚡',
    domain: 'weather',
    statBonus: { critDmg: 5, critRate: 1 },
    desc: 'Getaran kilat langit menyengat meridian dan meningkatkan daya hancur pukulan kritikal.',
    weatherReq: ['Hujan', 'Mendung'],
    biomeReq: ['azure_mountain_range'],
    epiphanyMsg: 'Sambaran kilat melintas di langit mendung, getaran statis menyengat ototmu memberi 1x Intisari Petir Dewa (Thunder Essence)!'
  },
  rain: {
    key: 'rain',
    name: 'Hujan Deras',
    fullName: 'Intisari Titisan Hujan Deras (Raindrop Essence)',
    icon: '🌧️',
    domain: 'weather',
    statBonus: { maxVitality: 5, vitality: 5 },
    desc: 'Titisan air hujan membasuh dan melenturkan sendi-sendi pergerakan tubuh.',
    weatherReq: ['Hujan'],
    biomeReq: ['central_plains', 'eastern_sea_region'],
    epiphanyMsg: 'Titisan gerimis dingin menyentuh pundakmu, pori-pori ototmu menyerap 1x Intisari Hujan Deras (Raindrop Essence)!'
  },
  mist: {
    key: 'mist',
    name: 'Halimun Lembah',
    fullName: 'Intisari Kabut Halimun Lembah (Mountain Mist Essence)',
    icon: '🌫️',
    domain: 'weather',
    statBonus: { focus: 2, critResist: 1 },
    desc: 'Kabut gunung menyamarkan siluet raga dan mempertajam insting menghindar.',
    weatherReq: ['Mendung', 'Cerah'],
    hourReq: [5, 8],
    biomeReq: ['azure_mountain_range'],
    epiphanyMsg: 'Kabut tebal halimun pagi menyelimuti puncak pegunungan, tubuhmu menghisap 1x Intisari Halimun Lembah (Mist Essence)!'
  },
  frost: {
    key: 'frost',
    name: 'Salju Abadi',
    fullName: 'Intisari Hawa Beku Salju Abadi (Frost Essence)',
    icon: '❄️',
    domain: 'weather',
    statBonus: { baseDef: 2, critDmgReduce: 1 },
    desc: 'Hawa sedingin es glasier memadatkan lapisan kulit menjadi perisai beku.',
    weatherReq: ['Mendung', 'Cerah'],
    biomeReq: ['northern_desolate_territory'],
    epiphanyMsg: 'Hawa dingin beku menusuk sumsum tulang di tundra utara, mengkristalkan 1x Intisari Salju Abadi (Frost Essence)!'
  },
  sandstorm: {
    key: 'sandstorm',
    name: 'Badai Pasir',
    fullName: 'Intisari Badai Pasir Mengamuk (Sandstorm Essence)',
    icon: '🌪️',
    domain: 'weather',
    statBonus: { baseDef: 3, martialRes: 1 },
    desc: 'Gesekan butiran pasir mengasah kulit menjadi sekeras intan padang gurun.',
    weatherReq: ['Cerah', 'Mendung'],
    biomeReq: ['western_sacred_deserts'],
    epiphanyMsg: 'Pusaran badai pasir mengamuk di gurun suci, mengasah kulitmu memberi 1x Intisari Badai Pasir (Sandstorm Essence)!'
  },

  // Domain 2: Kosmik, Langit & Waktu
  solar: {
    key: 'solar',
    name: 'Surya Murni',
    fullName: 'Intisari Surya Murni (Solar Essence)',
    icon: '☀️',
    domain: 'celestial',
    statBonus: { baseAtk: 2, critRate: 1 },
    desc: 'Cahaya Yang murni memanaskan aliran darah otot untuk melancarkan serangan penetrasi.',
    weatherReq: ['Cerah'],
    hourReq: [9, 15],
    biomeReq: ['central_plains', 'western_sacred_deserts'],
    epiphanyMsg: 'Pancaran terik mentari membakar meridian raga, menghasilkan 1x Intisari Surya Murni (Solar Essence)!'
  },
  lunar: {
    key: 'lunar',
    name: 'Embun Rembulan',
    fullName: 'Intisari Embun Rembulan (Lunar Essence)',
    icon: '🌙',
    domain: 'celestial',
    statBonus: { spiritualRes: 2, focus: 2 },
    desc: 'Sinar rembulan menenangkan gejolak amarah dan meredam serangan energi sihir.',
    hourReq: [19, 5],
    biomeReq: ['azure_mountain_range', 'eastern_sea_region'],
    epiphanyMsg: 'Keheningan malam di bawah sinar rembulan menyejukkan batinmu, menyerap 1x Intisari Rembulan (Lunar Essence)!'
  },
  astral: {
    key: 'astral',
    name: 'Rasi Bintang',
    fullName: 'Intisari Rasi Bintang Tujuh (Astral Essence)',
    icon: '✨',
    domain: 'celestial',
    statBonus: { insight: 1, luck: 1, critRate: 1 },
    desc: 'Bintang utara menyelaraskan titik akupuntur raga dengan harmoni semesta.',
    hourReq: [0, 4],
    biomeReq: ['azure_mountain_range', 'central_plains'],
    epiphanyMsg: 'Kerlip rasi bintang tengah malam memancarkan cahaya perak, meneteskan 1x Intisari Bintang (Astral Essence)!'
  },
  dawn: {
    key: 'dawn',
    name: 'Fajar Sinar Ungu',
    fullName: 'Intisari Fajar Sinar Ungu (Dawn Aurora Essence)',
    icon: '🌅',
    domain: 'celestial',
    statBonus: { baseHp: 15, baseAtk: 1, baseDef: 1, luck: 1 },
    desc: 'Kilau ungu saat matahari terbit menyucikan racun fana dan meningkatkan takdir keberuntungan.',
    hourReq: [5, 7],
    biomeReq: ['central_plains', 'azure_mountain_range', 'eastern_sea_region'],
    epiphanyMsg: 'Sinar ungu merekah dari ufuk timur di waktu fajar, menghadiahkan 1x Intisari Fajar Ungu (Dawn Essence)!'
  },
  twilight: {
    key: 'twilight',
    name: 'Lembayung Senja',
    fullName: 'Intisari Lembayung Senja (Twilight Essence)',
    icon: '🌇',
    domain: 'celestial',
    statBonus: { agility: 2, travelSpeed: 2 },
    desc: 'Remang senja memudahkan tubuh menyatu dengan bayang-bayang alam.',
    hourReq: [17, 19],
    biomeReq: ['western_sacred_deserts', 'central_plains'],
    epiphanyMsg: 'Cahaya lembayung senja membaur dengan bayangan tubuhmu, menghasilkan 1x Intisari Senja (Twilight Essence)!'
  },
  eclipse: {
    key: 'eclipse',
    name: 'Gerhana Purba',
    fullName: 'Intisari Gerhana Kosmik Purba (Eclipse Essence)',
    icon: '🌑',
    domain: 'celestial',
    statBonus: { baseAtk: 3, critDmg: 5 },
    desc: 'Pertemuan matahari dan bulan menciptakan keseimbangan Yin-Yang sejati yang menembus armor.',
    biomeReq: ['central_plains', 'azure_mountain_range', 'southern_demon_domain'],
    epiphanyMsg: 'Fenomena langit langka menutupi sang surya, mengalirkan 1x Intisari Gerhana Purba (Eclipse Essence)!'
  },
  meteor: {
    key: 'meteor',
    name: 'Debu Bintang',
    fullName: 'Intisari Debu Bintang Jatuh (Meteor Stardust Essence)',
    icon: '🌠',
    domain: 'celestial',
    statBonus: { critRate: 2, critDmg: 6 },
    desc: 'Gesekan batu meteor di langit malam menyuntikkan daya ledak kritikal dahsyat.',
    hourReq: [21, 4],
    biomeReq: ['western_sacred_deserts', 'northern_desolate_territory'],
    epiphanyMsg: 'Bintang jatuh melesat membelah langit malam, menyuntikkan 1x Intisari Debu Bintang (Meteor Essence)!'
  },

  // Domain 3: Bentang Alam & Kehidupan
  grass: {
    key: 'grass',
    name: 'Tumbuhan Hayat',
    fullName: 'Intisari Tumbuhan Hayat (Life Wood Essence)',
    icon: '🌿',
    domain: 'terrestrial',
    statBonus: { baseHp: 25, maxLifespan: 1 },
    desc: 'Klorofil dan getah tanaman hutan belantara meremajakan sel dan memperpanjang umur.',
    biomeReq: ['central_plains'],
    epiphanyMsg: 'Aroma wangi herba hutan menyegarkan pernapasanmu, menyerap 1x Intisari Tumbuhan Hayat (Grass Essence)!'
  },
  pool: {
    key: 'pool',
    name: 'Tirta Telaga',
    fullName: 'Intisari Tirta Telaga Jernih (Pool Essence)',
    icon: '💧',
    domain: 'terrestrial',
    statBonus: { maxVitality: 8, vitality: 8 },
    desc: 'Kesejukan air danau pedalaman membasuh racun kelelahan dan memulihkan vitalitas.',
    biomeReq: ['central_plains', 'eastern_sea_region'],
    epiphanyMsg: 'Gemericik air danau jernih membasuh keletihan ototmu, menghasilkan 1x Intisari Tirta Telaga (Pool Essence)!'
  },
  ocean: {
    key: 'ocean',
    name: 'Gelombang Samudra',
    fullName: 'Intisari Gelombang Samudra Raya (Ocean Tide Essence)',
    icon: '🌊',
    domain: 'terrestrial',
    statBonus: { baseHp: 20, martialRes: 2 },
    desc: 'Hantaman deburan ombak laut memberi daya dorong berat pada setiap benturan tubuh.',
    biomeReq: ['eastern_sea_region'],
    epiphanyMsg: 'Deburan ombak samudra menghantam kokoh tubuhmu, menyerap 1x Intisari Gelombang Samudra (Ocean Essence)!'
  },
  earth: {
    key: 'earth',
    name: 'Urat Bumi',
    fullName: 'Intisari Urat Bumi Karang Wadas (Earth Leyline Essence)',
    icon: '🗿',
    domain: 'terrestrial',
    statBonus: { baseDef: 3, martialRes: 2 },
    desc: 'Stabilitas urat batu leylines mengokohkan kuda-kuda kaki agar tak tergoyahkan.',
    biomeReq: ['azure_mountain_range', 'central_plains'],
    epiphanyMsg: 'Denyut energi leylines bumi terasa di telapak kakimu, menyerap 1x Intisari Urat Bumi (Earth Essence)!'
  },

  // Domain 4: Ekstrem & Vulkanik
  magma: {
    key: 'magma',
    name: 'Bara Lahar',
    fullName: 'Intisari Bara Lahar Kawah Berapi (Magma Essence)',
    icon: '🌋',
    domain: 'extreme',
    statBonus: { baseAtk: 3, martialRes: 1 },
    desc: 'Panas magma kawah berapi mengubah darah raga mendidih dengan aura pembakar.',
    biomeReq: ['southern_demon_domain'],
    epiphanyMsg: 'Hawa panas kawah vulkanik membakar kulit fana, mengkristalkan 1x Intisari Bara Lahar (Magma Essence)!'
  },
  miasma: {
    key: 'miasma',
    name: 'Racun Rawa',
    fullName: 'Intisari Kabut Racun Rawa Kuno (Miasma Essence)',
    icon: '☠️',
    domain: 'extreme',
    statBonus: { spiritualRes: 2, critResist: 2 },
    desc: 'Kabut beracun rawa iblis melatih pori-pori kulit kebal terhadap segala racun.',
    weatherReq: ['Badai Beracun'],
    biomeReq: ['southern_demon_domain'],
    epiphanyMsg: 'Uap ungu beracun rawa purba dihirup oleh kulitmu, menghasilkan 1x Intisari Racun Rawa (Miasma Essence)!'
  },
  sulfur: {
    key: 'sulfur',
    name: 'Uap Belerang',
    fullName: 'Intisari Asap Panas Belerang (Sulfur Essence)',
    icon: '💨',
    domain: 'extreme',
    statBonus: { baseDef: 2, critDmgReduce: 2 },
    desc: 'Asap belerang geotermal menguapkan sisa kotoran daging dan mengeraskan kulit terluar.',
    biomeReq: ['southern_demon_domain'],
    epiphanyMsg: 'Asap panas belerang menyengat rongga pernapasan, mengendapkan 1x Intisari Uap Belerang (Sulfur Essence)!'
  },
  crystal: {
    key: 'crystal',
    name: 'Kristal Gua',
    fullName: 'Intisari Kristal Gua Bawah Tanah (Crystal Essence)',
    icon: '💎',
    domain: 'extreme',
    statBonus: { focus: 3, insight: 1 },
    desc: 'Resonansi kristal gua bawah tanah menajamkan refleks indra dalam kegelapan labirin.',
    biomeReq: ['azure_mountain_range', 'southern_demon_domain'],
    epiphanyMsg: 'Kilau kristal gua bawah tanah meresonansi batinmu, menyerap 1x Intisari Kristal Gua (Crystal Essence)!'
  }
};

/**
 * Batas penyimpanan maksimal per jenis esensi di dalam pori-pori raga:
 * Formula: 15 * (rank + 1)
 */
function getMaxEssenceStorage(rank = 0) {
  return 15 * (rank + 1);
}

/**
 * Durasi penempaan bagian tubuh (detik) per rank
 */
function getTemperingDurationSeconds(rank = 0) {
  switch (rank) {
    case 0: return 30; // 30s di Mortal
    case 1: return 60; // 1m di Qi Refining
    case 2: return 120; // 2m di Foundation
    case 3: return 180; // 3m di Golden Core
    default: return 300; // 5m di ranah tinggi
  }
}

/**
 * Pemanenan spontan esensi alam saat melangkah atau bernapas di alam terbuka
 */
function harvestEnvironmentalEssence(player, context = {}) {
  if (!player || !player.cultivationLaw) return null;
  const law = player.cultivationLaw;
  if (law.activeLawType !== 'body_tempering') return null;

  if (!law.bodyEssenceStorage) {
    law.bodyEssenceStorage = {};
  }

  // Peluang random pemicu inhalasi alam (LAW_BALANCE.BODY_MOVE_HARVEST_CHANCE: 0.12)
  const roll = Math.random();
  if (roll > LAW_BALANCE.BODY_MOVE_HARVEST_CHANCE) return null;

  const weather = context.weather || 'Cerah';
  const hour = context.hour !== undefined ? context.hour : (new Date().getHours());
  const regionSlug = context.regionSlug || player.currentLocation?.regionSlug || 'central_plains';

  const matching = Object.values(NATURAL_ESSENCES).filter(ess => {
    if (ess.weatherReq && !ess.weatherReq.includes(weather)) return false;
    if (ess.hourReq) {
      const [from, to] = ess.hourReq;
      if (from <= to) {
        if (hour < from || hour > to) return false;
      } else {
        if (hour < from && hour > to) return false;
      }
    }
    if (ess.biomeReq && !ess.biomeReq.includes(regionSlug)) return false;
    return true;
  });

  if (matching.length === 0) {
    if (weather === 'Hujan') matching.push(NATURAL_ESSENCES.rain);
    else if (hour >= 19 || hour <= 5) matching.push(NATURAL_ESSENCES.lunar);
    else matching.push(NATURAL_ESSENCES.solar);
  }

  const selected = matching[Math.floor(Math.random() * matching.length)];
  const maxStorage = getMaxEssenceStorage(law.rank || 0);
  const currentCount = law.bodyEssenceStorage[selected.key] || 0;

  if (currentCount >= maxStorage) {
    return {
      success: false,
      full: true,
      essenceKey: selected.key,
      essenceName: selected.name,
      message: `Penyimpanan pori-pori untuk ${selected.name} telah mencapai batas maksimal (${maxStorage}).`
    };
  }

  law.bodyEssenceStorage[selected.key] = currentCount + 1;
  return {
    success: true,
    essenceKey: selected.key,
    essenceName: selected.name,
    icon: selected.icon,
    fullName: selected.fullName,
    message: selected.epiphanyMsg,
    currentCount: law.bodyEssenceStorage[selected.key],
    maxStorage
  };
}

/**
 * Memulai penempaan salah satu dari 9 bagian tubuh menggunakan 1 esensi alam
 */
function startBodyTemperingPart(player, partId, essenceKey) {
  const law = player.cultivationLaw;
  if (!law || law.activeLawType !== 'body_tempering') {
    throw new Error('Hanya pendekar Penempaan Raga yang dapat menempah bagian tubuh.');
  }

  if (law.isTemperingPart && law.temperingFinishAt && new Date() < new Date(law.temperingFinishAt)) {
    const rem = Math.ceil((new Date(law.temperingFinishAt).getTime() - Date.now()) / 1000);
    throw new Error(`Penempaan bagian [${law.temperingPartTarget}] sedang berlangsung (sisa ${rem} detik).`);
  }

  const validParts = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'spine', 'dantian', 'skin'];
  if (!validParts.includes(partId)) {
    throw new Error(`Bagian tubuh '${partId}' tidak valid.`);
  }

  const cleanKey = essenceKey ? essenceKey.replace(/^essence_/, '') : '';
  const essenceDef = NATURAL_ESSENCES[cleanKey] || NATURAL_ESSENCES[essenceKey];
  if (!essenceDef) {
    throw new Error(`Esensi '${essenceKey}' tidak dikenali.`);
  }

  const currentStored = law.bodyEssenceStorage?.[cleanKey] !== undefined
    ? law.bodyEssenceStorage[cleanKey]
    : (law.bodyEssenceStorage?.[essenceKey] || 0);
  if (currentStored <= 0) {
    throw new Error(`Kamu tidak memiliki ${essenceDef.fullName} di penyimpanan batin raga.`);
  }

  const durationSec = getTemperingDurationSeconds(law.rank || 0);
  law.isTemperingPart = true;
  law.temperingPartTarget = partId;
  law.temperingEssenceUsed = cleanKey;
  law.temperingFinishAt = new Date(Date.now() + durationSec * 1000);

  return {
    partId,
    essenceKey: cleanKey,
    durationSec,
    finishAt: law.temperingFinishAt
  };
}

/**
 * Menyelesaikan dan mengklaim penempaan bagian tubuh
 */
function claimBodyTemperingPart(player) {
  const law = player.cultivationLaw;
  if (!law || law.activeLawType !== 'body_tempering') {
    throw new Error('Hanya pendekar Penempaan Raga yang dapat menempah bagian tubuh.');
  }

  if (!law.isTemperingPart) {
    throw new Error('Tidak ada proses penempaan bagian tubuh yang sedang berlangsung.');
  }

  if (new Date() < new Date(law.temperingFinishAt)) {
    const rem = Math.ceil((new Date(law.temperingFinishAt).getTime() - Date.now()) / 1000);
    throw new Error(`Penempaan belum selesai. Sisa waktu: ${rem} detik.`);
  }

  const partId = law.temperingPartTarget;
  const rawKey = law.temperingEssenceUsed;
  const cleanKey = rawKey ? rawKey.replace(/^essence_/, '') : '';
  const essenceDef = NATURAL_ESSENCES[cleanKey] || NATURAL_ESSENCES[rawKey] || { name: rawKey, statBonus: {} };

  // Konsumsi 1 esensi
  if (law.bodyEssenceStorage) {
    if (law.bodyEssenceStorage[cleanKey] > 0) {
      law.bodyEssenceStorage[cleanKey] -= 1;
    } else if (law.bodyEssenceStorage[rawKey] > 0) {
      law.bodyEssenceStorage[rawKey] -= 1;
    }
  }

  // Tingkatkan level / progress bagian tubuh (+1 level)
  if (!law.bodyTemperingParts) law.bodyTemperingParts = {};
  const currentLevel = law.bodyTemperingParts[partId] || 0;
  law.bodyTemperingParts[partId] = currentLevel + 1;

  // Injeksi True Qi ke dantian
  const trueQiGained = 60 + (law.rank || 0) * 20;
  law.qi = (law.qi || 0) + trueQiGained;

  // Terapkan bonus stat permanen ke karakter
  if (!player.extendedStats) player.extendedStats = {};
  if (essenceDef.statBonus) {
    for (const [stat, val] of Object.entries(essenceDef.statBonus)) {
      if (player.extendedStats[stat] !== undefined) {
        player.extendedStats[stat] += val;
      } else if (player.stats && player.stats[stat] !== undefined) {
        player.stats[stat] += val;
      }
    }
  }

  // Reset status aktif penempaan
  law.isTemperingPart = false;
  law.temperingPartTarget = null;
  law.temperingEssenceUsed = null;
  law.temperingFinishAt = null;

  return {
    partId,
    newLevel: law.bodyTemperingParts[partId],
    essenceUsed: cleanKey,
    trueQiGained,
    statBonus: essenceDef.statBonus,
    essenceRemaining: law.bodyEssenceStorage?.[cleanKey] || 0
  };
}

/**
 * Channeling Cap Constants (Merujuk ke LAW_PROGRESSION sebagai single source of truth)
 */
const BASE_CHANNEL_CAP_MINUTES = LAW_PROGRESSION.BASE_CHANNEL_CAP_MINUTES;
const STREAK_BONUS_PER_DAY = LAW_PROGRESSION.STREAK_BONUS_PER_DAY;
const MAX_STREAK_DAYS = LAW_PROGRESSION.MAX_STREAK_DAYS;
const MAX_STREAK_BONUS = STREAK_BONUS_PER_DAY * MAX_STREAK_DAYS; // +21 menit

// ═══════════════════════════════════════════════════════════════
// QI & PROGRESSION CALCULATION (SUMBER KEBENARAN: RANK_TARGET_DAYS)
// ═══════════════════════════════════════════════════════════════

/**
 * Channeling Qi Rate per menit (Qi/menit) yang didapat saat meditasi.
 * Rate meningkat setiap rank naik:
 * base = floor(CHANNEL_BASE_RATE_RANK0 * (CHANNEL_RATE_GROWTH ^ rank))
 * 
 * pathMod mempengaruhi laju Qi (Master Plan §5.4 & Balance Pass):
 * - Mode 'penalty' (default anti-OP demonic): rate = max(1, floor(base / pm))
 * - Mode 'bonus': rate = max(1, floor(base * pm))
 * @param {number} rank - Rank kultivasi law (0-8)
 * @param {number} pathMod - PathMod dari LAW_DEFINITIONS (default 1.0)
 * @returns {number} Qi rate per menit
 */
function getChannelQiRate(rank, pathMod = 1.0) {
  const base = Math.floor(
    LAW_PROGRESSION.CHANNEL_BASE_RATE_RANK0 *
    Math.pow(LAW_PROGRESSION.CHANNEL_RATE_GROWTH, Number(rank) || 0)
  );
  const pm = Math.min(1.6, Math.max(0.9, Number(pathMod) || 1));
  if (LAW_BALANCE.CHANNEL_PATHMOD_MODE === 'penalty') {
    return Math.max(1, Math.floor(base / pm));
  }
  return Math.max(1, Math.floor(base * pm));
}

/**
 * Menghitung batas menit channeling harian efektif.
 * @param {number} streakDays - Hari streak login berturut (0-7)
 * @param {number} premiumBonusMinutes - Bonus dari item premium (default 0)
 * @param {number} eventBonusMinutes - Bonus dari event spesial bulanan (default 0)
 * @returns {number} Total menit channeling yang diizinkan hari ini
 */
function getDailyChannelCap(streakDays = 0, premiumBonusMinutes = 0, eventBonusMinutes = 0) {
  const bonus = Math.min(streakDays || 0, LAW_PROGRESSION.MAX_STREAK_DAYS) * LAW_PROGRESSION.STREAK_BONUS_PER_DAY;
  return LAW_PROGRESSION.BASE_CHANNEL_CAP_MINUTES + bonus + (premiumBonusMinutes || 0) + (eventBonusMinutes || 0);
}

/**
 * Total Qi untuk menyelesaikan 10 stage di rank r dikalibrasi dari RANK_TARGET_DAYS.
 * Qi_total(rank) = TARGET_DAYS[rank] * rate(rank,1.0) * BASE_CHANNEL_CAP_MINUTES
 * Lalu dibagi ke stage lewat stageMult.
 */
function getTotalQiForRank(rank) {
  const r = Math.max(0, Math.min(8, Number(rank) || 0));
  const days = LAW_PROGRESSION.RANK_TARGET_DAYS[r] || 280;
  const rate = getChannelQiRate(r, 1.0);
  const mins = LAW_PROGRESSION.BASE_CHANNEL_CAP_MINUTES;
  return Math.max(1000, Math.floor(days * rate * mins));
}

function getStageMult(stage) {
  const s = Math.max(0, Math.min(9, Number(stage) || 0));
  // bobot stage akhir rank sedikit lebih berat (anticipation breakthrough)
  return 0.70 + s * 0.10; // sum s0..9 = 0.7*10 + 0.10*(0+...+9)=7+4.5=11.5
}

function getStageMultSum() {
  let sum = 0;
  for (let s = 0; s <= 9; s++) sum += getStageMult(s);
  return sum;
}

function getQiRequired(rank, stage) {
  const total = getTotalQiForRank(rank);
  const mult = getStageMult(stage);
  const sum = getStageMultSum();
  return Math.max(50, Math.floor(total * (mult / sum)));
}

function getBaseQiRequired(rank) {
  // kompatibilitas: kembalikan qi stage-0 “setara” atau total/sum — dokumentasikan
  return getQiRequired(rank, 0);
}

/**
 * Menghitung kapasitas maksimal Bar Esensi berdasarkan Ranah (Rank 0 s/d 8)
 * Formula: MaxEssence(rank) = floor(MAX_ESSENCE_BASE * (MAX_ESSENCE_GROWTH ^ rank))
 */
function getMaxEssence(rank = 0) {
  return Math.floor(
    LAW_PROGRESSION.MAX_ESSENCE_BASE * Math.pow(LAW_PROGRESSION.MAX_ESSENCE_GROWTH, rank || 0)
  );
}

/**
 * Menghitung laju pencernaan esensi per menit channeling.
 */
function getEssenceDigestRate(rank = 0) {
  return Math.max(
    1,
    Math.floor(LAW_PROGRESSION.DIGEST_BASE * Math.pow(LAW_PROGRESSION.DIGEST_GROWTH, rank || 0))
  );
}

/**
 * Mengonversi dokumen Item atau objek item menjadi Tier numerik (1-6).
 * Memeriksa itemDoc.tier terlebih dahulu; jika tidak ada, memetakan dari rank/rarity.
 * @param {object} itemDoc
 * @returns {number}
 */
function resolveItemTier(itemDoc) {
  if (!itemDoc) return 1;
  if (itemDoc.tier != null && !Number.isNaN(Number(itemDoc.tier))) return Number(itemDoc.tier);
  if (itemDoc.itemTier != null && !Number.isNaN(Number(itemDoc.itemTier))) return Number(itemDoc.itemTier);
  const rankMap = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
    mythic: 6,
    mythical: 6,
    mortal: 1,
    spiritual: 2,
    immortal: 3
  };
  const r = String(itemDoc.rank || itemDoc.rarity || '').toLowerCase();
  return rankMap[r] || 1;
}

/**
 * Efisiensi konsumsi item berdasarkan tier (Master Plan §5.1)
 * playerTier = rank Law ATAU tier realm yang relevan (gunakan (law.rank || 0) + 1 sebagai default untuk Law consumption)
 * itemTier = item.tier (number, default 1)
 * @param {number|object} playerTier
 * @param {number} itemTier
 * @returns {{ allowed: boolean, efficiency: number, reason?: string }}
 */
function getTierAffinity(playerTier, itemTier) {
  let p = typeof playerTier === 'object' && playerTier !== null
    ? ((playerTier.rank !== undefined ? playerTier.rank : playerTier.cultivationLaw?.rank) ?? 0) + 1
    : Number(playerTier);
  if (isNaN(p)) p = 1;
  // Jika rank 0 dioper langsung (p === 0), rank 0 fana setara Tier 1
  if (p === 0) p = 1;

  const t = Number(itemTier) || 1;
  if (t > p) {
    return { allowed: false, efficiency: 0, reason: 'Item di atas ranahmu. Dantian menolak menyerap.' };
  }
  if (t === p) {
    return { allowed: true, efficiency: 1 };
  }
  // t < p
  const efficiency = Math.round(Math.max(0.15, 1 - (p - t) * 0.40) * 100) / 100;
  return { allowed: true, efficiency };
}

/**
 * Batas maksimal slot Gu yang dapat di-equip berdasarkan rank Law (Master Plan §3.2)
 * Rank 0: 1 slot
 * Rank 1: 2 slot
 * Rank 2: 3 slot
 * Rank 3: 4 slot
 * Rank 4+: 5 slot (maksimal)
 * @param {number} rank
 * @returns {number}
 */
function getGuMaxSlots(rank = 0) {
  const r = Number(rank) || 0;
  if (r <= 0) return 1;
  if (r === 1) return 2;
  if (r === 2) return 3;
  if (r === 3) return 4;
  return 5;
}

// ═══════════════════════════════════════════════════════════════
// COMBAT QI VS CULTIVATION QI (Master Plan §1.2, §1.3 & §5.4)
// ═══════════════════════════════════════════════════════════════

/**
 * Kapasitas Maksimal Qi Bertarung (Combat Qi / MP) sesuai Master Plan §1.3 & §5.4
 * MaxCombatQi = 50 + (RealmIndex * 25) + floor(Stat_Energy * 0.5) + floor(Stat_Focus * 0.3)
 * Combat Qi ≠ Cultivation Qi (Master Plan §1.2)
 * @param {object} player - Mongoose Player document
 * @returns {number}
 */
function getMaxCombatQi(player) {
  if (!player) return 50;
  const { getRealmIndex } = require('./cultivation');
  const realmIdx = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');
  const energyStat = player.extendedStats?.energy ?? player.extendedStats?.innerEnergy ?? 100;
  const focusStat = player.extendedStats?.focus ?? 100;
  return 50 + (realmIdx * 25) + Math.floor(energyStat * 0.5) + Math.floor(focusStat * 0.3);
}

/**
 * Regenerasi Qi Bertarung per Ronde Tempur sesuai Master Plan §1.3 & §5.4
 * CombatQiRegenPerRound = 5 + (RealmIndex * 2) + floor(Stat_Vitality * 0.05)
 * Combat Qi ≠ Cultivation Qi (Master Plan §1.2)
 * @param {object} player - Mongoose Player document
 * @returns {number}
 */
function getCombatQiRegenPerRound(player) {
  if (!player) return 5;
  const { getRealmIndex } = require('./cultivation');
  const realmIdx = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');
  const vitalityStat = player.extendedStats?.vitality ?? player.vitality ?? 100;
  return 5 + (realmIdx * 2) + Math.floor(vitalityStat * 0.05);
}

// ═══════════════════════════════════════════════════════════════
// NETHER DARKNESS HELPERS (Master Plan §3.8)
// ═══════════════════════════════════════════════════════════════

const NETHER_DARKNESS_ZONES = [
  'nether_chasm',
  'ghost_cemetery',
  'ancient_tomb',
  'southern_demon_domain',
  'shadow_valley',
  'dark_abyss',
  'underworld_crevasse'
];

function isNetherTerritory(zoneId, regionSlug, tileInfo = {}) {
  const z = (zoneId || '').toLowerCase();
  const r = (regionSlug || '').toLowerCase();
  const t = (tileInfo.label || tileInfo.buildingName || tileInfo.terrainType || '').toLowerCase();

  return (
    NETHER_DARKNESS_ZONES.some(zone => z.includes(zone) || r.includes(zone)) ||
    z.includes('nether') || z.includes('cemetery') || z.includes('grave') || z.includes('makam') || z.includes('abyss') ||
    r.includes('nether') || r.includes('cemetery') || r.includes('demon') || r.includes('abyss') ||
    t.includes('nether') || t.includes('makam') || t.includes('kubur') || t.includes('jurang') || t.includes('yin')
  );
}

/**
 * Batas durasi aman bertahan di luar wilayah gelap Nether (detik)
 * Rank 0: 12 jam (43,200 detik)
 * Rank 2: 24 jam (86,400 detik)
 * Rank 4: 3 hari (259,200 detik)
 * Rank 7+: 7 hari (604,800 detik)
 * @param {number} rank
 * @returns {number}
 */
function getNetherSafeLimitSeconds(rank = 0) {
  const r = Number(rank) || 0;
  if (r <= 0) return 12 * 3600;       // 12 jam (43,200s)
  if (r === 1) return 18 * 3600;      // 18 jam
  if (r === 2 || r === 3) return 24 * 3600; // 24 jam (86,400s)
  if (r >= 4 && r < 7) return 3 * 24 * 3600; // 3 hari (259,200s)
  return 7 * 24 * 3600;              // Rank 7+: 7 hari (604,800s)
}

/**
 * Menghitung jumlah Qi yang didapat dari channeling sejak lastChannelSyncAt.
 * Server-authoritative: berdasarkan delta waktu server, dipengaruhi oleh status Bar Esensi.
 * 
 * ATURAN MUTLAK (§2.1 & Balance Pass):
 * - Qi KULTIVASI (cultivationLaw.qi) HANYA bertambah jika BAR KONSUMSI/ESENSI > 0 dan sedang dicerna.
 * - Bar kosong = 0 Qi kultivasi (tanpa toleransi 15% drip).
 * @param {object} player - Mongoose Player document
 * @returns {{ qiGained: number, minutesElapsed: number, isCapReached: boolean, essenceConsumed: number, isEssenceDepleted: boolean }}
 */
function calculateChannelingProgress(player) {
  const law = player.cultivationLaw;
  if (!law || !law.isChanneling || !law.lastChannelSyncAt) {
    return { qiGained: 0, minutesElapsed: 0, isCapReached: false, essenceConsumed: 0, isEssenceDepleted: false };
  }

  // Pastikan daily cap direset jika tengah malam (00:00 WIB) telah terlewati
  checkAndResetDailyCap(player);

  const now = Date.now();
  const elapsed = (now - new Date(law.lastChannelSyncAt).getTime()) / 60000; // menit
  const minutesElapsed = Math.max(0, elapsed);

  // Daily cap check
  const streakDays = law.dailyData?.dailyStreakDays || player.dailyStreak || 0;
  const dailyCap = getDailyChannelCap(streakDays);
  const minutesUsedToday = law.dailyData?.channelMinutesToday || 0;
  const minutesRemaining = Math.max(0, dailyCap - minutesUsedToday);

  // Batasi waktu channeling efektif dengan sisa batas harian
  const effectiveMinutes = Math.min(minutesElapsed, minutesRemaining);
  const isCapReached = (minutesUsedToday + effectiveMinutes) >= dailyCap;

  if (effectiveMinutes <= 0) {
    return {
      qiGained: 0,
      minutesElapsed: 0,
      isCapReached,
      essenceConsumed: 0,
      isEssenceDepleted: (Number(law.currentEssence) || 0) <= 0
    };
  }

  const lawDef = law.activeLawType ? LAW_DEFINITIONS[law.activeLawType] : null;
  const pathMod = lawDef?.pathMod || 1.0;
  const baseRate = getChannelQiRate(law.rank || 0, pathMod);
  const currentEss = Math.max(0, Number(law.currentEssence) || 0);

  // Laju pencernaan esensi
  const digestRate = getEssenceDigestRate(law.rank || 0);
  const isEssenceDepleted = currentEss <= 0;

  if (isEssenceDepleted) {
    // ATURAN MUTLAK: Bar esensi kosong = sama sekali TIDAK ADA Qi kultivasi (tanpa 15% drip)
    return {
      qiGained: 0,
      minutesElapsed: effectiveMinutes,
      isCapReached,
      essenceConsumed: 0,
      isEssenceDepleted: true
    };
  }

  // Hanya menit yang tertutupi stok esensi yang menghasilkan Qi
  const maxFundableMinutes = currentEss / digestRate;
  const minutesFunded = Math.min(effectiveMinutes, maxFundableMinutes);
  const essenceConsumed = Math.min(currentEss, Math.round(minutesFunded * digestRate * 10) / 10);

  const digestBonus = LAW_PROGRESSION.ESSENCE_DIGEST_BONUS !== undefined ? LAW_PROGRESSION.ESSENCE_DIGEST_BONUS : (LAW_PROGRESSION.ESSENCE_FULL_DIGEST_BONUS || 1.0);
  const qiGained = Math.floor(minutesFunded * baseRate * digestBonus);

  return {
    qiGained,
    minutesElapsed: effectiveMinutes,
    isCapReached,
    essenceConsumed,
    isEssenceDepleted: (currentEss - essenceConsumed) <= 0
  };
}

/**
 * Sinkronisasi Qi channeling ke database (dipanggil saat stop channel atau cek status).
 * @param {object} player - Mongoose Player document (mutable)
 * @returns {{ qiGained: number, totalQi: number, newQi: number, minutesSynced: number, isCapReached: boolean, isQiFull: boolean, essenceConsumed: number, isEssenceDepleted: boolean }}
 */
function syncLawChanneling(player) {
  const { qiGained, minutesElapsed, isCapReached, essenceConsumed, isEssenceDepleted } = calculateChannelingProgress(player);

  const law = player.cultivationLaw;
  if (!law) return { qiGained: 0, totalQi: 0, newQi: 0, minutesSynced: 0, isCapReached: false, isQiFull: false, essenceConsumed: 0, isEssenceDepleted: false };

  const streakDays = law.dailyData?.dailyStreakDays || player.dailyStreak || 0;
  const dailyCap = getDailyChannelCap(streakDays);

  if (qiGained > 0) {
    law.qi = Math.min(
      law.maxQi,
      Math.floor((law.qi || 0) + qiGained)
    );
  }

  if (minutesElapsed > 0) {
    const currentUsed = law.dailyData?.channelMinutesToday || 0;
    law.dailyData.channelMinutesToday = Math.min(
      dailyCap,
      Math.round((currentUsed + minutesElapsed) * 100) / 100
    );
  }

  // Konsumsi Universal Essence
  if (essenceConsumed > 0 && law.currentEssence !== undefined) {
    law.currentEssence = Math.max(0, Math.round((law.currentEssence - essenceConsumed) * 10) / 10);
  }

  // Khusus Gu Master: cerna satiety cacing Gu di rongga Aperture
  if (law.activeLawType === 'gu_master' && Array.isArray(law.guSlots)) {
    const guDigestPoints = Math.max(1, Math.floor(minutesElapsed * 0.5));
    for (const gu of law.guSlots) {
      if (gu.satiety !== undefined && gu.satiety > 0) {
        gu.satiety = Math.max(0, gu.satiety - guDigestPoints);
        gu.hunger = gu.satiety; // sync alias
      }
    }
  }

  // Khusus Body Tempering: Meditasi Outdoor menghasilkan esensi alam dominan (Master Plan §3.3)
  // Setiap IntervalMenit = 15 * 2^rank menit channeling efektif, +1 essence dominan bioma.
  if (law.activeLawType === 'body_tempering') {
    const isSettlement = player.currentLocation?.isSettlement || player.isInSettlement || (player.gridPosition?.interiorInstanceId != null);
    if (!isSettlement && minutesElapsed > 0) {
      if (!law.bodyEssenceStorage) law.bodyEssenceStorage = {};
      const rank = law.rank || 0;
      const intervalMinutes = 15 * Math.pow(2, rank);
      law.bodyOutdoorChannelMinutes = (law.bodyOutdoorChannelMinutes || 0) + minutesElapsed;

      if (law.bodyOutdoorChannelMinutes >= intervalMinutes) {
        const count = Math.floor(law.bodyOutdoorChannelMinutes / intervalMinutes);
        law.bodyOutdoorChannelMinutes %= intervalMinutes;

        const regionSlug = player.currentLocation?.regionSlug || 'central_plains';
        const biomeEssences = Object.values(NATURAL_ESSENCES).filter(ess => ess.biomeReq && ess.biomeReq.includes(regionSlug));
        const chosenEssence = (biomeEssences.length > 0)
          ? biomeEssences[Math.floor(Math.random() * biomeEssences.length)]
          : NATURAL_ESSENCES.earth;

        const maxStorage = getMaxEssenceStorage(rank);
        const currentCount = law.bodyEssenceStorage[chosenEssence.key] || 0;
        if (currentCount < maxStorage) {
          law.bodyEssenceStorage[chosenEssence.key] = Math.min(maxStorage, currentCount + count);
        }
      }
    }
  }

  law.lastChannelSyncAt = new Date();
  law.lastEssenceDigestAt = new Date();

  const isQiFull = (law.qi >= law.maxQi);
  if (isCapReached || isQiFull) {
    law.isChanneling = false;
  }

  return {
    qiGained,
    totalQi: law.qi,
    newQi: law.qi,
    minutesSynced: minutesElapsed,
    isCapReached,
    isQiFull,
    essenceConsumed,
    isEssenceDepleted: (law.currentEssence || 0) <= 0
  };
}

// ═══════════════════════════════════════════════════════════════
// LEVEL CAP INTEGRATION (§2.6)
// ═══════════════════════════════════════════════════════════════

/**
 * MaxLevel = BaseCap + (totalStagesCompleted × 2)
 * BaseCap = 20 untuk semua karakter baru.
 * Total stages selesai = (rank × 10) + stage (karena setiap rank memiliki 10 stage: 0-9)
 */
function getLevelCap(player) {
  const baseCap = 20;
  const lawBonus = player.cultivationLaw?.lawLevelCapBonus || 0;
  return baseCap + lawBonus;
}

// ═══════════════════════════════════════════════════════════════
// MINI-BREAKTHROUGH (§2.7) — Naik Stage (Stage 0→1, 1→2, ..., 8→9)
// ═══════════════════════════════════════════════════════════════

/**
 * Biaya material (dalam Copper) untuk mini-breakthrough.
 * Berdasarkan kalibrasi ekonomi di §2.4 dan §3.8.
 * @param {number} rank - Rank saat ini
 * @param {number} stage - Stage saat ini (0-8, menuju stage+1)
 * @returns {number} Biaya dalam satuan Copper
 */
function getMiniBreakthroughCost(rank, stage) {
  // Rank 0: 15-80 Copper (sangat murah untuk pemula fana)
  // Rank 1: 50 Copper - 2.5 Silver  
  // Rank 3+: 3-10 Silver
  // Rank 5+: 15-50 Silver
  // Rank 7+: 4-12 Gold (40,000-120,000 Copper)
  // Rank 8: 8-30 Gold (80,000-300,000 Copper)
  const baseCosts = [
    // Rank 0 (Copper)
    [15, 18, 20, 25, 30, 35, 40, 45, 50, 80],
    // Rank 1 (Copper transitioning to Silver)
    [50, 60, 75, 90, 100, 120, 140, 160, 180, 250],
    // Rank 2 (Silver tier: 1-3 Silver)
    [150, 180, 200, 230, 260, 300, 340, 380, 420, 600],
    // Rank 3 (3-10 Silver = 300-1000 Copper)
    [300, 350, 400, 450, 500, 550, 600, 650, 700, 1000],
    // Rank 4 (8-20 Silver)
    [800, 950, 1100, 1250, 1400, 1550, 1700, 1850, 2000, 3000],
    // Rank 5 (15-50 Silver)
    [1500, 1800, 2000, 2200, 2500, 2800, 3000, 3500, 4000, 5000],
    // Rank 6 (30-80 Silver)
    [3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 8000],
    // Rank 7 (4-12 Gold = 40,000-120,000 Copper)
    [40000, 47000, 53000, 60000, 67000, 73000, 80000, 90000, 100000, 120000],
    // Rank 8 (8-30 Gold)
    [80000, 95000, 110000, 125000, 140000, 155000, 170000, 200000, 250000, 300000]
  ];

  return baseCosts[rank]?.[stage] || 100;
}

/**
 * Success rate mini-breakthrough.
 * Formula: 90% - (stage × 1%)
 * Stage 0 = 90%, Stage 8 = 82%, Stage 9 (major) handled separately.
 */
function getMiniBreakthroughSuccessRate(stage) {
  return Math.max(50, 90 - (stage * 1));
}

/**
 * Cooldown mini-breakthrough gagal: 2 jam + (stage × 30 menit)
 * @returns {number} Cooldown dalam milidetik
 */
function getMiniBreakthroughFailCooldown(stage) {
  return (2 * 3600 * 1000) + (stage * 30 * 60 * 1000);
}

/**
 * Eksekusi mini-breakthrough (Stage 0-8 → Stage+1).
 * Server-authoritative: seluruh logika validasi dan RNG di sini.
 * @param {object} player - Mongoose Player document (mutable)
 * @returns {{ success: boolean, message: string, rewards?: object, penalties?: object }}
 */
function attemptMiniBreakthrough(player, options = {}) {
  const law = player.cultivationLaw;
  if (!law || !law.activeLawType) {
    return { success: false, message: 'Belum memilih Hukum Semesta (Law).' };
  }

  // Validasi stage (harus 0-8 untuk mini, stage 9 = major)
  if (law.stage >= 9) {
    return { success: false, message: 'Stage sudah 9. Lakukan Major Breakthrough untuk naik Rank.' };
  }

  // Validasi Qi penuh
  if (law.qi < law.maxQi) {
    return { success: false, message: `Qi belum penuh. ${Math.floor(law.qi)}/${law.maxQi}` };
  }

  // Validasi cooldown
  if (law.miniBreakthroughCooldownUntil && new Date(law.miniBreakthroughCooldownUntil) > new Date()) {
    const remaining = Math.ceil((new Date(law.miniBreakthroughCooldownUntil) - Date.now()) / 60000);
    return { success: false, message: `Masih dalam masa pemulihan. Sisa: ${remaining} menit.` };
  }

  // Auto-detect slotted breakthrough pill
  if (law.breakthroughPillSlot) {
    options.pillBonusRate = options.pillBonusRate || 20;
    options.pillProtectLoss = options.pillProtectLoss !== undefined ? options.pillProtectLoss : true;
    law.breakthroughPillSlot = null; // Terkonsumsi saat ritual penerobosan
  }

  // Roll RNG dengan bonus pil jika ada
  const baseRate = getMiniBreakthroughSuccessRate(law.stage);
  const pillBonus = options.pillBonusRate || 0;
  const successRate = Math.min(95, baseRate + pillBonus);
  const roll = Math.random() * 100;
  const isSuccess = roll <= successRate;

  if (isSuccess) {
    const oldStage = law.stage;
    law.stage += 1;
    law.qi = 0;
    law.maxQi = getQiRequired(law.rank, law.stage);
    law.lawLevelCapBonus += 2;
    law.lawSkillPoints += 1;
    law.miniBreakthroughCooldownUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 menit

    const lawDef = LAW_DEFINITIONS[law.activeLawType];
    const rankNames = LAW_RANK_NAMES[law.activeLawType];
    const rankName = rankNames?.[law.rank] || `Rank ${law.rank}`;

    // Penerapan bonus 5 Pilar sesuai Hukum Semesta yang dipatri
    if (!player.stats) player.stats = {};
    if (!player.extendedStats) player.extendedStats = {};

    const bonus = lawDef?.stageBonus || {};
    if (bonus.hp) player.stats.baseHp = (player.stats.baseHp || 100) + bonus.hp;
    if (bonus.atk) player.stats.baseAtk = (player.stats.baseAtk || 15) + bonus.atk;
    if (bonus.def) player.stats.baseDef = (player.stats.baseDef || 10) + bonus.def;
    if (bonus.crit) player.extendedStats.crit = (player.extendedStats.crit || 0) + bonus.crit;
    if (bonus.agility) player.extendedStats.agility = (player.extendedStats.agility || 0) + bonus.agility;
    if (bonus.vitality) player.extendedStats.vitality = (player.extendedStats.vitality || 100) + bonus.vitality;
    if (bonus.lifespan) player.extendedStats.lifespan = (player.extendedStats.lifespan || 100) + bonus.lifespan;
    if (bonus.martialRes) player.extendedStats.martialRes = (player.extendedStats.martialRes || 0) + bonus.martialRes;
    if (bonus.spiritualRes) player.extendedStats.spiritualRes = (player.extendedStats.spiritualRes || 0) + bonus.spiritualRes;
    if (bonus.travelSpeed) player.extendedStats.travelSpeed = (player.extendedStats.travelSpeed || 100) + bonus.travelSpeed;
    if (bonus.maxStamina) player.currentStamina = (player.currentStamina || 100) + bonus.maxStamina;

    // Injeksi Spiritual Root XP Otomatis (Automatic Dao Resonance)
    if (lawDef?.rootKey) {
      if (!player.extendedStats.spiritualRoot) player.extendedStats.spiritualRoot = {};
      const currentRootXp = player.extendedStats.spiritualRoot[lawDef.rootKey] || 0;
      player.extendedStats.spiritualRoot[lawDef.rootKey] = currentRootXp + (bonus.rootExp || 25);
    }

    const realmDisplay = formatLawRealmDisplay(player);
    const realmLabel = realmDisplay?.display || `${rankName} · Rank ${law.rank} · Stage ${law.stage}/9`;

    return {
      success: true,
      isSuccess: true,
      message: `Penerobosan Berhasil! ${realmLabel}.`,
      realmDisplay,
      realmLabel,
      rewards: {
        newStage: law.stage,
        newRank: law.rank,
        levelCapBonus: 2,
        skillPoints: 1,
        cooldownMs: 30 * 60 * 1000,
        maxQi: law.maxQi,
        rankDisplayName: realmDisplay?.title || rankName,
        realmLabel,
        stageBonusGranted: bonus
      }
    };
  } else {
    // Penalti gagal (§5.3) dengan proteksi pil
    const qiPenalty = options.pillProtectLoss ? 0 : Math.floor(law.maxQi * 0.15);
    law.qi = Math.max(0, law.qi - qiPenalty);
    const cooldownMs = options.pillProtectLoss
      ? Math.floor(getMiniBreakthroughFailCooldown(law.stage) / 2)
      : getMiniBreakthroughFailCooldown(law.stage);
    law.miniBreakthroughCooldownUntil = new Date(Date.now() + cooldownMs);

    const failMsg = options.pillProtectLoss
      ? 'Penerobosan Gagal! Namun khasiat Pil Penerobosan melindungi dantianmu dari deviasi (Qi tidak berkurang)!'
      : `Penerobosan Gagal! Qi berkurang ${qiPenalty}. Pulihkan diri.`;

    return {
      success: true,
      isSuccess: false,
      message: failMsg,
      penalties: {
        qiLost: qiPenalty,
        cooldownMs,
        cooldownMinutes: Math.ceil(cooldownMs / 60000)
      }
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAJOR BREAKTHROUGH (§2.8) — Naik Rank (Stage 9 → Rank+1 Stage 0)
// ═══════════════════════════════════════════════════════════════

/**
 * Major breakthrough success rate.
/**
 * Peluang sukses major breakthrough (Master Plan §5.2).
 * Dengan pil cocok: rentang 85–95% (data-driven dari BREAKTHROUGH_PILL_CATALOG).
 * Tanpa pil: rentang 30–40%.
 */
function getMajorBreakthroughSuccessRate(rank, hasPill = false) {
  const targetRank = (Number(rank) || 0) + 1;
  if (hasPill) {
    const catalogEntry = BREAKTHROUGH_PILL_CATALOG[targetRank];
    return catalogEntry ? catalogEntry.successRate : Math.min(95, Math.max(85, 95 - (rank * 2)));
  }
  return Math.min(40, Math.max(30, 40 - (rank * 2)));
}

/**
 * Cooldown major breakthrough gagal: 8 jam + (rank × 2 jam)
 * @returns {number} Cooldown dalam milidetik
 */
function getMajorBreakthroughFailCooldown(rank) {
  return (8 * 3600 * 1000) + (rank * 2 * 3600 * 1000);
}

/**
 * Menentukan apakah rank ini membutuhkan tribulasi langit.
 */
function requiresTribulation(rank) {
  return TRIBULATION_RANKS.includes(rank);
}

/**
 * Menghitung damage gelombang tribulasi langit.
 * Formula: WaveDamage(wave, rank, pathMod) = 50 × (1 + 0.3 × wave) × (1.6 ^ (rank/2)) × pathMod
 * @param {number} wave - Nomor gelombang (0, 1, 2)
 * @param {number} rank - Rank saat ini (3, 5, 7, 8)
 * @param {number} pathMod - PathMod tribulasi dari LAW_DEFINITIONS
 * @returns {number} Damage gelombang
 */
function calculateTribulationWaveDamage(wave, rank, pathMod) {
  return Math.floor(50 * (1 + 0.3 * wave) * Math.pow(1.6, rank / 2) * pathMod);
}

/**
 * Menghitung HP survival pemain saat tribulasi.
 * Formula: SurvivalHP = maxHP + (DEF × 3) + (Vitality × 2) + (Focus × 1.5)
 */
function calculateSurvivalHP(player) {
  const stats = player.stats || {};
  const ext = player.extendedStats || {};
  const maxHP = stats.baseHp || 100;
  const def = stats.baseDef || 10;
  const vitality = ext.vitality || 100;
  const focus = ext.focus || 100;

  return Math.floor(maxHP + (def * 3) + (vitality * 2) + (focus * 1.5));
}

/**
 * Menjalankan simulasi tribulasi langit 3 gelombang.
 * @param {object} player - Mongoose Player document
 * @param {number} [targetRank] - Target rank yang ingin dicapai (3, 5, 7, 8)
 * @returns {{ survived: boolean, wavesCleared: number, totalDamage: number, survivalHP: number, waveDetails: Array }}
 */
function runTribulation(player, targetRank = null) {
  const law = player.cultivationLaw;
  const lawDef = LAW_DEFINITIONS[law.activeLawType];
  const pathMod = lawDef?.pathMod || 1.0;
  const rank = targetRank !== null && targetRank !== undefined ? targetRank : ((law.rank || 0) + 1);
  const survivalHP = calculateSurvivalHP(player);

  const waveDetails = [];
  let survived = true;

  for (let wave = 0; wave < 3; wave++) {
    const damage = calculateTribulationWaveDamage(wave, rank, pathMod);
    const cleared = survivalHP > damage;
    waveDetails.push({ wave: wave + 1, damage, survived: cleared });

    if (!cleared) {
      survived = false;
      break;
    }
  }

  const totalDamage = waveDetails.reduce((sum, w) => sum + w.damage, 0);
  return { survived, wavesCleared: waveDetails.filter(w => w.survived).length, totalDamage, survivalHP, waveDetails };
}

// ═══════════════════════════════════════════════════════════════
// BREAKTHROUGH PILL CATALOG (Master Plan §5.2)
// ═══════════════════════════════════════════════════════════════

const BREAKTHROUGH_PILL_CATALOG = {
  1: { targetRank: 1, name: 'Pil Pembersih Sumsum Fana', tier: 1, tag: 'breakthrough_pill', successRate: 95 },
  2: { targetRank: 2, name: 'Pil Pembentukan Fondasi Sembilan Awan', tier: 2, tag: 'breakthrough_pill', successRate: 92 },
  3: { targetRank: 3, name: 'Pil Inti Emas Sembilan Revolusi', tier: 3, tag: 'breakthrough_pill', successRate: 90 },
  4: { targetRank: 4, name: 'Pil Kelahiran Roh Bayi Primordial', tier: 4, tag: 'breakthrough_pill', successRate: 88 },
  5: { targetRank: 5, name: 'Pil Transformasi Jiwa Ilahi', tier: 5, tag: 'breakthrough_pill', successRate: 86 },
  6: { targetRank: 6, name: 'Pil Pembelah Kekosongan Void', tier: 6, tag: 'breakthrough_pill', successRate: 85 },
  7: { targetRank: 7, name: 'Pil Penyeberang Petir Sembilan Kesengsaraan', tier: 7, tag: 'breakthrough_pill', successRate: 85 },
  8: { targetRank: 8, name: 'Pil Kenaikan Abadi Nirwana', tier: 8, tag: 'breakthrough_pill', successRate: 85 }
};

/**
 * Eksekusi major breakthrough (Stage 9 → Rank+1 Stage 0).
 * @param {object} player - Mongoose Player document (mutable)
 * @returns {{ success: boolean, isSuccess?: boolean, message: string, rewards?: object, penalties?: object, tribulation?: object }}
 */
function attemptMajorBreakthrough(player, options = {}) {
  const law = player.cultivationLaw;
  if (!law || !law.activeLawType) {
    return { success: false, message: 'Belum memilih Hukum Semesta (Law).' };
  }

  if (law.stage !== 9) {
    return { success: false, message: 'Harus mencapai Stage 9 terlebih dahulu.' };
  }

  if (law.rank >= 8) {
    return { success: false, message: 'Sudah mencapai Rank tertinggi (8).' };
  }

  const targetRank = law.rank + 1;

  // 1. Validasi Syarat Level Karakter & Realm (Mutual Gate)
  if (!meetsLawRankRequirements(player, targetRank)) {
    const reqData = LAW_RANK_REALM_REQUIREMENTS[targetRank];
    return {
      success: false,
      message: `Kapasitas fisik belum siap untuk menembus Rank ${targetRank}. Capai Level ${reqData?.minLevel || 1} terlebih dahulu.`
    };
  }

  // 2. Validasi Khusus Penempaan Raga (Body Tempering: 9 Bagian Tubuh) (Master Plan §3.3 & §5.3)
  // Tabel Syarat Level 9 Bagian Tubuh Penempaan Raga:
  // - Menuju Rank 1: tiap bagian >= Lv. 2
  // - Menuju Rank 2: tiap bagian >= Lv. 4
  // - Menuju Rank 3: tiap bagian >= Lv. 6
  // - Menuju Rank 4: tiap bagian >= Lv. 8
  // - Menuju Rank 5: tiap bagian >= Lv. 10
  // - Menuju Rank 6: tiap bagian >= Lv. 12
  // - Menuju Rank 7: tiap bagian >= Lv. 14
  // - Menuju Rank 8: tiap bagian >= Lv. 16
  if (law.activeLawType === 'body_tempering') {
    const parts = law.bodyTemperingParts || {};
    const requiredParts = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'spine', 'dantian', 'skin'];
    const requiredLevel = targetRank * 2;
    const unreadyParts = requiredParts.filter(p => (parts[p] || 0) < requiredLevel);
    if (unreadyParts.length > 0) {
      const partLabels = {
        head: 'Kepala', torso: 'Dada', leftArm: 'Lengan Kiri', rightArm: 'Lengan Kanan',
        leftLeg: 'Kaki Kiri', rightLeg: 'Kaki Kanan', spine: 'Tulang Punggung', dantian: 'Dantian Raga', skin: 'Kulit Luar'
      };
      const unreadyList = unreadyParts.map(p => `${partLabels[p] || p} (${parts[p] || 0}/${requiredLevel})`).join(', ');
      return {
        success: false,
        message: `Penempaan Raga belum tuntas. Menuju Rank ${targetRank}, seluruh 9 bagian tubuh wajib mencapai minimal Lv. ${requiredLevel}. Belum siap: ${unreadyList}.`
      };
    }
  }

  if (law.qi < law.maxQi) {
    return { success: false, message: `Qi belum penuh. ${Math.floor(law.qi)}/${law.maxQi}` };
  }

  if (law.majorBreakthroughCooldownUntil && new Date(law.majorBreakthroughCooldownUntil) > new Date()) {
    const remaining = Math.ceil((new Date(law.majorBreakthroughCooldownUntil) - Date.now()) / 60000);
    return { success: false, message: `Masih dalam masa pemulihan besar. Sisa: ${remaining} menit.` };
  }

  // Tribulasi Langit (Rank 3, 5, 7, 8)
  let tribResult = null;
  if (requiresTribulation(targetRank)) {
    tribResult = runTribulation(player, targetRank);
    if (!tribResult.survived) {
      // Tribulasi GAGAL — penalti berat
      const cooldownMs = getMajorBreakthroughFailCooldown(law.rank) + (24 * 3600 * 1000) + (law.rank * 4 * 3600 * 1000);
      law.qi = Math.max(0, law.qi - Math.floor(law.maxQi * 0.5));
      law.majorBreakthroughCooldownUntil = new Date(Date.now() + cooldownMs);

      return {
        success: true,
        isSuccess: false,
        message: `Tribulasi Langit GAGAL! Petir surgawi menghancurkan pertahananmu di gelombang ${tribResult.wavesCleared + 1}.`,
        tribulation: tribResult,
        penalties: {
          qiLost: Math.floor(law.maxQi * 0.5),
          cooldownMs,
          cooldownHours: Math.ceil(cooldownMs / 3600000)
        }
      };
    }
  }

  // Auto-detect slotted breakthrough pill & catalog validation (Master Plan §5.2)
  const catalogEntry = BREAKTHROUGH_PILL_CATALOG[targetRank];
  let hasPill = !!options.hasMatchingPill;
  if (law.breakthroughPillSlot) {
    hasPill = true;
    options.pillProtectLoss = true;
    law.breakthroughPillSlot = null; // Terkonsumsi saat ritual penerobosan
  }

  // Roll RNG untuk major breakthrough (Master Plan §5.2)
  // Dengan pil cocok: success rate naik ke rentang 85–95%
  // Tanpa pil: rate rendah 30–40%; gagal -> Qi hilang ~50%
  let successRate = getMajorBreakthroughSuccessRate(law.rank, hasPill);
  if (hasPill && options.pillBonusRate) {
    successRate = Math.min(95, successRate + options.pillBonusRate);
  }

  const roll = Math.random() * 100;
  const isSuccess = roll <= successRate;

  if (isSuccess) {
    const oldRank = law.rank;
    law.rank += 1;
    law.stage = 0;
    law.qi = 0;
    law.maxQi = getQiRequired(law.rank, 0);
    law.lawLevelCapBonus += 5;      // Major bonus +5 Level Cap
    law.lawSkillPoints += 3;         // Major bonus +3 Skill Points
    law.majorBreakthroughCooldownUntil = new Date(Date.now() + 4 * 3600 * 1000); // 4 jam recovery

    const rankNames = LAW_RANK_NAMES[law.activeLawType];
    const newRankName = rankNames?.[law.rank] || `Rank ${law.rank}`;
    const lawDef = LAW_DEFINITIONS[law.activeLawType];

    if (law.activeLawType === 'gu_master') {
      law.guMaxSlots = getGuMaxSlots(law.rank);
    }

    // D3: Evolusi Beast & Artifact saat Major Breakthrough Success (Master Plan §2.1 & §2.2)
    if (law.activeLawType === 'natal_beast' && law.boundEntity) {
      const b = law.boundEntity;
      b.rankLevel = law.rank;
      if (law.rank >= 7) {
        b.evolutionStage = 'Avatar / Soul Fusion';
        b.isEgg = false;
      } else if (law.rank >= 5) {
        b.evolutionStage = 'Siluman';
        b.isEgg = false;
      } else if (law.rank >= 3) {
        b.evolutionStage = 'Dewasa';
        b.isEgg = false;
      } else if (law.rank >= 1) {
        b.evolutionStage = 'Anak Satwa Roh';
        if (b.isEgg) {
          b.isEgg = false;
          b.hatchedAt = new Date();
        }
      } else {
        b.evolutionStage = 'Telur Purba';
        b.isEgg = true;
      }

      // Kenaikan stat deterministik per rank (Master Plan §2.2)
      b.beastAtk = 15 + (law.rank * 15);
      b.beastDef = 10 + (law.rank * 10);
      b.beastMaxHp = 100 + (law.rank * 60);
      b.beastCurrentHp = b.beastMaxHp;
    }

    if (law.activeLawType === 'natal_artifact' && law.boundEntity) {
      const a = law.boundEntity;
      a.rankLevel = law.rank;
      a.artifactAtk = (a.artifactAtk || 15) + 15;
      a.artifactDef = (a.artifactDef || 10) + 10;
      a.artifactCrit = (a.artifactCrit || 5) + 2;
      a.artifactRes = (a.artifactRes || 5) + 2;
    }

    // Penerapan lonjakan 5 Pilar Mayor saat kenaikan Rank
    if (!player.stats) player.stats = {};
    if (!player.extendedStats) player.extendedStats = {};
    player.stats.baseHp = (player.stats.baseHp || 100) + 100;
    player.stats.baseAtk = (player.stats.baseAtk || 15) + 20;
    player.stats.baseDef = (player.stats.baseDef || 10) + 15;
    player.extendedStats.lifespan = (player.extendedStats.lifespan || 100) + 20;
    player.currentStamina = (player.currentStamina || 100) + (law.activeLawType === 'body_tempering' ? 15 : 10);
    if (lawDef?.rootKey) {
      if (!player.extendedStats.spiritualRoot) player.extendedStats.spiritualRoot = {};
      player.extendedStats.spiritualRoot[lawDef.rootKey] = (player.extendedStats.spiritualRoot[lawDef.rootKey] || 0) + 100;
    }

    const realmDisplay = formatLawRealmDisplay(player);
    const realmLabel = realmDisplay?.display || `${newRankName} · Rank ${law.rank} · Stage 0/9`;

    return {
      success: true,
      isSuccess: true,
      message: `🎉 PENEROBOSAN BESAR BERHASIL! Ranah naik ke: ${realmLabel}!`,
      realmDisplay,
      realmLabel,
      tribulation: tribResult,
      rewards: {
        newRank: law.rank,
        newStage: 0,
        rankDisplayName: realmDisplay?.title || newRankName,
        realmLabel,
        levelCapBonus: 5,
        skillPoints: 3,
        cooldownMs: 4 * 3600 * 1000,
        maxQi: law.maxQi
      }
    };
  } else {
    // Major fail — penalti (dapat diredam pil)
    const baseCooldownMs = getMajorBreakthroughFailCooldown(law.rank);
    const cooldownMs = options.pillProtectLoss ? Math.floor(baseCooldownMs / 2) : baseCooldownMs;
    const qiLost = options.pillProtectLoss ? 0 : Math.floor(law.maxQi * 0.50); // Tanpa pil: deviasi parah kehilangan ~50% Qi
    law.qi = Math.max(0, law.qi - qiLost);
    law.majorBreakthroughCooldownUntil = new Date(Date.now() + cooldownMs);

    const failMsg = options.pillProtectLoss
      ? 'Penerobosan Besar Gagal! Namun khasiat Pil Penerobosan menyerap deviasi batin sehingga Xiuwei tidak berkurang!'
      : 'Penerobosan Besar GAGAL. Qi mengalami deviasi parah (-50% Xiuwei). Pulihkan diri.';

    return {
      success: true,
      isSuccess: false,
      message: failMsg,
      tribulation: tribResult,
      penalties: {
        qiLost,
        cooldownMs,
        cooldownHours: Math.ceil(cooldownMs / 3600000)
      }
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// ACTIVE CULTIVATION ENGINE (ANTI-STAGNAN & LOOP ADIKTIF)
// ═══════════════════════════════════════════════════════════════

/**
 * Memberikan perolehan Qi / True Qi aktif berdasarkan aktivitas gameplay nyata.
 * Menjamin loop gameplay adiktif dan setiap Law merasakan sensasi berbeda.
 * 
 * @param {object} player - Mongoose Player document (mutable)
 * @param {string} triggerType - Jenis aksi gameplay
 * @param {object} context - Parameter tambahan
 * @returns {{ lawQiGained: number, systemQiGained: number, energyLabel: string, message: string }}
 */
function awardActiveCultivationQi(player, triggerType, context = {}) {
  if (!player) return { lawQiGained: 0, systemQiGained: 0, energyLabel: 'Qi', message: '' };

  const law = player.cultivationLaw;
  const activeLawType = law?.activeLawType;
  const lawDef = LAW_DEFINITIONS[activeLawType];

  let lawQiGained = 0;
  let essenceGained = 0;
  let systemQiGained = 0;
  let message = '';

  switch (triggerType) {
    case 'battle_hit':
      if (activeLawType === 'body_tempering') {
        essenceGained = 2;
      } else {
        essenceGained = 1;
      }
      break;

    case 'battle_victory':
      const monsterTier = context.monsterTier || 1;
      systemQiGained = Math.floor(35 * monsterTier);
      if (activeLawType === 'body_tempering') {
        essenceGained = 5;
        lawQiGained = 3;
        message = '💪 Otot dan urat menyerap hawa pertarungan (+5 Esensi Raga, +3 True Qi residu)!';
      } else if (activeLawType === 'demonic_blood_soul') {
        essenceGained = 5;
        lawQiGained = 3;
        message = '🩸 Memanen darah musuh yang gugur (+5 Esensi Darah, +3 Blood Qi residu)!';
      } else if (activeLawType === 'natal_beast') {
        essenceGained = 5;
        lawQiGained = 3;
        if (law.boundEntity) {
          law.boundEntity.beastCurrentHp = Math.min(law.boundEntity.beastMaxHp || 120, (law.boundEntity.beastCurrentHp || 120) + 15);
        }
        message = '🐾 Bertarung berdampingan dengan satwa roh (+5 Esensi Ikatan, +3 Qi residu)!';
      } else {
        essenceGained = 3;
        lawQiGained = 2;
      }
      break;

    case 'meat_eaten':
      if (activeLawType === 'body_tempering') {
        essenceGained = 6;
        lawQiGained = 3;
        message = '🍖 Daging binatang buas dicerna menjadi intisari raga (+6 Esensi Raga, +3 True Qi residu)!';
      } else {
        essenceGained = 3;
        lawQiGained = 1;
      }
      break;

    case 'step_endurance':
      const steps = context.steps || 1;
      essenceGained = steps >= 5 ? 1 : 0;
      lawQiGained = 0;
      systemQiGained = Math.floor(steps * 0.5);
      break;

    case 'fish_caught':
      if (activeLawType === 'element_azure_water') {
        essenceGained = 5;
        lawQiGained = 2;
        message = '💧 Menyerap embun air danau bersama ikan roh (+5 Esensi Azure, +2 Qi residu)!';
      } else {
        essenceGained = 2;
        lawQiGained = 1;
      }
      systemQiGained = 20;
      break;

    case 'ore_mined':
      if (activeLawType === 'element_xuanwu_earth') {
        essenceGained = 5;
        lawQiGained = 2;
        message = '🗿 Menyerap hawa bumi leylines dari rekahan batu (+5 Esensi Leyline, +2 Qi residu)!';
      } else {
        essenceGained = 2;
        lawQiGained = 1;
      }
      systemQiGained = 20;
      break;

    case 'herb_harvested':
      if (activeLawType === 'element_qingdi_wood') {
        essenceGained = 5;
        lawQiGained = 2;
        message = '🌿 Intisari getah tanaman obat meresap ke pori-pori (+5 Esensi Hayat, +2 Qi residu)!';
      } else {
        essenceGained = 2;
        lawQiGained = 1;
      }
      systemQiGained = 20;
      break;

    case 'equipment_forged':
      if (activeLawType === 'natal_artifact') {
        essenceGained = 5;
        lawQiGained = 3;
        message = '🗡️ Hawa dentingan palu beresonansi dengan pusaka jiwa (+5 Esensi Pusaka, +3 Qi residu)!';
      } else {
        essenceGained = 3;
        lawQiGained = 1;
      }
      systemQiGained = 25;
      break;

    case 'crit_landed':
      if (activeLawType === 'element_godthunder_light') {
        essenceGained = 2;
        lawQiGained = 1;
        message = '⚡ Sengatan kilat surgawi menyambar meridian (+2 Esensi Petir, +1 Qi residu)!';
      } else {
        essenceGained = 1;
        lawQiGained = 0;
      }
      break;

    default:
      essenceGained = 1;
      lawQiGained = 0;
      systemQiGained = 10;
  }

  // Akumulasikan ke cultivationLaw jika pemain mengikat Law
  if (law && law.activeLawType) {
    checkAndResetDailyCap(player);
    if (!law.dailyData) law.dailyData = {};

    if (essenceGained > 0) {
      const worldEssenceToday = law.dailyData.worldEssenceToday || 0;
      const DAILY_WORLD_ESSENCE_CAP = 25; // Batas harian akumulasi esensi duniawi (anti-bypass)
      const allowedEssence = Math.max(0, DAILY_WORLD_ESSENCE_CAP - worldEssenceToday);
      const actualEssence = Math.min(essenceGained, allowedEssence);
      if (actualEssence > 0) {
        const maxEss = getMaxEssence(law.rank || 0);
        law.currentEssence = Math.min(maxEss, (law.currentEssence !== undefined ? law.currentEssence : 0) + actualEssence);
        law.maxEssence = maxEss;
        law.dailyData.worldEssenceToday = worldEssenceToday + actualEssence;
      }
      essenceGained = actualEssence;
    }

    // Direct law.qi from world hooks strictly capped to avoid bypassing channeling progression curve
    if (lawQiGained > 0) {
      const worldQiToday = law.dailyData.worldQiToday || 0;
      const DAILY_WORLD_QI_CAP = 5; // Minimal residual Qi only (anti-bypass)
      const allowed = Math.max(0, DAILY_WORLD_QI_CAP - worldQiToday);
      const actualGrant = Math.min(lawQiGained, allowed);
      if (actualGrant > 0) {
        law.qi = Math.min(law.maxQi || 1000, (law.qi || 0) + actualGrant);
        law.dailyData.worldQiToday = worldQiToday + actualGrant;
      }
      lawQiGained = actualGrant;
    }
  }

  // Akumulasikan ke systemCultivation (fondasi ranah)
  if (player.systemCultivation && systemQiGained > 0) {
    const { getRealmIndex, getMaxQi } = require('./cultivation');
    const rIdx = getRealmIndex(player.systemCultivation.realm || 'Fondasi Fana (Mortal Foundation)');
    const sysMaxQi = getMaxQi(rIdx, player.systemCultivation.stage || 1);
    player.systemCultivation.qi = Math.min(sysMaxQi, (player.systemCultivation.qi || 0) + systemQiGained);
  }

  return {
    lawQiGained,
    essenceGained,
    systemQiGained,
    energyLabel: lawDef?.energyLabel || 'Qi',
    message
  };
}

// ═══════════════════════════════════════════════════════════════
// DAILY RESET & EPIPHANY CLAIM (§3.1)
// ═══════════════════════════════════════════════════════════════

/**
 * Reset daily channeling cap jika hari sudah berganti.
 * Dipanggil setiap kali pemain mengakses halaman kultivasi.
 * @param {object} player - Mongoose Player document (mutable)
 * @returns {boolean} true jika reset dilakukan
 */
function checkAndResetDailyCap(player) {
  const law = player.cultivationLaw;
  if (!law) return false;
  if (!law.dailyData) {
    law.dailyData = {
      channelMinutesToday: 0,
      dailyStreakDays: player.dailyStreak || 1,
      lastDailyResetAt: new Date(),
      lastEpiphanyClaimAt: null,
      dailyMissionsCompleted: 0,
      dailyMissionIds: [],
      turbidAbsorbsToday: 0,
      bloodHarvestsToday: 0,
      soulBannerToday: 0,
      venomDrinksToday: 0,
      essenceConvertsToday: 0,
      worldQiToday: 0,
      meritAbsorbsToday: 0,
      yangAbsorbsToday: 0,
      swordAbsorbsToday: 0,
      arrayAbsorbsToday: 0,
      karmaAbsorbsToday: 0
    };
    return true;
  }

  const lastReset = law.dailyData.lastDailyResetAt ? new Date(law.dailyData.lastDailyResetAt) : new Date(0);
  const now = new Date();

  function getJakartaDateString(date = new Date()) {
    return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  // Reset jika hari berbeda (berdasarkan WIB date 00:00 reset)
  if (getJakartaDateString(lastReset) !== getJakartaDateString(now)) {
    law.dailyData.channelMinutesToday = 0;
    law.dailyData.lastDailyResetAt = now;
    law.dailyData.dailyMissionsCompleted = 0;
    law.dailyData.dailyMissionIds = [];
    law.dailyData.turbidAbsorbsToday = 0;
    law.dailyData.bloodHarvestsToday = 0;
    law.dailyData.soulBannerToday = 0;
    law.dailyData.venomDrinksToday = 0;
    law.dailyData.essenceConvertsToday = 0;
    law.dailyData.worldQiToday = 0;
    law.dailyData.meritAbsorbsToday = 0;
    law.dailyData.yangAbsorbsToday = 0;
    law.dailyData.swordAbsorbsToday = 0;
    law.dailyData.arrayAbsorbsToday = 0;
    law.dailyData.karmaAbsorbsToday = 0;
    return true;
  }
  return false;
}

/**
 * Klaim pencerahan harian (Daily Epiphany).
 * Memberikan 5% dari batas Qi stage saat ini secara instan + 10 Esensi + 25-40 Copper.
 * @param {object} player - Mongoose Player document (mutable)
 * @returns {{ success: boolean, message: string, qiGranted?: number, essenceGranted?: number, copperGranted?: number }}
 */
function claimDailyEpiphany(player) {
  const law = player.cultivationLaw;
  if (!law || !law.activeLawType) {
    return { success: false, message: 'Belum memilih Hukum Semesta (Law).' };
  }

  checkAndResetDailyCap(player);

  if (isClaimedToday(law.dailyData.lastEpiphanyClaimAt)) {
    return { success: false, message: 'Pencerahan harian sudah diklaim hari ini. Reset pada jam 00:00 WIB.' };
  }

  // +5% Qi instan (C1 & C4: menjaga keseimbangan kurva 7 hari Rank 0)
  const qiGranted = Math.floor(law.maxQi * 0.05);
  law.qi = Math.min(law.qi + qiGranted, law.maxQi);

  // +10 Esensi untuk menjaga habit loop meditasi harian
  const essenceGranted = 10;
  const maxEss = law.maxEssence || getMaxEssence(law.rank || 0);
  law.currentEssence = Math.min(maxEss, (Number(law.currentEssence) || 0) + essenceGranted);

  law.dailyData.lastEpiphanyClaimAt = new Date();

  // +25 s/d 40 Copper (random)
  const copperGranted = 25 + Math.floor(Math.random() * 16);
  if (player.currency) {
    player.currency.copper = (player.currency.copper || 0) + copperGranted;
  }

  return {
    success: true,
    message: `✨ Pencerahan Harian! +${qiGranted} Qi, +${essenceGranted} Esensi & +${copperGranted} Tembaga.`,
    qiGranted,
    essenceGranted,
    copperGranted
  };
}

// ═══════════════════════════════════════════════════════════════
// GATE MUTUAL: Law Rank ↔ Character Realm (§2.9)
// ═══════════════════════════════════════════════════════════════

/**
 * Memeriksa apakah pemain memenuhi syarat Character Realm untuk menaikkan Law Rank.
 */
const LAW_RANK_REALM_REQUIREMENTS = [
  { minRealmIndex: 0, minLevel: 1 },   // Rank 0
  { minRealmIndex: 0, minLevel: 20 },  // Rank 1
  { minRealmIndex: 1, minLevel: 40 },  // Rank 2
  { minRealmIndex: 2, minLevel: 60 },  // Rank 3
  { minRealmIndex: 2, minLevel: 80 },  // Rank 4
  { minRealmIndex: 3, minLevel: 100 }, // Rank 5
  { minRealmIndex: 4, minLevel: 120 }, // Rank 6
  { minRealmIndex: 5, minLevel: 150 }, // Rank 7
  { minRealmIndex: 6, minLevel: 180 }, // Rank 8
];

function meetsLawRankRequirements(player, targetRank) {
  const { getRealmIndex } = require('./cultivation');
  const req = LAW_RANK_REALM_REQUIREMENTS[targetRank];
  if (!req) return false;

  const realmIdx = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');
  const level = player.level || 1;

  return realmIdx >= req.minRealmIndex && level >= req.minLevel;
}

// ═══════════════════════════════════════════════════════════════
// STATUS & INFO HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Menghasilkan objek status lengkap Law cultivation untuk response API.
 * @param {object} player - Mongoose Player document
 * @returns {object} Status lengkap untuk frontend
 */
function getLawStatus(player) {
  const law = player.cultivationLaw;
  const systemStage = player.systemCultivation?.stage || 1;
  const systemRealm = player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)';
  const { getRealmIndex } = require('./cultivation');
  const realmIdx = getRealmIndex(systemRealm);

  const mortalGate = {
    systemRealm,
    systemStage,
    canBindLaw: realmIdx === 0 && systemStage >= 10 && !law?.activeLawType && !player.isNormalCultivator,
    canChooseOrdinary: systemStage >= 10 && !law?.activeLawType && !player.isNormalCultivator,
    needsStage10: realmIdx === 0 && systemStage < 10
  };

  if (!law) return { hasLaw: false, canBind: mortalGate.canBindLaw, mortalGate };

  // Bootstrap anti soft-lock (hanya setelah bind untuk pemain rank 0)
  if (
    law?.activeLawType &&
    !law.essenceBootstrapDone &&
    (law.rank || 0) === 0 &&
    (law.qi || 0) === 0 &&
    (law.currentEssence || 0) === 0
  ) {
    law.currentEssence = LAW_PROGRESSION.BOOTSTRAP_ESSENCE;
    law.essenceBootstrapDone = true;
  }

  const lawDef = law.activeLawType ? LAW_DEFINITIONS[law.activeLawType] : null;
  const rankNames = law.activeLawType ? LAW_RANK_NAMES[law.activeLawType] : null;
  const realmDisplay = formatLawRealmDisplay(player);
  const rankDisplayName = realmDisplay?.title || rankNames?.[law.rank] || null;
  const realmLabel = realmDisplay?.display || null;

  const streakDays = law.dailyData?.dailyStreakDays || player.dailyStreak || 0;
  const dailyCap = getDailyChannelCap(streakDays);
  const minutesUsed = law.dailyData?.channelMinutesToday || 0;
  const streakBonus = Math.min(35, streakDays * 5);

  // Live channeling computation for status display (non-mutating)
  let currentQi = law.qi || 0;
  let currentMinutesUsed = minutesUsed;
  let isChannelingActive = !!law.isChanneling;
  const rank = Math.max(0, Math.min(8, Number(law.rank) || 0));
  const stage = Math.max(0, Math.min(9, Number(law.stage) || 0));
  const targetStageQi = law.maxQi || getQiRequired(rank, stage);

  if (isChannelingActive && law.lastChannelSyncAt) {
    const progress = calculateChannelingProgress(player);
    currentQi = Math.min(targetStageQi, currentQi + progress.qiGained);
    currentMinutesUsed = Math.min(dailyCap, currentMinutesUsed + progress.minutesElapsed);
  }

  const isCapReached = (currentMinutesUsed >= dailyCap);
  const isQiFull = (currentQi >= targetStageQi);

  const totalStages = (rank * 10) + stage;
  const qiPercent = targetStageQi > 0 ? Math.min(100, Math.floor((currentQi / targetStageQi) * 100)) : 0;
  const pathMod = lawDef?.pathMod || 1.0;
  const channelRate = getChannelQiRate(rank, pathMod);

  const canClaimEpiphany = !isClaimedToday(law.dailyData?.lastEpiphanyClaimAt);

  const charLevelCap = getLevelCap(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)', law.lawLevelCapBonus || 0);

  const targetRank = (law.rank || 0) + 1;
  const isLevelMet = meetsLawRankRequirements(player, targetRank);
  const reqData = LAW_RANK_REALM_REQUIREMENTS[targetRank];
  const requiredLevel = reqData?.minLevel || 1;
  const charLevel = player.level || 1;

  const tribWaveDamages = [0, 1, 2].map(w => calculateTribulationWaveDamage(w, law.rank || 0, pathMod));
  const survivalHP = calculateSurvivalHP(player);
  const maxWaveDmg = Math.max(...tribWaveDamages);
  const willFaceTribulation = requiresTribulation(targetRank);
  const canSurviveTribulation = !willFaceTribulation || (survivalHP >= maxWaveDmg);

  let majorBlockingReason = null;
  if (stage === 9) {
    if (!isLevelMet) {
      majorBlockingReason = `Kapasitas fisik belum siap. Capai Level ${requiredLevel} (saat ini Lv. ${charLevel}).`;
    } else if (currentQi < targetStageQi) {
      majorBlockingReason = `Akumulasi Qi belum mencapai batas maksimal (${Math.floor(currentQi)}/${targetStageQi}).`;
    } else if (willFaceTribulation && !canSurviveTribulation) {
      majorBlockingReason = `Peringatan Kematian: Survival HP (${survivalHP}) tidak cukup menahan Petir Tribulasi (${maxWaveDmg} DMG). Tingkatkan DEF/Vitalitas.`;
    }
  }

  // Progression Feel & ETA Calculations (Loop Kecanduan §C1 & §C5)
  const remainingQiThisStage = Math.max(0, targetStageQi - currentQi);
  const effectiveRate = Math.max(1, channelRate);
  const dailyEffectiveMinutes = Math.max(1, dailyCap);
  const dailyEffectiveQi = effectiveRate * dailyEffectiveMinutes;

  // ETA untuk stage saat ini
  const etaMinutesThisStage = Math.ceil(remainingQiThisStage / effectiveRate);
  const etaDaysThisStage = Number((remainingQiThisStage / dailyEffectiveQi).toFixed(2));

  // ETA untuk seluruh sisa stage di rank saat ini (termasuk stage saat ini)
  let remainingQiThisRank = remainingQiThisStage;
  for (let s = stage + 1; s <= 9; s++) {
    remainingQiThisRank += getQiRequired(rank, s);
  }
  const etaDaysThisRank = Number((remainingQiThisRank / dailyEffectiveQi).toFixed(2));

  const digestRate = getEssenceDigestRate(rank);
  const currentEssVal = Math.floor(law.currentEssence !== undefined ? law.currentEssence : 40);
  const essenceMinutesLeft = Math.floor(currentEssVal / Math.max(1, digestRate));

  let nextDopamine = 'channel';
  if (currentQi >= targetStageQi) {
    nextDopamine = stage === 9 ? 'major_breakthrough_ready' : 'breakthrough_ready';
  } else if (currentQi >= targetStageQi * 0.85) {
    nextDopamine = 'breakthrough_imminent';
  } else if (currentEssVal <= (digestRate * 10)) {
    nextDopamine = 'need_absorb';
  } else if (dailyCap - currentMinutesUsed > 0) {
    nextDopamine = 'channel';
  }

  const nextAction = (currentEssVal <= (digestRate * 10)) ? 'absorb' : (currentQi >= targetStageQi) ? 'breakthrough' : 'channel';

  const progressionFeel = {
    rank,
    stage,
    qi: Math.floor(currentQi),
    maxQi: targetStageQi,
    stageProgressPct: Number((targetStageQi > 0 ? (currentQi / targetStageQi) : 0).toFixed(4)),
    stageProgressPercent: Math.min(100, Math.floor((currentQi / targetStageQi) * 100)),
    etaDaysThisStage,
    etaMinutesThisStage,
    etaDaysThisRank,
    rankTargetDays: LAW_PROGRESSION.RANK_TARGET_DAYS[rank] || 280,
    nextAction,
    nextDopamine,
    essenceMinutesLeft,
    dailyCapMinutes: dailyCap,
    dailyMinutesUsed: Math.floor(currentMinutesUsed),
    channelMinutesRemainingToday: Math.max(0, dailyCap - currentMinutesUsed),
    hintText: currentQi >= targetStageQi
      ? (stage === 9 ? '⚡ Qi Dantiamu meluap! Bersiaplah menghadapi Terobosan Ranah Agung (Major Breakthrough)!' : '✨ Botol leher terobosan telah tercapai! Lakukan Penerobosan Stage!')
      : currentEssVal <= 0
        ? '⚠️ Reservoir esensi kosong! Meditasi terhenti sampai kamu menyerap bahan spiritual.'
        : `🧘 Meditasi sekitar ±${etaMinutesThisStage} menit lagi untuk menerobos ke Stage berikutnya.`
  };

  return {
    mortalGate,
    isNormalCultivator: !!player.isNormalCultivator,
    hasLaw: !!law.activeLawType,
    activeLawType: law.activeLawType,
    lawName: lawDef?.name || null,
    category: lawDef?.category || null,
    lawCategory: lawDef?.category || null,
    element: lawDef?.element || null,
    lawElement: lawDef?.element || null,
    qiType: lawDef?.qiType || 'qi',
    energyLabel: lawDef?.energyLabel || (lawDef?.qiType === 'true_qi' ? 'True Qi (真气)' : 'Qi Spiritual (灵气)'),
    pathMod: pathMod,

    rank,
    stage,
    rankDisplayName: rankDisplayName || `Rank ${rank}`,
    realmDisplay,
    realmLabel,
    totalStages,

    qi: Math.floor(currentQi),
    maxQi: targetStageQi,
    qiPercent,
    qiProgressPercent: qiPercent,
    channelRate,
    channelRatePerMinute: channelRate,

    isChanneling: isChannelingActive,
    dailyChannelCap: dailyCap,
    dailyChannelCapMinutes: dailyCap,
    dailyChannelUsed: Math.floor(currentMinutesUsed),
    channelMinutesUsedToday: Math.floor(currentMinutesUsed),
    dailyChannelRemaining: Math.max(0, dailyCap - currentMinutesUsed),
    remainingChannelMinutesToday: Math.max(0, dailyCap - currentMinutesUsed),

    loginStreak: streakDays,
    streakBonusMinutes: streakBonus,
    lawLevelCapBonus: law.lawLevelCapBonus || 0,
    characterLevelCap: charLevelCap,
    characterCurrentLevel: charLevel,
    requiredLevelForNextRank: requiredLevel,
    isLevelMetForNextRank: isLevelMet,
    lawSkillPoints: law.lawSkillPoints || 0,
    unlockedSkillIds: law.unlockedSkillIds || [],
    unlockedSkillsCount: (law.unlockedSkillIds || []).length,
    combatLoadout: law.combatLoadout || [],

    // C4. Skill Tree Representation
    skillTree: (() => {
      const tree = law.activeLawType ? LAW_SKILL_TREES[law.activeLawType] : null;
      const skillLevels = law.skillLevels instanceof Map
        ? Object.fromEntries(law.skillLevels)
        : (law.skillLevels || {});
      const unlocked = new Set(law.unlockedSkillIds || []);

      const nodes = (tree?.nodes || []).map(n => {
        const nodeId = n.id || n.skillId;
        const currentLevel = Number(skillLevels[nodeId] || (unlocked.has(nodeId) ? 1 : 0));
        const reqParent = (n.requires && n.requires.length > 0) ? n.requires[0] : null;
        const parentUnlocked = !reqParent || unlocked.has(reqParent);
        const rankMet = (law.rank || 0) >= (n.requiredRank || 0);
        return {
          id: nodeId,
          name: n.name,
          tier: n.tier || 1,
          icon: n.icon || '⚡',
          description: n.description,
          currentLevel,
          maxLevel: n.maxLevel || 5,
          costPerLevel: n.costPerLevel || 1,
          unlocked: currentLevel > 0,
          canUnlock: currentLevel === 0 && rankMet && parentUnlocked,
          canUpgrade: currentLevel > 0 && currentLevel < (n.maxLevel || 5),
          effects: n.effects
        };
      });

      return {
        points: law.lawSkillPoints || law.skillPoints || 0,
        nodes
      };
    })(),

    // Fase E: UX / Unique Panel per activeLawType
    uniquePanel: (() => {
      const type = law.activeLawType;
      if (!type) return null;
      const panel = {};

      if (type === 'body_tempering') {
        panel.bodyParts = law.bodyTemperingParts || {
          head: 0, torso: 0, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0, spine: 0, dantian: 0, skin: 0
        };
        panel.bodyEssenceStorage = law.bodyEssenceStorage || {};
        panel.maxStorage = getMaxEssenceStorage(law.rank || 0);
        panel.temperingActive = !!law.isTemperingPart;
        panel.temperingPart = law.temperingPartTarget || null;
      } else if (type === 'gu_master') {
        panel.guSlots = law.guSlots || [];
        panel.guMaxSlots = getGuMaxSlots(law.rank || 0);
        panel.combatActiveGu = (law.guSlots || []).filter(g => g.isActiveInCombat).length;
      } else if (type.startsWith('natal_')) {
        panel.boundEntity = law.boundEntity || null;
      } else if (type.startsWith('demonic_')) {
        panel.demonicData = {
          corruption: law.demonicData?.corruption || 0,
          infamy: player.infamy || law.demonicData?.infamy || 0,
          venomLevel: law.demonicData?.venomLevel || 0,
          altarTier: law.facilities?.abyssalAltarTier || 0,
          netherExileTimerSeconds: law.demonicData?.netherExileTimerSeconds || 0,
          hasNetherDebuff: !!law.demonicData?.hasNetherDebuff,
          abyssalCurseLevel: law.demonicData?.abyssalCurseLevel || 0
        };
      } else if (type === 'righteous_heavenly_merit') {
        panel.merit = {
          absorbsToday: law.dailyData?.meritAbsorbsToday || 0,
          max: LAW_BALANCE.DAILY_MERIT_ABSORB_MAX || 15
        };
      } else if (type === 'righteous_pure_yang') {
        panel.yang = {
          absorbsToday: law.dailyData?.yangAbsorbsToday || 0,
          max: LAW_BALANCE.DAILY_YANG_ABSORB_MAX || 12,
          cleanInventoryRequired: true
        };
      } else if (type === 'righteous_sword_heart') {
        panel.sword = {
          absorbsToday: law.dailyData?.swordAbsorbsToday || 0,
          max: LAW_BALANCE.DAILY_SWORD_ABSORB_MAX || 15,
          wieldingSword: isPlayerWieldingSword(player)
        };
      } else if (type === 'righteous_formation_array') {
        panel.formation = {
          absorbsToday: law.dailyData?.arrayAbsorbsToday || 0,
          max: LAW_BALANCE.DAILY_ARRAY_ABSORB_MAX || 10,
          onHub: isOnOwnFormationHub(player),
          hubTier: law.facilities?.formationHubTier || 0
        };
      } else if (type === 'righteous_karmic_mirror') {
        const inf = player.infamy || 0;
        panel.karma = {
          absorbsToday: law.dailyData?.karmaAbsorbsToday || 0,
          max: LAW_BALANCE.DAILY_KARMA_ABSORB_MAX || 15,
          infamy: inf,
          absorbBlocked: inf > 30,
          reflectPct: (player.extendedStats?.reflectPct || 0)
        };
      }

      return panel;
    })(),

    boundEntity: law.boundEntity || null,
    demonicData: (() => {
      if (!law.demonicData) return null;
      const d = (typeof law.demonicData.toObject === 'function') ? law.demonicData.toObject() : { ...law.demonicData };
      if (law.activeLawType === 'demonic_abyssal_pact' && d.abyssalTributeDueAt) {
        const dueTime = new Date(d.abyssalTributeDueAt).getTime();
        const now = Date.now();
        if (now > dueTime) {
          const overdueDays = (now - dueTime) / (24 * 3600 * 1000);
          d.abyssalCurseLevel = overdueDays >= 7 ? 2 : 1;
        } else {
          d.abyssalCurseLevel = 0;
        }
      }
      if (law.activeLawType === 'demonic_nether_darkness') {
        const safeLimit = getNetherSafeLimitSeconds(law.rank || 0);
        if (d.leftNetherTerritoryAt) {
          const elapsed = Math.floor((Date.now() - new Date(d.leftNetherTerritoryAt).getTime()) / 1000);
          const remaining = Math.max(0, safeLimit - elapsed);
          d.netherExileTimerSeconds = remaining;
          d.hasNetherDebuff = (remaining <= 0);
        } else {
          d.netherExileTimerSeconds = safeLimit;
          d.hasNetherDebuff = false;
        }
      }
      return d;
    })(),
    bodyTemperingParts: law.bodyTemperingParts || {
      head: 0, torso: 0, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0, spine: 0, dantian: 0, skin: 0
    },
    // Penyimpanan Internal 22 Esensi Alam Raga Suci
    bodyEssenceStorage: law.bodyEssenceStorage || {},
    maxBodyEssenceStorage: getMaxEssenceStorage(law.rank || 0),
    naturalEssencesCatalog: NATURAL_ESSENCES,
    temperingStatus: {
      isTempering: !!law.isTemperingPart,
      targetPart: law.temperingPartTarget || null,
      essenceUsed: law.temperingEssenceUsed || null,
      finishAt: law.temperingFinishAt || null,
      isFinished: law.temperingFinishAt ? (new Date() >= new Date(law.temperingFinishAt)) : false,
      remainingSeconds: law.temperingFinishAt ? Math.max(0, Math.ceil((new Date(law.temperingFinishAt).getTime() - Date.now()) / 1000)) : 0
    },
    breakthroughPillSlot: law.breakthroughPillSlot ? {
      _id: (law.breakthroughPillSlot._id || law.breakthroughPillSlot).toString(),
      name: law.breakthroughPillSlot.name || 'Pil Penerobosan',
      tier: law.breakthroughPillSlot.tier || (law.breakthroughPillSlot.rank === 'uncommon' ? 2 : law.breakthroughPillSlot.rank === 'rare' ? 3 : 1),
      icon: law.breakthroughPillSlot.icon || '💊',
      rarity: law.breakthroughPillSlot.rank || law.breakthroughPillSlot.rarity || 'Common',
      description: law.breakthroughPillSlot.description || 'Meningkatkan peluang keberhasilan terobosan sebesar +20% dan melindungi dantian dari kehilangan Qi.'
    } : null,
    guSlots: (law.guSlots || []).map(g => {
      const baseSatiety = g.satiety !== undefined ? g.satiety : (g.hunger !== undefined ? g.hunger : 80);
      const hoursSinceFed = g.lastFedAt ? (Date.now() - new Date(g.lastFedAt).getTime()) / 3600000 : 0;
      const decay = Math.floor(hoursSinceFed * 2); // 2% satiety decay per hour
      const effectiveSatiety = Math.max(0, Math.min(100, baseSatiety - decay));
      return {
        guItemId: g.guItemId || null,
        guName: g.guName,
        guType: g.guType,
        tier: g.tier || 1,
        level: g.level || 1,
        hunger: effectiveSatiety,
        satiety: effectiveSatiety,
        bonusAtk: g.bonusAtk || 5,
        bonusDef: g.bonusDef || 3,
        specialEffect: g.specialEffect || null,
        lastFedAt: g.lastFedAt || null
      };
    }),
    guMaxSlots: getGuMaxSlots(law.rank || 0),
    guBacklashUntil: law.guBacklashUntil || player.demonicData?.guBacklashUntil || null,

    // Universal Essence System
    currentEssence: currentEssVal,
    maxEssence: law.maxEssence || getMaxEssence(rank),
    essencePercent: Math.min(100, Math.floor((currentEssVal / (law.maxEssence || getMaxEssence(rank))) * 100)),
    essence: {
      current: currentEssVal,
      max: law.maxEssence || getMaxEssence(rank),
      barName: (law.activeLawType && LAW_ESSENCE_PROFILE[law.activeLawType]?.barName) || 'Reservoir Esensi Hukum',
      isDepleted: currentEssVal <= 0,
      emptyHint: (law.activeLawType && LAW_ESSENCE_PROFILE[law.activeLawType]?.emptyHint) || 'Serap bahan spiritual sesuai jalurnya agar meditasi menghasilkan Xiuwei.',
      digestRatePerMinute: digestRate,
      channelRatePerMinute: channelRate,
      minutesFundable: essenceMinutesLeft,
      etaDaysToNextStage: etaDaysThisStage
    },

    // Soft Addiction Hooks & Progression Metrics (Master Plan §5.4 & C5)
    progressionFeel,

    // Cultivation Facilities (Khusus Altar: Hanya Demonic Abyssal Altar di Lahan Peta)
    facilities: law.facilities || {
      abyssalAltarTier: 0,
      bodyCauldronTier: 0,
      guCrucibleTier: 1
    },

    canMiniBreakthrough: (currentQi >= targetStageQi) && (stage < 9),
    miniBreakthroughReady: (currentQi >= targetStageQi) && (stage < 9),
    canMajorBreakthrough: (currentQi >= targetStageQi) && (stage === 9) && (rank < 8) && isLevelMet,
    majorBreakthroughReady: (currentQi >= targetStageQi) && (stage === 9) && (rank < 8) && isLevelMet,
    majorBreakthroughBlockingReason: majorBlockingReason,
    requiresTribulation: willFaceTribulation,

    tribulationDetails: {
      willFaceTribulation,
      waveDamages: tribWaveDamages,
      survivalHP,
      maxWaveDmg,
      canSurvive: canSurviveTribulation
    },

    miniBreakthroughCost: {
      moodCost: 15,
      vitalityCost: 15,
      silverCost: Math.ceil(getMiniBreakthroughCost(law.rank || 0, law.stage || 0) / 100),
      materialName: 'Herba Penguat Intisari'
    },
    miniBreakthroughSuccessRate: getMiniBreakthroughSuccessRate(law.rank || 0, law.stage || 0),
    majorBreakthroughSuccessRate: getMajorBreakthroughSuccessRate(law.rank || 0, !!law.breakthroughPillSlot),

    miniCooldownUntil: law.miniBreakthroughCooldownUntil || null,
    miniBreakthroughCooldownUntil: law.miniBreakthroughCooldownUntil || null,
    majorCooldownUntil: law.majorBreakthroughCooldownUntil || null,
    majorBreakthroughCooldownUntil: law.majorBreakthroughCooldownUntil || null,

    canClaimEpiphany,
    canBind: !law.activeLawType
  };
}

// ═══════════════════════════════════════════════════════════════
// SKILL TREES UNTUK 5 HUKUM SEMESTA RIGHTEOUS
// ═══════════════════════════════════════════════════════════════
const LAW_SKILL_TREES = {
  righteous_heavenly_merit: {
    lawType: 'righteous_heavenly_merit',
    name: 'Pohon Kebaikan Surgawi',
    nodes: [
      {
        id: 'merit_resolve',
        name: 'Tekad Jasa',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { hpMult: 0.01 },
        icon: '🛡️',
        description: 'Mempertebal tekad kebajikan, meningkatkan batas HP sebesar +1% per level.'
      },
      {
        id: 'merit_aegis',
        name: 'Perisai Kebajikan',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['merit_resolve'],
        requiredRank: 0,
        effects: { defMult: 0.01 },
        icon: '✨',
        description: 'Pancaran aura kebajikan menahan benturan, meningkatkan DEF sebesar +1% per level.'
      },
      {
        id: 'merit_smite',
        name: 'Hukuman Langit',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['merit_aegis'],
        requiredRank: 1,
        effects: { atkWantedMult: 0.03, flatAtk: 5 },
        icon: '⚡',
        description: 'Menyalurkan murka langit terhadap penjahat buronan ortodoks, memberikan bonus ATK.'
      },
      {
        id: 'merit_charity_flow',
        name: 'Aliran Amal',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['merit_resolve'],
        requiredRank: 1,
        effects: { essenceGainPct: 0.02 },
        icon: '🕊️',
        description: 'Mempercepat penyerapan segel kebajikan ke dalam dantian (+2% esensi per level).'
      },
      {
        id: 'merit_heaven_eye',
        name: 'Mata Langit Suci',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['merit_smite'],
        requiredRank: 2,
        effects: { spiritualRes: 4 },
        icon: '👁️',
        description: 'Mata batin menembus ilusi kefasikan, meningkatkan Spiritual Resistance sebesar +4 per level.'
      }
    ]
  },
  righteous_pure_yang: {
    lawType: 'righteous_pure_yang',
    name: 'Pohon Yang Murni',
    nodes: [
      {
        id: 'yang_breath',
        name: 'Napas Surya',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { atkMult: 0.01 },
        icon: '☀️',
        description: 'Menghela napas intisari surya murni, meningkatkan ATK sebesar +1% per level.'
      },
      {
        id: 'yang_purge',
        name: 'Purifikasi Yang',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['yang_breath'],
        requiredRank: 0,
        effects: { poisonResist: 0.05, corruptionResist: 0.05 },
        icon: '🔥',
        description: 'Membakar racun dan hawa kotor di dalam meridian tubuh.'
      },
      {
        id: 'yang_sun_brand',
        name: 'Tera Mentari',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['yang_purge'],
        requiredRank: 1,
        effects: { dmgVsCorrupted: 0.04 },
        icon: '🔆',
        description: 'Menghanguskan musuh yang terkorupsi dengan daya bakar surya bertambah +4% per level.'
      },
      {
        id: 'yang_cleanse_vessel',
        name: 'Pembersihan Bejana',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['yang_breath'],
        requiredRank: 1,
        effects: { channelDarkPenaltyReduction: 0.20 },
        icon: '🪷',
        description: 'Menjaga kemurnian bejana kultivasi dari pengaruh wilayah gelap.'
      },
      {
        id: 'yang_radiance',
        name: 'Radiansi Kehidupan',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['yang_sun_brand'],
        requiredRank: 2,
        effects: { lifespan: 2, vitality: 5 },
        icon: '🌞',
        description: 'Cahaya Yang murni memelihara sumsum kehidupan, meningkatkan usia dan vitalitas.'
      }
    ]
  },
  righteous_sword_heart: {
    lawType: 'righteous_sword_heart',
    name: 'Pohon Hati Pedang',
    nodes: [
      {
        id: 'sword_stance',
        name: 'Kuda-kuda Pedang',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { atkMult: 0.015 },
        icon: '🗡️',
        description: 'Kuda-kuda dasar pendekar pedang sejati, meningkatkan ATK sebesar +1.5% per level.'
      },
      {
        id: 'sword_edge',
        name: 'Ketajaman Hati',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['sword_stance'],
        requiredRank: 0,
        effects: { crit: 0.4 },
        icon: '⚔️',
        description: 'Menajamkan niat pedang batin, memberikan bonus CRIT sebesar +0.4% per level.'
      },
      {
        id: 'sword_draw',
        name: 'Kilat Cabutan Pedang',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['sword_stance'],
        requiredRank: 1,
        effects: { spdMult: 0.015 },
        icon: '⚡',
        description: 'Gerakan menghunus pedang secepat kilat, meningkatkan SPD sebesar +1.5% per level.'
      },
      {
        id: 'sword_oath_bond',
        name: 'Ikatan Sumpah Bilah',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['sword_edge'],
        requiredRank: 1,
        effects: { unarmedPenaltyMitigation: 0.03 },
        icon: '🤝',
        description: 'Mematri jiwa ke dalam bilah pedang; meredam penalti pertarungan saat terpisah dari pedang.'
      },
      {
        id: 'sword_one_strike',
        name: 'Satu Tebasan Belah Awan',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['sword_draw', 'sword_oath_bond'],
        requiredRank: 2,
        effects: { flatAtk: 8 },
        icon: '🌠',
        description: 'Intisari tebasan mutlak pendekar pedang, memberikan bonus flat ATK +8 per level.'
      }
    ]
  },
  righteous_formation_array: {
    lawType: 'righteous_formation_array',
    name: 'Pohon Formasi Bendera',
    nodes: [
      {
        id: 'array_foundation',
        name: 'Fondasi Formasi',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { defMult: 0.015 },
        icon: '🚩',
        description: 'Menancapkan patok formasi kokoh, meningkatkan DEF sebesar +1.5% per level.'
      },
      {
        id: 'array_bulwark',
        name: 'Benteng Qi Susun Sembilan',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['array_foundation'],
        requiredRank: 0,
        effects: { hpMult: 0.012 },
        icon: '🏰',
        description: 'Menyusun lapis pelindung energi formasi, meningkatkan HP sebesar +1.2% per level.'
      },
      {
        id: 'array_pulse',
        name: 'Getaran Denyut Lempeng',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['array_foundation'],
        requiredRank: 1,
        effects: { martialRes: 3 },
        icon: '🌀',
        description: 'Mengalirkan resonansi gelombang tanah untuk menangkis serangan fisik (+3 Martial RES).'
      },
      {
        id: 'array_domain',
        name: 'Domain Wilayah Berdaulat',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['array_bulwark'],
        requiredRank: 1,
        effects: { homeBonusAdd: 0.02 },
        icon: '🌐',
        description: 'Memperkuat efisiensi tempur di dalam kawasan Hub Formasi milik sendiri.'
      },
      {
        id: 'array_rebuild',
        name: 'Restrukturisasi Formasi Kilat',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['array_pulse', 'array_domain'],
        requiredRank: 2,
        effects: { repairEfficiency: 0.10 },
        icon: '🛠️',
        description: 'Pemahaman mendalam tentang tata letak formasi memudahkan perawatan dan upgrade Hub.'
      }
    ]
  },
  righteous_karmic_mirror: {
    lawType: 'righteous_karmic_mirror',
    name: 'Pohon Cermin Karma',
    nodes: [
      {
        id: 'karma_stillness',
        name: 'Ketenangan Cermin Datar',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { defMult: 0.015 },
        icon: '🪞',
        description: 'Menjaga kejernihan batin laksana cermin air tenang, meningkatkan DEF sebesar +1.5% per level.'
      },
      {
        id: 'karma_clarity',
        name: 'Kekudusan Hati Nurani',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['karma_stillness'],
        requiredRank: 0,
        effects: { spiritualRes: 4 },
        icon: '🕯️',
        description: 'Memancarkan cahaya nurani yang menolak sihir jahat, meningkatkan Spiritual Resistance +4 per level.'
      },
      {
        id: 'karma_retribution',
        name: 'Pembalasan Karma Buruk',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['karma_stillness'],
        requiredRank: 1,
        effects: { reflectPct: 0.015 },
        icon: '⚖️',
        description: 'Memantulkan kembali karma jahat ke penyerang bertaraf infamy tinggi.'
      },
      {
        id: 'karma_absolution',
        name: 'Pengampunan Dosa',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['karma_clarity'],
        requiredRank: 1,
        effects: { infamyPenaltyReduction: 0.20 },
        icon: '🕊️',
        description: 'Meredam gesekan amarah batin jika tanpa sengaja terpapar dosa duniawi.'
      },
      {
        id: 'karma_verdict',
        name: 'Vonis Cermin Langit',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['karma_retribution', 'karma_absolution'],
        requiredRank: 2,
        effects: { flatAtk: 6 },
        icon: '⚡',
        description: 'Mengeksekusi hukuman karma secara mutlak, memberikan flat ATK +6 per level.'
      }
    ]
  },
  element_phoenix_fire: {
    lawType: 'element_phoenix_fire',
    name: 'Pohon Api Feniks',
    nodes: [
      {
        id: 'phoenix_blaze',
        name: 'Kobaran Api Feniks',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { atkMult: 0.015 },
        icon: '🔥',
        description: 'Meningkatkan ATK sebesar +1.5% per level.'
      },
      {
        id: 'phoenix_cauterize',
        name: 'Pembakaran Meridian',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['phoenix_blaze'],
        requiredRank: 0,
        effects: { flatAtk: 5 },
        icon: '💥',
        description: 'Memberikan flat ATK +5 per level.'
      },
      {
        id: 'phoenix_inferno_burst',
        name: 'Ledakan Api Nirwana',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['phoenix_blaze'],
        requiredRank: 1,
        effects: { crit: 0.8 },
        icon: '☄️',
        description: 'Meningkatkan Crit Rate sebesar +0.8% per level.'
      },
      {
        id: 'phoenix_rebirth_aura',
        name: 'Aura Abadi Feniks',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['phoenix_inferno_burst'],
        requiredRank: 2,
        effects: { hpMult: 0.02, flatAtk: 6 },
        icon: '🦅',
        description: 'Meningkatkan HP +2% dan flat ATK +6 per level.'
      }
    ]
  },
  element_azure_water: {
    lawType: 'element_azure_water',
    name: 'Pohon Air Biru',
    nodes: [
      {
        id: 'azure_flow',
        name: 'Aliran Air Biru',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { spdMult: 0.015 },
        icon: '🌊',
        description: 'Meningkatkan SPD sebesar +1.5% per level.'
      },
      {
        id: 'azure_mist_barrier',
        name: 'Dinding Kabut Samudra',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['azure_flow'],
        requiredRank: 0,
        effects: { defMult: 0.012 },
        icon: '💧',
        description: 'Meningkatkan DEF sebesar +1.2% per level.'
      },
      {
        id: 'azure_tidal_surge',
        name: 'Pusaran Arus Pasang',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['azure_flow'],
        requiredRank: 1,
        effects: { spiritualRes: 3, flatHp: 25 },
        icon: '🌫️',
        description: 'Meningkatkan Spiritual RES +3 dan flat HP +25 per level.'
      },
      {
        id: 'azure_abyssal_calm',
        name: 'Heningnya Palung Biru',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['azure_tidal_surge'],
        requiredRank: 2,
        effects: { hpMult: 0.02, defMult: 0.015 },
        icon: '🌀',
        description: 'Meningkatkan HP +2% dan DEF +1.5% per level.'
      }
    ]
  },
  element_xuanwu_earth: {
    lawType: 'element_xuanwu_earth',
    name: 'Pohon Bumi Xuanwu',
    nodes: [
      {
        id: 'xuanwu_bastion',
        name: 'Perisai Kura-Kura Hitam',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { defMult: 0.02 },
        icon: '⛰️',
        description: 'Meningkatkan DEF sebesar +2% per level.'
      },
      {
        id: 'xuanwu_granite_foundation',
        name: 'Fondasi Granit Kuno',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['xuanwu_bastion'],
        requiredRank: 0,
        effects: { hpMult: 0.015 },
        icon: '🪨',
        description: 'Meningkatkan HP sebesar +1.5% per level.'
      },
      {
        id: 'xuanwu_unyielding_plate',
        name: 'Zirah Besi Bumi',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['xuanwu_bastion'],
        requiredRank: 1,
        effects: { martialRes: 4, flatDef: 6 },
        icon: '🛡️',
        description: 'Meningkatkan Martial RES +4 dan flat DEF +6 per level.'
      },
      {
        id: 'xuanwu_mountain_domain',
        name: 'Domain Gunung Berdiri',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['xuanwu_unyielding_plate'],
        requiredRank: 2,
        effects: { defMult: 0.025, flatHp: 35 },
        icon: '🏰',
        description: 'Meningkatkan DEF +2.5% dan flat HP +35 per level.'
      }
    ]
  },
  element_qingdi_wood: {
    lawType: 'element_qingdi_wood',
    name: 'Pohon Hayat Qingdi',
    nodes: [
      {
        id: 'qingdi_life_breath',
        name: 'Napas Kehidupan Qingdi',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { hpMult: 0.018 },
        icon: '🌱',
        description: 'Meningkatkan HP sebesar +1.8% per level.'
      },
      {
        id: 'qingdi_regrowth',
        name: 'Regenerasi Urat Kayu',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['qingdi_life_breath'],
        requiredRank: 0,
        effects: { flatHp: 25 },
        icon: '🍃',
        description: 'Meningkatkan flat HP +25 per level.'
      },
      {
        id: 'qingdi_bark_skin',
        name: 'Kulit Pohon Dunia',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['qingdi_life_breath'],
        requiredRank: 1,
        effects: { defMult: 0.012, martialRes: 3 },
        icon: '🪵',
        description: 'Meningkatkan DEF +1.2% dan Martial RES +3 per level.'
      },
      {
        id: 'qingdi_evergreen_dao',
        name: 'Dao Kayu Abadi',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['qingdi_bark_skin'],
        requiredRank: 2,
        effects: { hpMult: 0.025, flatHp: 40 },
        icon: '🌳',
        description: 'Meningkatkan HP +2.5% dan flat HP +40 per level.'
      }
    ]
  },
  element_roc_wind: {
    lawType: 'element_roc_wind',
    name: 'Pohon Badai Burung Roc',
    nodes: [
      {
        id: 'roc_gale_step',
        name: 'Langkah Angin Burung Roc',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { spdMult: 0.02 },
        icon: '🌪️',
        description: 'Meningkatkan SPD sebesar +2% per level.'
      },
      {
        id: 'roc_cutting_wind',
        name: 'Bilah Angin Puyuh',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['roc_gale_step'],
        requiredRank: 0,
        effects: { flatAtk: 5 },
        icon: '💨',
        description: 'Meningkatkan flat ATK +5 per level.'
      },
      {
        id: 'roc_aerial_strike',
        name: 'Sambaran Sergap Udara',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['roc_gale_step'],
        requiredRank: 1,
        effects: { crit: 0.8, spdMult: 0.01 },
        icon: '🦅',
        description: 'Meningkatkan Crit Rate +0.8% dan SPD +1% per level.'
      },
      {
        id: 'roc_nine_heavens_soar',
        name: 'Menembus Sembilan Langit',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['roc_aerial_strike'],
        requiredRank: 2,
        effects: { atkMult: 0.02, spdMult: 0.02 },
        icon: '🌌',
        description: 'Meningkatkan ATK +2% dan SPD +2% per level.'
      }
    ]
  },
  element_godthunder_light: {
    lawType: 'element_godthunder_light',
    name: 'Pohon Petir Dewa',
    nodes: [
      {
        id: 'thunder_spark',
        name: 'Pijar Petir Dewa',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { spdMult: 0.015, flatAtk: 4 },
        icon: '⚡',
        description: 'Meningkatkan SPD +1.5% dan flat ATK +4 per level.'
      },
      {
        id: 'thunder_crack',
        name: 'Guruh Membelah Bumi',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['thunder_spark'],
        requiredRank: 0,
        effects: { flatAtk: 6 },
        icon: '🌩️',
        description: 'Meningkatkan flat ATK +6 per level.'
      },
      {
        id: 'thunder_divine_pierce',
        name: 'Tusukan Petir Ilahi',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['thunder_spark'],
        requiredRank: 1,
        effects: { crit: 1.0 },
        icon: '⚡',
        description: 'Meningkatkan Crit Rate +1% per level.'
      },
      {
        id: 'thunder_wrath_judgment',
        name: 'Penghakiman Guruh Langit',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['thunder_divine_pierce'],
        requiredRank: 2,
        effects: { atkMult: 0.03, flatAtk: 8 },
        icon: '⛈️',
        description: 'Meningkatkan ATK +3% dan flat ATK +8 per level.'
      }
    ]
  },
  body_tempering: {
    lawType: 'body_tempering',
    name: 'Pohon Tempa Tubuh Sakti',
    nodes: [
      {
        id: 'body_iron_sinew',
        name: 'Urat Kawat Tulang Besi',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { hpMult: 0.015, flatHp: 20 },
        icon: '💪',
        description: 'Meningkatkan HP +1.5% dan flat HP +20 per level.'
      },
      {
        id: 'body_adamantine_skin',
        name: 'Kulit Kebal Tembaga',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['body_iron_sinew'],
        requiredRank: 0,
        effects: { defMult: 0.015, flatDef: 4 },
        icon: '🛡️',
        description: 'Meningkatkan DEF +1.5% dan flat DEF +4 per level.'
      },
      {
        id: 'body_giant_might',
        name: 'Kekuatan Raksasa Kuno',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['body_iron_sinew'],
        requiredRank: 1,
        effects: { atkMult: 0.015, martialRes: 3 },
        icon: '💥',
        description: 'Meningkatkan ATK +1.5% dan Martial RES +3 per level.'
      },
      {
        id: 'body_immortal_vessel',
        name: 'Wadah Fisik Tak Binasa',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['body_adamantine_skin', 'body_giant_might'],
        requiredRank: 2,
        effects: { hpMult: 0.025, defMult: 0.02 },
        icon: '🗿',
        description: 'Meningkatkan HP +2.5% dan DEF +2% per level.'
      }
    ]
  },
  gu_master: {
    lawType: 'gu_master',
    name: 'Pohon Pembiak Serangga Gu',
    nodes: [
      {
        id: 'gu_symbiosis',
        name: 'Simbiosis Serangga Gu',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { flatHp: 25 },
        icon: '🐛',
        description: 'Meningkatkan flat HP +25 per level.'
      },
      {
        id: 'gu_chitin_shell',
        name: 'Pelindung Cangkang Chitin',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['gu_symbiosis'],
        requiredRank: 0,
        effects: { defMult: 0.012 },
        icon: '🛡️',
        description: 'Meningkatkan DEF +1.2% per level.'
      },
      {
        id: 'gu_toxin_secretion',
        name: 'Sekresi Bisa Alami',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['gu_symbiosis'],
        requiredRank: 1,
        effects: { flatAtk: 6, spiritualRes: 3 },
        icon: '🧪',
        description: 'Meningkatkan flat ATK +6 dan Spiritual RES +3 per level.'
      },
      {
        id: 'gu_swarm_resonance',
        name: 'Resonansi Sarang Seribu Gu',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['gu_chitin_shell', 'gu_toxin_secretion'],
        requiredRank: 2,
        effects: { atkMult: 0.02, hpMult: 0.015 },
        icon: '🦗',
        description: 'Meningkatkan ATK +2% dan HP +1.5% per level.'
      }
    ]
  },
  natal_artifact: {
    lawType: 'natal_artifact',
    name: 'Pohon Sukma Pusaka Natal',
    nodes: [
      {
        id: 'artifact_harmonize',
        name: 'Penyelarasan Sukma Artefak',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { flatDef: 5, spiritualRes: 2 },
        icon: '📿',
        description: 'Meningkatkan flat DEF +5 dan Spiritual RES +2 per level.'
      },
      {
        id: 'artifact_resonance',
        name: 'Resonansi Inti Pusaka',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['artifact_harmonize'],
        requiredRank: 0,
        effects: { flatAtk: 5 },
        icon: '🔮',
        description: 'Meningkatkan flat ATK +5 per level.'
      },
      {
        id: 'artifact_aegis',
        name: 'Perisai Pusaka Pelindung',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['artifact_harmonize'],
        requiredRank: 1,
        effects: { defMult: 0.018, hpMult: 0.012 },
        icon: '🛡️',
        description: 'Meningkatkan DEF +1.8% dan HP +1.2% per level.'
      },
      {
        id: 'artifact_soul_fusion',
        name: 'Peleburan Jiwa dan Benda',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['artifact_resonance', 'artifact_aegis'],
        requiredRank: 2,
        effects: { atkMult: 0.02, defMult: 0.02 },
        icon: '✨',
        description: 'Meningkatkan ATK +2% dan DEF +2% per level.'
      }
    ]
  },
  natal_beast: {
    lawType: 'natal_beast',
    name: 'Pohon Satwa Roh Natal',
    nodes: [
      {
        id: 'beast_instinct',
        name: 'Naluri Pemangsa Liar',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { spdMult: 0.015, crit: 0.4 },
        icon: '🐾',
        description: 'Meningkatkan SPD +1.5% dan Crit +0.4% per level.'
      },
      {
        id: 'beast_pelt',
        name: 'Bulu Tebal Satwa Roh',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['beast_instinct'],
        requiredRank: 0,
        effects: { defMult: 0.012, flatHp: 20 },
        icon: '🐺',
        description: 'Meningkatkan DEF +1.2% dan flat HP +20 per level.'
      },
      {
        id: 'beast_feral_claws',
        name: 'Cakar Pengoyak Zirah',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['beast_instinct'],
        requiredRank: 1,
        effects: { atkMult: 0.02, flatAtk: 5 },
        icon: '🦅',
        description: 'Meningkatkan ATK +2% dan flat ATK +5 per level.'
      },
      {
        id: 'beast_bloodline_awakening',
        name: 'Kebangkitan Darah Satwa Kuno',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['beast_pelt', 'beast_feral_claws'],
        requiredRank: 2,
        effects: { hpMult: 0.02, atkMult: 0.02 },
        icon: '🐉',
        description: 'Meningkatkan HP +2% dan ATK +2% per level.'
      }
    ]
  },
  demonic_turbid_core: {
    lawType: 'demonic_turbid_core',
    name: 'Pohon Inti Siluman Kotor',
    nodes: [
      {
        id: 'turbid_absorption',
        name: 'Penyerapan Inti Keruh',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { hpMult: 0.018 },
        icon: '🕳️',
        description: 'Meningkatkan HP +1.8% per level.'
      },
      {
        id: 'turbid_mire',
        name: 'Rawa Keruh Peredam',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['turbid_absorption'],
        requiredRank: 0,
        effects: { defMult: 0.015, flatDef: 4 },
        icon: '🌑',
        description: 'Meningkatkan DEF +1.5% dan flat DEF +4 per level.'
      },
      {
        id: 'turbid_chaos_pulse',
        name: 'Denyut Kekacauan Kotor',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['turbid_absorption'],
        requiredRank: 1,
        effects: { flatAtk: 6, spdMult: -0.005 },
        icon: '🌪️',
        description: 'Meningkatkan flat ATK +6 (SPD -0.5%) per level.'
      },
      {
        id: 'turbid_calamity_core',
        name: 'Inti Bencana Siluman',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['turbid_mire', 'turbid_chaos_pulse'],
        requiredRank: 2,
        effects: { hpMult: 0.025, defMult: 0.02 },
        icon: '☄️',
        description: 'Meningkatkan HP +2.5% dan DEF +2% per level.'
      }
    ]
  },
  demonic_blood_soul: {
    lawType: 'demonic_blood_soul',
    name: 'Pohon Jiwa Darah Iblis',
    nodes: [
      {
        id: 'blood_surge',
        name: 'Gelora Darah Siluman',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { atkMult: 0.018, flatAtk: 4 },
        icon: '🩸',
        description: 'Meningkatkan ATK +1.8% dan flat ATK +4 per level.'
      },
      {
        id: 'blood_vessel_hardening',
        name: 'Pengerasan Pembuluh Darah',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['blood_surge'],
        requiredRank: 0,
        effects: { hpMult: 0.015 },
        icon: '❤️',
        description: 'Meningkatkan HP +1.5% per level.'
      },
      {
        id: 'blood_carnage',
        name: 'Pesta Darah Pembantaian',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['blood_surge'],
        requiredRank: 1,
        effects: { crit: 0.6, flatAtk: 6 },
        icon: '🗡️',
        description: 'Meningkatkan Crit +0.6% dan flat ATK +6 per level.'
      },
      {
        id: 'blood_demon_dominion',
        name: 'Kekuasaan Raja Iblis Darah',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['blood_vessel_hardening', 'blood_carnage'],
        requiredRank: 2,
        effects: { atkMult: 0.025, hpMult: 0.02 },
        icon: '👑',
        description: 'Meningkatkan ATK +2.5% dan HP +2% per level.'
      }
    ]
  },
  demonic_myriad_venom: {
    lawType: 'demonic_myriad_venom',
    name: 'Pohon Sepuluh Ribu Racun',
    nodes: [
      {
        id: 'venom_circulation',
        name: 'Peredaran Bisa Mematikan',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { flatAtk: 5, spiritualRes: 2 },
        icon: '🧪',
        description: 'Meningkatkan flat ATK +5 dan Spiritual RES +2 per level.'
      },
      {
        id: 'venom_tolerance',
        name: 'Daya Tahan Racun Mutlak',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['venom_circulation'],
        requiredRank: 0,
        effects: { hpMult: 0.015 },
        icon: '🐍',
        description: 'Meningkatkan HP +1.5% per level.'
      },
      {
        id: 'venom_corrosive_strike',
        name: 'Serangan Peleleh Daging',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['venom_circulation'],
        requiredRank: 1,
        effects: { atkMult: 0.018, flatAtk: 6 },
        icon: '☠️',
        description: 'Meningkatkan ATK +1.8% dan flat ATK +6 per level.'
      },
      {
        id: 'venom_myriad_plague',
        name: 'Wabah Sepuluh Ribu Racun',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['venom_tolerance', 'venom_corrosive_strike'],
        requiredRank: 2,
        effects: { atkMult: 0.025, crit: 0.5 },
        icon: '☣️',
        description: 'Meningkatkan ATK +2.5% dan Crit +0.5% per level.'
      }
    ]
  },
  demonic_abyssal_pact: {
    lawType: 'demonic_abyssal_pact',
    name: 'Pohon Kontrak Abyss',
    nodes: [
      {
        id: 'abyss_contract',
        name: 'Ikatan Jiwa Jurang Gelap',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { atkMult: 0.02 },
        icon: '📜',
        description: 'Meningkatkan ATK sebesar +2% per level.'
      },
      {
        id: 'abyss_dark_armor',
        name: 'Baju Zirah Kegelapan Abyss',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['abyss_contract'],
        requiredRank: 0,
        effects: { defMult: 0.015 },
        icon: '🛡️',
        description: 'Meningkatkan DEF sebesar +1.5% per level.'
      },
      {
        id: 'abyss_sacrificial_might',
        name: 'Daya Hancur Kurban Iblis',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['abyss_contract'],
        requiredRank: 1,
        effects: { flatAtk: 8, crit: 0.6 },
        icon: '🩸',
        description: 'Meningkatkan flat ATK +8 dan Crit +0.6% per level.'
      },
      {
        id: 'abyss_fiend_embrace',
        name: 'Pelukan Iblis Palung Abyss',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['abyss_dark_armor', 'abyss_sacrificial_might'],
        requiredRank: 2,
        effects: { atkMult: 0.025, hpMult: 0.02 },
        icon: '👹',
        description: 'Meningkatkan ATK +2.5% dan HP +2% per level.'
      }
    ]
  },
  demonic_nether_darkness: {
    lawType: 'demonic_nether_darkness',
    name: 'Pohon Kegelapan Nether',
    nodes: [
      {
        id: 'nether_shroud',
        name: 'Selubung Hawa Kubur Nether',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: [],
        requiredRank: 0,
        effects: { spdMult: 0.018, spiritualRes: 3 },
        icon: '🌑',
        description: 'Meningkatkan SPD +1.8% dan Spiritual RES +3 per level.'
      },
      {
        id: 'nether_chill',
        name: 'Dingin Nether Penusuk Tulang',
        tier: 1,
        maxLevel: 5,
        costPerLevel: 1,
        requires: ['nether_shroud'],
        requiredRank: 0,
        effects: { flatAtk: 5 },
        icon: '❄️',
        description: 'Meningkatkan flat ATK +5 per level.'
      },
      {
        id: 'nether_gloom_evasion',
        name: 'Langkah Bayangan Nether',
        tier: 2,
        maxLevel: 5,
        costPerLevel: 2,
        requires: ['nether_shroud'],
        requiredRank: 1,
        effects: { spdMult: 0.02, crit: 0.5 },
        icon: '👻',
        description: 'Meningkatkan SPD +2% dan Crit +0.5% per level.'
      },
      {
        id: 'nether_abyssal_sovereign',
        name: 'Penguasa Bayangan Akhirat',
        tier: 3,
        maxLevel: 5,
        costPerLevel: 3,
        requires: ['nether_chill', 'nether_gloom_evasion'],
        requiredRank: 2,
        effects: { atkMult: 0.022, spdMult: 0.018 },
        icon: '👑',
        description: 'Meningkatkan ATK +2.2% dan SPD +1.8% per level.'
      }
    ]
  }
};

/**
 * Menerapkan efek pasif dari node skill tree Law yang telah dialokasikan pemain.
 * @param {Object} player - Mongoose player document
 * @param {Object} mult - Multiplier objek { hp, atk, def, spd }
 * @param {Object} flat - Flat bonus objek { hp, atk, def, spd }
 */
function applyLawSkillTreeEffects(player, mult, flat) {
  if (!player) return;
  const law = player.cultivationLaw;
  if (!law?.activeLawType) return;

  const tree = LAW_SKILL_TREES[law.activeLawType];
  if (!tree?.nodes || tree.nodes.length === 0) return;

  // Baca skillLevels dari law (bisa berupa Map atau plain object)
  const skillLevels = law.skillLevels instanceof Map
    ? Object.fromEntries(law.skillLevels)
    : (law.skillLevels || {});

  // Fallback: jika skill ada di unlockedSkillIds tapi belum tercatat levelnya, anggap level 1
  const unlocked = new Set(law.unlockedSkillIds || []);

  for (const node of tree.nodes) {
    const nodeId = node.id || node.skillId;
    let level = Number(skillLevels[nodeId] || 0);
    if (level <= 0 && unlocked.has(nodeId)) {
      level = 1;
    }

    if (level <= 0) continue;

    const eff = node.effects;
    if (!eff) continue;

    // Multipliers
    if (eff.hpMult) mult.hp += eff.hpMult * level;
    if (eff.atkMult) mult.atk += eff.atkMult * level;
    if (eff.defMult) mult.def += eff.defMult * level;
    if (eff.spdMult) mult.spd += eff.spdMult * level;

    // Flat stats
    if (eff.flatHp) flat.hp += eff.flatHp * level;
    if (eff.flatAtk) flat.atk += eff.flatAtk * level;
    if (eff.flatDef) flat.def += eff.flatDef * level;
    if (eff.flatSpd) flat.spd += eff.flatSpd * level;

    // Extended Stats
    if (!player.extendedStats) player.extendedStats = {};
    if (eff.crit) player.extendedStats.crit = (player.extendedStats.crit || 0) + (eff.crit * level);
    if (eff.reflectPct) player.extendedStats.reflectPct = (player.extendedStats.reflectPct || 0) + (eff.reflectPct * level);
    if (eff.martialRes) player.extendedStats.martialRes = (player.extendedStats.martialRes || 0) + (eff.martialRes * level);
    if (eff.spiritualRes) player.extendedStats.spiritualRes = (player.extendedStats.spiritualRes || 0) + (eff.spiritualRes * level);
  }
}

// ═══════════════════════════════════════════════════════════════
// COMBAT & SPATIAL HELPERS (SWORD, FORMATION HUB, LAW MODIFIERS)
// ═══════════════════════════════════════════════════════════════

/**
 * Memeriksa apakah pemain sedang menggunakan senjata bertipe pedang.
 * Sumber kebenaran tunggal untuk absorb gate dan combat calculations.
 * @param {Object} player
 * @returns {boolean}
 */
function isPlayerWieldingSword(player) {
  if (!player) return false;

  // 1. Cek langsung jika player.equipment.weapon adalah objek weapon terpopulasi
  const eqWeapon = player.equipment instanceof Map
    ? player.equipment.get('weapon')
    : player.equipment?.weapon;
  if (eqWeapon && typeof eqWeapon === 'object') {
    const tags = Array.isArray(eqWeapon.tags) ? eqWeapon.tags : [];
    if (tags.includes('sword') || tags.includes('oath_sword')) return true;
    const name = (eqWeapon.name || '').toLowerCase();
    const subtype = (eqWeapon.subtype || eqWeapon.weaponType || '').toLowerCase();
    if (/(sword|pedang|jian)/i.test(name) || /(sword|pedang|jian)/i.test(subtype)) return true;
  }

  if (!player.inventory) return false;
  const equipmentSlotValues = player.equipment
    ? Object.values(player.equipment instanceof Map ? Object.fromEntries(player.equipment) : player.equipment)
        .filter(v => v !== null && v !== undefined)
        .map(v => v.toString())
    : [];

  for (const invItem of player.inventory) {
    const isActuallyEquipped = invItem.isEquipped ||
      (invItem._id && equipmentSlotValues.includes(invItem._id.toString())) ||
      (invItem.itemId?._id && equipmentSlotValues.includes(invItem.itemId._id.toString())) ||
      (invItem.itemId && equipmentSlotValues.includes(invItem.itemId.toString()));

    if (!isActuallyEquipped) continue;
    const item = (invItem.itemId && typeof invItem.itemId === 'object') ? invItem.itemId : invItem;
    if (item && (item.category === 'weapon' || item.weaponType || item.subtype === 'weapon')) {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      if (tags.includes('sword') || tags.includes('oath_sword')) return true;
      const name = (item.name || '').toLowerCase();
      const subtype = (item.subtype || item.weaponType || '').toLowerCase();
      if (/(sword|pedang|jian)/i.test(name) || /(sword|pedang|jian)/i.test(subtype)) return true;
    }
  }
  return false;
}

/**
 * Memeriksa apakah pemain sedang berada di petak Hub Formasi miliknya sendiri.
 * @param {Object} player
 * @param {Object} [cachedHubTile] - Opsional tile dari DB query
 * @returns {boolean}
 */
function isOnOwnFormationHub(player, cachedHubTile = null) {
  if (!player) return false;
  let hubTileX;
  let hubTileY;
  let hubZoneId;

  // 1. Cek dari player.assets
  const hubAsset = player.assets?.find(a => a.name && /(Hub Formasi|Formation Hub)/i.test(a.name) && a.status === 'active' && a.placement?.tileX !== undefined);
  if (hubAsset?.placement) {
    hubTileX = hubAsset.placement.tileX;
    hubTileY = hubAsset.placement.tileY;
    hubZoneId = hubAsset.placement.zoneId;
  } else if (cachedHubTile) {
    hubTileX = cachedHubTile.tileX;
    hubTileY = cachedHubTile.tileY;
    hubZoneId = cachedHubTile.zoneId;
  }

  if (hubTileX === undefined || hubTileY === undefined) return false;

  const playerTileX = player.gridPosition?.tileX;
  const playerTileY = player.gridPosition?.tileY;
  const playerZoneId = player.gridPosition?.zoneId;

  return (playerTileX === hubTileX && playerTileY === hubTileY) && (!hubZoneId || playerZoneId === hubZoneId);
}

/**
 * Menghitung modifier tempur dinamis antar dua entitas (attacker vs defender) berdasarkan Law.
 * @param {Object} attacker - Player document atau battle entity
 * @param {Object} defender - Player document, mob, atau battle entity
 * @returns {Object} { damageMultiplier, isMeritBonus, isYangBonus, bonusDesc }
 */
function getLawCombatModifiers(attacker, defender) {
  const result = {
    damageMultiplier: 1.0,
    isMeritBonus: false,
    isYangBonus: false,
    bonusDesc: null
  };

  if (!attacker || !defender) return result;

  // Resolusi Law Attacker
  const lawType = attacker.cultivationLaw?.activeLawType
    || attacker.activeLawType
    || attacker.lawType
    || (attacker.laws && attacker.laws.find(l => l.isActive)?.lawType)
    || null;

  if (!lawType) return result;

  const rank = Number(attacker.cultivationLaw?.rank ?? attacker.lawRank ?? 0);

  // Status Defender (Wanted, Demonic, Corrupt, Undead)
  const isWanted = !!(defender.isWantedByOrthodox || defender.wanted || (defender.infamy && defender.infamy > 50));

  const defTags = Array.isArray(defender.tags) ? defender.tags : [];
  const defCategory = (defender.category || defender.enemyType || '').toLowerCase();
  const defName = (defender.name || defender.characterName || '').toLowerCase();
  const defLawType = defender.cultivationLaw?.activeLawType || defender.activeLawType || defender.lawType || '';

  const isCorruptOrDemonic = isWanted ||
    (typeof defLawType === 'string' && defLawType.startsWith('demonic_')) ||
    defTags.some(t => ['demonic', 'undead', 'corrupt', 'ghost', 'yin', 'iblis', 'siluman_hitam'].includes(t)) ||
    ['demonic', 'undead', 'corrupt', 'ghost'].includes(defCategory) ||
    /(iblis|siluman|mayat|hantu|abyss|korup)/i.test(defName);

  // 1. Righteous Heavenly Merit: Bonus vs Wanted / Demonic / Undead / Corrupt
  if (lawType === 'righteous_heavenly_merit' && isCorruptOrDemonic) {
    const bonus = Math.max(0.04, (rank || 1) * (LAW_BALANCE.MERIT_VS_WANTED_ATK_MULT || 0.04));
    result.damageMultiplier *= (1 + bonus);
    result.isMeritBonus = true;
    result.bonusDesc = `⚡ [Jasa Langit: +${Math.round(bonus * 100)}% vs Iblis/Buronan]`;
  }

  // 2. Righteous Pure Yang: Bonus vs Corrupt / Demonic / Ghost / Yin
  if (lawType === 'righteous_pure_yang' && isCorruptOrDemonic) {
    const bonus = Math.max(0.03, (rank || 1) * (LAW_BALANCE.YANG_VS_CORRUPTION_ATK || 0.03));
    result.damageMultiplier *= (1 + bonus);
    result.isYangBonus = true;
    result.bonusDesc = `☀️ [Yang Murni: +${Math.round(bonus * 100)}% Penumpasan Kegelapan]`;
  }

  return result;
}

/**
 * applyLawDamageModifiers(attacker, defender, baseDamage, options = {})
 * Menerapkan pengali damage situasional Law (Merit vs Wanted/Demonic, Pure Yang vs Corrupt)
 * dan menghitung damage pantulan (reflect) dari Defender kembali ke Attacker jika Defender memiliki reflectPct > 0.
 *
 * @param {Object} attacker - Player document atau battle entity penyerang
 * @param {Object} defender - Player document, monster, atau battle entity penerima serangan
 * @param {number} baseDamage - Damage dasar yang telah dimitigasi pertahanan target
 * @param {Object} [options]
 * @param {boolean} [options.skipReflect=false] - Cegah infinite reflect loop jika damage adalah hasil pantulan
 * @returns {{ finalDamage: number, reflectedDamage: number, logParts: string[], mod: Object, reflectPct: number }}
 */
function applyLawDamageModifiers(attacker, defender, baseDamage, options = {}) {
  let dmg = Math.max(0, Math.floor(Number(baseDamage) || 0));
  const logParts = [];

  try {
    // 1) Outgoing multiplier (Merit / Pure Yang vs wanted-demonic)
    const mod = getLawCombatModifiers(attacker, defender);
    if (mod.damageMultiplier && mod.damageMultiplier !== 1.0) {
      dmg = Math.max(0, Math.floor(dmg * mod.damageMultiplier));
      if (mod.bonusDesc) logParts.push(mod.bonusDesc);
    }

    // 2) Reflect dari DEFENDER ke ATTACKER (Karma / skill tree reflectPct)
    // Cegah infinite loop: jika opsi skipReflect aktif, jangan pantulkan lagi
    let reflectedDamage = 0;
    let reflectPct = 0;

    if (!options.skipReflect) {
      const rawReflect = Number(
        defender?.combatStats?.reflectPct ??
        defender?.stats?.reflectPct ??
        defender?.extendedStats?.reflectPct ??
        defender?.reflectPct ??
        0
      );
      reflectPct = Math.max(0, Math.min(0.25, rawReflect)); // CAP 25%

      if (reflectPct > 0 && dmg > 0) {
        reflectedDamage = Math.max(1, Math.floor(dmg * reflectPct));
        if (reflectedDamage > 0) {
          logParts.push(`🪞 Cermin Karma memantulkan ${reflectedDamage} DMG (${Math.round(reflectPct * 100)}%)`);
        }
      }
    }

    return { finalDamage: dmg, reflectedDamage, logParts, mod, reflectPct };
  } catch (err) {
    console.error('[applyLawDamageModifiers] Error applying law damage modifiers:', err);
    return { finalDamage: dmg, reflectedDamage: 0, logParts: [], mod: { damageMultiplier: 1.0 }, reflectPct: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Constants
  LAW_BALANCE,
  LAW_PROGRESSION,
  LAW_DEFINITIONS,
  LAW_RANK_NAMES,
  LAW_ESSENCE_PROFILE,
  LAW_SKILL_TREES,
  LAW_TYPE_ENUM: Object.keys(LAW_DEFINITIONS),
  TRIBULATION_RANKS,
  BASE_CHANNEL_CAP_MINUTES,
  NATURAL_ESSENCES,

  // Combat & Spatial Helpers
  isPlayerWieldingSword,
  isOnOwnFormationHub,
  getLawCombatModifiers,
  applyLawCombatModifiers: applyLawDamageModifiers,
  applyLawDamageModifiers,
  applyLawSkillTreeEffects,

  // Qi & Essence Calculation
  getBaseQiRequired,
  getStageMult,
  getStageMultSum,
  getTotalQiForRank,
  getQiRequired,
  getChannelQiRate,
  getMaxEssence,
  getEssenceDigestRate,
  getTierAffinity,
  resolveItemTier,
  getGuMaxSlots,
  getMaxCombatQi,
  getCombatQiRegenPerRound,

  // Body Tempering & Environmental Essences
  getMaxEssenceStorage,
  getTemperingDurationSeconds,
  harvestEnvironmentalEssence,
  startBodyTemperingPart,
  claimBodyTemperingPart,

  // Daily Cap
  getDailyChannelCap,
  calculateChannelingProgress,
  syncLawChanneling,
  checkAndResetDailyCap,
  claimDailyEpiphany,

  // Level Cap
  getLevelCap,

  // Breakthrough
  BREAKTHROUGH_PILL_CATALOG,
  getMiniBreakthroughCost,
  getMiniBreakthroughSuccessRate,
  getMiniBreakthroughFailCooldown,
  attemptMiniBreakthrough,
  getMajorBreakthroughSuccessRate,
  getMajorBreakthroughFailCooldown,
  requiresTribulation,
  calculateTribulationWaveDamage,
  calculateSurvivalHP,
  runTribulation,
  attemptMajorBreakthrough,

  // Gate Mutual
  LAW_RANK_REALM_REQUIREMENTS,
  meetsLawRankRequirements,

  // Active Gathering
  awardActiveCultivationQi,

  // Status & Display
  getLawStatus,
  formatLawRealmDisplay,

  // Nether Darkness Helpers
  NETHER_DARKNESS_ZONES,
  isNetherTerritory,
  getNetherSafeLimitSeconds
};
