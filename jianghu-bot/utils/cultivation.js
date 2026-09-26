const Player = require('../models/Player');

// Data Realm Kultivasi Sistem
const SYSTEM_REALMS = [
  {
    name: 'Fondasi Fana (Mortal Foundation)',
    maxStage: 10,
    baseQiCapacity: 1000,
    qiRatePerMinute: 1,
    baseSuccessRate: 100, // Mortal ke Qi Refining 100% success
    tribulationTier: 0,
    tribulationTitle: 'Pembersihan Dantian & Penyatuan Fondasi Fana',
    tribulationBaseDamage: 0,
    failCooldownHours: 0
  },
  {
    name: 'Pemurnian Qi (Qi Refining)',
    maxStage: 9,
    baseQiCapacity: 5000,
    qiRatePerMinute: 2,
    baseSuccessRate: 90,
    tribulationTier: 1,
    tribulationTitle: 'Percikan Kilat Rohani Surgawi',
    tribulationBaseDamage: 100,
    failCooldownHours: 4
  },
  {
    name: 'Pembentukan Fondasi (Foundation Establishment)',
    maxStage: 9,
    baseQiCapacity: 25000,
    qiRatePerMinute: 5,
    baseSuccessRate: 80,
    tribulationTier: 2,
    tribulationTitle: 'Sambaran Guntur Bumi Sembilan Lapis',
    tribulationBaseDamage: 250,
    failCooldownHours: 6
  },
  {
    name: 'Pembentukan Inti (Core Formation)',
    maxStage: 9,
    baseQiCapacity: 125000,
    qiRatePerMinute: 15,
    baseSuccessRate: 70,
    tribulationTier: 3,
    tribulationTitle: '⚡ Tribulasi Langit Tingkat 1 (Petir Emas Pelebur Inti)',
    tribulationBaseDamage: 500,
    failCooldownHours: 12
  },
  {
    name: 'Roh Bayi (Nascent Soul)',
    maxStage: 9,
    baseQiCapacity: 625000,
    qiRatePerMinute: 40,
    baseSuccessRate: 60,
    tribulationTier: 4,
    tribulationTitle: '⚡ Tribulasi Roh Membelah Dantian',
    tribulationBaseDamage: 1000,
    failCooldownHours: 16
  },
  {
    name: 'Transformasi Roh (Soul Transformation)',
    maxStage: 9,
    baseQiCapacity: 3125000,
    qiRatePerMinute: 120,
    baseSuccessRate: 50,
    tribulationTier: 5,
    tribulationTitle: '⚡ Tribulasi Petir Ungu Sembilan Awan',
    tribulationBaseDamage: 2000,
    failCooldownHours: 24
  },
  {
    name: 'Pemutus Kehampaan (Void Severing)',
    maxStage: 9,
    baseQiCapacity: 15625000,
    qiRatePerMinute: 350,
    baseSuccessRate: 40,
    tribulationTier: 6,
    tribulationTitle: '⚡ Tribulasi Kehampaan Ruang & Waktu',
    tribulationBaseDamage: 4000,
    failCooldownHours: 36
  },
  {
    name: 'Penerobosan Tribulasi (Tribulation Crossing) ⚡',
    maxStage: 9,
    baseQiCapacity: 78125000,
    qiRatePerMinute: 1000,
    baseSuccessRate: 30,
    tribulationTier: 7,
    tribulationTitle: '⚡⚡ Tribulasi Petir Emas Surgawi Purba',
    tribulationBaseDamage: 8000,
    failCooldownHours: 48
  },
  {
    name: 'Kenaikan Abadi (Immortal Ascension)',
    maxStage: 9,
    baseQiCapacity: 500000000,
    qiRatePerMinute: 3000,
    baseSuccessRate: 20,
    tribulationTier: 8,
    tribulationTitle: '⚡⚡⚡ Tribulasi Penciptaan Semesta Raya',
    tribulationBaseDamage: 16000,
    failCooldownHours: 72
  }
];

// Helper: Dapatkan indeks realm
function getRealmIndex(realmName) {
  const idx = SYSTEM_REALMS.findIndex(r => r.name === realmName);
  return idx !== -1 ? idx : 0; // fallback to Mortal
}

// Tabel Progresi Dinamis Fondasi Fana (Mortal Foundation Stage 1 - 10)
// Menjamin setiap stage bertumbuh secara organik dan tidak stagnan di 1000 Qi
const MORTAL_STAGE_PROGRESSION = [
  { stage: 1,  maxQi: 1000,  ratePerMinute: 2 },
  { stage: 2,  maxQi: 1500,  ratePerMinute: 3 },
  { stage: 3,  maxQi: 2200,  ratePerMinute: 4 },
  { stage: 4,  maxQi: 3100,  ratePerMinute: 5 },
  { stage: 5,  maxQi: 4200,  ratePerMinute: 6 },
  { stage: 6,  maxQi: 5500,  ratePerMinute: 7 },
  { stage: 7,  maxQi: 7000,  ratePerMinute: 8 },
  { stage: 8,  maxQi: 9000,  ratePerMinute: 9 },
  { stage: 9,  maxQi: 11500, ratePerMinute: 10 },
  { stage: 10, maxQi: 15000, ratePerMinute: 12 }
];

