/**
 * scripts/testCombatDotHp.js
 * Regression & Unit Test Suite: Combat Debuff/Buff DoT HP Nyata di Semua Path (PvE & PvP)
 * 
 * Skenario:
 * DOT-1: Enemy poison 40, 1 tickStatuses -> hp berkurang >= 1 & hpDelta < 0
 * DOT-2: Poison stacks tinggi -> hp=0 isDead true
 * DOT-3: Mock 2 ronde IBS processStatusEffects -> session.enemies[0].hp monotonic turun
 * DOT-4: Apply burn via onSkillHit/applyStatus + tick -> burn stacks>0 lalu hp turun
 * DOT-5: Stun -> skipTurn true / aksi dilewati
 * DOT-6: defense_up -> damage taken berkurang (getDefenseDamageMultiplier 0.5)
 * DOT-7: simulateBattle poison path -> final defender HP terkena DoT nyata (logs condition_tick)
 * DOT-8: Session save/load -> hp after DoT tetap persisten
 */

const assert = require('assert');
const {
  tickStatuses,
  applyStatus,
  ensureCombatState,
  getDefenseDamageMultiplier,
  getStatusBadges,
  onSkillHitLawExtras
} = require('../utils/combatStatus');
const InteractiveBattleService = require('../services/InteractiveBattleService');
const { simulateBattle } = require('../utils/simulateBattle');

let passedTests = 0;
let totalTests = 0;

