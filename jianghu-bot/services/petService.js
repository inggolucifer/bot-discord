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
 * Buat instance pet baru berdasarkan base stat dari katalog
 */
function createPetInstance(petDoc, nickname = null) {
  const multiplier = RANK_MULTIPLIER[petDoc.rank] || 1.0;
  return {
    instanceId: crypto.randomUUID(),
    petId: petDoc._id,
    nickname: nickname,
    level: 1,
    exp: 0,
    hp: Math.floor(petDoc.baseHp * multiplier),
    maxHp: Math.floor(petDoc.baseHp * multiplier),
    atk: Math.floor(petDoc.baseAtk * multiplier),
    def: Math.floor(petDoc.baseDef * multiplier),
    spd: Math.floor(petDoc.baseSpd * multiplier),
    hunger: 100,
    element: petDoc.element || 'Netral',
    wins: 0,
    losses: 0,
    lastFedAt: null,
    lastBattledAt: null,
    isLocked: false,
    affinity: 0
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
    const statMul = growth * rankMul;

    const hpUp = Math.floor((petDoc.baseHp * 0.1) * statMul) || 1;
    const atkUp = Math.floor((petDoc.baseAtk * 0.1) * statMul) || 1;
    const defUp = Math.floor((petDoc.baseDef * 0.1) * statMul) || 1;
    const spdUp = Math.floor((petDoc.baseSpd * 0.1) * statMul) || 1;

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
 * Return: 1.2 (advantage), 0.8 (disadvantage), 1.0 (netral)
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

  if (advantages[attackerEl] === defenderEl) return 1.2;
  if (advantages[defenderEl] === attackerEl) return 0.8;
  return 1.0;
}

/**
 * Simulasi satu ronde battle
 */
function simulateRound(pet1, pet2, p1Name, p2Name) {
  const isP1Turn = pet1.spd >= pet2.spd ? Math.random() < 0.6 : Math.random() < 0.4;

  let attacker = isP1Turn ? pet1 : pet2;
  let defender = isP1Turn ? pet2 : pet1;
  let attName = isP1Turn ? p1Name : p2Name;
  let defName = isP1Turn ? p2Name : p1Name;

  const advantage = getElementAdvantage(attacker.element, defender.element);

  // Affinity bonus (max 100 affinity = max 10% bonus atk/def)
  const atkAffinityBonus = 1 + (attacker.affinity * 0.001);
  const defAffinityBonus = 1 + (defender.affinity * 0.001);

  const finalAtk = attacker.atk * atkAffinityBonus * advantage;
  const finalDef = defender.def * defAffinityBonus;

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
