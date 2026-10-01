/**
 * combatBody.js
 * Engine kondisi fisik, Body Tempering 9 bagian anatomi, injury, serta modifikasi 5 Pilar Tempur.
 */

const { COMBAT_STATUS, applyStatus } = require('./combatStatus');

/**
 * Hitung pengali efisiensi tempur dari 9 bagian Body Tempering (Anatomi Fisik).
 * Hanya aktif jika activeLawType === 'body_tempering'.
 * Jika Law lain: mengembalikan multiplier 1.0 (aman, tidak soft-lock).
 */
function getBodyPartCombatMultipliers(player) {
  const defaults = {
    isBodyLaw: false,
    atkMult: 1.0,
    defMult: 1.0,
    spdMult: 1.0,
    maxHpMult: 1.0,
    critMult: 1.0,
    evadeMult: 1.0,
    hitChanceMult: 1.0,
    combatQiRegenMult: 1.0,
    staminaMult: 1.0,
    partsSummary: null
  };

  if (!player || !player.cultivationLaw) return defaults;
  if (player.cultivationLaw.activeLawType !== 'body_tempering') return defaults;

  const rawParts = player.cultivationLaw.bodyTemperingParts || {};
  const partLevel = (key) => Math.max(0, Math.floor(Number(rawParts[key]) || 0));

  // Formula stabil non-zero: level 0 = 0.55 (floor aman), level 15 = 1.00, level 20+ = 1.15 (cap)
  const calcFactor = (lvl) => Math.min(1.15, Math.max(0.55, Number((0.55 + lvl * 0.03).toFixed(3))));

  const head = calcFactor(partLevel('head'));
  const torso = calcFactor(partLevel('torso'));
  const leftArm = calcFactor(partLevel('leftArm'));
  const rightArm = calcFactor(partLevel('rightArm'));
  const leftLeg = calcFactor(partLevel('leftLeg'));
  const rightLeg = calcFactor(partLevel('rightLeg'));
  const spine = calcFactor(partLevel('spine'));
  const dantian = calcFactor(partLevel('dantian'));
  const skin = calcFactor(partLevel('skin'));

  // Mapping pilar anggota badan:
  // 1. Lengan -> Kekuatan pukulan (ATK & Crit)
  const armsAvg = Number(((leftArm + rightArm) / 2).toFixed(3));
  // 2. Kaki -> Kecepatan gerak & kelincahan menghindar (SPD & Evasion)
  const legsAvg = Number(((leftLeg + rightLeg) / 2).toFixed(3));
  // 3. Kepala -> Fokus mental & ketepatan serangan (Hit Chance)
  const headVal = head;
  // 4. Batang Tubuh & Kulit -> Ketahanan fisik dan zirah daging (DEF & Max HP)
  const bodyDefAvg = Number(((torso + skin) / 2).toFixed(3));
  // 5. Tulang Belakang & Dantian -> Sirkulasi tenaga dalam dan daya tahan (Qi Regen & Stamina)
  const coreAvg = Number(((spine + dantian) / 2).toFixed(3));

  return {
    isBodyLaw: true,
    atkMult: armsAvg,
    defMult: bodyDefAvg,
    spdMult: legsAvg,
    maxHpMult: bodyDefAvg,
    critMult: armsAvg,
    evadeMult: legsAvg,
    hitChanceMult: headVal,
    combatQiRegenMult: coreAvg,
    staminaMult: coreAvg,
    partsSummary: {
      head: partLevel('head'),
      torso: partLevel('torso'),
      leftArm: partLevel('leftArm'),
      rightArm: partLevel('rightArm'),
      leftLeg: partLevel('leftLeg'),
      rightLeg: partLevel('rightLeg'),
      spine: partLevel('spine'),
      dantian: partLevel('dantian'),
      skin: partLevel('skin')
    }
  };
}

/**
 * Pengali penalti Vitality fisik pemain terhadap efektivitas tempur.
 * Vitality 100 -> 1.0x (Optimal)
 * Vitality 50  -> 0.9x
 * Vitality 0   -> 0.8x (Batas Bawah / Floor Aman)
 */
function getVitalityCombatPenalty(player) {
  if (!player) return 1.0;
  const vit = Number(player.extendedStats?.vitality ?? player.vitality ?? 100);
  const clampedVit = Math.min(100, Math.max(0, isNaN(vit) ? 100 : vit));
  return Number(Math.min(1.0, Math.max(0.8, 0.8 + (clampedVit / 100) * 0.2)).toFixed(3));
}

/**
 * Pengali penalti stamina aksi saat stamina pemain sangat rendah di ronde tempur.
 * - stamina < 20% max -> outbound damage * 0.90, hitChance * 0.95
 * - stamina === 0     -> outbound damage * 0.85, hitChance * 0.90 (tetap bisa basic attack)
 */
function getStaminaActionPenalty(sessionPlayer) {
  if (!sessionPlayer) {
    const numObj = new Number(1.0);
    numObj.damageMult = 1.0;
    numObj.hitChanceMult = 1.0;
    numObj.isExhausted = false;
    numObj.isTired = false;
    return numObj;
  }

  const sta = Number(sessionPlayer.stamina !== undefined ? sessionPlayer.stamina : 100);
  const maxSta = Number(sessionPlayer.maxStamina || 100);
  const ratio = maxSta > 0 ? (sta / maxSta) : 1.0;

  let damageMult = 1.0;
  let hitChanceMult = 1.0;
  let isExhausted = false;
  let isTired = false;

  if (sta <= 0) {
    damageMult = 0.85;
    hitChanceMult = 0.90;
    isExhausted = true;
  } else if (ratio < 0.20 || sta < 20) {
    damageMult = 0.90;
    hitChanceMult = 0.95;
    isTired = true;
  }

  const numObj = new Number(damageMult);
  numObj.damageMult = damageMult;
  numObj.hitChanceMult = hitChanceMult;
  numObj.isExhausted = isExhausted;
  numObj.isTired = isTired;
  return numObj;
}