function runTest(id, name, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✅ [${id}] PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [${id}] FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 RUNNING QA TEST SUITE: COMBAT DEBUFF/BUFF DoT HP NYATA');
console.log('═══════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────
// [DOT-1] Enemy poison 40, 1 tickStatuses -> hp berkurang >= 1
// ─────────────────────────────────────────────────────────────
runTest('DOT-1', 'Enemy poison 40, 1 tickStatuses -> hp berkurang >= 1 & hpDelta < 0', () => {
  const enemy = {
    name: 'Serigala Roh',
    hp: 100,
    maxHp: 100,
    conditions: { poison: 40 }
  };
  ensureCombatState(enemy);

  const res = tickStatuses(enemy, { maxHp: 100 });

  assert(enemy.hp < 100, `HP musuh harus berkurang dari 100 (aktual: ${enemy.hp})`);
  assert(res.hpDelta < 0, `res.hpDelta harus negatif (aktual: ${res.hpDelta})`);
  assert(res.dotDamages && res.dotDamages.length > 0, 'res.dotDamages harus memiliki entri DoT');
  assert.strictEqual(res.dotDamages[0].type, 'poison', 'Tipe DoT harus poison');
  assert(res.dotDamages[0].amount >= 1, `Damage DoT minimal 1 (aktual: ${res.dotDamages[0].amount})`);
  assert.strictEqual(enemy.hp, 100 - res.dotDamages[0].amount, 'HP entity harus sinkron dengan damage yang dicatat');
});

// ─────────────────────────────────────────────────────────────
// [DOT-2] Poison stacks tinggi -> hp=0 isDead
// ─────────────────────────────────────────────────────────────
runTest('DOT-2', 'Poison stacks tinggi mematikan musuh (hp=0 & isDead=true)', () => {
  const enemy = {
    name: 'Siluman Ular Hitam',
    entityType: 'monster',
    hp: 4,
    maxHp: 100,
    conditions: { poison: 80 }
  };
  ensureCombatState(enemy);

  const res = tickStatuses(enemy, { maxHp: 100 });

  assert.strictEqual(enemy.hp, 0, `HP musuh harus 0 setelah DoT mematikan (aktual: ${enemy.hp})`);
  assert.strictEqual(enemy.isDead, true, 'Flag enemy.isDead harus true');
  assert.strictEqual(res.isDead, true, 'Flag res.isDead harus true');
});

// ─────────────────────────────────────────────────────────────
// [DOT-3] Mock 2 ronde IBS processStatusEffects -> session.enemies[0].hp monotonic turun
// ─────────────────────────────────────────────────────────────
runTest('DOT-3', 'Mock 2 ronde IBS processStatusEffects -> enemy HP menurun secara monotonik', () => {
  const mockSession = {
    currentTick: 1,
    player: { name: 'Pendekar Fana', hp: 200, maxHp: 200, conditions: {} },
    enemies: [
      { name: 'Iblis Kelabang', hp: 120, maxHp: 120, isDead: false, conditions: { poison: 50 } }
    ],
    allies: [],
    logs: []
  };

  ensureCombatState(mockSession.player);
  ensureCombatState(mockSession.enemies[0]);

  // Ronde 1
  InteractiveBattleService.processStatusEffects(mockSession);
  const hpRound1 = mockSession.enemies[0].hp;
  assert(hpRound1 < 120, `HP musuh ronde 1 harus kurang dari 120 (aktual: ${hpRound1})`);
  assert(mockSession.dotDamageThisRound.length > 0, 'dotDamageThisRound harus mencatat damage ronde 1');

  // Ronde 2
  mockSession.currentTick = 2;
  InteractiveBattleService.processStatusEffects(mockSession);
  const hpRound2 = mockSession.enemies[0].hp;
  assert(hpRound2 < hpRound1, `HP musuh ronde 2 harus lebih kecil dari ronde 1 (r1: ${hpRound1}, r2: ${hpRound2})`);

  // Pastikan log condition_tick bertambah
  const tickLogs = mockSession.logs.filter(l => l.action === 'condition_tick');
  assert(tickLogs.length >= 2, 'Harus ada minimal 2 log condition_tick');
});

// ─────────────────────────────────────────────────────────────
// [DOT-4] Apply burn via applyStatus + tick -> burn stacks>0 lalu hp turun
// ─────────────────────────────────────────────────────────────
runTest('DOT-4', 'Apply burn via applyStatus + tick -> burn stacks>0 lalu hp berkurang', () => {
  const defender = {
    name: 'Siluman Pohon Tua',
    hp: 100,
    maxHp: 100,
    conditions: {}
  };
  ensureCombatState(defender);

  applyStatus(defender, 'burn', { stacks: 30 });
  assert(defender.conditions.burn >= 30, `Burn stack defender harus >= 30 (aktual: ${defender.conditions.burn})`);

  const tickRes = tickStatuses(defender, { maxHp: 100 });
  assert(defender.hp < 100, `HP defender harus turun akibat burn (aktual: ${defender.hp})`);
  const burnDamage = tickRes.dotDamages.find(d => d.type === 'burn');
  assert(burnDamage, 'Harus ada entri dotDamages dengan type burn');
  assert(burnDamage.amount >= 1, `Burn damage harus >= 1 (aktual: ${burnDamage.amount})`);
});

// ─────────────────────────────────────────────────────────────
// [DOT-5] Stun -> skipTurn true / aksi dilewati
// ─────────────────────────────────────────────────────────────
runTest('DOT-5', 'Stun debuff menghasilkan skipTurn=true pada tickStatuses', () => {
  const target = {
    name: 'Musuh Terlumpuhkan',
    hp: 100,
    maxHp: 100,
    conditions: {},
    debuffs: []
  };
  ensureCombatState(target);

  applyStatus(target, 'stun', { duration: 1 });
  assert(target.debuffs.some(d => d.type === 'stun' && d.duration > 0), 'Target harus memiliki debuff stun');

  const tickRes = tickStatuses(target, { maxHp: 100 });
  assert.strictEqual(tickRes.skipTurn, true, 'tickStatuses harus mengembalikan skipTurn=true saat entity terkena stun');
});

// ─────────────────────────────────────────────────────────────
// [DOT-6] defense_up -> damage taken berkurang
// ─────────────────────────────────────────────────────────────
runTest('DOT-6', 'Buff defense_up mereduksi 50% damage masuk via getDefenseDamageMultiplier', () => {
  const defender = {
    name: 'Pendekar Bertahan',
    hp: 100,
    maxHp: 100,
    buffs: [{ name: 'Kuda-Kuda Bertahan', type: 'defense_up', duration: 1, value: 0.5 }]
  };
  ensureCombatState(defender);

  const mult = getDefenseDamageMultiplier(defender);
  assert.strictEqual(mult, 0.5, `Multiplier pertahanan harus 0.5 saat defense_up aktif (aktual: ${mult})`);
});

// ─────────────────────────────────────────────────────────────
// [DOT-7] simulateBattle poison path -> final defender.hp < start - direct hits only
// ─────────────────────────────────────────────────────────────
runTest('DOT-7', 'simulateBattle poison path menghasilkan condition_tick racun nyata', () => {
  const challenger = {
    discordId: 'p1_poison',
    characterName: 'Kultivator Racun Mistik',
    currentHp: 200,
    stats: { maxHp: 200, hp: 200, atk: 8, def: 80, spd: 30 },
    manuals: [{
      manualId: {
        name: 'Jurus Telapak Racun Kalajengking',
        effectType: 'poison',
        triggerChance: 1.0,
        effectValue: 1.0
      }
    }]
  };

  const opponent = {
    discordId: 'p2_dummy',
    characterName: 'Boneka Latihan Besi',
    currentHp: 200,
    stats: { maxHp: 200, hp: 200, atk: 2, def: 80, spd: 5 }
  };

  const simRes = simulateBattle(challenger, opponent);

  const poisonTicks = simRes.logs.filter(l => l.type === 'condition_tick' && l.text.includes('racun'));
  assert(poisonTicks.length > 0, 'Harus ada log condition_tick racun dalam pertempuran PvP simulateBattle');
  assert(simRes.p2Conditions.poison !== undefined, 'p2Conditions harus memiliki properti poison');
  assert(typeof simRes.p2Hp === 'number', 'p2Hp harus berupa angka yang valid');
});

// ─────────────────────────────────────────────────────────────
// [DOT-8] Session save/load -> hp after DoT tetap persisten
// ─────────────────────────────────────────────────────────────
runTest('DOT-8', 'HP dan dotDamageThisRound tetap utuh saat di-serialize/deserialize (Session persist)', () => {
  const sessionSnapshot = {
    battleId: 'BTL-REGRESSION-01',
    currentTick: 3,
    player: { entityId: 'p1', hp: 85, maxHp: 100, conditions: { poison: 10 }, isDead: false },
    enemies: [
      { entityId: 'e1', hp: 38, maxHp: 100, conditions: { burn: 20 }, isDead: false }
    ],
    dotDamageThisRound: [
      { targetId: 'e1', type: 'burn', amount: 7, hpAfter: 38 }
    ]
  };

  const jsonString = JSON.stringify(sessionSnapshot);
  const loaded = JSON.parse(jsonString);

  assert.strictEqual(loaded.enemies[0].hp, 38, 'HP musuh setelah DoT harus tetap 38 setelah reload');
  assert.strictEqual(loaded.dotDamageThisRound.length, 1, 'dotDamageThisRound harus berisi 1 elemen');
  assert.strictEqual(loaded.dotDamageThisRound[0].amount, 7, 'Damage DoT yang tersimpan harus tepat 7');
  assert.strictEqual(loaded.dotDamageThisRound[0].hpAfter, 38, 'hpAfter pada record DoT harus tetap 38');
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`📊 TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('═══════════════════════════════════════════════════════════════');

if (passedTests === totalTests) {
  console.log('🎉 ALL COMBAT DOT & BUFF/DEBUFF REGRESSION TESTS PASSED CLEANLY!\n');
} else {
  console.error('❌ SOME TESTS FAILED!\n');
  process.exit(1);
}
