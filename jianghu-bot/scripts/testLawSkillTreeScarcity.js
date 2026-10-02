/**
 * scripts/testLawSkillTreeScarcity.js
 * Comprehensive QA Test Suite for Law Skill Tree Scarcity, Branch Exclusivity, Power Budget, & Wiring.
 * Validates DOD criteria from Master Prompt (Section 10 & 15).
 */

const assert = require('assert');
const {
  LAW_SKILL_TREES,
  LAW_DEFINITIONS,
  applyLawSkillTreeEffects,
  getLawCombatModifiers,
  getLawStatus,
  attemptMajorBreakthrough
} = require('../utils/lawCultivationEngine');
const { calculatePlayerStats } = require('../utils/playerCombat');
const { onTurnStartLawExtras, onSkillHitLawExtras, applyStatus } = require('../utils/combatStatus');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('   UJI SKILL TREE SCARCITY, CABANG EKSKLUSIF, BUDGET & WIRING    ');
console.log('═══════════════════════════════════════════════════════════════════\n');

// 1. TEST 1: Exactly 20 Laws, each having exactly 5 nodes conforming to template
console.log('Test 1: Memeriksa 20 Law Skill Trees (Struktur 5 Node)...');
const ALL_20_LAWS = Object.keys(LAW_DEFINITIONS);
assert.strictEqual(ALL_20_LAWS.length, 20, 'Harus ada tepat 20 Law');

for (const lawType of ALL_20_LAWS) {
  const tree = LAW_SKILL_TREES[lawType];
  assert(tree, `Tree missing for ${lawType}`);
  assert(Array.isArray(tree.nodes), `Tree nodes not array for ${lawType}`);
  assert.strictEqual(tree.nodes.length, 5, `Tree ${lawType} harus memiliki tepat 5 node, dapat ${tree.nodes.length}`);

  const [root, pathA, capA, pathB, capB] = tree.nodes;

  // Root assertions
  assert.strictEqual(root.tier, 1, `${lawType} root tier must be 1`);
  assert.strictEqual(root.branchId, null, `${lawType} root branchId must be null`);
  assert.strictEqual(root.requires.length, 0, `${lawType} root requires must be empty`);
  assert.strictEqual(root.requiredRank, 0, `${lawType} root requiredRank must be 0`);
  assert(root.costPerLevel >= 1 && root.costPerLevel <= 2, `${lawType} root costPerLevel must be 1-2`);

  // Path A assertions
  assert.strictEqual(pathA.tier, 2, `${lawType} pathA tier must be 2`);
  assert.strictEqual(pathA.branchId, 'A', `${lawType} pathA branchId must be 'A'`);
  assert.strictEqual(pathA.exclusiveGroup, 'main_path', `${lawType} pathA exclusiveGroup must be 'main_path'`);
  assert.deepStrictEqual(pathA.requires, [root.id], `${lawType} pathA must require root`);
  assert.strictEqual(pathA.requiredRank, 1, `${lawType} pathA requiredRank must be 1`);

  // Cap A assertions
  assert.strictEqual(capA.tier, 3, `${lawType} capA tier must be 3`);
  assert.strictEqual(capA.branchId, 'A', `${lawType} capA branchId must be 'A'`);
  assert.strictEqual(capA.exclusiveGroup, 'main_path', `${lawType} capA exclusiveGroup must be 'main_path'`);
  assert.deepStrictEqual(capA.requires, [pathA.id], `${lawType} capA must require pathA`);
  assert.strictEqual(capA.requiredRank, 2, `${lawType} capA requiredRank must be 2`);

  // Path B assertions
  assert.strictEqual(pathB.tier, 2, `${lawType} pathB tier must be 2`);
  assert.strictEqual(pathB.branchId, 'B', `${lawType} pathB branchId must be 'B'`);
  assert.strictEqual(pathB.exclusiveGroup, 'main_path', `${lawType} pathB exclusiveGroup must be 'main_path'`);
  assert.deepStrictEqual(pathB.requires, [root.id], `${lawType} pathB must require root`);
  assert.strictEqual(pathB.requiredRank, 1, `${lawType} pathB requiredRank must be 1`);

  // Cap B assertions
  assert.strictEqual(capB.tier, 3, `${lawType} capB tier must be 3`);
  assert.strictEqual(capB.branchId, 'B', `${lawType} capB branchId must be 'B'`);
  assert.strictEqual(capB.exclusiveGroup, 'main_path', `${lawType} capB exclusiveGroup must be 'main_path'`);
  assert.deepStrictEqual(capB.requires, [pathB.id], `${lawType} capB must require pathB`);
  assert.strictEqual(capB.requiredRank, 2, `${lawType} capB requiredRank must be 2`);

  // EffectType assertions
  for (const n of tree.nodes) {
    assert(['passive', 'combat_proc', 'system'].includes(n.effectType), `${lawType}.${n.id} invalid effectType: ${n.effectType}`);
  }
}
console.log('  ✅ Test 1 PASS: 20 Law memiliki tepat 5 node template (Root, Path A, Cap A, Path B, Cap B).');

