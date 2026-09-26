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
 * PathMod Tribulasi menentukan pengganda damage gelombang petir.
 * Semakin tinggi PathMod, semakin sulit tribulasi tetapi Qi lebih cepat.
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
  }
};

/**
 * Nama Rank Unik per Law (Rank 0 s/d 8)
 * Setiap Law memiliki penamaan rank berbeda sesuai jalur.
 * Format: LAW_RANK_NAMES[lawType][rankIndex]
 */
const LAW_RANK_NAMES = {
  element_phoenix_fire:     ['Percikan Api Kecil', 'Pembakaran Awal', 'Sayap Api Muda', 'Nirwana Pertama', 'Nyala Phoenix Bangkit', 'Lahar Inti Batin', 'Mahkota Api Surgawi', 'Burung Api Abadi', 'Phoenix Sempurna'],
  element_azure_water:      ['Tetesan Embun Pagi', 'Aliran Sungai Perak', 'Gelombang Laut Biru', 'Arus Deras Naga', 'Samudra Batin Jernih', 'Glasier Jiwa Beku', 'Pusaran Abyssal', 'Lautan Langit Tanpa Dasar', 'Naga Azure Sempurna'],
  element_xuanwu_earth:     ['Kerikil Dasar', 'Tanah Liat Padat', 'Batu Karang Kokoh', 'Tebing Baja Bumi', 'Inti Gunung Berapi', 'Lempeng Benua Agung', 'Fondasi Leylines', 'Cangkang Xuanwu Purba', 'Xuanwu Sempurna'],
  element_qingdi_wood:      ['Tunas Biji Pertama', 'Akar Rumput Liar', 'Batang Bambu Kokoh', 'Pohon Tua Berurat', 'Hutan Belantara Hidup', 'Akar Dunia Terhubung', 'Pohon Hayat Berbunga', 'Kanopi Langit Surgawi', 'Kaisar Hijau Sempurna'],
  element_roc_wind:         ['Hembusan Lembut', 'Pusaran Debu Kecil', 'Angin Kencang Padang', 'Topan Bilah Tajam', 'Badai Petir Langit', 'Sayap Roc Terbentang', 'Tornado Sembilan Langit', 'Angin Astral Pembatas', 'Roc Kuno Sempurna'],
  element_godthunder_light: ['Percikan Statis', 'Kilat Jemari Kecil', 'Sambaran Awan Hitam', 'Petir Langit Pertama', 'Rantai Petir Biru', 'Petir Ungu Murni', 'Hukuman Langit Ketujuh', 'Sembilan Petir Suci', 'Dewa Petir Sempurna'],
  body_tempering:           ['Kulit Fana Biasa', 'Pengerasan Daging', 'Tulang Besi Tempa', 'Otot Kawat Baja', 'Meridian Terbuka', 'Organ Emas Murni', 'Darah Naga Mengalir', 'Raga Vajra Tak Tertembus', 'Raga Sempurna'],
  gu_master:                ['Penanam Ulat Kecil', 'Penjaga Sarang Awal', 'Peternak Gu Muda', 'Pengendali Koloni', 'Master Fusi Gu', 'Raja Aperture', 'Penguasa Sepuluh Ribu', 'Rongga Chaos Purba', 'Gu Sempurna'],
  natal_artifact:           ['Benda Fana Biasa', 'Pusaka Berpendar', 'Senjata Roh Muda', 'Artefak Inti Batin', 'Pusaka Batin Hidup', 'Relik Bernapas', 'Senjata Jiwa Terikat', 'Pusaka Surgawi', 'Pusaka Sempurna'],
  natal_beast:              ['Hewan Fana Biasa', 'Satwa Roh Kecil', 'Satwa Berbakat Muda', 'Macan Roh Tumbuh', 'Satwa Metamorfosis', 'Roh Purba Bangkit', 'Satwa Langit Terbang', 'Naga Roh Sejati', 'Satwa Sempurna'],
  demonic_turbid_core:      ['Penghisap Hawa Lemah', 'Penyerap Inti Kotor', 'Pembersih Core Muda', 'Pelebur Aura Siluman', 'Penguasa Miasma', 'Pemakan Hawa Hitam', 'Tiran Core Gelap', 'Raja Siluman Pelebur', 'Iblis Core Sempurna'],
  demonic_blood_soul:       ['Penghisap Setetes Darah', 'Peminum Darah Fana', 'Pengikat Ruh Lemah', 'Panji Ruh Pertama', 'Pencabut Nyawa Diam', 'Lautan Darah Beriak', 'Penguasa Sembilan Ruh', 'Raja Neraka Darah', 'Iblis Darah Sempurna'],
  demonic_myriad_venom:     ['Penjilat Bisa Ringan', 'Peminum Racun Encer', 'Tubuh Toleran Racun', 'Kantung Bisa Terbentuk', 'Racun Seribu Jenis', 'Tubuh Kebal Maut', 'Naga Racun Korosi', 'Lautan Racun Pemusnah', 'Iblis Racun Sempurna'],
  demonic_abyssal_pact:     ['Bisikan Iblis Samar', 'Kontrak Pertama', 'Perjanjian Darah', 'Wadah Iblis Muda', 'Segel Keempat Terbuka', 'Tangan Kanan Iblis', 'Perwujudan Abyss', 'Pewaris Tahta Iblis', 'Iblis Pact Sempurna'],
  demonic_nether_darkness:  ['Bayangan Pudar', 'Kabut Yin Tipis', 'Kegelapan Merayap', 'Jubah Malam Abadi', 'Domain Bayangan', 'Penguasa Nether Yin', 'Kekosongan Sembilan Lapis', 'Raja Kegelapan Kuno', 'Iblis Nether Sempurna']
};