// Menghitung Kapasitas Qi Maksimal (Max Qi) untuk Realm & Stage saat ini
function getMaxQi(realmIndex, stage) {
  const realm = SYSTEM_REALMS[realmIndex];
  if (!realm) return 1000;

  // 1. Fondasi Fana (Realm 0): Gunakan progresi dinamis per stage (1 - 10)
  if (realmIndex === 0) {
    const s = Math.max(1, Math.min(10, Number(stage) || 1));
    const entry = MORTAL_STAGE_PROGRESSION[s - 1];
    return entry ? entry.maxQi : 1000;
  }

  // 2. Ranah Tinggi (Realm 1+): Kurva halus (Smoothed Progressive Curve)
  // Menghindari ledakan liar 1.5^(stage-1) = 38x yang mematikan gameplay
  const s = Math.max(1, Math.min(realm.maxStage || 9, Number(stage) || 1));
  const stageOffset = s - 1;
  const stageMultiplier = 1 + (stageOffset * 0.40) + (Math.pow(stageOffset, 1.35) * 0.12);
  return Math.floor(realm.baseQiCapacity * stageMultiplier);
}

// Menghitung Qi Rate per menit
function getQiRatePerMinute(realmIndex, stage) {
    const realm = SYSTEM_REALMS[realmIndex];
    if (!realm) return 1;

    // 1. Fondasi Fana (Realm 0): Laju Qi bertumbuh seiring pembukaan meridian
    if (realmIndex === 0) {
      const s = Math.max(1, Math.min(10, Number(stage) || 1));
      const entry = MORTAL_STAGE_PROGRESSION[s - 1];
      return entry ? entry.ratePerMinute : 2;
    }

    // 2. Ranah Tinggi (Realm 1+): Laju bertumbuh +20% per mini-stage
    const s = Math.max(1, Math.min(realm.maxStage || 9, Number(stage) || 1));
    const stageMultiplier = 1 + ((s - 1) * 0.20);
    return Math.floor(realm.qiRatePerMinute * stageMultiplier);
}

const { getClimatePenalties, getPlayerClimateResistance } = require('./climate');

// Menghitung Qi aktual berdasarkan waktu berlalu sejak lastSyncAt
// Memerlukan argument resistance dan/atau config cuaca agar sinkron.
// Karena syncPlayerCultivation async, kita bisa merubah ini menjadi async,
// Tapi untuk menghindari breaking changes pada pemanggil sync, kita buat ini menerima params
// Kita bisa buat syncPlayerCultivation yang akan menghandle logic climate-nya.
function calculateCurrentQi(player, climateRegenMultiplier = 1.0) {
    if (!player.systemCultivation) {
         player.systemCultivation = {
            realm: 'Fondasi Fana (Mortal Foundation)',
            stage: 0,
            qi: 0,
            lastSyncAt: new Date()
         };
    }

    const sysCult = player.systemCultivation;
    const realmIdx = getRealmIndex(sysCult.realm);
    const maxQi = getMaxQi(realmIdx, sysCult.stage);
    const ratePerMinute = getQiRatePerMinute(realmIdx, sysCult.stage);

    const now = new Date();
    const lastSync = new Date(sysCult.lastSyncAt);
    const minutesPassed = Math.max(0, (now - lastSync) / (1000 * 60));

    // Apply climate penalty if outside comfort zone
    let effectiveRate = ratePerMinute * climateRegenMultiplier;
    let generatedQi = Math.floor(minutesPassed * effectiveRate);
    let newQi = Math.floor(sysCult.qi + generatedQi);

    if (newQi > maxQi) {
        newQi = maxQi;
    }

    return {
        currentQi: newQi,
        maxQi: maxQi,
        ratePerMinute: ratePerMinute,
        realmIdx: realmIdx,
        isReadyForBreakthrough: newQi >= maxQi
    };
}

// Fungsi utama sinkronisasi database (dipanggil saat mau update atau read penting)
async function syncPlayerCultivation(player) {
    // 1. Dapatkan WeatherConfig (opsional, jika tidak ada = cerah/default)
    const WeatherConfig = require('../models/WeatherConfig');
    const weatherConfig = await WeatherConfig.findOne({ configId: 'global' });

    // 2. Dapatkan resistance
    const resistance = await getPlayerClimateResistance(player);

    // 3. Kalkulasi penalti climate
    const regionSlug = player.currentLocation?.regionSlug || 'central_plains';
    const penalties = getClimatePenalties(regionSlug, resistance, { weatherConfig });

    const calc = calculateCurrentQi(player, penalties.qiRegenMultiplier);

    player.systemCultivation.qi = calc.currentQi;
    player.systemCultivation.lastSyncAt = new Date();
    // Tidak di-save disini untuk efisiensi, caller yang akan .save()
    return calc;
}