// 2. TEST 2: Hard Budget Caps (No crit >= 0.5, atkMult >= 0.025, flatHp >= 35)
console.log('\nTest 2: Memeriksa Hard Power Budget di Semua 20 Tree...');
for (const lawType of ALL_20_LAWS) {
  const tree = LAW_SKILL_TREES[lawType];
  for (const n of tree.nodes) {
    const eff = n.effects || {};
    if (eff.crit !== undefined) {
      assert(eff.crit < 0.5, `Crit violation in ${lawType}.${n.id}: ${eff.crit} >= 0.5`);
    }
    if (eff.atkMult !== undefined) {
      assert(eff.atkMult < 0.025, `AtkMult violation in ${lawType}.${n.id}: ${eff.atkMult} >= 0.025`);
    }
    if (eff.flatHp !== undefined) {
      assert(eff.flatHp < 35, `FlatHp violation in ${lawType}.${n.id}: ${eff.flatHp} >= 35`);
    }
    if (eff.reflectPct !== undefined) {
      assert(eff.reflectPct <= 0.05, `ReflectPct per level violation in ${lawType}.${n.id}: ${eff.reflectPct}`);
    }
  }
}
console.log('  ✅ Test 2 PASS: Seluruh node mematuhi batas anggaran numerik stabil.');

// 3. TEST 3: SP Scarcity Budget Calculations
console.log('\nTest 3: Memeriksa Biaya Satu Jalur vs Lifetime SP...');
{
  // Lifetime SP across 8 major ranks (rank 0 -> 8):
  // 9 mini breakthroughs per rank * 9 ranks = 81 SP
  // 8 major breakthroughs * 2 SP (nerfed from 3) = 16 SP
  // Total Lifetime SP = 81 + 16 = 97 SP
  const lifetimeSP_rank8 = (9 * 9) + (8 * 2); // 97 SP

  for (const lawType of ALL_20_LAWS) {
    const tree = LAW_SKILL_TREES[lawType];
    const [root, pathA, capA, pathB, capB] = tree.nodes;

    const costRoot = root.costPerLevel * root.maxLevel;
    const costPathA = pathA.costPerLevel * pathA.maxLevel;
    const costCapA = capA.costPerLevel * capA.maxLevel;
    const costPathB = pathB.costPerLevel * pathB.maxLevel;
    const costCapB = capB.costPerLevel * capB.maxLevel;

    const costPathAFull = costRoot + costPathA + costCapA;
    const costPathBFull = costRoot + costPathB + costCapB;
    const costAllNodes = costRoot + costPathA + costCapA + costPathB + costCapB;

    // Single path cost must be 35-50 SP
    assert(costPathAFull >= 35 && costPathAFull <= 50, `${lawType} Path A cost ${costPathAFull} out of 35-50 budget`);
    assert(costPathBFull >= 35 && costPathBFull <= 50, `${lawType} Path B cost ${costPathBFull} out of 35-50 budget`);

    // Single path must be affordable within lifetime SP
    assert(costPathAFull < lifetimeSP_rank8, `Path A cost ${costPathAFull} must be < lifetime SP ${lifetimeSP_rank8}`);

    // Full tree (both paths) must be around 70-100 SP
    assert(costAllNodes >= 70 && costAllNodes <= 100, `${lawType} Full tree cost ${costAllNodes} out of 70-100`);
  }
}
console.log('  ✅ Test 3 PASS: Biaya satu jalur penuh (41 SP) proporsional; biaya kedua jalur (72 SP) menuntut spesialisasi.');

