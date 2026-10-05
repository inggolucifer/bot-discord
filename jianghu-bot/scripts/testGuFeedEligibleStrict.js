/**
 * scripts/testGuFeedEligibleStrict.js
 *
 * QA UNIT TEST SUITE: STRICT GU FEED ELIGIBILITY & BEAST/ARTIFACT PARITY
 *
 * Menguji skenario G1 - G7 sesuai instruksi prompt:
 * G1: tags ['gu_food'] -> YA eligible gu_feed
 * G2: name "Larva Tanah", cat 'material' -> YA eligible gu_feed
 * G3: tags ['essence', 'material'], name "Kristal Esensi Api" -> TIDAK eligible gu_feed
 * G4: sword / armor (equipment) -> TIDAK eligible gu_feed
 * G5: name "Daging Monster", cat 'food'/'material' -> TIDAK untuk gu_feed, YA untuk beast_feed
 * G6: Item G3 ditolak oleh matcher kelayakan (isItemEligibleForPurpose return false)
 * G7: Item G1 diterima oleh matcher kelayakan & dapat dikonsumsi via consumeInventoryItem
 * G8: listEligibleInventory hanya memuat G1 & G2 dari tas campuran (G3, G4, G5 disaring keluar)
 */

const assert = require('assert');
const {
  isItemEligibleForPurpose,
  listEligibleInventory,
  consumeInventoryItem,
  LAW_ESSENCE_PROFILE
} = require('../utils/lawCultivationEngine');

console.log('================================================================');
console.log('🧪 RUNNING STRICT QA TESTS: GU FEED & ESSENCE ELIGIBILITY');
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
// G1: Item dengan tag gu_food -> YA
// ─────────────────────────────────────────────────────────────────────────────
runTest('G1', 'Item with tag gu_food is eligible for gu_feed', () => {
  const itemG1 = {
    _id: 'item_g1',
    name: 'Serbuk Bunga Misterius',
    category: 'consumable',
    tier: 1,
    tags: ['gu_food']
  };
  const eligible = isItemEligibleForPurpose(itemG1, 'gu_feed', 'gu_master');
  assert.strictEqual(eligible, true, 'Item with gu_food tag must be eligible');
});

// ─────────────────────────────────────────────────────────────────────────────
// G2: Item dengan name "Larva Tanah", category 'material' -> YA
// ─────────────────────────────────────────────────────────────────────────────
runTest('G2', 'Item named "Larva Tanah", cat material is eligible for gu_feed', () => {
  const itemG2 = {
    _id: 'item_g2',
    name: 'Larva Tanah Lembah Hitam',
    category: 'material',
    tier: 1,
    tags: ['material']
  };
  const eligible = isItemEligibleForPurpose(itemG2, 'gu_feed', 'gu_master');
  assert.strictEqual(eligible, true, 'Larva item must be eligible for gu_feed');
});

// ─────────────────────────────────────────────────────────────────────────────
// G3: Item tags ['essence', 'material'], name "Kristal Esensi Api" -> TIDAK
// ─────────────────────────────────────────────────────────────────────────────
runTest('G3', 'Generic essence material "Kristal Esensi Api" is REJECTED for gu_feed', () => {
  const itemG3 = {
    _id: 'item_g3',
    name: 'Kristal Esensi Api',
    category: 'material',
    tier: 1,
    tags: ['material', 'essence']
  };
  const eligible = isItemEligibleForPurpose(itemG3, 'gu_feed', 'gu_master');
  assert.strictEqual(eligible, false, 'Generic essence must NOT be eligible for gu_feed');
});

// ─────────────────────────────────────────────────────────────────────────────
// G4: Sword & Armor -> TIDAK
// ─────────────────────────────────────────────────────────────────────────────
runTest('G4', 'Weapons and Armor are REJECTED for gu_feed', () => {
  const sword = {
    _id: 'item_sword',
    name: 'Pedang Baja Tempaan',
    category: 'weapon',
    tier: 1,
    tags: ['weapon', 'sword']
  };
  const armor = {
    _id: 'item_armor',
    name: 'Zirah Kulit Serigala',
    category: 'armor',
    tier: 1,
    tags: ['armor']
  };
  assert.strictEqual(isItemEligibleForPurpose(sword, 'gu_feed', 'gu_master'), false, 'Sword must be rejected');
  assert.strictEqual(isItemEligibleForPurpose(armor, 'gu_feed', 'gu_master'), false, 'Armor must be rejected');
});

// ─────────────────────────────────────────────────────────────────────────────
// G5: "Daging Monster" -> TIDAK untuk gu_feed, YA untuk beast_feed
// ─────────────────────────────────────────────────────────────────────────────
runTest('G5', '"Daging Monster" is REJECTED for gu_feed, but ELIGIBLE for beast_feed', () => {
  const itemG5 = {
    _id: 'item_g5',
    name: 'Daging Monster Buas',
    category: 'food',
    tier: 1,
    tags: ['food', 'meat']
  };
  const forGu = isItemEligibleForPurpose(itemG5, 'gu_feed', 'gu_master');
  assert.strictEqual(forGu, false, '"Daging Monster" must NOT be eligible for gu_feed');

  const forBeast = isItemEligibleForPurpose(itemG5, 'beast_feed', 'natal_beast');
  assert.strictEqual(forBeast, true, '"Daging Monster" MUST be eligible for beast_feed');
});

// ─────────────────────────────────────────────────────────────────────────────
// G5b: False-positive prevention: "Anggur Hitam" tidak boleh lolos gu_feed
// ─────────────────────────────────────────────────────────────────────────────
runTest('G5b', 'False positive name check: "Anggur Hitam" is REJECTED for gu_feed', () => {
  const wineItem = {
    _id: 'item_wine',
    name: 'Anggur Hitam Fermentasi',
    category: 'food',
    tier: 1,
    tags: ['food', 'wine']
  };
  const eligible = isItemEligibleForPurpose(wineItem, 'gu_feed', 'gu_master');
  assert.strictEqual(eligible, false, '"Anggur Hitam" must not trigger gu regex false positive');
});

