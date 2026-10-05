/**
 * scripts/testLawEligibleDbAndBtParity.js
 *
 * QA TEST SUITE: ELIGIBLE INVENTORY, GU EQUIP & BREAKTHROUGH MATERIAL PARITY
 *
 * Skenario Uji:
 * - GU-E1 : Mock item tags essence+material nama "Kristal X" → eligible gu_feed
 * - GU-E2 : weapon category → NOT eligible
 * - GU-E3 : POST feed itemId eligible → qty-1 via consumeInventoryItem
 * - EQ-1  : gu/equip pakai findInventoryIndex + consumeInventoryItem
 * - BT-1  : Breakthrough materials by tag/tier bukan nama exact
 * - API-1 : GET /law/inventory/eligible format output contains totalScanned & skippedUnpopulated
 */

const assert = require('assert');
const {
  listEligibleInventory,
  isItemEligibleForPurpose,
  isBreakthroughMaterial,
  consumeBreakthroughMaterials,
  consumeInventoryItem,
  findInventoryIndex
} = require('../utils/lawCultivationEngine');

console.log('================================================================');
console.log('🧪 RUNNING QA TEST: ELIGIBLE DB PARITY & BT MATERIAL TAG MATCH');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(id, name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${id} - ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${id} - ${name}:`, err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GU-E1: Mock item tags essence+material name "Kristal X" → eligible gu_feed
// ─────────────────────────────────────────────────────────────────────────────
runTest('GU-E1', 'Mock item tags essence+material name "Kristal X" is eligible for gu_feed', () => {
  const item = {
    _id: 'item_kristal_x',
    name: 'Kristal X',
    category: 'material',
    tier: 1,
    tags: ['essence', 'material']
  };

  const isEligible = isItemEligibleForPurpose(item, 'gu_feed', 'gu_master');
  assert.strictEqual(isEligible, true, 'Item with essence+material must be eligible for gu_feed');

  const mockPlayer = {
    cultivationLaw: { activeLawType: 'gu_master', rank: 0 },
    inventory: [{ _id: 'inv_1', quantity: 5, itemId: item }]
  };
  const list = listEligibleInventory(mockPlayer, 'gu_feed');
  assert.strictEqual(list.length, 1, 'Kristal X must appear in eligible list');
  assert.strictEqual(list[0].allowed, true, 'Kristal X must be allowed');
});

// ─────────────────────────────────────────────────────────────────────────────
// GU-E2: weapon → not eligible
// ─────────────────────────────────────────────────────────────────────────────
runTest('GU-E2', 'Weapon category is NOT eligible for gu_feed', () => {
  const weapon = {
    _id: 'item_pedang_sakral',
    name: 'Pedang Sakral Naga',
    category: 'weapon',
    tier: 1,
    tags: ['weapon', 'sword']
  };

  const isEligible = isItemEligibleForPurpose(weapon, 'gu_feed', 'gu_master');
  assert.strictEqual(isEligible, false, 'Weapon must NOT be eligible for gu_feed');

  const mockPlayer = {
    cultivationLaw: { activeLawType: 'gu_master', rank: 0 },
    inventory: [{ _id: 'inv_w1', quantity: 1, itemId: weapon }]
  };
  const list = listEligibleInventory(mockPlayer, 'gu_feed');
  assert.strictEqual(list.length, 0, 'Weapon must NOT appear in eligible list for gu_feed');
});

// ─────────────────────────────────────────────────────────────────────────────
// GU-E3: POST feed itemId eligible → qty-1
// ─────────────────────────────────────────────────────────────────────────────
runTest('GU-E3', 'POST feed itemId eligible decrements quantity by 1 via consumeInventoryItem', () => {
  const itemDoc = {
    _id: 'item_food_sample',
    name: 'Larva Rawa Mistis',
    category: 'material',
    tier: 1,
    tags: ['gu_food', 'material']
  };

  const mockPlayer = {
    cultivationLaw: { activeLawType: 'gu_master', rank: 0 },
    inventory: [{ _id: 'inv_f1', quantity: 3, itemId: itemDoc }],
    markModified: () => {}
  };

  const eligibleList = listEligibleInventory(mockPlayer, 'gu_feed');
  assert.strictEqual(eligibleList.length, 1);

  const pickedId = (eligibleList[0].itemId || eligibleList[0]._id).toString();
  assert.strictEqual(pickedId, 'item_food_sample');

  const res = consumeInventoryItem(mockPlayer, pickedId, 1);
  assert.strictEqual(res.quantityRemaining, 2);
  assert.strictEqual(mockPlayer.inventory[0].quantity, 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// EQ-1: gu/equip pakai findInventoryIndex
// ─────────────────────────────────────────────────────────────────────────────
runTest('EQ-1', 'gu/equip uses findInventoryIndex to locate Gu item in inventory', () => {
  const guItemDoc = {
    _id: 'item_ulat_sutra_roh',
    name: 'Ulat Sutra Roh',
    category: 'material',
    tier: 1,
    tags: ['gu_larva', 'gu']
  };

  const mockPlayer = {
    cultivationLaw: { activeLawType: 'gu_master', rank: 0 },
    inventory: [
      { _id: 'inv_other', quantity: 10, itemId: { _id: 'item_other', name: 'Batu Kasar' } },
      { _id: 'inv_gu_slot', quantity: 1, itemId: guItemDoc }
    ],
    markModified: () => {}
  };

  // Locate by itemId
  const foundIdx = findInventoryIndex(mockPlayer, 'item_ulat_sutra_roh');
  assert.strictEqual(foundIdx, 1, 'findInventoryIndex must correctly locate slot index 1');

  // Consume for equip
  const res = consumeInventoryItem(mockPlayer, 'item_ulat_sutra_roh', 1);
  assert.strictEqual(res.quantityRemaining, 0);
  assert.strictEqual(mockPlayer.inventory.length, 1, 'Inventory item should be spliced when qty drops to 0');
});

// ─────────────────────────────────────────────────────────────────────────────
// BT-1: BT materials by tag/tier bukan nama exact
// ─────────────────────────────────────────────────────────────────────────────
runTest('BT-1', 'Breakthrough materials matched by tag & tier, NOT exact name strings', () => {
  // Mini BT: Any material or spirit stone with tier <= playerTier
  const itemA = {
    _id: 'item_batu_sembarang',
    name: 'Batu Roh Gurun Acak', // NOT named "Kayu Bambu Keras"
    category: 'material',
    tier: 1,
    tags: ['spirit_stone', 'material']
  };

  assert.strictEqual(isBreakthroughMaterial(itemA, 1, false), true, 'Batu Roh Gurun Acak is valid mini-BT material');

  const mockPlayer = {
    cultivationLaw: {
      rank: 0,
      stage: 0
    },
    inventory: [
      { _id: 'inv_bt_1', quantity: 5, itemId: itemA }
    ],
    markModified: () => {}
  };

  // Mini-BT needs: 2 + rank(0) + floor(0/3) = 2 items
  const btResult = consumeBreakthroughMaterials(mockPlayer, mockPlayer.cultivationLaw, false);
  assert.strictEqual(btResult.consumedQty, 2);
  assert.strictEqual(mockPlayer.inventory[0].quantity, 3);
  assert(btResult.consumedItemName.includes('Batu Roh Gurun Acak'));

  // Major BT: Needs tier >= playerTier + catalyst/breakthrough tag
  const highTierCatalyst = {
    _id: 'item_cat_high',
    name: 'Embun Intisari Langit', // Arbitrary name
    category: 'material',
    tier: 1,
    tags: ['catalyst', 'breakthrough_material']
  };

  assert.strictEqual(isBreakthroughMaterial(highTierCatalyst, 1, true), true, 'Embun Intisari Langit is valid major-BT material');

  const majorPlayer = {
    cultivationLaw: { rank: 0, stage: 0 },
    inventory: [{ _id: 'inv_bt_major', quantity: 1, itemId: highTierCatalyst }],
    markModified: () => {}
  };
  const majorBtResult = consumeBreakthroughMaterials(majorPlayer, majorPlayer.cultivationLaw, true);
  assert.strictEqual(majorBtResult.consumedQty, 1);
  assert.strictEqual(majorBtResult.consumedItemName, 'Embun Intisari Langit');
  assert.strictEqual(majorPlayer.inventory.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// API-1: listEligibleInventory attaches totalScanned & skippedUnpopulated
// ─────────────────────────────────────────────────────────────────────────────
runTest('API-1', 'listEligibleInventory calculates totalScanned and skips unpopulated raw ObjectIds', () => {
  const validItem = {
    _id: 'item_valid_herb',
    name: 'Herba Embun',
    category: 'material',
    tier: 1,
    tags: ['essence', 'material']
  };

  // Mock player with 1 valid item and 1 dangling unpopulated raw ObjectId
  const mockPlayer = {
    cultivationLaw: { activeLawType: 'gu_master', rank: 0 },
    inventory: [
      { _id: 'inv_good', quantity: 2, itemId: validItem },
      { _id: 'inv_dangling', quantity: 1, itemId: '6a91b15ba9e03dc91c54bfe2' } // raw unpopulated ObjectId string
    ]
  };

  const results = listEligibleInventory(mockPlayer, 'gu_feed');
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].name, 'Herba Embun');
  assert.strictEqual(results.totalScanned, 2, 'Total scanned should be 2');
  assert.strictEqual(results.skippedUnpopulated, 1, 'Skipped unpopulated should be 1');
});

console.log('\n================================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
console.log('================================================================\n');
