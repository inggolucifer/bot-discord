/**
 * testCombatDepthComprehensive.js
 * Verification suite for Combat Depth: Unified Status + Body Condition + 5 Pillars + Law Synergy.
 * Tests CD-01 through CD-10 according to specifications.
 */

const assert = require('assert');
const {
  COMBAT_STATUS,
  REFLECT_CAP,
  applyStatus,
  removeStatus,
  hasStatus,
  getDefenseDamageMultiplier,
  getStatusBadges,
  tickStatuses,
  onSkillHitLawExtras,
  onTurnStartLawExtras
} = require('../utils/combatStatus');

const {
  getBodyPartCombatMultipliers,
  getVitalityCombatPenalty,
  getStaminaActionPenalty,
  getInjuryStatPenalties,
  checkAndApplyHeavyHitInjury,
  applyPillarCombatModifiers
} = require('../utils/combatBody');

const { applyLawDamageModifiers, getLawCombatModifiers } = require('../utils/lawCultivationEngine');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('   UJI COMBAT DEPTH: STATUS + BODY + 5 PILAR + SINERGI LAW        ');
console.log('═══════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// CD-01: Apply poison 2x -> severity/stacks terukur, 1 tick per ronde
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-01: Apply poison 2x (stacking & single tick per round)...');
{
  const target = {
    name: 'Target Boneka',
    hp: 100,
    maxHp: 100,
    conditions: { poison: 0 }
  };

  applyStatus(target, 'poison', { stacks: 20 });
  assert.strictEqual(target.conditions.poison, 20, 'CD-01 FAIL: First poison apply should set 20 stacks');

  applyStatus(target, 'poison', { stacks: 20 });
  assert.strictEqual(target.conditions.poison, 40, 'CD-01 FAIL: Second poison apply should stack to 40');

  const tickResult = tickStatuses(target, { maxHp: 100 });
  console.log(`  Poison 40 stacks tick damage log: ${tickResult.logs[0]}`);
  assert(target.hp < 100, 'CD-01 FAIL: Poison tick should decrease HP');
  assert(tickResult.logs.length > 0, 'CD-01 FAIL: Poison tick should produce log');

  const expectedHp = 100 - Math.max(2, Math.floor(100 * (40 * 0.0015)));
  assert.strictEqual(target.hp, expectedHp, 'CD-01 FAIL: Poison damage amount mismatch');
  console.log('  ✅ CD-01 PASS: Poison stacking (40 stacks) dan 1 tick per ronde terverifikasi presisi.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-02: Stun -> skip 1 giliran & durasi berkurang
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-02: Stun skip turn & duration decay...');
{
  const entity = {
    name: 'Pendekar Lawan',
    hp: 100,
    maxHp: 100,
    debuffs: []
  };

  applyStatus(entity, 'stun', { duration: 1 });
  assert.strictEqual(hasStatus(entity, 'stun'), true, 'CD-02 FAIL: Entity should have stun status');
  assert.strictEqual(entity.debuffs[0].duration, 1, 'CD-02 FAIL: Stun duration should be 1');

  // Tick akhir ronde
  tickStatuses(entity, { maxHp: 100 });
  assert.strictEqual(hasStatus(entity, 'stun'), false, 'CD-02 FAIL: Stun should expire after 1 turn');
  console.log('  ✅ CD-02 PASS: Stun aktif dan luruh tepat setelah 1 giliran.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-03: Hit >= 15% maxHP -> injury +1
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-03: Hit >= 15% maxHP -> injury +1...');
{
  const target = {
    name: 'Target Uji',
    hp: 200,
    maxHp: 200,
    conditions: { injury: 0 }
  };

  // 1. Serangan ringan (20 DMG dari 200 HP = 10% < 15%)
  const lightTrigger = checkAndApplyHeavyHitInjury(target, 20);
  assert.strictEqual(lightTrigger, false, 'CD-03 FAIL: Hit < 15% should NOT trigger injury');
  assert.strictEqual(target.conditions.injury, 0, 'CD-03 FAIL: Injury should remain 0');

  // 2. Serangan berat (30 DMG dari 200 HP = 15% >= 15%)
  const heavyTrigger1 = checkAndApplyHeavyHitInjury(target, 30);
  assert.strictEqual(heavyTrigger1, true, 'CD-03 FAIL: Hit >= 15% should trigger injury');
  assert.strictEqual(target.conditions.injury, 1, 'CD-03 FAIL: Injury should be 1');

  // 3. Serangan berat lagi (40 DMG = 20% >= 15%)
  const heavyTrigger2 = checkAndApplyHeavyHitInjury(target, 40);
  assert.strictEqual(heavyTrigger2, true, 'CD-03 FAIL: Second heavy hit should trigger injury');
  assert.strictEqual(target.conditions.injury, 2, 'CD-03 FAIL: Injury should stack to 2');

  const penalties = getInjuryStatPenalties(target.conditions);
  console.log(`  Injury Level 2 -> ATK/DEF Mult: ${penalties.atkDefMult} (-6%), MP Mult: ${penalties.mpMult} (-4%)`);
  assert.strictEqual(penalties.atkDefMult, 0.94, 'CD-03 FAIL: Injury 2 should reduce ATK/DEF by 6%');
  assert.strictEqual(penalties.mpMult, 0.96, 'CD-03 FAIL: Injury 2 should reduce Max MP by 4%');
  console.log('  ✅ CD-03 PASS: Heavy hit threshold 15% memicu injury bertingkat dan penalti deterministik.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-04: Body law arms level 0 vs 10 -> ATK beda terukur
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-04: Body law arms level 0 vs 10 -> ATK beda terukur...');
{
  const playerBody0 = {
    cultivationLaw: {
      activeLawType: 'body_tempering',
      bodyTemperingParts: { leftArm: 0, rightArm: 0, torso: 0, skin: 0, spine: 0, dantian: 0 }
    }
  };

  const playerBody10 = {
    cultivationLaw: {
      activeLawType: 'body_tempering',
      bodyTemperingParts: { leftArm: 10, rightArm: 10, torso: 0, skin: 0, spine: 0, dantian: 0 }
    }
  };

  const mult0 = getBodyPartCombatMultipliers(playerBody0);
  const mult10 = getBodyPartCombatMultipliers(playerBody10);

  console.log(`  Level 0 Arms AtkMult: ${mult0.atkMult} (Floor aman >= 0.50)`);
  console.log(`  Level 10 Arms AtkMult: ${mult10.atkMult}`);

  assert(mult0.atkMult >= 0.50, 'CD-04 FAIL: Level 0 multiplier must have safe floor >= 0.50 (no soft-lock)');
  assert(mult10.atkMult > mult0.atkMult, 'CD-04 FAIL: Level 10 arms must have higher ATK multiplier than level 0');
  assert.strictEqual(mult0.atkMult, 0.55, 'CD-04 FAIL: Level 0 base multiplier should be 0.55');
  assert.strictEqual(mult10.atkMult, 0.85, 'CD-04 FAIL: Level 10 multiplier should be 0.85 (0.55 + 10 * 0.03)');

  const baseAtk = 100;
  const atk0 = Math.floor(baseAtk * mult0.atkMult);
  const atk10 = Math.floor(baseAtk * mult10.atkMult);
  assert(atk10 > atk0, 'CD-04 FAIL: Resulting ATK for level 10 must be strictly greater than level 0');
  console.log(`  Base ATK 100 -> Lv 0: ${atk0} ATK vs Lv 10: ${atk10} ATK (Beda ${atk10 - atk0} ATK)`);
  console.log('  ✅ CD-04 PASS: Body Tempering arms level 0 vs 10 menghasilkan scaling ATK nyata.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-05: Focus 20 vs 80 -> hit chance beda (cap ±8%)
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-05: Focus 20 vs 80 -> hit chance beda (cap ±8%)...');
{
  const base = { atk: 50, def: 30, maxHp: 200, critHitRate: 0.05 };
  const playerLowFocus = { focus: 20, extendedStats: { focus: 20 } };
  const playerHighFocus = { focus: 80, extendedStats: { focus: 80 } };

  const resLow = applyPillarCombatModifiers(base, playerLowFocus);
  const resHigh = applyPillarCombatModifiers(base, playerHighFocus);

  console.log(`  Focus 20 -> Hit Bonus: ${resLow.hitChanceBonus * 100}%`);
  console.log(`  Focus 80 -> Hit Bonus: ${resHigh.hitChanceBonus * 100}%`);

  assert(resLow.hitChanceBonus < 0, 'CD-05 FAIL: Focus 20 should produce negative hitChanceBonus');
  assert(resHigh.hitChanceBonus > 0, 'CD-05 FAIL: Focus 80 should produce positive hitChanceBonus');
  assert(Math.abs(resLow.hitChanceBonus) <= 0.08, 'CD-05 FAIL: Hit bonus must be capped at ±8%');
  assert(Math.abs(resHigh.hitChanceBonus) <= 0.08, 'CD-05 FAIL: Hit bonus must be capped at ±8%');
  console.log('  ✅ CD-05 PASS: Efek Pilar Focus terhadap akurasi hit terukur dan terlindungi batas cap.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-06: Venom law skill -> poison applied
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-06: Venom law skill -> poison applied on hit...');
{
  const attackerVenom = {
    name: 'Iblis Racun',
    activeLawType: 'demonic_myriad_venom'
  };

  const defender = {
    name: 'Pendekar Sasaran',
    maxHp: 200,
    conditions: { poison: 0 }
  };

  const extras = onSkillHitLawExtras({
    attacker: attackerVenom,
    defender,
    skill: { name: 'Tapak Bisa Gelap' },
    damage: 30,
    isCrit: false
  });

  console.log(`  Defender poison after hit: ${defender.conditions.poison}`);
  console.log(`  Extras notes: ${extras.notes.join(' | ')}`);

  assert(defender.conditions.poison > 0, 'CD-06 FAIL: Demonic Myriad Venom must apply poison on hit');
  assert.strictEqual(defender.conditions.poison, 25, 'CD-06 FAIL: Base poison applied should be 25');
  console.log('  ✅ CD-06 PASS: Demonic Myriad Venom otomatis menyuntikkan racun pada setiap serangan.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-07: Pure Yang + poison -> 30% resist & cleanse chance
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-07: Pure Yang 30% poison resistance & turn start cleanse...');
{
  const attackerVenom = {
    name: 'Iblis Racun',
    activeLawType: 'demonic_myriad_venom'
  };

  const defenderNormal = {
    name: 'Orang Biasa',
    maxHp: 200,
    activeLawType: 'none',
    conditions: { poison: 0 }
  };

  const defenderYang = {
    name: 'Pendekar Yang Murni',
    maxHp: 200,
    activeLawType: 'righteous_pure_yang',
    conditions: { poison: 0 }
  };

  // 1. Uji Resistensi Racun yang Masuk (30% resist -> stacks * 0.70)
  onSkillHitLawExtras({ attacker: attackerVenom, defender: defenderNormal, skill: {}, damage: 20 });
  onSkillHitLawExtras({ attacker: attackerVenom, defender: defenderYang, skill: {}, damage: 20 });

  console.log(`  Normal defender poison: ${defenderNormal.conditions.poison} stacks`);
  console.log(`  Pure Yang defender poison: ${defenderYang.conditions.poison} stacks (-30% resist)`);

  assert.strictEqual(defenderNormal.conditions.poison, 25, 'CD-07 FAIL: Normal defender should take 25 poison');
  assert.strictEqual(defenderYang.conditions.poison, Math.floor(25 * 0.70), 'CD-07 FAIL: Pure Yang should resist 30% poison (17 stacks)');

  // 2. Uji Turn Start Cleanse
  defenderYang.conditions.poison = 60; // Set tinggi agar memicu cleanse
  const cleanseRes = onTurnStartLawExtras({ entity: defenderYang });
  console.log(`  After Pure Yang Cleanse -> Poison: ${defenderYang.conditions.poison}/60 | Note: ${cleanseRes.notes[0]}`);

  assert(defenderYang.conditions.poison < 60, 'CD-07 FAIL: Pure Yang should cleanse poison on turn start');
  assert.strictEqual(defenderYang.conditions.poison, 35, 'CD-07 FAIL: Pure Yang should cleanse 25 poison stacks');
  console.log('  ✅ CD-07 PASS: Pure Yang berhasil menahan 30% racun dan membersihkan meridian di awal giliran.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-08: Karma reflect -> damage balik capped 25%
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-08: Karma reflect -> damage balik capped at 25%...');
{
  const attacker = { name: 'Penyerang', currentHp: 200 };
  const defenderNormalReflect = { name: 'Defender Karma 20%', combatStats: { reflectPct: 0.20 } };
  const defenderOvertunedReflect = { name: 'Defender Karma 90%', combatStats: { reflectPct: 0.90 } };

  const res20 = applyLawDamageModifiers(attacker, defenderNormalReflect, 100);
  const res90 = applyLawDamageModifiers(attacker, defenderOvertunedReflect, 100);

  console.log(`  Reflect 20% -> Reflected: ${res20.reflectedDamage} DMG`);
  console.log(`  Reflect 90% (Liar) -> Reflected: ${res90.reflectedDamage} DMG (Cap 25%)`);

  assert.strictEqual(res20.reflectedDamage, 20, 'CD-08 FAIL: 20% reflect of 100 should be 20');
  assert.strictEqual(res90.reflectedDamage, 25, 'CD-08 FAIL: 90% reflect must be hard-capped at 25');
  console.log('  ✅ CD-08 PASS: Reflect Karma bekerja deterministik dan terlindungi hard-cap 25%.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-09: Merit vs wanted -> damage naik
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-09: Merit vs wanted -> damage naik...');
{
  const attackerMerit = {
    name: 'Murid Langit',
    cultivationLaw: {
      activeLawType: 'righteous_heavenly_merit',
      rank: 3
    }
  };

  const ordinaryTarget = { name: 'Petani Biasa', isWantedByOrthodox: false, tags: [] };
  const wantedTarget = { name: 'Buronan Sekte', isWantedByOrthodox: true, tags: ['wanted'] };

  const resOrd = applyLawDamageModifiers(attackerMerit, ordinaryTarget, 100);
  const resWanted = applyLawDamageModifiers(attackerMerit, wantedTarget, 100);

  console.log(`  Vs Ordinary -> Final: ${resOrd.finalDamage}, Mult: ${resOrd.mod.damageMultiplier}`);
  console.log(`  Vs Wanted   -> Final: ${resWanted.finalDamage}, Mult: ${resWanted.mod.damageMultiplier}`);

  assert.strictEqual(resOrd.finalDamage, 100, 'CD-09 FAIL: Merit vs ordinary should not have bonus');
  assert(resWanted.finalDamage > 100, 'CD-09 FAIL: Merit vs wanted must boost damage');
  assert.strictEqual(resWanted.finalDamage, 112, 'CD-09 FAIL: Merit rank 3 should give +12% vs wanted (112 DMG)');
  console.log('  ✅ CD-09 PASS: Bonus Merit vs Wanted (+12% di rank 3) berjalan akurat.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-10: statusBadges di response -> non-empty saat debuffed
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-10: statusBadges di response -> non-empty saat debuffed...');
{
  const entity = {
    name: 'Pendekar Kena Efek',
    conditions: {
      poison: 40,
      injury: 2,
      burn: 25
    },
    debuffs: [
      { type: 'stun', duration: 1, name: 'Lumpuh' }
    ],
    buffs: [
      { type: 'defense_up', duration: 1, name: 'Bertahan' }
    ]
  };

  const badges = getStatusBadges(entity);
  console.log(`  Badges count: ${badges.length}`);
  badges.forEach(b => console.log(`   - [${b.badge}] ${b.label} (${b.id}): ${b.desc}`));

  assert(Array.isArray(badges), 'CD-10 FAIL: statusBadges must be an array');
  assert(badges.length >= 5, 'CD-10 FAIL: Should have at least 5 badges (poison, injury, burn, stun, defense_up)');

  const badgeIds = badges.map(b => b.id);
  assert(badgeIds.includes('poison'), 'CD-10 FAIL: Should include poison badge');
  assert(badgeIds.includes('injury'), 'CD-10 FAIL: Should include injury badge');
  assert(badgeIds.includes('burn'), 'CD-10 FAIL: Should include burn badge');
  assert(badgeIds.includes('stun'), 'CD-10 FAIL: Should include stun badge');
  assert(badgeIds.includes('defense_up'), 'CD-10 FAIL: Should include defense_up badge');

  console.log('  ✅ CD-10 PASS: statusBadges memuat informasi lengkap untuk rendering UI.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-11: Single DoT Tick per Round (Single Path, Anti-Double-Tick)
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-11: Single DoT Tick per round (Anti-Double-Tick verification)...');
{
  const victim = {
    name: 'Korban Racun',
    hp: 100,
    maxHp: 100,
    conditions: { poison: 0 }
  };

  // Terapkan 40 stack racun lewat applyStatus
  applyStatus(victim, 'poison', { stacks: 40 });
  assert.strictEqual(victim.conditions.poison, 40, 'CD-11 FAIL: Poison should be 40 stacks');

  // onSkillHitLawExtras TIDAK BOLEH mengurangi HP atau melakukan DoT tick langsung,
  // tetapi Demonic Myriad Venom menambahkan +25 stack racun (40 + 25 = 65 stack)
  const dummyAttacker = { name: 'Penyerang', activeLawType: 'demonic_myriad_venom' };
  const hitExtras = onSkillHitLawExtras({
    attacker: dummyAttacker,
    defender: victim,
    skill: { name: 'Pukulan Beracun' },
    damage: 10,
    isCrit: false
  });
  assert(victim.hp === 100, 'CD-11 FAIL: onSkillHitLawExtras must NOT tick DoT or mutate HP directly');
  assert.strictEqual(victim.conditions.poison, 65, 'CD-11 FAIL: Demonic Myriad Venom should add +25 stacks to 65');

  // Jalankan SATU KALI tickStatuses akhir ronde
  // 65 stacks * 0.0015 * 100 maxHp = 9 DMG
  const tickResult = tickStatuses(victim, { maxHp: 100 });
  assert.strictEqual(tickResult.logs.length, 1, 'CD-11 FAIL: Exactly 1 poison tick log should be generated per round');
  assert.strictEqual(victim.hp, 91, 'CD-11 FAIL: Exactly 9 DMG should be dealt (floor(100 * 65 * 0.0015) = 9)');

  console.log(`  HP awal: 100 -> Racun 65 stacks -> HP setelah 1 ronde: ${victim.hp} (-9 HP, tepat 1 tick DoT)`);
  console.log('  ✅ CD-11 PASS: Single-path status apply dan eliminasi double-tick terverifikasi 100% presisi.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-12: Stamina Mid-Battle Soft Penalties (Penalti Lunak Tanpa Soft-Lock)
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-12: Stamina mid-battle soft penalties...');
{
  // 1. Stamina Penuh (100/100) -> 1.0x damage, 1.0x hit
  const pOptimal = getStaminaActionPenalty({ stamina: 100, maxStamina: 100 });
  assert.strictEqual(Number(pOptimal), 1.0, 'CD-12 FAIL: Optimal stamina should have 1.0 mult');
  assert.strictEqual(pOptimal.damageMult, 1.0, 'CD-12 FAIL: damageMult should be 1.0');
  assert.strictEqual(pOptimal.hitChanceMult, 1.0, 'CD-12 FAIL: hitChanceMult should be 1.0');
  assert.strictEqual(pOptimal.isTired, false, 'CD-12 FAIL: isTired should be false');
  assert.strictEqual(pOptimal.isExhausted, false, 'CD-12 FAIL: isExhausted should be false');

  // 2. Stamina Rendah (< 20%) -> 0.90x damage, 0.95x hit
  const pLow = getStaminaActionPenalty({ stamina: 15, maxStamina: 100 });
  assert.strictEqual(Number(pLow), 0.90, 'CD-12 FAIL: Low stamina should have 0.90 mult');
  assert.strictEqual(pLow.damageMult, 0.90, 'CD-12 FAIL: Low stamina damageMult should be 0.90');
  assert.strictEqual(pLow.hitChanceMult, 0.95, 'CD-12 FAIL: Low stamina hitChanceMult should be 0.95');
  assert.strictEqual(pLow.isTired, true, 'CD-12 FAIL: isTired should be true');
  assert.strictEqual(pLow.isExhausted, false, 'CD-12 FAIL: isExhausted should be false');

  // 3. Stamina Habis (0) -> 0.85x damage, 0.90x hit (Tidak memblokir basic attack)
  const pZero = getStaminaActionPenalty({ stamina: 0, maxStamina: 100 });
  assert.strictEqual(Number(pZero), 0.85, 'CD-12 FAIL: Zero stamina should have 0.85 mult');
  assert.strictEqual(pZero.damageMult, 0.85, 'CD-12 FAIL: Zero stamina damageMult should be 0.85');
  assert.strictEqual(pZero.hitChanceMult, 0.90, 'CD-12 FAIL: Zero stamina hitChanceMult should be 0.90');
  assert.strictEqual(pZero.isExhausted, true, 'CD-12 FAIL: isExhausted should be true');

  console.log(`  Stamina 100 -> DMG Mult: ${pOptimal.damageMult}x, Hit: ${pOptimal.hitChanceMult}x`);
  console.log(`  Stamina 15  -> DMG Mult: ${pLow.damageMult}x, Hit: ${pLow.hitChanceMult}x (Tired)`);
  console.log(`  Stamina 0   -> DMG Mult: ${pZero.damageMult}x, Hit: ${pZero.hitChanceMult}x (Exhausted, Basic Attack Tetap Berjalan)`);
  console.log('  ✅ CD-12 PASS: Penalti stamina lunak mid-battle bekerja proporsional tanpa soft-lock.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CD-13: statusBadges Always Array & Standardized Contract
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test CD-13: statusBadges always array & standardized contract...');
{
  // 1. Kasus null / undefined / empty entity -> selalu mengembalikan array []
  const nullBadges = getStatusBadges(null);
  const undefBadges = getStatusBadges(undefined);
  const emptyBadges = getStatusBadges({});
  assert(Array.isArray(nullBadges) && nullBadges.length === 0, 'CD-13 FAIL: Null entity must return []');
  assert(Array.isArray(undefBadges) && undefBadges.length === 0, 'CD-13 FAIL: Undefined entity must return []');
  assert(Array.isArray(emptyBadges) && emptyBadges.length === 0, 'CD-13 FAIL: Clean entity must return []');

  // 2. Bentuk baku (contract schema) pada entitas berstatus
  const debuffedEntity = {
    conditions: { poison: 40, injury: 3 },
    debuffs: [{ type: 'stun', duration: 1, name: 'Lumpuh (Stun)' }],
    buffs: [{ type: 'defense_up', duration: 2, name: 'Pertahanan Baja' }]
  };
  const badges = getStatusBadges(debuffedEntity);
  assert(Array.isArray(badges) && badges.length === 4, 'CD-13 FAIL: Should return 4 badges');

  // Verifikasi setiap badge memuat seluruh field wajib
  const requiredKeys = ['id', 'badge', 'label', 'severity', 'stacks', 'duration', 'description', 'desc', 'kind'];
  badges.forEach(b => {
    requiredKeys.forEach(k => {
      assert(k in b, `CD-13 FAIL: Badge ${b.id} missing required contract key '${k}'`);
    });
  });

  const poisonBadge = badges.find(b => b.id === 'poison');
  assert.strictEqual(poisonBadge.badge, '☠️');
  assert.strictEqual(poisonBadge.label, 'Racun');
  assert.strictEqual(poisonBadge.severity, 2);
  assert.strictEqual(poisonBadge.stacks, 40);
  assert.strictEqual(poisonBadge.duration, null);
  assert.strictEqual(typeof poisonBadge.description, 'string');
  assert.strictEqual(poisonBadge.kind, 'debuff');

  const stunBadge = badges.find(b => b.id === 'stun');
  assert.strictEqual(stunBadge.badge, '⚡');
  assert.strictEqual(stunBadge.duration, 1);
  assert.strictEqual(stunBadge.stacks, null);

  console.log('  Verifikasi kontrak badge Poison:');
  console.log(`   - ID: ${poisonBadge.id}, Badge: ${poisonBadge.badge}, Label: ${poisonBadge.label}`);
  console.log(`   - Severity: ${poisonBadge.severity}, Stacks: ${poisonBadge.stacks}, Duration: ${poisonBadge.duration}`);
  console.log(`   - Description: "${poisonBadge.description}"`);
  console.log('  ✅ CD-13 PASS: statusBadges selalu array dan mematuhi kontrak bentuk baku 100% konsisten.\n');
}

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🎉 SELURUH PENGUJIAN CD-01 S/D CD-13 LULUS 100% TANPA KESALAHAN!  ');
console.log('═══════════════════════════════════════════════════════════════════\n');