/**
 * Rank kultivasi yang memicu Tribulasi Langit (gelombang petir).
 * Rank lain hanya menggunakan roll RNG biasa.
 */
const TRIBULATION_RANKS = [3, 5, 7, 8];

/**
 * Channeling Cap Constants
 */
const BASE_CHANNEL_CAP_MINUTES = 90;
const STREAK_BONUS_PER_DAY = 5;      // +5 menit per hari streak
const MAX_STREAK_DAYS = 7;
const MAX_STREAK_BONUS = STREAK_BONUS_PER_DAY * MAX_STREAK_DAYS; // +35 menit

// ═══════════════════════════════════════════════════════════════
// QI CALCULATION (Formula §2.3 & §2.4)
// ═══════════════════════════════════════════════════════════════

/**
 * BaseQiRequired(rank) = 1260 × (2.4 ^ rank)
 * Menghasilkan kebutuhan Qi dasar untuk satu stage di rank tertentu.
 */
function getBaseQiRequired(rank) {
  return Math.floor(1260 * Math.pow(2.4, rank));
}

/**
 * StageMult(stage) = 0.6 + (stage × 0.1)
 * Stage 0 = 0.6x, Stage 9 = 1.5x
 */
function getStageMult(stage) {
  return 0.6 + (stage * 0.1);
}

/**
 * QiRequired(rank, stage) = BaseQiRequired(rank) × StageMult(stage)
 * Menghitung kebutuhan Qi tepat untuk satu stage tertentu.
 */
function getQiRequired(rank, stage) {
  return Math.floor(getBaseQiRequired(rank) * getStageMult(stage));
}

/**
 * Channeling Qi Rate per menit (Qi/menit) yang didapat saat meditasi.
 * Rate meningkat setiap rank naik.
 * BaseRate = 21 Qi/menit pada Rank 0, meningkat 1.8× per rank.
 */
function getChannelQiRate(rank) {
  return Math.floor(21 * Math.pow(1.8, rank));
}

// ═══════════════════════════════════════════════════════════════
// DAILY CHANNELING CAP (§2.5)
// ═══════════════════════════════════════════════════════════════

/**
 * Menghitung batas menit channeling harian efektif.
 * @param {number} streakDays - Hari streak login berturut (0-7)
 * @param {number} premiumBonusMinutes - Bonus dari item premium (default 0)
 * @param {number} eventBonusMinutes - Bonus dari event spesial bulanan (default 0)
 * @returns {number} Total menit channeling yang diizinkan hari ini
 */
function getDailyChannelCap(streakDays, premiumBonusMinutes = 0, eventBonusMinutes = 0) {
  const streakBonus = Math.min(streakDays, MAX_STREAK_DAYS) * STREAK_BONUS_PER_DAY;
  return BASE_CHANNEL_CAP_MINUTES + streakBonus + premiumBonusMinutes + eventBonusMinutes;
}