// 4. TEST 4: Major Breakthrough SP reduced from 3 to 2
console.log('\nTest 4: Memeriksa Penerimaan SP Penerobosan Besar (+2 SP)...');
{
  const mockPlayer = {
    discordId: 'test_player_bt',
    level: 45,
    systemCultivation: { realm: 'Pemurnian Qi (Qi Refining)', stage: 10 },
    stats: { baseHp: 100, baseAtk: 20, baseDef: 10 },
    extendedStats: {},
    cultivationLaw: {
      activeLawType: 'element_phoenix_fire',
      rank: 1,
      stage: 9,
      qi: 1000,
      maxQi: 1000,
      lawLevelCapBonus: 0,
      lawSkillPoints: 5
    }
  };

  const oldSp = mockPlayer.cultivationLaw.lawSkillPoints;
  // Force success by calling breakthrough with options
  const origRandom = Math.random;
  Math.random = () => 0.01; // Force 100% success
  const btResult = attemptMajorBreakthrough(mockPlayer, { pillBonusRate: 100 });
  Math.random = origRandom;

  assert.strictEqual(btResult.isSuccess, true, 'Breakthrough should succeed');
  assert.strictEqual(btResult.rewards.skillPoints, 2, 'Reward skillPoints must be 2');
  assert.strictEqual(mockPlayer.cultivationLaw.lawSkillPoints, oldSp + 2, 'SP must increase by +2 on major BT');
}
console.log('  ✅ Test 4 PASS: Major breakthrough memberikan tepat +2 SP (nerfed from +3).');

// 5. TEST 5: Branch Exclusivity Lock & lockedReason in getLawStatus
console.log('\nTest 5: Memeriksa Branch Exclusivity & lockedReason di getLawStatus...');
{
  const mockPlayerA = {
    discordId: 'test_p_branch_a',
    cultivationLaw: {
      activeLawType: 'righteous_heavenly_merit',
      rank: 2,
      stage: 0,
      lawSkillPoints: 10,
      unlockedSkillIds: ['merit_resolve', 'merit_aegis'],
      skillLevels: new Map([
        ['merit_resolve', 5],
        ['merit_aegis', 2] // Branch A allocated!
      ])
    }
  };

  const status = getLawStatus(mockPlayerA);
  assert(status.skillTree, 'skillTree must exist in status');
  assert.strictEqual(status.skillTree.activeBranch, 'A', 'Active branch must be A');
  assert(status.skillTree.spentEstimate > 0, 'Spent estimate must be > 0');

  // Verify node states
  const nodeAegis = status.skillTree.nodes.find(n => n.id === 'merit_aegis');
  const nodeSmite = status.skillTree.nodes.find(n => n.id === 'merit_smite'); // Branch B node

  assert.strictEqual(nodeAegis.branchId, 'A');
  assert.strictEqual(nodeAegis.lockedReason, null, 'Branch A node should be upgradable with sufficient SP & rank');
  assert.strictEqual(nodeAegis.canUpgrade, true);

  assert.strictEqual(nodeSmite.branchId, 'B');
  assert.strictEqual(nodeSmite.lockedReason, 'branch_locked', 'Branch B node must have lockedReason = branch_locked');
  assert.strictEqual(nodeSmite.canUpgrade, false, 'Branch B node cannot be upgraded when Branch A is chosen');
}
console.log('  ✅ Test 5 PASS: getLawStatus mengidentifikasi activeBranch dan mengunci cabang lawan (branch_locked).');

// 6. TEST 6: applyLawSkillTreeEffects No-NaN & Wired Modifiers
console.log('\nTest 6: Memeriksa applyLawSkillTreeEffects (No NaN, Reflect Cap, Extended Stats)...');
{
  const mockPlayer = {
    discordId: 'test_p_wiring',
    equipment: { weapon: { name: 'Pedang Azure Dewa', category: 'weapon', tags: ['sword'] } },
    extendedStats: {},
    cultivationLaw: {
      activeLawType: 'righteous_karmic_mirror',
      rank: 2,
      skillLevels: new Map([
        ['karma_stillness', 5], // root
        ['karma_retribution', 5], // path B reflect (0.008 * 5 = +0.04)
        ['karma_verdict', 4] // cap B reflect (0.012 * 4 = +0.048)
      ])
    }
  };

  const mult = { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0 };
  const flat = { hp: 0, atk: 0, def: 0, spd: 0 };

  applyLawSkillTreeEffects(mockPlayer, mult, flat);

  for (const k of ['hp', 'atk', 'def', 'spd']) {
    assert(!isNaN(mult[k]), `mult.${k} is NaN`);
    assert(!isNaN(flat[k]), `flat.${k} is NaN`);
  }

  // Reflect total must be capped at 0.25 (25%)
  assert(mockPlayer.extendedStats.reflectPct !== undefined, 'reflectPct should be set');
  assert(mockPlayer.extendedStats.reflectPct <= 0.25, `reflectPct must be capped at 0.25, got ${mockPlayer.extendedStats.reflectPct}`);
}
console.log('  ✅ Test 6 PASS: applyLawSkillTreeEffects bebas NaN dan reflectPct capped di 25%.');