// Eksekusi Breakthrough
function attemptBreakthrough(realmIndex, stage, usedPill = false) {
    const realm = SYSTEM_REALMS[realmIndex];
    if (!realm) return { success: false, message: "Realm tidak valid." };

    // Jika sudah Immortal Ascension stage 9 (Mentok)
    if (realmIndex === SYSTEM_REALMS.length - 1 && stage === realm.maxStage) {
        return { success: false, message: "Kamu telah mencapai puncak kultivasi alam semesta!", isMaxLevel: true };
    }

    let successRate = realm.baseSuccessRate;

    // Semakin tinggi stage (1-9), semakin susah
    if (stage > 0) {
        successRate -= (stage * 2); // kurangi 2% per stage
    }

    // Tambahkan bonus pil jika ada
    if (typeof usedPill === 'number') {
        successRate += usedPill;
    } else if (usedPill === true) {
        // Fallback untuk legacy Discord bot (hardcoded 5%)
        successRate += 5;
    }

    // Cap at 100% and min at 1%
    successRate = Math.min(100, Math.max(1, successRate));

    const roll = Math.random() * 100;
    const isSuccess = roll <= successRate;

    return {
        success: isSuccess,
        successRate: successRate,
        roll: roll
    };
}

// Update Role Discord (Hanya Realm Utama)
async function updateCultivationRole(interaction, realmName) {
     if (!interaction.guild) return;

     try {
         const guild = interaction.guild;
         const member = await guild.members.fetch(interaction.user.id);
         if (!member) return;

         // Find role in guild by name
         let targetRole = guild.roles.cache.find(r => r.name === realmName);

         // Create if not exists
         if (!targetRole) {
             targetRole = await guild.roles.create({
                 name: realmName,
                 color: 'Random', // Bisa diatur warnanya per realm nanti
                 reason: 'Role otomatis untuk Sistem Kultivasi'
             });
         }

         // Hapus role realm lain yang mungkin dimiliki member
         const realmNames = SYSTEM_REALMS.map(r => r.name);
         for (const rName of realmNames) {
             if (rName === realmName) continue;
             const roleToRemove = guild.roles.cache.find(r => r.name === rName);
             if (roleToRemove && member.roles.cache.has(roleToRemove.id)) {
                 await member.roles.remove(roleToRemove);
             }
         }

         // Tambahkan role baru
         if (!member.roles.cache.has(targetRole.id)) {
             await member.roles.add(targetRole);
         }
     } catch (err) {
         console.error("[Cultivation Role Error]", err);
     }
}


/**
 * Menghitung HP survival pemain saat menghadapi tribulasi petir.
 * Formula: SurvivalHP = maxHP + (DEF × 3) + (Vitality × 2) + (Focus × 1.5)
 */
function calculateSurvivalHP(player) {
  const stats = player.stats || {};
  const ext = player.extendedStats || {};
  const maxHP = player.currentHp || stats.baseHp || 100;
  const def = stats.baseDef || 10;
  const vitality = ext.vitality || 100;
  const focus = ext.focus || 100;

  return Math.floor(maxHP + (def * 3) + (vitality * 2) + (focus * 1.5));
}

/**
 * Menghitung damage gelombang tribulasi petir berdasarkan ranah dan nomor gelombang.
 */
function calculateRealmWaveDamage(wave, realmIndex) {
  const realm = SYSTEM_REALMS[realmIndex];
  if (!realm || !realm.tribulationBaseDamage) return 0;
  return Math.floor(realm.tribulationBaseDamage * (1 + 0.3 * wave));
}

/**
 * Menjalankan simulasi tribulasi petir 3 gelombang untuk ranah utama.
 */
function runRealmTribulation(player, realmIndex) {
  const realm = SYSTEM_REALMS[realmIndex];
  const survivalHP = calculateSurvivalHP(player);
  const waveDetails = [];
  let survived = true;

  for (let wave = 0; wave < 3; wave++) {
    const damage = calculateRealmWaveDamage(wave, realmIndex);
    const cleared = damage === 0 || survivalHP >= damage;
    waveDetails.push({ wave: wave + 1, damage, survived: cleared });
    if (!cleared) {
      survived = false;
      break;
    }
  }

  const totalDamage = waveDetails.reduce((sum, w) => sum + w.damage, 0);
  return {
    survived,
    wavesCleared: waveDetails.filter(w => w.survived).length,
    totalDamage,
    survivalHP,
    waveDetails,
    tribulationTitle: realm?.tribulationTitle || 'Tribulasi Petir'
  };
}

module.exports = {
    SYSTEM_REALMS,
    MORTAL_STAGE_PROGRESSION,
    getRealmIndex,
    getMaxQi,
    getQiRatePerMinute,
    calculateCurrentQi,
    syncPlayerCultivation,
    attemptBreakthrough,
    updateCultivationRole,
    calculateSurvivalHP,
    calculateRealmWaveDamage,
    runRealmTribulation
};

function getRealmName(idx) {
  const realm = SYSTEM_REALMS[idx];
  if (realm) return realm.name;
  return 'Unknown Realm';
}
module.exports.getRealmName = getRealmName;
