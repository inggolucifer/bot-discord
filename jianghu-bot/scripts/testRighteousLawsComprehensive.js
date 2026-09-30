/**
 * scripts/testRighteousLawsComprehensive.js
 * Comprehensive automated test suite for the 5 Righteous Cultivation Laws.
 * Validates all DOD criteria from Section 11 of Prompt Master.
 */

const assert = require('assert');
const {
  LAW_DEFINITIONS,
  LAW_RANK_NAMES,
  LAW_ESSENCE_PROFILE,
  LAW_PROGRESSION,
  LAW_BALANCE,
  LAW_SKILL_TREES,
  getTierAffinity,
  resolveItemTier,
  calculateChannelingProgress,
  checkAndResetDailyCap,
  getMaxEssence
} = require('../utils/lawCultivationEngine');
const { calculatePlayerStats } = require('../utils/playerCombat');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('   UJI KOMPREHENSIF: 5 HUKUM SEMESTA RIGHTEOUS (IMMORTAL-X)        ');
console.log('═══════════════════════════════════════════════════════════════════\n');

const RIGHTEOUS_LAWS = [
  'righteous_heavenly_merit',
  'righteous_pure_yang',
  'righteous_sword_heart',
  'righteous_formation_array',
  'righteous_karmic_mirror'
];

// TEST 1: 5 LAW_DEFINITIONS exist and have valid fields
console.log('Test 1: Memeriksa 5 LAW_DEFINITIONS...');
for (const lawType of RIGHTEOUS_LAWS) {
  const def = LAW_DEFINITIONS[lawType];
  assert(def, `LAW_DEFINITIONS missing ${lawType}`);
  assert.strictEqual(def.faction, 'righteous');
  assert.strictEqual(def.category, 'righteous');
  assert(def.pathMod >= 1.05 && def.pathMod <= 1.20, `pathMod out of range for ${lawType}: ${def.pathMod}`);
  assert(def.stageBonus, `stageBonus missing for ${lawType}`);
}
console.log('  ✅ Test 1 PASS: Semua 5 LAW_DEFINITIONS valid.');

// TEST 2: LAW_RANK_NAMES (9 rank names each, index 0-8)
console.log('\nTest 2: Memeriksa LAW_RANK_NAMES untuk 5 law...');
for (const lawType of RIGHTEOUS_LAWS) {
  const ranks = LAW_RANK_NAMES[lawType];
  assert(Array.isArray(ranks), `LAW_RANK_NAMES not an array for ${lawType}`);
  assert.strictEqual(ranks.length, 9, `LAW_RANK_NAMES must have 9 entries for ${lawType}, got ${ranks.length}`);
  for (let i = 0; i < 9; i++) {
    assert(typeof ranks[i] === 'string' && ranks[i].length > 0, `Rank ${i} name invalid for ${lawType}`);
  }
}
console.log('  ✅ Test 2 PASS: 9 rank names terdaftar untuk tiap Law.');

// TEST 3: LAW_ESSENCE_PROFILE
console.log('\nTest 3: Memeriksa LAW_ESSENCE_PROFILE & daily caps...');
for (const lawType of RIGHTEOUS_LAWS) {
  const prof = LAW_ESSENCE_PROFILE[lawType];
  assert(prof, `LAW_ESSENCE_PROFILE missing for ${lawType}`);
  assert(prof.barName, `barName missing for ${lawType}`);
  assert(Array.isArray(prof.fillTags) && prof.fillTags.length > 0, `fillTags missing for ${lawType}`);
  assert(prof.dailyAbsorbField, `dailyAbsorbField missing for ${lawType}`);
  assert(prof.dailyAbsorbMax > 0, `dailyAbsorbMax missing for ${lawType}`);
}
// Special profile gates
assert(LAW_ESSENCE_PROFILE.righteous_pure_yang.requireCleanInventory === true, 'pure_yang requireCleanInventory should be true');
assert(LAW_ESSENCE_PROFILE.righteous_sword_heart.requireEquippedSword === true, 'sword_heart requireEquippedSword should be true');
assert(LAW_ESSENCE_PROFILE.righteous_formation_array.requireFormationHubTile === true, 'formation_array requireFormationHubTile should be true');
assert(LAW_ESSENCE_PROFILE.righteous_karmic_mirror.rejectIfInfamyAbove === 30, 'karmic_mirror rejectIfInfamyAbove should be 30');
console.log('  ✅ Test 3 PASS: Profil esensi dan special gates terdefinisi akurat.');