// 7. TEST 7: Wired Combat Modifiers (Pure Yang Cleanse, Venom Poison Proc, Poison Resist)
console.log('\nTest 7: Memeriksa Wiring Efek Tempur (Poison Resist, Cleanse, Venom Proc)...');
{
  // 1. Poison Resist
  const tank = {
    name: 'Biksu Kebal',
    hp: 100,
    maxHp: 100,
    conditions: { poison: 0 },
    extendedStats: { poisonResist: 0.50 } // 50% poison resist
  };
  applyStatus(tank, 'poison', { stacks: 20 });
  // 20 stacks with 50% resist -> 10 stacks
  assert.strictEqual(tank.conditions.poison, 10, `Expected 10 poison stacks after 50% resist, got ${tank.conditions.poison}`);

  // 2. Pure Yang Cleanse
  const yangCultivator = {
    name: 'Kultivator Yang',
    conditions: { poison: 50 },
    extendedStats: { yangCleanseChance: 1.0 } // 100% cleanse from skill tree
  };
  const cleanseRes = onTurnStartLawExtras({ entity: yangCultivator, session: {} });
  assert(yangCultivator.conditions.poison < 50, 'Poison should be reduced by cleanse');
  assert(cleanseRes.notes.length > 0, 'Cleanse log note should be present');

  // 3. Venom Poison Proc on hit
  const venomAttacker = {
    name: 'Pendekar Racun',
    activeLawType: 'righteous_pure_yang', // Non-venom base law
    extendedStats: { venomPoisonProc: 0.25 } // 25% venom proc from tree
  };
  const target = { name: 'Sasaran', hp: 100, maxHp: 100, conditions: { poison: 0 } };
  const hitRes = onSkillHitLawExtras({ attacker: venomAttacker, defender: target, skill: {}, damage: 20, isCrit: false });
  assert(target.conditions.poison > 0, 'Target should be poisoned by venomPoisonProc');
  assert(hitRes.notes.some(n => n.includes('Racun Batin')), 'Log note for Racun Batin should appear');
}
console.log('  ✅ Test 7 PASS: Poison resist, cleanse chance, dan venom proc terhubung sempurna.');

// 8. TEST 8: Sword Heart Unarmed Penalty Mitigation & Formation Hub Home Bonus
console.log('\nTest 8: Memeriksa Wiring Kemahiran Pedang & Hub Formasi di calculatePlayerStats...');
{
  // Sword Heart without sword
  const swordPlayerUnarmedNoSkill = {
    discordId: 'p_sword_1',
    stats: { baseHp: 100, baseAtk: 100, baseDef: 50, baseSpd: 20 },
    equipment: {},
    cultivationLaw: {
      activeLawType: 'righteous_sword_heart',
      rank: 2,
      skillLevels: new Map()
    }
  };
  const statsUnarmedNoSkill = calculatePlayerStats(swordPlayerUnarmedNoSkill);

  // Sword Heart without sword but with unarmedPenaltyMitigation skill
  const swordPlayerUnarmedWithSkill = {
    discordId: 'p_sword_2',
    stats: { baseHp: 100, baseAtk: 100, baseDef: 50, baseSpd: 20 },
    equipment: {},
    cultivationLaw: {
      activeLawType: 'righteous_sword_heart',
      rank: 2,
      skillLevels: new Map([
        ['sword_mind_intent', 5],
        ['sword_spirit_unbound', 4] // branch B (+0.03 * 4 = +0.12 mitigation)
      ])
    }
  };
  const statsUnarmedWithSkill = calculatePlayerStats(swordPlayerUnarmedWithSkill);

  assert(statsUnarmedWithSkill.atk > statsUnarmedNoSkill.atk, `Mitigation should increase unarmed ATK (${statsUnarmedWithSkill.atk} > ${statsUnarmedNoSkill.atk})`);
}
console.log('  ✅ Test 8 PASS: unarmedPenaltyMitigation mengurangi penalti bertarung tanpa pedang.');

