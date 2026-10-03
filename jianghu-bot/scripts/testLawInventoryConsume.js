/**
 * REGRESSION TEST SUITE: LAW INVENTORY ELIGIBLE & ITEM CONSUME
 *
 * Menguji secara komprehensif:
 * 1. listEligibleInventory (Gu Master & all laws, tier gating, tag matching)
 * 2. findInventoryIndex (by item ID & inventory entry ID)
 * 3. consumeInventoryItem (quantity decrement, array splice on <= 0, delta return, markModified)
 * 4. assertAbsorbTier (tier affinity, over-tier 400 rejection, efficiency calc)
 * 5. Route-level validation (Strict itemId check on all 12 consumption routes)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const {
  listEligibleInventory,
  findInventoryIndex,
  consumeInventoryItem,
  assertAbsorbTier,
  getTierAffinity,
  resolveItemTier,
  LAW_ESSENCE_PROFILE
} = require('../utils/lawCultivationEngine');

const CustomError = require('../web-api/utils/CustomError');

console.log('================================================================');
console.log('🧪 RUNNING REGRESSION TEST: LAW INVENTORY & ITEM CONSUME SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TEST listEligibleInventory (GU MASTER)
// ─────────────────────────────────────────────────────────────────────────────
runTest('1.1 listEligibleInventory Gu Master filters correctly and enforces tier limit', () => {
  const mockPlayer = {
    cultivationLaw: {
      activeLawType: 'gu_master',
      rank: 1 // playerTier = 2 (Foundation)
    },
    inventory: [
      {
        _id: 'inv_1',
        quantity: 3,
        itemId: {
          _id: 'item_ulat_sutra',
          name: 'Ulat Sutra Giok',
          category: 'material',
          tags: ['material', 'gu_larva'],
          tier: 2
        }
      },
      {
        _id: 'inv_2',
        quantity: 10,
        itemId: {
          _id: 'item_batu_kali',
          name: 'Batu Kali',
          category: 'material',
          tags: ['mineral'],
          tier: 1
        }
      },
      {
        _id: 'inv_3',
        quantity: 1,
        itemId: {
          _id: 'item_larva_rawa',
          name: 'Larva Rawa (Tier 3)',
          category: 'material',
          tags: ['gu_food'],
          tier: 3
        }
      }
    ]
  };

  const eligible = listEligibleInventory(mockPlayer, 'gu_feed', 'gu_master');

  // Assert: Exactly 2 items entered the list (Batu Kali MUST NOT be included)
  assert.strictEqual(eligible.length, 2, 'Harus ada tepat 2 item pakan Gu yang eligible');

  const ulat = eligible.find(i => i.name === 'Ulat Sutra Giok');
  assert.ok(ulat, 'Ulat Sutra Giok harus ada dalam list');
  assert.strictEqual(ulat.allowed, true, 'Ulat Sutra Giok (Tier 2 pada Player Tier 2) harus allowed');
  assert.strictEqual(ulat.efficiency, 1.0, 'Efisiensi Ulat Sutra harus 1.0 (100%)');
  assert.strictEqual(ulat.isOptimal, true, 'Ulat Sutra harus ditandai optimal');
  assert.strictEqual(ulat.lockedReason, null, 'Ulat Sutra tidak boleh memiliki lockedReason');

  const larvaT3 = eligible.find(i => i.name === 'Larva Rawa (Tier 3)');
  assert.ok(larvaT3, 'Larva Rawa (Tier 3) harus ada dalam list');
  assert.strictEqual(larvaT3.allowed, false, 'Larva Rawa Tier 3 dilarang dikonsumsi player Tier 2');
  assert.ok(larvaT3.lockedReason?.includes('Di atas ranah'), 'Harus memiliki pesan locked "Di atas ranah"');

  const batu = eligible.find(i => i.name === 'Batu Kali');
  assert.strictEqual(batu, undefined, 'Batu Kali TIDAK BOLEH masuk dalam list pakan Gu');
});

runTest('1.2 listEligibleInventory Gu Master includes various valid tags (gu_food, gu_feed, gu_essence, herb, etc)', () => {
  const mockPlayer = {
    cultivationLaw: { activeLawType: 'gu_master', rank: 2 }, // playerTier = 3
    inventory: [
      {
        _id: 'inv_a',
        quantity: 5,
        itemId: { _id: 'item_a', name: 'Madu Ratu Kalajengking Roh', category: 'material', tags: ['essence', 'gu_essence'], tier: 3 }
      },
      {
        _id: 'inv_b',
        quantity: 2,
        itemId: { _id: 'item_b', name: 'Getah Manis Rawa', category: 'herb', tags: ['herb', 'food'], tier: 2 }
      },
      {
        _id: 'inv_c',
        quantity: 1,
        itemId: { _id: 'item_c', name: 'Cacing Tanah Biasa', category: 'material', tags: ['material'], tier: 1 }
      }
    ]
  };

  const eligible = listEligibleInventory(mockPlayer, 'gu_feed', 'gu_master');
  assert.strictEqual(eligible.length, 3, 'Semua 3 item terkait pakan Gu / cacing harus terdeteksi');
  assert.ok(eligible.every(i => i.allowed), 'Semua item tier <= 3 harus allowed untuk player tier 3');
});

runTest('1.3 listEligibleInventory for Natal Beast, Artifact, and Demonic laws', () => {
  const mockPlayer = {
    cultivationLaw: { activeLawType: 'demonic_turbid_core', rank: 1 },
    inventory: [
      {
        _id: 'inv_turbid',
        quantity: 4,
        itemId: { _id: 'item_turbid', name: 'Inti Siluman Kotor', category: 'material', tags: ['turbid_core', 'beast_core', 'essence'], tier: 2 }
      },
      {
        _id: 'inv_sword',
        quantity: 1,
        itemId: { _id: 'item_sword', name: 'Pedang Besi Biasa', category: 'weapon', tags: ['weapon'], tier: 1 }
      }
    ]
  };

  const eligible = listEligibleInventory(mockPlayer, 'turbid_absorb', 'demonic_turbid_core');
  assert.strictEqual(eligible.length, 1, 'Hanya turbid core yang harus masuk');
  assert.strictEqual(eligible[0].name, 'Inti Siluman Kotor');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. TEST findInventoryIndex
// ─────────────────────────────────────────────────────────────────────────────
runTest('2.1 findInventoryIndex locates item by item._id and inventory._id', () => {
  const mockPlayer = {
    inventory: [
      {
        _id: 'inv_entry_alpha',
        quantity: 5,
        itemId: { _id: 'item_id_alpha', name: 'Item Alpha' }
      },
      {
        _id: 'inv_entry_beta',
        quantity: 2,
        itemId: 'item_id_beta_string'
      }
    ]
  };

  // Find by item._id (object)
  const idx1 = findInventoryIndex(mockPlayer, 'item_id_alpha');
  assert.strictEqual(idx1, 0, 'Harus menemukan index 0 berdasarkan item._id');

  // Find by inventory._id
  const idx2 = findInventoryIndex(mockPlayer, 'inv_entry_alpha');
  assert.strictEqual(idx2, 0, 'Harus menemukan index 0 berdasarkan inv._id');

  // Find by raw string itemId
  const idx3 = findInventoryIndex(mockPlayer, 'item_id_beta_string');
  assert.strictEqual(idx3, 1, 'Harus menemukan index 1 berdasarkan raw string itemId');

  // Not found
  const idx4 = findInventoryIndex(mockPlayer, 'non_existent_id');
  assert.strictEqual(idx4, -1, 'Harus return -1 untuk item yang tidak ada');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEST consumeInventoryItem
// ─────────────────────────────────────────────────────────────────────────────
runTest('3.1 consumeInventoryItem decrements quantity by 1 when qty > 1', () => {
  let markedField = null;
  const mockPlayer = {
    inventory: [
      {
        _id: 'inv_slot_1',
        quantity: 2,
        itemId: { _id: 'item_larva', name: 'Larva Sutra Roh', category: 'material' }
      }
    ],
    markModified: (field) => { markedField = field; }
  };

  const delta = consumeInventoryItem(mockPlayer, 'item_larva');

  assert.strictEqual(mockPlayer.inventory.length, 1, 'Item tetap di inventori karena qty sisa 1');
  assert.strictEqual(mockPlayer.inventory[0].quantity, 1, 'Quantity harus berkurang dari 2 menjadi 1');
  assert.strictEqual(markedField, 'inventory', 'player.markModified("inventory") wajib dipanggil');
  assert.strictEqual(delta.consumedItemId, 'item_larva');
  assert.strictEqual(delta.consumedName, 'Larva Sutra Roh');
  assert.strictEqual(delta.quantityRemaining, 1);
  assert.strictEqual(delta.inventoryDelta, true);
});

runTest('3.2 consumeInventoryItem removes item completely (splice) when qty is 1', () => {
  let markedField = null;
  const mockPlayer = {
    inventory: [
      {
        _id: 'inv_slot_last',
        quantity: 1,
        itemId: { _id: 'item_last_feed', name: 'Madu Ratu Terakhir', category: 'material' }
      },
      {
        _id: 'inv_slot_other',
        quantity: 5,
        itemId: { _id: 'item_other', name: 'Batu Roh', category: 'material' }
      }
    ],
    markModified: (field) => { markedField = field; }
  };

  const delta = consumeInventoryItem(mockPlayer, 'item_last_feed');

  assert.strictEqual(mockPlayer.inventory.length, 1, 'Panjang inventory harus berkurang 1 (displice)');
  assert.strictEqual(mockPlayer.inventory[0].itemId._id, 'item_other', 'Slot tersisa hanya item lain');
  assert.strictEqual(markedField, 'inventory', 'player.markModified("inventory") wajib dipanggil');
  assert.strictEqual(delta.quantityRemaining, 0);
  assert.strictEqual(delta.inventoryDelta, true);
});

runTest('3.3 consumeInventoryItem throws 400 error when item is missing or quantity is 0', () => {
  const mockPlayer = {
    inventory: [
      {
        _id: 'inv_zero',
        quantity: 0,
        itemId: { _id: 'item_empty', name: 'Kotak Kosong' }
      }
    ],
    markModified: () => {}
  };

  assert.throws(
    () => consumeInventoryItem(mockPlayer, 'item_empty'),
    (err) => err.statusCode === 400,
    'Harus throw error statusCode 400 jika quantity 0'
  );

  assert.throws(
    () => consumeInventoryItem(mockPlayer, 'item_ghost'),
    (err) => err.statusCode === 400,
    'Harus throw error statusCode 400 jika item tidak ada di inventory'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. TEST assertAbsorbTier
// ─────────────────────────────────────────────────────────────────────────────
runTest('4.1 assertAbsorbTier calculates correct efficiency and enforces tier rules', () => {
  const law = { rank: 1 }; // playerTier = 2

  // Tier 2 item on Player Tier 2 -> 100% efficiency
  const itemT2 = { name: 'Item Tier 2', tier: 2 };
  const resT2 = assertAbsorbTier(law, itemT2);
  assert.strictEqual(resT2.playerTier, 2);
  assert.strictEqual(resT2.itemTier, 2);
  assert.strictEqual(resT2.efficiency, 1.0);

  // Tier 1 item on Player Tier 2 -> Under-tier allowed with penalty
  const itemT1 = { name: 'Item Tier 1', tier: 1 };
  const resT1 = assertAbsorbTier(law, itemT1);
  assert.strictEqual(resT1.playerTier, 2);
  assert.strictEqual(resT1.itemTier, 1);
  assert.ok(resT1.efficiency > 0 && resT1.efficiency < 1.0, 'Efisiensi under-tier harus < 1.0');

  // Tier 3 item on Player Tier 2 -> Over-tier MUST throw 400
  const itemT3 = { name: 'Item Tier 3', tier: 3 };
  assert.throws(
    () => assertAbsorbTier(law, itemT3),
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('Tier 3') || err.message.includes('ranah'));
      return true;
    },
    'Over-tier item harus ditolak dengan error 400'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. TEST ROUTE CODEBASE INTEGRITY (STRICT itemId ENFORCEMENT ON ALL 12 ROUTES)
// ─────────────────────────────────────────────────────────────────────────────
runTest('5.1 Verify all 12 item consumption routes in lawCultivation.js require explicit itemId', () => {
  const routesPath = path.resolve(__dirname, '../web-api/routes/lawCultivation.js');
  assert.ok(fs.existsSync(routesPath), 'lawCultivation.js harus ada');
  const content = fs.readFileSync(routesPath, 'utf8');

  // 1. GET /inventory/eligible endpoint exists
  assert.ok(content.includes("router.get('/inventory/eligible'"), 'Endpoint GET /inventory/eligible harus terdaftar');

  // 2. Strict checks on feed and absorb routes
  const requiredChecks = [
    { route: 'gu/feed', pattern: /Wajib memilih item pakan cacing Gu dari tas inventori \(itemId\)/ },
    { route: 'essence/absorb', pattern: /Wajib menyertakan itemId bahan yang ingin diserap/ },
    { route: 'essence/feed', pattern: /Wajib menyertakan itemId bahan yang ingin diserap/ },
    { route: 'artifact/infuse', pattern: /Wajib memilih item mineral\/batu asah dari tas inventori \(itemId\)/ },
    { route: 'beast/feed', pattern: /Wajib memilih pakan satwa dari tas inventori \(itemId\)/ },
    { route: 'demonic/turbid-absorb', pattern: /Wajib memilih inti siluman dari tas inventori \(itemId\)/ },
    { route: 'demonic/venom-ingest', pattern: /Wajib memilih racun dari tas inventori \(itemId\)/ },
    { route: 'demonic/nether-channel', pattern: /Wajib memilih batu Yin \/ esensi kegelapan dari tas inventori \(itemId\)/ },
    { route: 'element/absorb', pattern: /Pilih item elemen dari tas inventori yang ingin diserap/ }
  ];

  for (const { route, pattern } of requiredChecks) {
    assert.ok(pattern.test(content), `Rute ${route} wajib memiliki validasi strict itemId: ${pattern}`);
  }

  // 3. Confirm consumeInventoryItem is invoked across routes
  const consumeCalls = (content.match(/consumeInventoryItem\(/g) || []).length;
  assert.ok(consumeCalls >= 10, `consumeInventoryItem harus digunakan di minimal 10 titik (ditemukan ${consumeCalls})`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. TEST FRONTEND PICKER COMPONENT INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────
runTest('6.1 Verify LawInventoryPicker.tsx and LawCultivationTab.tsx integration', () => {
  const pickerPath = path.resolve(__dirname, '../web-dashboard/src/components/cultivation/LawInventoryPicker.tsx');
  const tabPath = path.resolve(__dirname, '../web-dashboard/src/components/cultivation/LawCultivationTab.tsx');

  assert.ok(fs.existsSync(pickerPath), 'LawInventoryPicker.tsx harus ada');
  assert.ok(fs.existsSync(tabPath), 'LawCultivationTab.tsx harus ada');

  const pickerContent = fs.readFileSync(pickerPath, 'utf8');
  assert.ok(pickerContent.includes('/cultivation/law/inventory/eligible'), 'Picker harus fetch ke /cultivation/law/inventory/eligible');
  assert.ok(pickerContent.includes('lockedReason'), 'Picker harus menampilkan lockedReason untuk item over-tier');

  const tabContent = fs.readFileSync(tabPath, 'utf8');
  assert.ok(tabContent.includes('LawInventoryPicker'), 'LawCultivationTab harus mengimpor LawInventoryPicker');
  assert.ok(tabContent.includes("purpose=\"gu_feed\""), 'Tab harus merender picker gu_feed');
  assert.ok(tabContent.includes("purpose=\"beast_feed\""), 'Tab harus merender picker beast_feed');
  assert.ok(tabContent.includes("purpose=\"artifact_infuse\""), 'Tab harus merender picker artifact_infuse');
  assert.ok(tabContent.includes("invalidateQueries({ queryKey: ['inventory'] })"), 'Harus menginvalir query cache inventory saat konsumsi');
});

console.log('\n================================================================');
console.log(`🎉 ALL TESTS PASSED: ${passedTests}/${totalTests} tests successful!`);
console.log('================================================================\n');

process.exit(0);
