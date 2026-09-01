// using crypto.randomUUID instead of external package to keep RAM footprint low.
const crypto = require('crypto');

const RANK_MULTIPLIER = {
  Common: 1.0,
  Uncommon: 1.1,
  Rare: 1.25,
  Epic: 1.45,
  Legendary: 1.7,
  Mythical: 2.0
};

/**
 * Helper: Generate random multiplier between 1.0 and 2.5
 */
function getRandomStatMultiplier() {
  return parseFloat((Math.random() * 1.5 + 1.0).toFixed(2));
}

/**
 * Buat instance pet baru berdasarkan base stat dari katalog
 */
function createPetInstance(petDoc, nickname = null) {
  const multiplier = RANK_MULTIPLIER[petDoc.rank] || 1.0;

  const statMultipliers = {
    hp: getRandomStatMultiplier(),
    atk: getRandomStatMultiplier(),
    def: getRandomStatMultiplier(),
    spd: getRandomStatMultiplier()
  };

  return {
    instanceId: crypto.randomUUID(),
    petId: petDoc._id,
    nickname: nickname,
    level: 1,
    exp: 0,
    hp: Math.floor(petDoc.baseHp * multiplier * statMultipliers.hp),
    maxHp: Math.floor(petDoc.baseHp * multiplier * statMultipliers.hp),
    atk: Math.floor(petDoc.baseAtk * multiplier * statMultipliers.atk),
    def: Math.floor(petDoc.baseDef * multiplier * statMultipliers.def),
    spd: Math.floor(petDoc.baseSpd * multiplier * statMultipliers.spd),
    hunger: 100,
    element: petDoc.element || 'Netral',
    wins: 0,
    losses: 0,
    lastFedAt: null,
    lastBattledAt: null,
    isLocked: false,
    affinity: 0,
    statMultipliers: statMultipliers
  };
}

/**
 * Hitung EXP yang dibutuhkan untuk naik ke level selanjutnya
 */
function getExpRequired(level) {
  return Math.floor(50 * Math.pow(level, 1.45));
}

/**
 * Handle logic penambahan EXP dan level up
 * Mengembalikan array string berisi info level up jika ada
 */
function addExp(petInstance, amount, petDoc) {
  if (petInstance.level >= petDoc.maxLevel) return [];

  petInstance.exp += amount;
  const messages = [];

  let required = getExpRequired(petInstance.level);
  while (petInstance.exp >= required && petInstance.level < petDoc.maxLevel) {
    petInstance.exp -= required;
    petInstance.level++;

    const growth = petDoc.growthRate || 1.0;
    const rankMul = RANK_MULTIPLIER[petDoc.rank] || 1.0;

    // Fallback if old pet doesn't have statMultipliers
    const pStatMul = petInstance.statMultipliers || { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0 };

    const hpUp = Math.floor((petDoc.baseHp * 0.1) * growth * rankMul * pStatMul.hp) || 1;
    const atkUp = Math.floor((petDoc.baseAtk * 0.1) * growth * rankMul * pStatMul.atk) || 1;
    const defUp = Math.floor((petDoc.baseDef * 0.1) * growth * rankMul * pStatMul.def) || 1;
    const spdUp = Math.floor((petDoc.baseSpd * 0.1) * growth * rankMul * pStatMul.spd) || 1;

    petInstance.maxHp += hpUp;
    petInstance.hp += hpUp;
    petInstance.atk += atkUp;
    petInstance.def += defUp;
    petInstance.spd += spdUp;

    messages.push(`Level Up! ${petInstance.level-1} -> ${petInstance.level} (HP +${hpUp}, ATK +${atkUp}, DEF +${defUp}, SPD +${spdUp})`);
    required = getExpRequired(petInstance.level);
  }

  if (petInstance.level >= petDoc.maxLevel) {
    petInstance.level = petDoc.maxLevel;
    petInstance.exp = 0;
  }

  return messages;
}

