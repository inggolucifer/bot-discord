/**
 * scripts/testHazard.js
 * GERBANG E5: Regional Hazard Engine Pure Verification
 */

const assert = require('assert');
const { applyHazard } = require('../utils/regionHazardEngine');

console.log('=== TEST GERBANG E5: REGION HAZARD ENGINE ===\n');

let failed = false;

// Test 1: 100 steps in northern_desolate without item
const playerWithoutItem = {
  maxHp: 1000,
  currentHp: 1000,
  inventory: [],
  hazardStepCounter: 0
};

const res1 = applyHazard(playerWithoutItem, 'northern_desolate', 100);
console.log('Test 1 (Without Item):', {
  kind: res1.kind,
  damage: res1.damage,
  mitigated: res1.mitigated,
  ticks: res1.ticks,
  playerHp: playerWithoutItem.currentHp
});

const expectedDamage = 10 * Math.floor(1000 * 1 / 100); // 100
if (res1.damage === expectedDamage && playerWithoutItem.currentHp === 900 && !res1.mitigated) {
  console.log('[PASS] Test 1: Damage exactly 100 over 10 ticks, HP=900, mitigated=false.');
} else {
  console.error(`[FAIL] Test 1: Expected damage ${expectedDamage}, got ${res1.damage}`);
  failed = true;
}

// Test 2: 100 steps in northern_desolate with counter item
const playerWithItem = {
  maxHp: 1000,
  currentHp: 1000,
  inventory: [{ itemId: 'item_frost_ward_cloak' }],
  hazardStepCounter: 0
};

const res2 = applyHazard(playerWithItem, 'northern_desolate', 100);
console.log('\nTest 2 (With Item):', {
  kind: res2.kind,
  damage: res2.damage,
  mitigated: res2.mitigated,
  ticks: res2.ticks,
  playerHp: playerWithItem.currentHp
});

if (res2.damage === 0 && res2.mitigated && playerWithItem.currentHp === 1000) {
  console.log('[PASS] Test 2: Damage 0 with item, mitigated=true, HP=1000.');
} else {
  console.error('[FAIL] Test 2: Expected damage 0, mitigated true.');
  failed = true;
}

// Test 3: HP never drops below 1
const lowHpPlayer = {
  maxHp: 1000,
  currentHp: 50,
  inventory: [],
  hazardStepCounter: 0
};

const res3 = applyHazard(lowHpPlayer, 'northern_desolate', 100);
console.log('\nTest 3 (Low HP clamp):', {
  initialHp: 50,
  damageCalculated: res3.damage,
  finalHp: lowHpPlayer.currentHp
});

if (lowHpPlayer.currentHp === 1) {
  console.log('[PASS] Test 3: HP never drops below 1 (clamped to 1).');
} else {
  console.error(`[FAIL] Test 3: Expected HP 1, got ${lowHpPlayer.currentHp}`);
  failed = true;
}

// Test 4: Region without hazard (central_plains)
const safePlayer = {
  maxHp: 1000,
  currentHp: 1000,
  inventory: [],
  hazardStepCounter: 0
};
const res4 = applyHazard(safePlayer, 'central_plains', 100);
if (res4.damage === 0 && !res4.mitigated && res4.kind === 'none') {
  console.log('\n[PASS] Test 4: Safe region (central_plains) produces 0 damage.');
} else {
  console.error('\n[FAIL] Test 4: Safe region failed.');
  failed = true;
}

if (!failed) {
  console.log('\n[PASS] GERBANG E5 100% SUKSES!');
  process.exit(0);
} else {
  console.error('\n[FAIL] GERBANG E5 GAGAL.');
  process.exit(1);
}
