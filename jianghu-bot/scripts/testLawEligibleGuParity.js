/**
 * scripts/testLawEligibleGuParity.js
 *
 * QA TEST SUITE: GU & LAW ELIGIBLE INVENTORY + CONSUME PARITY
 *
 * Skenario:
 * GU-1  : Inventory material/essence tanpa nama "serangga" muncul di gu_feed
 * GU-2  : Item bertag gu_food selalu muncul
 * GU-3  : Weapon/Armor tidak muncul di gu_feed
 * GU-4  : Item tier > playerTier muncul dengan allowed: false + lockedReason
 * BST-1 : beast_feed daging bertag meat / beast_food muncul
 * EL-1  : Fire law + fire_essence muncul di element_absorb
 * ABS-1 : POST feed itemId dari eligible list lolos isItemEligibleForPurpose & consumeInventoryItem qty-1
 */

const assert = require('assert');
const {
  listEligibleInventory,
  isItemEligibleForPurpose,
  consumeInventoryItem,
  resolvePlayerTier,
  LAW_ESSENCE_PROFILE
} = require('../utils/lawCultivationEngine');

console.log('================================================================');
console.log('🧪 RUNNING QA TEST: GU & ALL LAWS ELIGIBLE INVENTORY PARITY');
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
// GU-1: Inventory generic material/essence items without Gu/insect tags or name are excluded
// ─────────────────────────────────────────────────────────────────────────────
runTest('GU-1', 'Generic material/essence items without Gu/insect tags are strictly excluded from gu_feed', () => {
  const genericMaterialItems = Array.from({ length: 10 }, (_, i) => ({
    _id: `inv_mat_${i + 1}`,
    quantity: 5,
    itemId: {
      _id: `item_mat_${i + 1}`,
      name: `Herba Esensi Alam ${i + 1}`,
      category: 'material',
      tier: 1,
      tags: ['material', 'essence']
    }
  }));

  const mockPlayer = {
    cultivationLaw: {
      activeLawType: 'gu_master',
      rank: 0 // tier 1
    },
    inventory: genericMaterialItems
  };

  const eligible = listEligibleInventory(mockPlayer, 'gu_feed');
  assert.strictEqual(eligible.length, 0, `Generic material/essence must NOT appear in gu_feed, got ${eligible.length}`);
  genericMaterialItems.forEach(item => {
    assert.strictEqual(isItemEligibleForPurpose(item.itemId, 'gu_feed', 'gu_master'), false, `Item ${item.itemId.name} must be rejected`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GU-2: Item bertag gu_food selalu muncul
// ─────────────────────────────────────────────────────────────────────────────
runTest('GU-2', 'Items tagged gu_food always appear in gu_feed regardless of strange name', () => {
  const mockPlayer = {
    cultivationLaw: {
      activeLawType: 'gu_master',
      rank: 0
    },
    inventory: [
      {
        _id: 'inv_gu_special',
        quantity: 2,
        itemId: {
          _id: 'item_gu_special',
          name: 'Kue Aneh Gunung Mistis',
          category: 'consumable',
          tier: 1,
          tags: ['gu_food']
        }
      },
      {
        _id: 'inv_gu_feed_tag',
        quantity: 1,
        itemId: {
          _id: 'item_gu_feed_tag',
          name: 'Racikan Rahasia Gua',
          category: 'misc',
          tier: 1,
          tags: ['gu_feed']
        }
      }
    ]
  };

  const eligible = listEligibleInventory(mockPlayer, 'gu_feed');
  assert.strictEqual(eligible.length, 2, `Both gu_food and gu_feed tagged items must appear`);
  const names = eligible.map(e => e.name);
  assert(names.includes('Kue Aneh Gunung Mistis'));
  assert(names.includes('Racikan Rahasia Gua'));
});

// ─────────────────────────────────────────────────────────────────────────────
// GU-3: Sword category weapon tidak muncul
// ─────────────────────────────────────────────────────────────────────────────
runTest('GU-3', 'Sword / Armor equipment strictly excluded from gu_feed', () => {
  const mockPlayer = {
    cultivationLaw: {
      activeLawType: 'gu_master',
      rank: 0
    },
    inventory: [
      {
        _id: 'inv_weap_1',
        quantity: 1,
        itemId: {
          _id: 'item_weap_1',
          name: 'Pedang Besi Karat',
          category: 'weapon',
          tier: 1,
          tags: ['sword', 'weapon']
        }
      },
      {
        _id: 'inv_armor_1',
        quantity: 1,
        itemId: {
          _id: 'item_armor_1',
          name: 'Zirah Kulit Serigala',
          category: 'armor',
          tier: 1,
          tags: ['armor']
        }
      },
      {
        _id: 'inv_valid_1',
        quantity: 3,
        itemId: {
          _id: 'item_valid_1',
          name: 'Larva Rawa',
          category: 'material',
          tier: 1,
          tags: ['gu_food', 'material']
        }
      }
    ]
  };

  const eligible = listEligibleInventory(mockPlayer, 'gu_feed');
  assert.strictEqual(eligible.length, 1, `Only the valid larva item must appear`);
  assert.strictEqual(eligible[0].name, 'Larva Rawa');

  // Verify matcher rejects weapon and armor
  assert.strictEqual(isItemEligibleForPurpose(mockPlayer.inventory[0].itemId, 'gu_feed', 'gu_master'), false);
  assert.strictEqual(isItemEligibleForPurpose(mockPlayer.inventory[1].itemId, 'gu_feed', 'gu_master'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// GU-4: Tier > playerTier muncul disabled / allowed false
// ─────────────────────────────────────────────────────────────────────────────
runTest('GU-4', 'Item with tier > playerTier appears with allowed: false and lockedReason', () => {
  const mockPlayer = {
    cultivationLaw: {
      activeLawType: 'gu_master',
      rank: 0 // tier 1
    },
    inventory: [
      {
        _id: 'inv_tier_1',
        quantity: 5,
        itemId: {
          _id: 'item_tier_1',
          name: 'Larva Serangga Rendah',
          category: 'material',
          tier: 1,
          tags: ['gu_food']
        }
      },
      {
        _id: 'inv_tier_3',
        quantity: 1,
        itemId: {
          _id: 'item_tier_3',
          name: 'Madu Ratu Kalajengking Langka',
          category: 'material',
          tier: 3, // over-tier for rank 0 player
          tags: ['gu_food']
        }
      }
    ]
  };

  const eligible = listEligibleInventory(mockPlayer, 'gu_feed');
  assert.strictEqual(eligible.length, 2, 'Both items should be listed in picker');

  const lowTier = eligible.find(i => i.name === 'Larva Serangga Rendah');
  const highTier = eligible.find(i => i.name === 'Madu Ratu Kalajengking Langka');

  assert.strictEqual(lowTier.allowed, true, 'Tier 1 item should be allowed');
  assert.strictEqual(highTier.allowed, false, 'Tier 3 item should NOT be allowed');
  assert.strictEqual(highTier.lockedReason, 'Di atas ranah', 'Locked reason must be "Di atas ranah"');
});

// ─────────────────────────────────────────────────────────────────────────────
// BST-1: beast_feed daging bertag meat muncul
// ─────────────────────────────────────────────────────────────────────────────
runTest('BST-1', 'beast_feed with meat / beast_food appears and excludes equipment', () => {
  const mockPlayer = {
    cultivationLaw: {
      activeLawType: 'natal_beast',
      rank: 1 // tier 2
    },
    inventory: [
      {
        _id: 'inv_meat_1',
        quantity: 10,
        itemId: {
          _id: 'item_meat_1',
          name: 'Daging Rusa Gunung',
          category: 'material',
          tier: 1,
          tags: ['meat', 'beast_food', 'material']
        }
      },
      {
        _id: 'inv_meat_2',
        quantity: 2,
        itemId: {
          _id: 'item_meat_2',
          name: 'Daging Siluman Berenergi',
          category: 'material',
          tier: 2,
          tags: ['beast_meat', 'essence']
        }
      },
      {
        _id: 'inv_weap_2',
        quantity: 1,
        itemId: {
          _id: 'item_weap_2',
          name: 'Tombak Pemburu',
          category: 'weapon',
          tier: 1,
          tags: ['staff', 'weapon']
        }
      }
    ]
  };

  const eligible = listEligibleInventory(mockPlayer, 'beast_feed');
  assert.strictEqual(eligible.length, 2, 'Both meats should be eligible for beast_feed');
  const names = eligible.map(e => e.name);
  assert(names.includes('Daging Rusa Gunung'));
  assert(names.includes('Daging Siluman Berenergi'));
  assert(!names.includes('Tombak Pemburu'));

  assert(isItemEligibleForPurpose(mockPlayer.inventory[0].itemId, 'beast_feed', 'natal_beast'));
  assert(isItemEligibleForPurpose(mockPlayer.inventory[1].itemId, 'beast_feed', 'natal_beast'));
  assert(!isItemEligibleForPurpose(mockPlayer.inventory[2].itemId, 'beast_feed', 'natal_beast'));
});

// ─────────────────────────────────────────────────────────────────────────────
// EL-1: fire law + fire_essence muncul di element_absorb
// ─────────────────────────────────────────────────────────────────────────────
runTest('EL-1', 'Fire law + fire_essence item appears in element_absorb', () => {
  const mockPlayer = {
    cultivationLaw: {
      activeLawType: 'phoenix_nirvana', // fire element law
      rank: 2 // tier 3
    },
    inventory: [
      {
        _id: 'inv_fire_1',
        quantity: 4,
        itemId: {
          _id: 'item_fire_1',
          name: 'Batu Api Purba',
          category: 'material',
          tier: 2,
          tags: ['fire_essence', 'material', 'essence']
        }
      },
      {
        _id: 'inv_water_1',
        quantity: 3,
        itemId: {
          _id: 'item_water_1',
          name: 'Mutiara Air Dingin',
          category: 'material',
          tier: 2,
          tags: ['water_essence', 'material']
        }
      }
    ]
  };

  const eligible = listEligibleInventory(mockPlayer, 'element_absorb');
  assert.strictEqual(eligible.length, 1, 'Only fire_essence matches phoenix_nirvana element_absorb');
  assert.strictEqual(eligible[0].name, 'Batu Api Purba');
  assert.strictEqual(eligible[0].allowed, true);

  assert(isItemEligibleForPurpose(mockPlayer.inventory[0].itemId, 'element_absorb', 'phoenix_nirvana'));
  assert(!isItemEligibleForPurpose(mockPlayer.inventory[1].itemId, 'element_absorb', 'phoenix_nirvana'));
});

// ─────────────────────────────────────────────────────────────────────────────
// ABS-1: POST feed itemId dari eligible list lolos dan consume qty-1
// ─────────────────────────────────────────────────────────────────────────────
runTest('ABS-1', 'Full consume parity: item in eligible list passes validation and consumes 1 qty', () => {
  const itemDoc = {
    _id: 'item_gu_feed_valid_01',
    name: 'Madu Bunga Beracun',
    category: 'material',
    tier: 1,
    tags: ['gu_food', 'material']
  };

  const mockPlayer = {
    cultivationLaw: {
      activeLawType: 'gu_master',
      rank: 0
    },
    inventory: [
      {
        _id: 'inv_entry_01',
        quantity: 3,
        itemId: itemDoc
      }
    ],
    markModified: () => {}
  };

  // 1. Get from eligible list
  const eligible = listEligibleInventory(mockPlayer, 'gu_feed');
  assert.strictEqual(eligible.length, 1);
  const pickedItem = eligible[0];

  // 2. Validate via shared isItemEligibleForPurpose
  const isEligible = isItemEligibleForPurpose(pickedItem, 'gu_feed', 'gu_master');
  assert.strictEqual(isEligible, true, 'Picked item must pass isItemEligibleForPurpose');

  // 3. Consume item by its itemId
  const itemIdToConsume = (pickedItem.itemId || pickedItem._id).toString();
  const result = consumeInventoryItem(mockPlayer, itemIdToConsume, 1);
  assert.strictEqual(result.quantityRemaining, 2);
  assert.strictEqual(result.consumedName, 'Madu Bunga Beracun');
  assert.strictEqual(mockPlayer.inventory[0].quantity, 2);

  // 4. Ineligible attempt (e.g. attempting to feed a weapon) must be blocked by isItemEligibleForPurpose
  const fakeWeapon = {
    _id: 'item_sword_99',
    name: 'Pedang Sakti Naga Emas',
    category: 'weapon',
    tier: 1,
    tags: ['weapon', 'sword']
  };
  const isWeaponEligible = isItemEligibleForPurpose(fakeWeapon, 'gu_feed', 'gu_master');
  assert.strictEqual(isWeaponEligible, false, 'Weapon cannot pass isItemEligibleForPurpose for gu_feed');
});

console.log('\n================================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED PERFECTLY!`);
console.log('================================================================\n');