// ─────────────────────────────────────────────────────────────────────────────
// G6: POST feed handler logic - G3 ditolak
// ─────────────────────────────────────────────────────────────────────────────
runTest('G6', 'Simulated POST /gu/feed with G3 item triggers not eligible error', () => {
  const itemG3 = {
    _id: 'item_g3',
    name: 'Kristal Esensi Api',
    category: 'material',
    tier: 1,
    tags: ['material', 'essence']
  };
  const isEligible = isItemEligibleForPurpose(itemG3, 'gu_feed', 'gu_master');
  assert.strictEqual(isEligible, false, 'Handler must reject G3 item');
});

// ─────────────────────────────────────────────────────────────────────────────
// G7: POST feed handler logic - G1 lolos dan quantity berkurang via consumeInventoryItem
// ─────────────────────────────────────────────────────────────────────────────
runTest('G7', 'Simulated POST /gu/feed with G1 item succeeds and consumes quantity', () => {
  const itemG1 = {
    _id: 'item_g1',
    name: 'Madu Ratu Lebah Hutan',
    category: 'food',
    tier: 1,
    tags: ['gu_food', 'food']
  };
  const isEligible = isItemEligibleForPurpose(itemG1, 'gu_feed', 'gu_master');
  assert.strictEqual(isEligible, true, 'Handler must accept G1 item');

  const mockPlayer = {
    inventory: [
      {
        itemId: itemG1,
        quantity: 5
      }
    ],
    markModified: () => {}
  };

  const consumed = consumeInventoryItem(mockPlayer, 'item_g1', 1);
  assert.strictEqual(consumed.inventoryDelta, true, 'consumeInventoryItem must set inventoryDelta to true');
  assert.strictEqual(consumed.quantityRemaining, 4, 'quantityRemaining must be 4');
  assert.strictEqual(mockPlayer.inventory[0].quantity, 4, 'Quantity must decrease from 5 to 4');
});

// ─────────────────────────────────────────────────────────────────────────────
// G8: listEligibleInventory only includes G1 & G2 from mixed inventory
// ─────────────────────────────────────────────────────────────────────────────
runTest('G8', 'listEligibleInventory filters strictly: only G1 and G2 appear, G3/G4/G5 excluded', () => {
  const mockPlayer = {
    cultivationLaw: {
      activeLawType: 'gu_master',
      rank: 0
    },
    inventory: [
      {
        _id: 'inv_1',
        quantity: 2,
        itemId: {
          _id: 'item_1',
          name: 'Larva Sutra Esensial',
          category: 'material',
          tier: 1,
          tags: ['gu_larva', 'material']
        }
      },
      {
        _id: 'inv_2',
        quantity: 3,
        itemId: {
          _id: 'item_2',
          name: 'Pakan Gu Khusus Tingkat Rendah',
          category: 'material',
          tier: 1,
          tags: ['material']
        }
      },
      {
        _id: 'inv_3',
        quantity: 10,
        itemId: {
          _id: 'item_3',
          name: 'Kristal Esensi Api',
          category: 'material',
          tier: 1,
          tags: ['material', 'essence']
        }
      },
      {
        _id: 'inv_4',
        quantity: 1,
        itemId: {
          _id: 'item_4',
          name: 'Pedang Besi Tajam',
          category: 'weapon',
          tier: 1,
          tags: ['weapon']
        }
      },
      {
        _id: 'inv_5',
        quantity: 5,
        itemId: {
          _id: 'item_5',
          name: 'Daging Monster Buas',
          category: 'food',
          tier: 1,
          tags: ['food', 'meat']
        }
      }
    ]
  };

  const eligible = listEligibleInventory(mockPlayer, 'gu_feed');
  assert.strictEqual(eligible.length, 2, `Expected exactly 2 eligible items, got ${eligible.length}`);
  const names = eligible.map(e => e.name);
  assert(names.includes('Larva Sutra Esensial'), 'Larva item must be in list');
  assert(names.includes('Pakan Gu Khusus Tingkat Rendah'), 'Pakan Gu item must be in list');
  assert(!names.includes('Kristal Esensi Api'), 'Kristal Esensi Api must NOT be in list');
  assert(!names.includes('Pedang Besi Tajam'), 'Pedang must NOT be in list');
  assert(!names.includes('Daging Monster Buas'), 'Daging Monster must NOT be in list');
});

// ─────────────────────────────────────────────────────────────────────────────
// G9: Artifact infuse parity - generic herb/meat rejected, whetstone/ore accepted
// ─────────────────────────────────────────────────────────────────────────────
runTest('G9', 'Artifact infuse parity: whetstone/ore accepted, generic herb/meat rejected', () => {
  const whetstone = {
    _id: 'whet_1',
    name: 'Batu Asah Alami',
    category: 'material',
    tier: 1,
    tags: ['whetstone', 'material']
  };
  const herb = {
    _id: 'herb_1',
    name: 'Rumput Embun Roh',
    category: 'herb',
    tier: 1,
    tags: ['herb', 'essence']
  };
  assert.strictEqual(isItemEligibleForPurpose(whetstone, 'artifact_infuse', 'natal_artifact'), true, 'Whetstone must be eligible');
  assert.strictEqual(isItemEligibleForPurpose(herb, 'artifact_infuse', 'natal_artifact'), false, 'Herb must NOT be eligible for artifact infuse');
});

console.log(`\n🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