/**
 * Parse effect string item, contoh "pet_food:exp=35;hunger=40" atau "pet_heal:amount=80"
 */
function parsePetItemEffect(effectStr) {
  if (!effectStr) return null;
  const parts = effectStr.split(':');
  if (parts.length < 2) return null;

  const type = parts[0]; // 'pet_food' atau 'pet_heal'
  const params = parts[1].split(';').reduce((acc, curr) => {
    const [k, v] = curr.split('=');
    acc[k] = v;
    return acc;
  }, {});

  return { type, params };
}

/**
 * Cek Element Advantage
 * Api > Angin > Tanah > Petir > Air > Api
 * Cahaya <> Kegelapan
 * Return: 1.25 (advantage), 0.75 (disadvantage), 1.0 (netral)
 */
function getElementAdvantage(attackerEl, defenderEl) {
  if (attackerEl === defenderEl) return 1.0;

  const advantages = {
    'Api': 'Angin',
    'Angin': 'Tanah',
    'Tanah': 'Petir',
    'Petir': 'Air',
    'Air': 'Api',
    'Cahaya': 'Kegelapan',
    'Kegelapan': 'Cahaya'
  };

  if (advantages[attackerEl] === defenderEl) return 1.25;
  if (advantages[defenderEl] === attackerEl) return 0.75;
  return 1.0;
}

/**
 * Simulasi satu ronde battle (dengan buff kultivasi sistem)
 * p1CultivationRealm dan p2CultivationRealm berisi realmIndex (0-8)
 */
function simulateRound(pet1, pet2, p1Name, p2Name, p1CultivationRealm = 0, p2CultivationRealm = 0) {
  // Bonus stat dari realm: +2% per realm index
  const p1Bonus = 1 + (p1CultivationRealm * 0.02);
  const p2Bonus = 1 + (p2CultivationRealm * 0.02);

  // Apply realm speed bonus
  const p1Spd = pet1.spd * p1Bonus;
  const p2Spd = pet2.spd * p2Bonus;

  const isP1Turn = p1Spd >= p2Spd ? Math.random() < 0.6 : Math.random() < 0.4;

  let attacker = isP1Turn ? pet1 : pet2;
  let defender = isP1Turn ? pet2 : pet1;
  let attName = isP1Turn ? p1Name : p2Name;
  let defName = isP1Turn ? p2Name : p1Name;

  const advantage = getElementAdvantage(attacker.element, defender.element);

  // Affinity bonus (max 100 affinity = max 10% bonus atk/def)
  const atkAffinityBonus = 1 + (attacker.affinity * 0.001);
  const defAffinityBonus = 1 + (defender.affinity * 0.001);

  // Apply Cultivation Realm Bonus
  const attackerRealmBonus = isP1Turn ? p1Bonus : p2Bonus;
  const defenderRealmBonus = isP1Turn ? p2Bonus : p1Bonus;

  const finalAtk = attacker.atk * atkAffinityBonus * advantage * attackerRealmBonus;
  const finalDef = defender.def * defAffinityBonus * defenderRealmBonus;

  let rawDamage = (finalAtk * (0.85 + Math.random() * 0.3)) - (finalDef * 0.6);
  let damage = Math.max(1, Math.floor(rawDamage));

  defender.hp -= damage;
  if (defender.hp < 0) defender.hp = 0;

  let advText = advantage > 1.0 ? " (Super efektif!)" : advantage < 1.0 ? " (Tidak efektif)" : "";

  return {
    log: `**${attName}** menyerang **${defName}** memberikan **${damage}** damage!${advText}`,
    pet1Hp: pet1.hp,
    pet2Hp: pet2.hp
  };
}

module.exports = {
  RANK_MULTIPLIER,
  createPetInstance,
  getExpRequired,
  addExp,
  parsePetItemEffect,
  getElementAdvantage,
  simulateRound
};
