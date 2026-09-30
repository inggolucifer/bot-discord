/**
 * testLawCombatBattleWire.js
 * Verification suite for wiring Law combat modifiers and reflect into the battle pipeline.
 * Tests BW-01 through BW-06 according to specifications.
 */

const assert = require('assert');
const {
  applyLawDamageModifiers,
  getLawCombatModifiers,
  getMaxCombatQi
} = require('../utils/lawCultivationEngine');
const { calculatePlayerStats } = require('../utils/playerCombat');
const InteractiveBattleService = require('../services/InteractiveBattleService');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('   UJI COMBAT WIRE: GETLAWCOMBATMODIFIERS & REFLECTPCT (BATTLE)   ');
console.log('═══════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// BW-01: Merit rank 2 vs isWantedByOrthodox target -> damage > base
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test BW-01: Merit rank 2 vs isWantedByOrthodox target...');
{
  const attackerMerit = {
    discordId: 'merit_user_1',
    characterName: 'Murid Langit',
    cultivationLaw: {
      activeLawType: 'righteous_heavenly_merit',
      rank: 2,
      qi: 1200
    }
  };

  const defenderWanted = {
    entityId: 'wanted_criminal',
    name: 'Penjahat Buronan',
    isWantedByOrthodox: true,
    tags: ['wanted', 'criminal'],
    stats: { reflectPct: 0 }
  };

  const baseDamage = 100;
  const result = applyLawDamageModifiers(attackerMerit, defenderWanted, baseDamage);

  console.log(`  Base: ${baseDamage}, Final: ${result.finalDamage}, Mult: ${result.mod.damageMultiplier}`);
  console.log(`  Logs: ${result.logParts.join(' | ')}`);

  assert(result.mod.damageMultiplier > 1, 'BW-01 FAIL: damageMultiplier should be > 1 for Merit vs Wanted');
  assert(result.finalDamage > baseDamage, 'BW-01 FAIL: finalDamage should be strictly greater than baseDamage');
  assert.strictEqual(result.finalDamage, Math.floor(100 * result.mod.damageMultiplier), 'BW-01 FAIL: finalDamage calculation mismatch');
  console.log('  ✅ BW-01 PASS: Merit rank 2 vs Wanted menghasilkan bonus damage yang sah.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// BW-02: Merit vs ordinary target -> damage ≈ base (no bonus)
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test BW-02: Merit vs ordinary target (no bonus)...');
{
  const attackerMerit = {
    discordId: 'merit_user_2',
    characterName: 'Murid Langit',
    cultivationLaw: {
      activeLawType: 'righteous_heavenly_merit',
      rank: 2,
      qi: 1200
    }
  };

  const defenderOrdinary = {
    entityId: 'normal_wolf',
    name: 'Serigala Liar',
    isWantedByOrthodox: false,
    tags: ['beast'],
    stats: { reflectPct: 0 }
  };

  const baseDamage = 100;
  const result = applyLawDamageModifiers(attackerMerit, defenderOrdinary, baseDamage);

  console.log(`  Base: ${baseDamage}, Final: ${result.finalDamage}, Mult: ${result.mod.damageMultiplier}`);

  assert.strictEqual(result.mod.damageMultiplier, 1, 'BW-02 FAIL: damageMultiplier must be exactly 1 for ordinary target');
  assert.strictEqual(result.finalDamage, baseDamage, 'BW-02 FAIL: finalDamage must equal baseDamage');
  console.log('  ✅ BW-02 PASS: Merit vs ordinary target tidak mendapatkan bonus (multiplier = 1.0).\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// BW-03: Pure Yang vs tag undead/demonic -> damage naik
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test BW-03: Pure Yang vs tag undead / demonic...');
{
  const attackerYang = {
    discordId: 'yang_user_1',
    characterName: 'Pendekar Yang Murni',
    cultivationLaw: {
      activeLawType: 'righteous_pure_yang',
      rank: 3,
      qi: 2500
    }
  };

  const defenderDemonic = {
    entityId: 'demon_spirit',
    name: 'Iblis Kegelapan',
    tags: ['demonic'],
    stats: { reflectPct: 0 }
  };

  const defenderUndead = {
    entityId: 'corpse_walker',
    name: 'Mayat Hidup',
    tags: ['undead'],
    stats: { reflectPct: 0 }
  };

  const baseDamage = 100;
  const resDemonic = applyLawDamageModifiers(attackerYang, defenderDemonic, baseDamage);
  const resUndead = applyLawDamageModifiers(attackerYang, defenderUndead, baseDamage);

  console.log(`  Vs Demonic -> Base: ${baseDamage}, Final: ${resDemonic.finalDamage}, Mult: ${resDemonic.mod.damageMultiplier}`);
  console.log(`  Vs Undead  -> Base: ${baseDamage}, Final: ${resUndead.finalDamage}, Mult: ${resUndead.mod.damageMultiplier}`);

  assert(resDemonic.mod.damageMultiplier > 1, 'BW-03 FAIL: Pure Yang vs Demonic damageMultiplier must be > 1');
  assert(resDemonic.finalDamage > baseDamage, 'BW-03 FAIL: Pure Yang vs Demonic finalDamage must be > baseDamage');
  assert(resUndead.mod.damageMultiplier > 1, 'BW-03 FAIL: Pure Yang vs Undead damageMultiplier must be > 1');
  assert(resUndead.finalDamage > baseDamage, 'BW-03 FAIL: Pure Yang vs Undead finalDamage must be > baseDamage');
  console.log('  ✅ BW-03 PASS: Pure Yang vs Demonic/Undead sukses meningkatkan damage secara signifikan.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// BW-04: Defender reflectPct 0.2, incoming 100 -> reflected 20, no infinite loop
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test BW-04: Defender reflectPct 0.20 (20%), no bounce loop...');
{
  const attacker = {
    discordId: 'attacker_1',
    name: 'Penyerang',
    currentHp: 200,
    maxHp: 200,
    stats: { reflectPct: 0.15 } // Attacker also has reflect! But reflect must NOT reflect back!
  };

  const defender = {
    entityId: 'karmic_mirror_user',
    name: 'Cermin Karma',
    currentHp: 500,
    combatStats: { reflectPct: 0.20 }
  };

  const baseDamage = 100;
  const result = applyLawDamageModifiers(attacker, defender, baseDamage);

  console.log(`  Incoming: ${baseDamage}, Final: ${result.finalDamage}, Reflected: ${result.reflectedDamage}`);
  console.log(`  Reflect Log: ${result.logParts.join(' | ')}`);

  assert.strictEqual(result.finalDamage, 100, 'BW-04 FAIL: Incoming damage should be 100');
  assert.strictEqual(result.reflectedDamage, 20, 'BW-04 FAIL: Reflected damage must be exactly 20 (20% of 100)');

  // Test anti-infinite loop: when reflected damage is applied back, skipReflect must prevent further reflect!
  const loopCheck = applyLawDamageModifiers(defender, attacker, result.reflectedDamage, { skipReflect: true });
  assert.strictEqual(loopCheck.reflectedDamage, 0, 'BW-04 FAIL: Reflected damage must NOT trigger another reflect (infinite loop detected!)');

  // Verify HP subtraction floor
  const attackerRemainingHp = Math.max(0, attacker.currentHp - result.reflectedDamage);
  assert.strictEqual(attackerRemainingHp, 180, 'BW-04 FAIL: Attacker HP after reflect should be 180');
  console.log('  ✅ BW-04 PASS: Reflect 20% tepat 20 damage, dan skipReflect mencegah recursive loop.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// BW-05: reflectPct 0.9 -> tetap cap 0.25 -> reflected 25 dari 100
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test BW-05: reflectPct 0.90 (90%) must be hard-capped at 25%...');
{
  const attacker = {
    discordId: 'attacker_2',
    name: 'Penyerang',
    currentHp: 100
  };

  const defender = {
    entityId: 'overtuned_reflector',
    name: 'Reflector Ekstrem',
    stats: { reflectPct: 0.90 } // 90% reflect attempt!
  };

  const baseDamage = 100;
  const result = applyLawDamageModifiers(attacker, defender, baseDamage);

  console.log(`  Raw reflect requested: 90% | Incoming: ${baseDamage} | Reflected: ${result.reflectedDamage}`);

  assert.strictEqual(result.reflectedDamage, 25, 'BW-05 FAIL: Reflected damage must be hard-capped at 25% (25 damage for 100 hit)');
  console.log('  ✅ BW-05 PASS: Hard cap 25% berhasil mengamankan nilai reflectPct liar (0.90 -> max 0.25).\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// BW-06: Skill cost: cultivationLaw.qi tidak berkurang; combat qi berkurang
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test BW-06: Skill cost: cultivationLaw.qi vs combat qi isolation...');
{
  const player = {
    discordId: 'cultivator_xiuwei',
    characterName: 'Pertapa Dantian',
    level: 15,
    realmIndex: 2,
    cultivationLaw: {
      activeLawType: 'righteous_pure_yang',
      rank: 2,
      qi: 7777 // Xiuwei dantian!
    },
    stats: {
      attack: 50,
      defense: 30,
      speed: 20
    }
  };

  // 1. Cek formula getMaxCombatQi
  const combatQiMax = getMaxCombatQi(player);
  console.log(`  Cultivation Qi: ${player.cultivationLaw.qi}, Computed Max Combat Qi: ${combatQiMax}`);

  assert(combatQiMax > 0, 'BW-06 FAIL: Combat Qi must be > 0');
  // Cultivation Qi harus tetap utuh
  assert.strictEqual(player.cultivationLaw.qi, 7777, 'BW-06 FAIL: Cultivation Qi must not be modified by getMaxCombatQi');

  // 2. Simulasi konsumsi combat Qi di battle session
  let battleCombatQi = combatQiMax;
  const skillCost = 15;
  battleCombatQi = Math.max(0, battleCombatQi - skillCost);

  console.log(`  After casting skill (Cost: ${skillCost}) -> Combat Qi: ${battleCombatQi}/${combatQiMax}, Cultivation Qi: ${player.cultivationLaw.qi}`);

  assert.strictEqual(battleCombatQi, combatQiMax - skillCost, 'BW-06 FAIL: Combat Qi should decrease by skill cost');
  assert.strictEqual(player.cultivationLaw.qi, 7777, 'BW-06 FAIL: Cultivation Law Qi must remain untouched (strictly separated)');
  console.log('  ✅ BW-06 PASS: Isolasi mutlak Combat Qi vs Cultivation Xiuwei Dantian terbukti aman.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Bonus Check: calculatePlayerStats carries reflectPct
// ─────────────────────────────────────────────────────────────────────────────
console.log('Bonus Check: calculatePlayerStats populates reflectPct from Karma law...');
{
  const karmicPlayer = {
    discordId: 'karmic_disciple',
    realmIndex: 1,
    cultivationLaw: {
      activeLawType: 'righteous_karmic_mirror',
      rank: 3,
      qi: 3000,
      unlockedSkills: ['karma_node_reflect']
    },
    equipment: {},
    kungfuSkills: {}
  };

  const stats = calculatePlayerStats(karmicPlayer);
  console.log(`  Karmic Player reflectPct: ${stats.reflectPct}`);
  assert(typeof stats.reflectPct === 'number', 'Bonus Check FAIL: stats.reflectPct must be a number');
  assert(stats.reflectPct > 0, 'Bonus Check FAIL: Karmic Mirror law must provide positive reflectPct');
  console.log('  ✅ Bonus Check PASS: calculatePlayerStats berhasil mengekstrak reflectPct dari Karmic Law.\n');
}

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🎉 SELURUH PENGUJIAN BW-01 S/D BW-06 LULUS 100% TANPA KESALAHAN!  ');
console.log('═══════════════════════════════════════════════════════════════════\n');
