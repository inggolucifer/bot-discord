/**
 * Test Mandiri Otoritatif:
 * scripts/testCultivationTabTierBtPolish.js
 * 
 * Verifikasi End-to-End Fase G:
 * T1: rank2 + itemTier1 -> efficiency < 1, gain < same BASE itemTier3
 * T2: rank2 + itemTier4 -> throw/400
 * T3: breakthrough/stage tidak membaca player.currency
 * T4: consumeBreakthroughMaterials gagal tanpa material
 * T5: skill-tree node.effects defined for all LAW_SKILL_TREES ids
 * T6: hasLaw cultivation page source: no "Buka Pohon Dao" string
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const {
  LAW_DEFINITIONS,
  LAW_SKILL_TREES,
  getTierAffinity,
  assertAbsorbTier,
  getMiniBreakthroughCost,
  consumeBreakthroughMaterials,
  resolveItemTier,
  formatLawRealmDisplay
} = require('../utils/lawCultivationEngine');

console.log('================================================================');
console.log('🧪 RUNNING QA TEST: CULTIVATION TAB, TIER & BT MATERIAL POLISH');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(id, name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] [${id}] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] [${id}] ${name}:`, err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// T1: rank2 + itemTier1 -> efficiency < 1, gain < same BASE itemTier3
// ─────────────────────────────────────────────────────────────────────────────
runTest('T1', 'rank2 + itemTier1 -> efficiency < 1, gain < same BASE itemTier3', () => {
  const lawRank2 = { rank: 2 }; // playerTier = 3
  const itemTier1 = { name: 'Batu Roh Rendah', tier: 1, category: 'spirit_stone' };
  const itemTier3 = { name: 'Batu Roh Menengah', tier: 3, category: 'spirit_stone' };

  // Verifikasi tier resolution
  assert.strictEqual(resolveItemTier(itemTier1), 1, 'itemTier1 harus resolve ke tier 1');
  assert.strictEqual(resolveItemTier(itemTier3), 3, 'itemTier3 harus resolve ke tier 3');

  // assertAbsorbTier untuk itemTier1 (under-tier)
  const absorbResT1 = assertAbsorbTier(lawRank2, itemTier1);
  assert.strictEqual(absorbResT1.playerTier, 3, 'playerTier harus 3 (rank 2 + 1)');
  assert.strictEqual(absorbResT1.itemTier, 1, 'itemTier harus 1');
  assert.ok(absorbResT1.efficiency < 1, `Efisiensi tier 1 pada rank 2 harus < 1, didapat: ${absorbResT1.efficiency}`);
  assert.strictEqual(absorbResT1.efficiency, 0.2, 'Efisiensi under-tier selisih 2 harus tepat 0.20 (20%)');

  // assertAbsorbTier untuk itemTier3 (matched tier)
  const absorbResT3 = assertAbsorbTier(lawRank2, itemTier3);
  assert.strictEqual(absorbResT3.playerTier, 3);
  assert.strictEqual(absorbResT3.itemTier, 3);
  assert.strictEqual(absorbResT3.efficiency, 1.0, 'Efisiensi tier matching harus tepat 1.0 (100%)');

  // Hitung simulasi gain dengan formula engine: Math.floor(BASE * itemTier * efficiency)
  const BASE_FILL = 18;
  const gainT1 = Math.floor(BASE_FILL * absorbResT1.itemTier * absorbResT1.efficiency); // 18 * 1 * 0.2 = 3
  const gainT3 = Math.floor(BASE_FILL * absorbResT3.itemTier * absorbResT3.efficiency); // 18 * 3 * 1.0 = 54 -> capped to max 35

  assert.ok(gainT1 < 10, `Gain tier 1 harus < 10, didapat: ${gainT1}`);
  assert.ok(gainT1 < gainT3, `Gain tier 1 (${gainT1}) harus lebih kecil dari tier 3 (${gainT3})`);
});

// ─────────────────────────────────────────────────────────────────────────────
// T2: rank2 + itemTier4 -> throw/400
// ─────────────────────────────────────────────────────────────────────────────
runTest('T2', 'rank2 + itemTier4 -> throw/400 (over-tier absorb ditolak)', () => {
  const lawRank2 = { rank: 2 }; // playerTier = 3
  const itemTier4 = { name: 'Inti Roh Jiwa Murni', tier: 4, category: 'material' };

  let threw = false;
  let statusCode = 0;
  let errorMsg = '';

  try {
    assertAbsorbTier(lawRank2, itemTier4);
  } catch (err) {
    threw = true;
    statusCode = err.statusCode || 500;
    errorMsg = err.message;
  }

  assert.strictEqual(threw, true, 'assertAbsorbTier wajib melempar error saat over-tier');
  assert.strictEqual(statusCode, 400, `Status code harus 400, didapat: ${statusCode}`);
  assert.ok(
    errorMsg.includes('Kapasitas dantian') || errorMsg.includes('menolak'),
    `Pesan error harus menjelaskan penolakan dantian: ${errorMsg}`
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// T3: breakthrough/stage tidak membaca player.currency
// ─────────────────────────────────────────────────────────────────────────────
runTest('T3', 'breakthrough/stage tidak membaca atau memotong player.currency', () => {
  const law = {
    activeLawType: 'righteous_sword_heart',
    rank: 0,
    stage: 1,
    currentEssence: 100,
    maxEssence: 100
  };

  const initialCopper = 50000;
  const initialSilver = 1000;
  const initialGold = 50;

  const player = {
    copper: initialCopper,
    silver: initialSilver,
    gold: initialGold,
    inventory: [
      { itemId: { _id: 'mat_ss1', name: 'Batu Roh Fondasi', category: 'spirit_stone', tier: 1 }, quantity: 5 }
    ]
  };

  // Jalankan consumeBreakthroughMaterials
  const consumed = consumeBreakthroughMaterials(player, law, false);
  assert.ok(consumed, 'Material harus berhasil dikonsumsi');
  assert.strictEqual(consumed.consumedQty, 2, 'Kebutuhan material stage 1 rank 0 adalah 2');

  // Verifikasi mutlak: currency tidak berkurang sama sekali
  assert.strictEqual(player.copper, initialCopper, 'player.copper tidak boleh berkurang');
  assert.strictEqual(player.silver, initialSilver, 'player.silver tidak boleh berkurang');
  assert.strictEqual(player.gold, initialGold, 'player.gold tidak boleh berkurang');
});

// ─────────────────────────────────────────────────────────────────────────────
// T4: consumeBreakthroughMaterials gagal tanpa material
// ─────────────────────────────────────────────────────────────────────────────
runTest('T4', 'consumeBreakthroughMaterials gagal tanpa material valid', () => {
  const law = {
    activeLawType: 'element_phoenix_fire',
    rank: 1, // playerTier = 2
    stage: 3
  };

  // Kasus 4a: Pemain tanpa inventori sama sekali
  const emptyPlayer = { inventory: [] };
  let threwEmpty = false;
  try {
    consumeBreakthroughMaterials(emptyPlayer, law, false);
  } catch (err) {
    threwEmpty = true;
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.message.includes('Material terobosan tidak mencukupi') || err.message.includes('Tier ≤ 2'));
  }
  assert.strictEqual(threwEmpty, true, 'Harus melempar 400 jika inventori kosong');

  // Kasus 4b: Pemain hanya punya material over-tier (Tier 3 > playerTier 2)
  const overTierPlayer = {
    inventory: [
      { itemId: { _id: 'mat_t3', name: 'Kristal Api Suci', category: 'spirit_stone', tier: 3 }, quantity: 10 }
    ]
  };
  let threwOverTier = false;
  try {
    consumeBreakthroughMaterials(overTierPlayer, law, false);
  } catch (err) {
    threwOverTier = true;
    assert.strictEqual(err.statusCode, 400);
  }
  assert.strictEqual(threwOverTier, true, 'Harus melempar 400 jika hanya memiliki material di atas playerTier');

  // Kasus 4c: Major Breakthrough tanpa katalis tier >= playerTier (hanya punya tier 1 padahal butuh tier >= 2)
  const underTierPlayer = {
    inventory: [
      { itemId: { _id: 'mat_t1', name: 'Serpihan Roh Rendah', category: 'material', tier: 1 }, quantity: 10 }
    ]
  };
  let threwMajorNoCat = false;
  try {
    consumeBreakthroughMaterials(underTierPlayer, law, true);
  } catch (err) {
    threwMajorNoCat = true;
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.message.includes('terobosan besar') || err.message.includes('Katalis') || err.message.includes('Tier 2'));
  }
  assert.strictEqual(threwMajorNoCat, true, 'Major breakthrough harus gagal jika tanpa katalis tier >= playerTier');
});

// ─────────────────────────────────────────────────────────────────────────────
// T5: skill-tree node.effects defined for all LAW_SKILL_TREES ids
// ─────────────────────────────────────────────────────────────────────────────
runTest('T5', 'skill-tree node.effects defined for all LAW_SKILL_TREES ids', () => {
  const allTreeKeys = Object.keys(LAW_SKILL_TREES);
  assert.strictEqual(allTreeKeys.length, 20, `Harus ada 20 tree terdaftar, didapat: ${allTreeKeys.length}`);

  let totalNodesChecked = 0;

  for (const treeKey of allTreeKeys) {
    const tree = LAW_SKILL_TREES[treeKey];
    assert.ok(tree, `Tree ${treeKey} harus ada`);
    const nodes = tree.nodes || tree.skills || [];
    assert.strictEqual(nodes.length, 5, `Tree ${treeKey} harus memiliki tepat 5 node`);

    for (const node of nodes) {
      totalNodesChecked++;
      const id = node.id || node.skillId;
      assert.ok(id, `Node di ${treeKey} harus memiliki id`);
      assert.ok(node.name, `Node ${id} harus memiliki nama`);
      assert.ok(node.description, `Node ${id} harus memiliki deskripsi`);
      assert.ok(typeof node.tier === 'number' && node.tier >= 1, `Node ${id} tier harus numerik >= 1`);
      assert.ok(['passive', 'combat_proc', 'system'].includes(node.effectType), `Node ${id} effectType valid`);
      
      // Verifikasi effects object
      assert.ok(node.effects !== undefined && node.effects !== null, `Node ${id} harus memiliki property effects`);
      assert.strictEqual(typeof node.effects, 'object', `Node ${id} effects harus bertipe object`);
      const effectKeys = Object.keys(node.effects);
      assert.ok(effectKeys.length > 0, `Node ${id} effects tidak boleh kosong`);

      // Verifikasi requires (array)
      if (node.requires) {
        assert.ok(Array.isArray(node.requires), `Node ${id} requires harus array jika ada`);
      }
    }
  }

  assert.strictEqual(totalNodesChecked, 100, `Total 100 node skill (20 law x 5 nodes) harus tervalidasi`);
});

// ─────────────────────────────────────────────────────────────────────────────
// T6: hasLaw cultivation page source: no "Buka Pohon Dao" string
// ─────────────────────────────────────────────────────────────────────────────
runTest('T6', 'hasLaw cultivation page source: no "Buka Pohon Dao" string', () => {
  const tabPath = path.resolve(__dirname, '../web-dashboard/src/components/cultivation/LawCultivationTab.tsx');
  assert.ok(fs.existsSync(tabPath), 'File LawCultivationTab.tsx harus ada');
  const content = fs.readFileSync(tabPath, 'utf8');

  // Verifikasi tidak ada string chrome terlarang
  const forbiddenKeywords = [
    'Buka Pohon Dao',
    'Buka Pohon Jurus',
    'Jejak Kultivasi',
    'Tabel Master',
    'Pohon Dao & Bintang Semesta',
    'LawConstellationTree'
  ];

  for (const forbidden of forbiddenKeywords) {
    assert.strictEqual(
      content.includes(forbidden),
      false,
      `LawCultivationTab.tsx tidak boleh memuat string "${forbidden}"`
    );
  }

  // Verifikasi teks material terobosan yang sah ada di LawCultivationTab
  assert.ok(
    content.includes('material kultivasi (Tier ≤'),
    'LawCultivationTab harus menampilkan teks material kultivasi Tier ≤'
  );
  assert.ok(
    content.includes('katalis Tier ≥'),
    'LawCultivationTab harus menampilkan teks butuh katalis Tier ≥'
  );
});

console.log('\n================================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS (T1..T6) PASSED PERFECTLY!`);
console.log('================================================================\n');