/**
 * Menghitung jumlah Qi yang didapat dari channeling sejak lastChannelSyncAt.
 * Server-authoritative: berdasarkan delta waktu server, bukan timer browser.
 * @param {object} player - Mongoose Player document
 * @returns {{ qiGained: number, minutesElapsed: number, isCapReached: boolean }}
 */
function calculateChannelingProgress(player) {
  const law = player.cultivationLaw;
  if (!law || !law.isChanneling || !law.lastChannelSyncAt) {
    return { qiGained: 0, minutesElapsed: 0, isCapReached: false };
  }

  const now = Date.now();
  const elapsed = (now - new Date(law.lastChannelSyncAt).getTime()) / 60000; // menit
  const minutesElapsed = Math.max(0, elapsed);

  // Daily cap check
  const streakDays = law.dailyData?.dailyStreakDays || 0;
  const dailyCap = getDailyChannelCap(streakDays);
  const minutesUsedToday = law.dailyData?.channelMinutesToday || 0;
  const minutesRemaining = Math.max(0, dailyCap - minutesUsedToday);
  const effectiveMinutes = Math.min(minutesElapsed, minutesRemaining);

  const rate = getChannelQiRate(law.rank);
  const qiGained = Math.floor(effectiveMinutes * rate);
  const isCapReached = minutesUsedToday + effectiveMinutes >= dailyCap;

  return { qiGained, minutesElapsed: effectiveMinutes, isCapReached };
}

/**
 * Sinkronisasi Qi channeling ke database (dipanggil saat stop channel atau cek status).
 * @param {object} player - Mongoose Player document (mutable)
 * @returns {{ newQi: number, minutesSynced: number, isCapReached: boolean }}
 */