/**
 * Hitung reduksi stat akibat cedera organ dalam (Injury Condition).
 * Setiap poin keparahan cedera (1-10) mengurangi ATK/DEF -3% dan Max Qi -2%.
 */
function getInjuryStatPenalties(conditions) {
  const sev = Math.max(0, Math.min(10, Math.floor(Number(conditions?.injury) || 0)));
  if (sev <= 0) {
    return { atkDefMult: 1.0, mpMult: 1.0, severity: 0 };
  }

  const atkDefPenalty = Math.min(0.30, sev * COMBAT_STATUS.INJURY.atkDefPenaltyPerSev);
  const mpPenalty = Math.min(0.20, sev * COMBAT_STATUS.INJURY.maxMpPenaltyPerSev);

  return {
    atkDefMult: Number((1.0 - atkDefPenalty).toFixed(3)),
    mpMult: Number((1.0 - mpPenalty).toFixed(3)),
    severity: sev
  };
}

/**
 * Periksa apakah serangan merupakan Heavy Hit (>= 15% Max HP target).
 * Jika ya, sematkan kondisi Injury +1 ke target.
 */
function checkAndApplyHeavyHitInjury(target, incomingDamage) {
  if (!target || incomingDamage <= 0) return false;
  const maxHp = target.maxHp || 100;
  const threshold = maxHp * COMBAT_STATUS.INJURY.applyOnHitPctOfMaxHp;

  if (incomingDamage >= threshold) {
    applyStatus(target, 'injury', { severity: 1 });
    return true;
  }
  return false;
}

/**
 * Terapkan modifikasi 5 Pilar Tempur (Focus, Vitality, Mood, Luck) ke snapshot stat tempur.
 * CATATAN ARSITEKTUR: Fungsi ini hanya dipanggil SATU KALI pada saat inisialisasi battle snapshot (applied once at battle snapshot),
 * untuk mencegah double-counting atau akumulasi liar antar-ronde.
 *
 * @param {Object} baseStats - Hasil kalkulasi dari getComputedStats()
 * @param {Object} player - Dokumen pemain
 * @returns {Object} Stat tempur yang telah diperkaya nilai 5 Pilar
 */
function applyPillarCombatModifiers(baseStats, player) {
  const stats = { ...baseStats };
  if (!player) return stats;

  const ext = player.extendedStats || {};

  // 1. PILAR FOCUS (Fokus Mental)
  // Base 50. Nilai >50 memberikan bonus akurasi hit (maks ±8%) & resistensi lumpuh/stun (maks 10%)
  const focus = Number(ext.focus ?? player.focus ?? 50);
  const hitChanceBonus = Math.min(0.08, Math.max(-0.08, Number(((focus - 50) * 0.0005).toFixed(4))));
  const stunResistBonus = Math.min(0.10, Math.max(0, Number(((focus - 50) * 0.002).toFixed(4))));

  // 2. PILAR VITALITY (Daya Tahan Hidup)
  const vitMult = getVitalityCombatPenalty(player);
  stats.atk = Math.max(1, Math.floor((stats.atk || 15) * vitMult));
  stats.def = Math.max(1, Math.floor((stats.def || 10) * vitMult));
  stats.maxHp = Math.max(10, Math.floor((stats.maxHp || 100) * vitMult));

  // 3. PILAR MOOD (Suasana Hati & Ketenangan Jiwa)
  // Base 50. Nilai >50 menaikkan critical strike chance (maks ±5%)
  const mood = Number(ext.mood ?? player.mood ?? 50);
  const critRateBonus = Math.min(0.05, Math.max(-0.05, Number(((mood - 50) * 0.0004).toFixed(4))));
  stats.critHitRate = Math.min(0.80, Math.max(0.01, Number(((stats.critHitRate || 0.05) + critRateBonus).toFixed(4))));
  stats.critRate = Math.round(stats.critHitRate * 100);

  // 4. PILAR LUCK (Faktor Keberuntungan Surga)
  // Luck >= 70 memberikan kelayakan reroll critical jika serangan pertama gagal crit
  const luck = Number(ext.luck ?? player.luck ?? 50);
  const luckRerollEligible = luck >= 70;

  // 5. BODY TEMPERING PARTS MULTIPLIER (Jika pemain mengikat Law Penempaan Tubuh)
  const bodyMults = getBodyPartCombatMultipliers(player);
  if (bodyMults.isBodyLaw) {
    stats.atk = Math.max(1, Math.floor(stats.atk * bodyMults.atkMult));
    stats.def = Math.max(1, Math.floor(stats.def * bodyMults.defMult));
    stats.spd = Math.max(1, Math.floor(stats.spd * bodyMults.spdMult));
    stats.maxHp = Math.max(10, Math.floor(stats.maxHp * bodyMults.maxHpMult));
    stats.bodySummary = bodyMults.partsSummary;
  }

  // Sematkan metadata pilar ke stats
  stats.hitChanceBonus = hitChanceBonus;
  stats.stunResistBonus = stunResistBonus;
  stats.critRateBonus = critRateBonus;
  stats.luckRerollEligible = luckRerollEligible;
  stats.vitalityFactor = vitMult;

  return stats;
}

module.exports = {
  getBodyPartCombatMultipliers,
  getVitalityCombatPenalty,
  getStaminaActionPenalty,
  getInjuryStatPenalties,
  checkAndApplyHeavyHitInjury,
  applyPillarCombatModifiers
};