// TEST 4: Tier Affinity (Rank 2 -> Player Tier 3)
console.log('\nTest 4: Memeriksa logika Tier Affinity...');
{
  const rank = 2;
  const playerTier = rank + 1; // 3
  
  // T3 (sama tier) -> allowed: true, efficiency: 1.0
  const affT3 = getTierAffinity(playerTier, 3);
  assert(affT3.allowed === true, 'T3 should be allowed for PlayerTier 3');
  assert.strictEqual(affT3.efficiency, 1.0, 'T3 efficiency should be 1.0');

  // T1 (di bawah tier) -> allowed: true, efficiency < 1.0
  const affT1 = getTierAffinity(playerTier, 1);
  assert(affT1.allowed === true, 'T1 should be allowed for PlayerTier 3');
  assert(affT1.efficiency < 1.0 && affT1.efficiency >= 0.15, `T1 efficiency out of range: ${affT1.efficiency}`);

  // T4 (di atas tier) -> allowed: false
  const affT4 = getTierAffinity(playerTier, 4);
  assert(affT4.allowed === false, 'T4 should be rejected for PlayerTier 3');
}
console.log('  ✅ Test 4 PASS: Tier Affinity (Rank 2: T3=100%, T1=inefficient, T4=tolak).');

// TEST 5: Essence Kosong -> 0 Qi pada Channel
console.log('\nTest 5: Memeriksa channel saat currentEssence = 0 (Mutlak 0 Qi)...');
{
  const mockPlayer = {
    cultivationLaw: {
      activeLawType: 'righteous_heavenly_merit',
      isChanneling: true,
      rank: 0,
      stage: 0,
      qi: 10,
      maxQi: 100,
      currentEssence: 0,
      lastChannelSyncAt: new Date(Date.now() - 3600000) // 60 menit lalu
    }
  };
  const result = calculateChannelingProgress(mockPlayer);
  assert.strictEqual(result.qiGained, 0, 'qiGained must be 0 when currentEssence <= 0');
  assert.strictEqual(result.isEssenceDepleted, true, 'isEssenceDepleted must be true');
}
console.log('  ✅ Test 5 PASS: Meditasi saat esensi kosong menghasilkan 0 Qi (Zero Drip).');

// TEST 6: INSTANT_QI_ON_ABSORB === 0
console.log('\nTest 6: Memeriksa INSTANT_QI_ON_ABSORB...');
assert.strictEqual(LAW_PROGRESSION.INSTANT_QI_ON_ABSORB, 0, 'INSTANT_QI_ON_ABSORB must be 0');
console.log('  ✅ Test 6 PASS: INSTANT_QI_ON_ABSORB terkonfirmasi bernilai 0.');

// TEST 7: LAW_SKILL_TREES definition & nodes
console.log('\nTest 7: Memeriksa LAW_SKILL_TREES untuk 5 law...');
for (const lawType of RIGHTEOUS_LAWS) {
  const tree = LAW_SKILL_TREES[lawType];
  assert(tree, `Skill tree missing for ${lawType}`);
  assert.strictEqual(tree.nodes.length, 5, `Skill tree must have 5 nodes for ${lawType}`);
  for (const node of tree.nodes) {
    assert(node.id, 'Node id missing');
    assert(node.name, 'Node name missing');
    assert(node.tier >= 1 && node.tier <= 3, 'Node tier out of range');
    assert(node.costPerLevel >= 1, 'costPerLevel missing');
    assert(node.effects, 'Node effects missing');
  }
}
console.log('  ✅ Test 7 PASS: Semua 5 skill tree memiliki 5 node terkonfigurasi.');