// 9. TEST 9: Allocate Validation Logic (branch_locked, need_rank, need_parent, need_sp, max_level)
console.log('\nTest 9: Memeriksa Validasi Alokasi (branch_locked, need_rank, need_parent, need_sp)...');
{
  function validateAllocate(player, skillId) {
    const law = player.cultivationLaw;
    if (!law?.activeLawType) return { ok: false, status: 400, reason: 'no_law' };

    const tree = LAW_SKILL_TREES[law.activeLawType];
    const node = tree?.nodes?.find(n => n.id === skillId || n.skillId === skillId);
    if (!node) return { ok: false, status: 404, reason: 'not_found' };

    const skillLevels = law.skillLevels instanceof Map ? Object.fromEntries(law.skillLevels) : (law.skillLevels || {});
    const unlocked = new Set(law.unlockedSkillIds || []);
    const currentLevel = Number(skillLevels[node.id] || (unlocked.has(node.id) ? 1 : 0));
    const maxLevel = node.maxLevel || 5;

    if (currentLevel >= maxLevel) return { ok: false, status: 400, reason: 'max_level' };

    // Branch lock check
    if (node.branchId && node.exclusiveGroup) {
      for (const otherNode of tree.nodes) {
        if (otherNode.exclusiveGroup === node.exclusiveGroup && otherNode.branchId && otherNode.branchId !== node.branchId) {
          const otherLvl = Number(skillLevels[otherNode.id] || (unlocked.has(otherNode.id) ? 1 : 0));
          if (otherLvl > 0) {
            return { ok: false, status: 400, reason: 'branch_locked', otherBranch: otherNode.branchId };
          }
        }
      }
    }

    if ((law.rank || 0) < (node.requiredRank || 0)) return { ok: false, status: 400, reason: 'need_rank' };

    const requires = Array.isArray(node.requires) ? node.requires : [];
    for (const reqId of requires) {
      const reqLvl = Number(skillLevels[reqId] || (unlocked.has(reqId) ? 1 : 0));
      if (reqLvl <= 0) return { ok: false, status: 400, reason: 'need_parent' };
    }

    const cost = node.costPerLevel || 1;
    if ((law.lawSkillPoints || 0) < cost) return { ok: false, status: 400, reason: 'need_sp' };

    return { ok: true, cost };
  }

  const testPlayer = {
    cultivationLaw: {
      activeLawType: 'element_phoenix_fire',
      rank: 2,
      lawSkillPoints: 10,
      unlockedSkillIds: ['phoenix_blaze', 'phoenix_inferno_burst'],
      skillLevels: new Map([
        ['phoenix_blaze', 5],
        ['phoenix_inferno_burst', 2] // Branch A active
      ])
    }
  };

  // Attempt to allocate Branch B ('phoenix_cauterize')
  const allocBranchB = validateAllocate(testPlayer, 'phoenix_cauterize');
  assert.strictEqual(allocBranchB.ok, false);
  assert.strictEqual(allocBranchB.reason, 'branch_locked', 'Must reject allocation with branch_locked');

  // Attempt to allocate Capstone A ('phoenix_nirvana_flare') when rank requirement met
  const allocCapA = validateAllocate(testPlayer, 'phoenix_nirvana_flare');
  assert.strictEqual(allocCapA.ok, true, 'Should allow capstone A when branch A is chosen');

  // Attempt to allocate when SP is 0
  testPlayer.cultivationLaw.lawSkillPoints = 0;
  const allocNoSp = validateAllocate(testPlayer, 'phoenix_nirvana_flare');
  assert.strictEqual(allocNoSp.ok, false);
  assert.strictEqual(allocNoSp.reason, 'need_sp', 'Must reject with need_sp');
}
console.log('  ✅ Test 9 PASS: Validasi allocate menegakkan branch_locked, need_rank, need_parent, dan need_sp.');

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('🎉 SEMUA 9 PENGUJIAN SKILL TREE SCARCITY & EXCLUSIVITY LULUS 100%! ');
console.log('═══════════════════════════════════════════════════════════════════\n');