function syncLawChanneling(player) {
  const { qiGained, minutesElapsed, isCapReached } = calculateChannelingProgress(player);

  if (qiGained > 0) {
    player.cultivationLaw.qi = Math.min(
      player.cultivationLaw.qi + qiGained,
      player.cultivationLaw.maxQi
    );
    player.cultivationLaw.dailyData.channelMinutesToday += minutesElapsed;
  }

  player.cultivationLaw.lastChannelSyncAt = new Date();

  if (isCapReached) {
    player.cultivationLaw.isChanneling = false;
  }

  return { newQi: player.cultivationLaw.qi, minutesSynced: minutesElapsed, isCapReached };
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
function attemptMiniBreakthrough(player) {
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

  // Roll RNG
  const successRate = getMiniBreakthroughSuccessRate(law.stage);
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

    return {
      success: true,
      isSuccess: true,
      message: `Penerobosan Berhasil! ${rankName} Stage ${law.stage}.`,
      rewards: {
        newStage: law.stage,
        newRank: law.rank,
        levelCapBonus: 2,
        skillPoints: 1,
        cooldownMs: 30 * 60 * 1000,
        maxQi: law.maxQi,
        rankDisplayName: rankName,
        stageBonusGranted: bonus
      }
    };
  } else {
    // Penalti gagal (§5.3)
    const qiPenalty = Math.floor(law.maxQi * 0.15);
    law.qi = Math.max(0, law.qi - qiPenalty);
    const cooldownMs = getMiniBreakthroughFailCooldown(law.stage);
    law.miniBreakthroughCooldownUntil = new Date(Date.now() + cooldownMs);

    return {
      success: true,
      isSuccess: false,
      message: `Penerobosan Gagal! Qi berkurang ${qiPenalty}. Pulihkan diri.`,
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
 * Formula: 85% - (rank × 5%)
 * Rank 0→1: 85%, Rank 7→8: 50%
 */
function getMajorBreakthroughSuccessRate(rank) {
  return Math.max(30, 85 - (rank * 5));
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
 * @returns {{ survived: boolean, wavesCleared: number, totalDamage: number, survivalHP: number, waveDetails: Array }}
 */
function runTribulation(player) {
  const law = player.cultivationLaw;
  const lawDef = LAW_DEFINITIONS[law.activeLawType];
  const pathMod = lawDef?.pathMod || 1.0;
  const rank = law.rank;
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

/**
 * Eksekusi major breakthrough (Stage 9 → Rank+1 Stage 0).
 * @param {object} player - Mongoose Player document (mutable)
 * @returns {{ success: boolean, isSuccess?: boolean, message: string, rewards?: object, penalties?: object, tribulation?: object }}
 */
function attemptMajorBreakthrough(player) {
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

  if (law.qi < law.maxQi) {
    return { success: false, message: `Qi belum penuh. ${Math.floor(law.qi)}/${law.maxQi}` };
  }

  if (law.majorBreakthroughCooldownUntil && new Date(law.majorBreakthroughCooldownUntil) > new Date()) {
    const remaining = Math.ceil((new Date(law.majorBreakthroughCooldownUntil) - Date.now()) / 60000);
    return { success: false, message: `Masih dalam masa pemulihan besar. Sisa: ${remaining} menit.` };
  }

  // Tribulasi Langit (Rank 3, 5, 7, 8)
  let tribResult = null;
  if (requiresTribulation(law.rank)) {
    tribResult = runTribulation(player);
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

  // Roll RNG untuk major breakthrough
  const successRate = getMajorBreakthroughSuccessRate(law.rank);
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

    return {
      success: true,
      isSuccess: true,
      message: `🎉 PENEROBOSAN BESAR BERHASIL! Ranah naik ke: ${newRankName}!`,
      tribulation: tribResult,
      rewards: {
        newRank: law.rank,
        newStage: 0,
        rankDisplayName: newRankName,
        levelCapBonus: 5,
        skillPoints: 3,
        cooldownMs: 4 * 3600 * 1000,
        maxQi: law.maxQi
      }
    };
  } else {
    // Major fail — penalti
    const cooldownMs = getMajorBreakthroughFailCooldown(law.rank);
    law.qi = Math.max(0, law.qi - Math.floor(law.maxQi * 0.25));
    law.majorBreakthroughCooldownUntil = new Date(Date.now() + cooldownMs);

    return {
      success: true,
      isSuccess: false,
      message: 'Penerobosan Besar GAGAL. Qi mengalami deviasi. Pulihkan diri.',
      tribulation: tribResult,
      penalties: {
        qiLost: Math.floor(law.maxQi * 0.25),
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
  let systemQiGained = 0;
  let message = '';

  switch (triggerType) {
    case 'battle_hit':
      if (activeLawType === 'body_tempering') {
        lawQiGained = 12; // True Qi dari pukulan fisik
      } else {
        lawQiGained = 4;
      }
      break;

    case 'battle_victory':
      const monsterTier = context.monsterTier || 1;
      systemQiGained = Math.floor(35 * monsterTier);
      if (activeLawType === 'body_tempering') {
        lawQiGained = 35;
        message = '💪 Otot dan urat menyerap hawa pertarungan (+35 True Qi)!';
      } else if (activeLawType === 'demonic_blood_soul') {
        lawQiGained = 50;
        message = '🩸 Memanen darah musuh yang gugur (+50 Blood Qi)!';
      } else if (activeLawType === 'natal_beast') {
        lawQiGained = 35;
        if (law.boundEntity) {
          law.boundEntity.beastCurrentHp = Math.min(law.boundEntity.beastMaxHp || 120, (law.boundEntity.beastCurrentHp || 120) + 15);
        }
        message = '🐾 Bertarung berdampingan dengan satwa roh (+35 Symbiotic Qi)!';
      } else {
        lawQiGained = 25;
      }
      break;

    case 'meat_eaten':
      if (activeLawType === 'body_tempering') {
        lawQiGained = 80;
        message = '🍖 Daging binatang buas dicerna menjadi intisari raga (+80 True Qi)!';
      } else {
        lawQiGained = 30;
      }
      break;

    case 'step_endurance':
      const steps = context.steps || 1;
      if (activeLawType === 'element_roc_wind') {
        lawQiGained = Math.floor(steps * 1.5);
      } else if (activeLawType === 'body_tempering') {
        lawQiGained = Math.floor(steps * 1.2);
      } else {
        lawQiGained = Math.floor(steps * 0.4);
      }
      systemQiGained = Math.floor(steps * 0.5);
      break;

    case 'fish_caught':
      if (activeLawType === 'element_azure_water') {
        lawQiGained = 40;
        message = '💧 Menyerap embun air danau bersama ikan roh (+40 Azure Qi)!';
      } else {
        lawQiGained = 15;
      }
      systemQiGained = 20;
      break;

    case 'ore_mined':
      if (activeLawType === 'element_xuanwu_earth') {
        lawQiGained = 35;
        message = '🗿 Menyerap hawa bumi leylines dari rekahan batu (+35 Leyline Qi)!';
      } else {
        lawQiGained = 15;
      }
      systemQiGained = 20;
      break;

    case 'herb_harvested':
      if (activeLawType === 'element_qingdi_wood') {
        lawQiGained = 40;
        message = '🌿 Intisari getah tanaman obat meresap ke pori-pori (+40 Life Qi)!';
      } else {
        lawQiGained = 15;
      }
      systemQiGained = 20;
      break;

    case 'equipment_forged':
      if (activeLawType === 'natal_artifact') {
        lawQiGained = 50;
        message = '🗡️ Hawa dentingan palu beresonansi dengan pusaka jiwa (+50 Soul Qi)!';
      } else {
        lawQiGained = 20;
      }
      systemQiGained = 25;
      break;

    case 'crit_landed':
      if (activeLawType === 'element_godthunder_light') {
        lawQiGained = 20;
        message = '⚡ Sengatan kilat surgawi menyambar meridian (+20 Lightning Qi)!';
      } else {
        lawQiGained = 5;
      }
      break;

    default:
      lawQiGained = 10;
      systemQiGained = 10;
  }

  // Akumulasikan ke cultivationLaw jika pemain mengikat Law
  if (law && law.activeLawType && lawQiGained > 0) {
    const maxQ = law.maxQi || 1000;
    law.qi = Math.min(maxQ, (law.qi || 0) + lawQiGained);
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
  if (!law || !law.dailyData) return false;

  const lastReset = law.dailyData.lastDailyResetAt ? new Date(law.dailyData.lastDailyResetAt) : new Date(0);
  const now = new Date();

  // Reset jika hari berbeda (berdasarkan WIB date 00:00 reset)
  if (!isClaimedToday(lastReset)) {
    law.dailyData.channelMinutesToday = 0;
    law.dailyData.lastDailyResetAt = now;
    law.dailyData.dailyMissionsCompleted = 0;
    law.dailyData.dailyMissionIds = [];
    return true;
  }
  return false;
}

/**
 * Klaim pencerahan harian (Daily Epiphany).
 * Memberikan 10% dari batas Qi stage saat ini secara instan + 25-40 Copper.
 * @param {object} player - Mongoose Player document (mutable)
 * @returns {{ success: boolean, message: string, qiGranted?: number, copperGranted?: number }}
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

  // +10% Qi instan
  const qiGranted = Math.floor(law.maxQi * 0.10);
  law.qi = Math.min(law.qi + qiGranted, law.maxQi);
  law.dailyData.lastEpiphanyClaimAt = new Date();

  // +25 s/d 40 Copper (random)
  const copperGranted = 25 + Math.floor(Math.random() * 16);
  if (player.currency) {
    player.currency.copper = (player.currency.copper || 0) + copperGranted;
  }

  return {
    success: true,
    message: `✨ Pencerahan Harian! +${qiGranted} Qi & +${copperGranted} Tembaga.`,
    qiGranted,
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
  if (!law) return { hasLaw: false, canBind: true };

  const lawDef = law.activeLawType ? LAW_DEFINITIONS[law.activeLawType] : null;
  const rankNames = law.activeLawType ? LAW_RANK_NAMES[law.activeLawType] : null;
  const rankDisplayName = rankNames?.[law.rank] || null;

  const streakDays = law.dailyData?.dailyStreakDays || player.dailyStreak || 0;
  const dailyCap = getDailyChannelCap(streakDays);
  const minutesUsed = law.dailyData?.channelMinutesToday || 0;
  const streakBonus = Math.min(35, streakDays * 5);

  const totalStages = (law.rank * 10) + law.stage;
  const qiPercent = law.maxQi > 0 ? Math.min(100, Math.floor((law.qi / law.maxQi) * 100)) : 0;
  const channelRate = getChannelQiRate(law.rank);

  const canClaimEpiphany = !isClaimedToday(law.dailyData?.lastEpiphanyClaimAt);

  const charLevelCap = getLevelCap(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)', law.lawLevelCapBonus || 0);

  const targetRank = (law.rank || 0) + 1;
  const isLevelMet = meetsLawRankRequirements(player, targetRank);
  const reqData = LAW_RANK_REALM_REQUIREMENTS[targetRank];
  const requiredLevel = reqData?.minLevel || 1;
  const charLevel = player.level || 1;

  const pathMod = lawDef?.pathMod || 1.0;
  const tribWaveDamages = [0, 1, 2].map(w => calculateTribulationWaveDamage(w, law.rank || 0, pathMod));
  const survivalHP = calculateSurvivalHP(player);
  const maxWaveDmg = Math.max(...tribWaveDamages);
  const willFaceTribulation = requiresTribulation(targetRank);
  const canSurviveTribulation = !willFaceTribulation || (survivalHP >= maxWaveDmg);

  let majorBlockingReason = null;
  if (law.stage === 9) {
    if (!isLevelMet) {
      majorBlockingReason = `Kapasitas fisik belum siap. Capai Level ${requiredLevel} (saat ini Lv. ${charLevel}).`;
    } else if (law.qi < law.maxQi) {
      majorBlockingReason = `Akumulasi Qi belum mencapai batas maksimal (${Math.floor(law.qi)}/${law.maxQi}).`;
    } else if (willFaceTribulation && !canSurviveTribulation) {
      majorBlockingReason = `Peringatan Kematian: Survival HP (${survivalHP}) tidak cukup menahan Petir Tribulasi (${maxWaveDmg} DMG). Tingkatkan DEF/Vitalitas.`;
    }
  }

  return {
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

    rank: law.rank || 0,
    stage: law.stage || 0,
    rankDisplayName: rankDisplayName || `Tingkat ${law.rank || 0}`,
    totalStages,

    qi: Math.floor(law.qi || 0),
    maxQi: law.maxQi || 1260,
    qiPercent,
    qiProgressPercent: qiPercent,
    channelRate,
    channelRatePerMinute: channelRate,

    isChanneling: !!law.isChanneling,
    dailyChannelCap: dailyCap,
    dailyChannelCapMinutes: dailyCap,
    dailyChannelUsed: Math.floor(minutesUsed),
    channelMinutesUsedToday: Math.floor(minutesUsed),
    dailyChannelRemaining: Math.max(0, dailyCap - minutesUsed),
    remainingChannelMinutesToday: Math.max(0, dailyCap - minutesUsed),

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

    boundEntity: law.boundEntity || null,
    demonicData: law.demonicData || null,
    bodyTemperingParts: law.bodyTemperingParts || {
      head: 0, torso: 0, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0, spine: 0, dantian: 0, skin: 0
    },
    guSlots: law.guSlots || [],

    canMiniBreakthrough: (law.qi >= law.maxQi) && (law.stage < 9),
    miniBreakthroughReady: (law.qi >= law.maxQi) && (law.stage < 9),
    canMajorBreakthrough: (law.qi >= law.maxQi) && (law.stage === 9) && (law.rank < 8) && isLevelMet,
    majorBreakthroughReady: (law.qi >= law.maxQi) && (law.stage === 9) && (law.rank < 8) && isLevelMet,
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
    majorBreakthroughSuccessRate: getMajorBreakthroughSuccessRate(law.rank || 0),

    miniCooldownUntil: law.miniBreakthroughCooldownUntil || null,
    miniBreakthroughCooldownUntil: law.miniBreakthroughCooldownUntil || null,
    majorCooldownUntil: law.majorBreakthroughCooldownUntil || null,
    majorBreakthroughCooldownUntil: law.majorBreakthroughCooldownUntil || null,

    canClaimEpiphany,
    canBind: !law.activeLawType
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Constants
  LAW_DEFINITIONS,
  LAW_RANK_NAMES,
  LAW_TYPE_ENUM: Object.keys(LAW_DEFINITIONS),
  TRIBULATION_RANKS,
  BASE_CHANNEL_CAP_MINUTES,

  // Qi Calculation
  getBaseQiRequired,
  getStageMult,
  getQiRequired,
  getChannelQiRate,

  // Daily Cap
  getDailyChannelCap,
  calculateChannelingProgress,
  syncLawChanneling,
  checkAndResetDailyCap,
  claimDailyEpiphany,

  // Level Cap
  getLevelCap,

  // Breakthrough
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

  // Status
  getLawStatus
};