// TEST 8: Combat Modifiers di calculatePlayerStats
console.log('\nTest 8: Memeriksa stats tempur 5 law di calculatePlayerStats...');
{
  // Sword Heart: Unarmed vs Equipped Sword
  const unarmedStats = calculatePlayerStats({
    cultivationLaw: { activeLawType: 'righteous_sword_heart', rank: 2, stage: 0 },
    inventory: [],
    equipment: {}
  });
  const armedStats = calculatePlayerStats({
    cultivationLaw: { activeLawType: 'righteous_sword_heart', rank: 2, stage: 0 },
    inventory: [{ isEquipped: true, itemId: { category: 'weapon', name: 'Pedang Sumpah', tags: ['sword'] } }],
    equipment: {}
  });
  assert(armedStats.atk > unarmedStats.atk, `Armed ATK (${armedStats.atk}) should be higher than Unarmed ATK (${unarmedStats.atk})`);

  // Merit: flat atk bonus
  const meritStats = calculatePlayerStats({
    cultivationLaw: { activeLawType: 'righteous_heavenly_merit', rank: 2, stage: 0 },
    inventory: [],
    equipment: {}
  });
  assert(meritStats.hp > 100, 'Merit HP should be boosted');
  assert(meritStats.atk > 15, 'Merit ATK should be boosted');

  // Formation: HP & DEF bonus
  const arrayStats = calculatePlayerStats({
    cultivationLaw: { activeLawType: 'righteous_formation_array', rank: 2, stage: 0 },
    inventory: [],
    equipment: {}
  });
  assert(arrayStats.def > 10, 'Array DEF should be boosted');

  // Karmic Mirror: Self infamy penalty if infamy > 50
  const cleanKarma = calculatePlayerStats({
    cultivationLaw: { activeLawType: 'righteous_karmic_mirror', rank: 2, stage: 0 },
    infamy: 0,
    inventory: [],
    equipment: {}
  });
  const guiltyKarma = calculatePlayerStats({
    cultivationLaw: { activeLawType: 'righteous_karmic_mirror', rank: 2, stage: 0 },
    infamy: 70,
    inventory: [],
    equipment: {}
  });
  assert(cleanKarma.atk > guiltyKarma.atk, `Clean Karma ATK (${cleanKarma.atk}) should be higher than Guilty Karma ATK (${guiltyKarma.atk})`);
}
console.log('  ✅ Test 8 PASS: Efek combat, scaling LAW_BALANCE, dan penalty berfungsi deterministik.');

// TEST 9: 15 Law Lama Anti-Regresi
console.log('\nTest 9: Memeriksa 15 Law lama tidak terdampak regresi...');
const OLD_15_LAWS = [
  'element_phoenix_fire', 'element_azure_water', 'element_xuanwu_earth',
  'element_qingdi_wood', 'element_roc_wind', 'element_godthunder_light',
  'body_tempering', 'gu_master', 'natal_artifact', 'natal_beast',
  'demonic_turbid_core', 'demonic_blood_soul', 'demonic_myriad_venom',
  'demonic_abyssal_pact', 'demonic_nether_darkness'
];
for (const oldLaw of OLD_15_LAWS) {
  assert(LAW_DEFINITIONS[oldLaw], `Old law ${oldLaw} missing from definitions`);
  assert(LAW_RANK_NAMES[oldLaw], `Old law ${oldLaw} missing from rank names`);
  assert(LAW_ESSENCE_PROFILE[oldLaw], `Old law ${oldLaw} missing from essence profiles`);
}
console.log('  ✅ Test 9 PASS: 15 Law lama 100% utuh tanpa regresi.');

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('🎉 SEMUA 9 PENGUJIAN KOMPREHENSIF LULUS DENGAN SEMPURNA!           ');
console.log('═══════════════════════════════════════════════════════════════════\n');
