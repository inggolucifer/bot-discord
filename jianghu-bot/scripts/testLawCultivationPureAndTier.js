/**
 * Test Mandiri Otoritatif:
 * Tab Kultivasi Murni, Skill Modal Nyata, Breakthrough Material-Only, dan Tier Affinity Fix
 * Memvalidasi UI-1, UI-2, BT-1, BT-2, TIER-1, TIER-2, TIER-3, dan LAW-20.
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
  formatLawRealmDisplay,
} = require('../utils/lawCultivationEngine');

console.log('================================================================');
console.log('🧪 RUNNING TEST: LAW CULTIVATION PURE & TIER AFFINITY TEST SUITE');
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
// TEST UI-1: Tab kultivasi tidak ada button/tab palsu
// ─────────────────────────────────────────────────────────────────────────────
runTest('UI-1: LawCultivationTab.tsx tidak mengandung navigasi/tombol palsu', () => {
  const filePath = path.resolve(__dirname, '../web-dashboard/src/components/cultivation/LawCultivationTab.tsx');
  assert.ok(fs.existsSync(filePath), 'File LawCultivationTab.tsx harus ada');
  const content = fs.readFileSync(filePath, 'utf8');

  const forbiddenStrings = [
    'Buka Pohon Dao',
    'Jejak Kultivasi',
    'Tabel Master',
    'Buka Pohon Jurus',
    'Pohon Dao & Bintang Semesta',
    'Garis Waktu & Riwayat Kultivasi',
    'Papan Penguasa Kultivasi 9 Benua'
  ];

  for (const forbidden of forbiddenStrings) {
    assert.strictEqual(
      content.includes(forbidden),
      false,
      `Ditemukan teks terlarang "${forbidden}" di LawCultivationTab.tsx`
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST UI-2: Skill detail modal pada LawConstellationTree.tsx menggunakan efek terurai
// ─────────────────────────────────────────────────────────────────────────────
runTest('UI-2: LawConstellationTree.tsx merender efek terurai dan SP progression', () => {
  const filePath = path.resolve(__dirname, '../web-dashboard/src/components/cultivation/LawConstellationTree.tsx');
  assert.ok(fs.existsSync(filePath), 'File LawConstellationTree.tsx harus ada');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(content.includes('formatSkillEffects'), 'Harus menyertakan formatSkillEffects');
  assert.ok(content.includes('selectedSkill.effects'), 'Harus merender effects terurai');
  assert.ok(content.includes('effectBullets.map') || content.includes('effectsList.map'), 'Harus mengiterasi effects terurai dalam bentuk list');
  assert.ok(content.includes('costPerLevel'), 'Harus menggunakan costPerLevel dinamis');
  assert.ok(!content.includes('94/136 XP'), 'Tidak boleh ada angka XP dummy palsu');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST BT-1: Breakthrough stage 1->2 menolak copper/silver & memotong material valid
// ─────────────────────────────────────────────────────────────────────────────
runTest('BT-1: consumeBreakthroughMaterials memotong material valid (Option A) dan bebas currency', () => {
  const law = {
    activeLawType: 'righteous_sword_heart',
    rank: 0,
    stage: 1,
    miniBreakthroughCost: {
      requiredQty: 2,
      requiredTier: 1,
      acceptedCategories: ['breakthrough_material', 'spirit_stone', 'catalyst', 'herb']
    }
  };

  const player = {
    copper: 1000,
    silver: 50,
    gold: 5,
    inventory: [
      { itemId: { _id: 'mat_1', name: 'Herba Embun Roh', category: 'herb', tier: 1 }, quantity: 3 },
      { itemId: { _id: 'mat_pill', name: 'Pil Terobosan Fondasi', category: 'pill', tier: 1 }, quantity: 1 }
    ]
  };

  const consumed = consumeBreakthroughMaterials(player, law);
  assert.ok(consumed, 'Harus berhasil memotong material');
  assert.strictEqual(consumed.consumedQty, 2, 'Harus memotong tepat 2 material');
  assert.ok(consumed.consumedItemName.includes('Herba Embun Roh'), 'Nama material harus Herba Embun Roh');

  // Verifikasi sisa inventori
  const herbSlot = player.inventory.find(i => i.itemId.name === 'Herba Embun Roh');
  assert.strictEqual(herbSlot.quantity, 1, 'Kuantitas herba harus berkurang 2 dari 3 menjadi 1');

  // Verifikasi currency TIDAK tersentuh sama sekali
  assert.strictEqual(player.copper, 1000, 'Copper dilarang terpotong');
  assert.strictEqual(player.silver, 50, 'Silver dilarang terpotong');
  assert.strictEqual(player.gold, 5, 'Gold dilarang terpotong');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST BT-2: Breakthrough stage 1->2 menolak material dengan tier > playerTier
// ─────────────────────────────────────────────────────────────────────────────
runTest('BT-2: consumeBreakthroughMaterials menolak material ber-tier lebih tinggi dari playerTier', () => {
  const law = {
    activeLawType: 'element_phoenix_fire',
    rank: 0, // playerTier = 1
    stage: 2,
    miniBreakthroughCost: {
      requiredQty: 2,
      requiredTier: 1,
      acceptedCategories: ['breakthrough_material', 'spirit_stone', 'catalyst', 'herb']
    }
  };

  // Hanya ada material Tier 2 (di atas playerTier 1)
  const player = {
    inventory: [
      { itemId: { _id: 'mat_high', name: 'Batu Api Kuno', category: 'spirit_stone', tier: 2 }, quantity: 5 }
    ]
  };

  let threwError = false;
  try {
    consumeBreakthroughMaterials(player, law);
  } catch (err) {
    threwError = true;
    assert.ok(err.message.includes('Tier') || err.message.includes('Material'), 'Pesan error harus menyebutkan keterbatasan material / Tier');
  }
  assert.strictEqual(threwError, true, 'Wajib menolak material dengan tier > playerTier');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST TIER-1: Rank 0 serap tier-1 = efficiency 1.0
// ─────────────────────────────────────────────────────────────────────────────
runTest('TIER-1: Rank 0 (playerTier 1) serap item Tier 1 memiliki efisiensi optimal 1.0 (100%)', () => {
  const law = { rank: 0 };
  const itemDoc = { name: 'Pil Qi Biasa', tier: 1 };

  const affinity = getTierAffinity((law.rank || 0) + 1, resolveItemTier(itemDoc));
  assert.strictEqual(affinity.allowed, true);
  assert.strictEqual(affinity.efficiency, 1.0);

  const res = assertAbsorbTier(law, itemDoc);
  assert.strictEqual(res.playerTier, 1);
  assert.strictEqual(res.itemTier, 1);
  assert.strictEqual(res.efficiency, 1.0);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST TIER-2: Rank 2 serap tier-1 = efficiency < 0.5 (tepatnya ~0.20-0.25)
// ─────────────────────────────────────────────────────────────────────────────
runTest('TIER-2: Rank 2 (playerTier 3) serap item Tier 1 efisiensi turun drastis (< 0.5, tepatnya 0.20)', () => {
  const law = { rank: 2 };
  const itemDoc = { name: 'Daging Rusa Rendah', tier: 1 };

  const affinity = getTierAffinity((law.rank || 0) + 1, resolveItemTier(itemDoc));
  assert.strictEqual(affinity.allowed, true);
  assert.ok(affinity.efficiency < 0.5, `Efisiensi harus < 0.5, didapat: ${affinity.efficiency}`);
  assert.strictEqual(affinity.efficiency, 0.2, 'Efisiensi Rank 2 serap Tier 1 harus 0.20 (20%)');

  const res = assertAbsorbTier(law, itemDoc);
  assert.strictEqual(res.playerTier, 3);
  assert.strictEqual(res.itemTier, 1);
  assert.strictEqual(res.efficiency, 0.2);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST TIER-3: Rank 1 serap tier-3 = TOLAK (allowed: false / assertAbsorbTier throws)
// ─────────────────────────────────────────────────────────────────────────────
runTest('TIER-3: Rank 1 (playerTier 2) serap item Tier 3 mutlak ditolak (allowed: false / throw)', () => {
  const law = { rank: 1 };
  const itemDoc = { name: 'Inti Siluman Emas', tier: 3 };

  const affinity = getTierAffinity((law.rank || 0) + 1, resolveItemTier(itemDoc));
  assert.strictEqual(affinity.allowed, false);
  assert.strictEqual(affinity.efficiency, 0);

  let threw = false;
  try {
    assertAbsorbTier(law, itemDoc);
  } catch (err) {
    threw = true;
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.message.includes('menolak'), 'Pesan error harus menyatakan penolakan dantian');
  }
  assert.strictEqual(threw, true, 'assertAbsorbTier wajib melempar CustomError dengan HTTP 400');
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST LAW-20: Verifikasi seluruh 20 law terdaftar di LAW_SKILL_TREES dan memiliki konfigurasi valid
// ─────────────────────────────────────────────────────────────────────────────
runTest('LAW-20: Seluruh 20 hukum semesta terdaftar di LAW_DEFINITIONS dan LAW_SKILL_TREES secara valid', () => {
  const lawKeys = Object.keys(LAW_DEFINITIONS);
  assert.strictEqual(lawKeys.length, 20, `Harus ada tepat 20 Law terdaftar di LAW_DEFINITIONS, didapat: ${lawKeys.length}`);

  for (const lawKey of lawKeys) {
    assert.ok(LAW_SKILL_TREES[lawKey], `LAW_SKILL_TREES harus memiliki entri untuk "${lawKey}"`);
    const tree = LAW_SKILL_TREES[lawKey];
    const nodes = tree.nodes || tree.skills;
    assert.ok(nodes && Array.isArray(nodes), `Tree ${lawKey} harus memiliki array nodes`);
    assert.strictEqual(nodes.length, 5, `Tree ${lawKey} harus memiliki tepat 5 node skill`);

    // Pastikan setiap node memiliki tier, effectType, dan effects yang terdefinisi
    for (const skill of nodes) {
      const skillId = skill.id || skill.skillId;
      assert.ok(skillId, `Skill di ${lawKey} harus punya id/skillId`);
      assert.ok(skill.name, `Skill ${skillId} di ${lawKey} harus punya name`);
      assert.ok(typeof skill.tier === 'number', `Skill ${skillId} harus memiliki numeric tier`);
      assert.ok(['passive', 'combat_proc', 'system'].includes(skill.effectType), `Skill ${skillId} memiliki effectType valid`);
      assert.ok(typeof skill.effects === 'object' && skill.effects !== null, `Skill ${skillId} harus punya object effects`);
    }

    // Pastikan memiliki format realm display yang valid
    const realmDisplay = formatLawRealmDisplay({ activeLawType: lawKey, rank: 0, stage: 0 });
    assert.ok(realmDisplay.title, `Law ${lawKey} harus memiliki realm title`);
    assert.ok(realmDisplay.display, `Law ${lawKey} harus memiliki realm display`);
  }
});

console.log('\n================================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
console.log('================================================================\n');
