const Player = require('../models/Player');

// Data Realm Kultivasi Sistem
const SYSTEM_REALMS = [
  {
    name: 'Fondasi Fana (Mortal Foundation)',
    maxStage: 0,
    baseQiCapacity: 1000,
    qiRatePerMinute: 1,
    baseSuccessRate: 100 // Mortal ke Qi Refining 100% success
  },
  {
    name: 'Pemurnian Qi (Qi Refining)',
    maxStage: 9,
    baseQiCapacity: 5000,
    qiRatePerMinute: 2,
    baseSuccessRate: 90
  },
  {
    name: 'Pembentukan Fondasi (Foundation Establishment)',
    maxStage: 9,
    baseQiCapacity: 25000,
    qiRatePerMinute: 5,
    baseSuccessRate: 80
  },
  {
    name: 'Pembentukan Inti (Core Formation)',
    maxStage: 9,
    baseQiCapacity: 125000,
    qiRatePerMinute: 15,
    baseSuccessRate: 70
  },
  {
    name: 'Roh Bayi (Nascent Soul)',
    maxStage: 9,
    baseQiCapacity: 625000,
    qiRatePerMinute: 40,
    baseSuccessRate: 60
  },
  {
    name: 'Transformasi Roh (Soul Transformation)',
    maxStage: 9,
    baseQiCapacity: 3125000,
    qiRatePerMinute: 120,
    baseSuccessRate: 50
  },
  {
    name: 'Pemutus Kehampaan (Void Severing)',
    maxStage: 9,
    baseQiCapacity: 15625000,
    qiRatePerMinute: 350,
    baseSuccessRate: 40
  },
  {
    name: 'Penerobosan Tribulasi (Tribulation Crossing) ⚡',
    maxStage: 9,
    baseQiCapacity: 78125000,
    qiRatePerMinute: 1000,
    baseSuccessRate: 30
  },
  {
    name: 'Kenaikan Abadi (Immortal Ascension)',
    maxStage: 9,
    baseQiCapacity: 500000000,
    qiRatePerMinute: 3000,
    baseSuccessRate: 20
  }
];

// Helper: Dapatkan indeks realm
function getRealmIndex(realmName) {
  const idx = SYSTEM_REALMS.findIndex(r => r.name === realmName);
  return idx !== -1 ? idx : 0; // fallback to Mortal
}

// Menghitung Kapasitas Qi Maksimal (Max Qi) untuk Realm & Stage saat ini
function getMaxQi(realmIndex, stage) {
  const realm = SYSTEM_REALMS[realmIndex];
  if (!realm) return 1000;

  if (realmIndex === 0) return realm.baseQiCapacity;

  // Eksponensial sederhana berdasarkan stage
  // Semakin tinggi stage, kapasitas naik
  const stageMultiplier = Math.pow(1.5, stage - 1);
  return Math.floor(realm.baseQiCapacity * stageMultiplier);
}

// Menghitung Qi Rate per menit
function getQiRatePerMinute(realmIndex, stage) {
    const realm = SYSTEM_REALMS[realmIndex];
    if (!realm) return 1;

    if (realmIndex === 0) return realm.qiRatePerMinute;

    // Rate naik sedikit per stage agar tidak frustrasi
    const stageMultiplier = 1 + ((stage - 1) * 0.1); // +10% rate per stage
    return Math.floor(realm.qiRatePerMinute * stageMultiplier);
}

// Menghitung Qi aktual berdasarkan waktu berlalu sejak lastSyncAt
function calculateCurrentQi(player) {
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

    let generatedQi = Math.floor(minutesPassed * ratePerMinute);
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
    const calc = calculateCurrentQi(player);
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

    // Pil memberikan flat +5%
    if (usedPill) {
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


module.exports = {
    SYSTEM_REALMS,
    getRealmIndex,
    getMaxQi,
    getQiRatePerMinute,
    calculateCurrentQi,
    syncPlayerCultivation,
    attemptBreakthrough,
    updateCultivationRole
};