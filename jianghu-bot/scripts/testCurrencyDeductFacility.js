/**
 * scripts/testCurrencyDeductFacility.js
 * Test Suite QA Currency Payment & Cultivation Facilities (CUR-1 s/d CUR-5)
 *
 * Skenario:
 * CUR-1: silver=0, gold=1, cost 50 silver → sukses upgrade, gold dipecah, saldo sisa 50 silver
 * CUR-2: total copper < need → 400 error, wallet tidak termutasi
 * CUR-3: UI Gu kendi quote menampilkan costSilver + materials + canAfford sebelum aksi
 * CUR-4: Body / Abyss / Formation memiliki breakdown quote yang lengkap & valid
 * CUR-5: normalizeCurrency & formatCopper bekerja deterministik, tidak negatif, copper < 100
 */

const assert = require('assert');
const {
  convertToCopper,
  convertFromCopper,
  normalizeCurrency,
  RATE_TO_COPPER,
  silverToCopper,
  getTotalCopper,
  canAffordCopper,
  formatCopper,
  deductCopper
} = require('../utils/currencyNormalize');

const {
  FACILITY_CONFIG,
  getFacilityUpgradeQuote
} = require('../utils/lawCultivationEngine');

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
console.log('🧪 RUNNING QA TEST SUITE: FACILITY UI COSTS & TOTAL COPPER PAY');
console.log('═══════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────
// [CUR-1] silver=0, gold=1, cost 50 silver
// ─────────────────────────────────────────────────────────────
runTest('CUR-1', 'Dompet emas saja (gold=1, silver=0) dapat membayar 50 Silver (5000 Copper)', () => {
  const wallet = { copper: 0, silver: 0, gold: 1, jade: 0, spirit: 0 };
  const costSilver = 50;
  const needCopper = silverToCopper(costSilver);

  assert.strictEqual(needCopper, 5000, '50 silver harus bernilai 5000 copper');
  assert.strictEqual(getTotalCopper(wallet), 10000, '1 gold harus bernilai 10000 copper');

  const afford = canAffordCopper(wallet, needCopper);
  assert.strictEqual(afford.ok, true, 'canAffordCopper harus true untuk 10000 >= 5000');
  assert.strictEqual(afford.shortfall, 0, 'shortfall harus 0');

  const result = deductCopper(wallet, needCopper, 'Upgrade Kendi');
  assert.strictEqual(result.paidCopper, 5000, 'paidCopper harus 5000');
  assert.strictEqual(result.remaining, 5000, 'remaining harus 5000 copper');

  // Cek mutasi in-place wallet: 5000 copper = 50 silver, 0 gold, 0 copper
  assert.strictEqual(wallet.copper, 0, 'Sisa copper harus 0');
  assert.strictEqual(wallet.silver, 50, 'Sisa silver harus 50');
  assert.strictEqual(wallet.gold, 0, 'Sisa gold harus 0');
  assert.strictEqual(getTotalCopper(wallet), 5000, 'Total copper setelah potong harus 5000');
});

// ─────────────────────────────────────────────────────────────
// [CUR-2] total copper < need → 400 error, wallet tidak termutasi
// ─────────────────────────────────────────────────────────────
runTest('CUR-2', 'Total copper < need throws 400 dan wallet tidak berubah', () => {
  const wallet = { copper: 45, silver: 20, gold: 0, jade: 0, spirit: 0 }; // 2045 copper
  const initialWalletCopy = { ...wallet };
  const needCopper = silverToCopper(30); // 30 silver = 3000 copper

  const afford = canAffordCopper(wallet, needCopper);
  assert.strictEqual(afford.ok, false, 'canAffordCopper harus false');
  assert.strictEqual(afford.shortfall, 955, 'shortfall harus 3000 - 2045 = 955');

  let thrownError = null;
  try {
    deductCopper(wallet, needCopper, 'Upgrade Fasilitas');
  } catch (err) {
    thrownError = err;
  }

  assert.ok(thrownError, 'deductCopper wajib melempar error saat saldo kurang');
  assert.strictEqual(thrownError.statusCode, 400, 'Error wajib memiliki statusCode 400');
  assert.ok(
    thrownError.message.includes('saldo tidak cukup'),
    `Pesan error harus informatif: "${thrownError.message}"`
  );

  // Verifikasi wallet tidak termutasi sama sekali
  assert.deepStrictEqual(wallet, initialWalletCopy, 'Wallet tidak boleh termutasi saat gagal bayar');
});

// ─────────────────────────────────────────────────────────────
// [CUR-3] UI Gu kendi quote menampilkan costSilver + materials
// ─────────────────────────────────────────────────────────────
runTest('CUR-3', 'Quote Fasilitas Gu Crucible menampilkan costSilver, materials, dan afford state', () => {
  const mockLaw = {
    activeLawType: 'gu_master',
    facilities: { guCrucibleTier: 1 }
  };

  const mockInventory = [
    { itemId: { name: 'Intisari Serangga Gu' }, quantity: 10 },
    { itemId: { name: 'Batu Kasar Gunung' }, quantity: 2 } // butuh 5, jadi kurang
  ];

  const mockWallet = { copper: 0, silver: 0, gold: 1, jade: 0, spirit: 0 }; // 1 Gold = 100 Silver

  const quote = getFacilityUpgradeQuote(mockLaw, 'gu_crucible', mockInventory, mockWallet);

  assert.ok(quote, 'Quote gu_crucible harus tersedia');
  assert.strictEqual(quote.facilityType, 'gu_crucible');
  assert.strictEqual(quote.currentTier, 1);
  assert.strictEqual(quote.nextTier, 2);
  assert.strictEqual(quote.maxTier, 4);
  assert.strictEqual(quote.isMaxTier, false);
  assert.strictEqual(quote.costSilver, 80, 'Tier 2 Gu Crucible butuh 80 Silver');
  assert.strictEqual(quote.costCopper, 8000, '80 Silver = 8000 Copper');
  assert.strictEqual(quote.canAfford, true, '1 Gold (10000C) harus mampu membayar 80 Silver (8000C)');
  assert.strictEqual(quote.materials.length, 2, 'Harus ada 2 jenis bahan');

  const mat1 = quote.materials.find(m => m.name === 'Intisari Serangga Gu');
  assert.ok(mat1, 'Harus butuh Intisari Serangga Gu');
  assert.strictEqual(mat1.requiredQty, 5);
  assert.strictEqual(mat1.availableQty, 10);
  assert.strictEqual(mat1.hasEnough, true);

  const mat2 = quote.materials.find(m => m.name === 'Batu Kasar Gunung');
  assert.ok(mat2, 'Harus butuh Batu Kasar Gunung');
  assert.strictEqual(mat2.requiredQty, 5);
  assert.strictEqual(mat2.availableQty, 2);
  assert.strictEqual(mat2.hasEnough, false, 'Batu Kasar Gunung harus ditandai belum cukup');

  assert.strictEqual(quote.hasMaterials, false, 'hasMaterials harus false karena batu kurang');
});

// ─────────────────────────────────────────────────────────────
// [CUR-4] Body / Abyss / Formation quotes memiliki breakdown lengkap
// ─────────────────────────────────────────────────────────────
runTest('CUR-4', 'Body Cauldron, Abyssal Altar, dan Formation Hub memiliki quote breakdown valid', () => {
  const mockLaw = {
    activeLawType: 'righteous_formation_array',
    facilities: {
      bodyCauldronTier: 0,
      abyssalAltarTier: 0,
      formationHubTier: 0
    }
  };

  const richWallet = { copper: 0, silver: 0, gold: 50, jade: 0, spirit: 0 };
  const richInv = [
    { itemId: { name: 'Kayu Bambu Keras' }, quantity: 20 },
    { itemId: { name: 'Batu Kasar Gunung' }, quantity: 20 },
    { itemId: { name: 'Batu Obsidian Hitam Abyss' }, quantity: 20 },
    { itemId: { name: 'Botol Esensi Darah Segar' }, quantity: 20 }
  ];

  // 1. Body Cauldron Quote (Tier 0 -> Tier 1: 30 Silver)
  const bodyQuote = getFacilityUpgradeQuote(mockLaw, 'body_cauldron', richInv, richWallet);
  assert.ok(bodyQuote, 'Body quote harus ada');
  assert.strictEqual(bodyQuote.currentTier, 0);
  assert.strictEqual(bodyQuote.nextTier, 1);
  assert.strictEqual(bodyQuote.costSilver, 30);
  assert.strictEqual(bodyQuote.costCopper, 3000);
  assert.strictEqual(bodyQuote.canAfford, true);
  assert.strictEqual(bodyQuote.hasMaterials, true);
  assert.strictEqual(bodyQuote.requiresMapTile, false);

  // 2. Abyssal Altar Quote (Tier 0 -> Tier 1: 50 Silver, requiresMapTile)
  const abyssQuote = getFacilityUpgradeQuote(mockLaw, 'abyssal_altar', richInv, richWallet);
  assert.ok(abyssQuote, 'Abyss quote harus ada');
  assert.strictEqual(abyssQuote.currentTier, 0);
  assert.strictEqual(abyssQuote.nextTier, 1);
  assert.strictEqual(abyssQuote.costSilver, 50);
  assert.strictEqual(abyssQuote.costCopper, 5000);
  assert.strictEqual(abyssQuote.canAfford, true);
  assert.strictEqual(abyssQuote.hasMaterials, true);
  assert.strictEqual(abyssQuote.requiresMapTile, true, 'Abyssal altar wajib membutuhkan lahan peta');

  // 3. Formation Hub Quote (Tier 0 -> Tier 1: 40 Silver, requiresMapTile)
  const formationQuote = getFacilityUpgradeQuote(mockLaw, 'formation_hub', richInv, richWallet);
  assert.ok(formationQuote, 'Formation quote harus ada');
  assert.strictEqual(formationQuote.currentTier, 0);
  assert.strictEqual(formationQuote.nextTier, 1);
  assert.strictEqual(formationQuote.costSilver, 40);
  assert.strictEqual(formationQuote.costCopper, 4000);
  assert.strictEqual(formationQuote.canAfford, true);
  assert.strictEqual(formationQuote.hasMaterials, true);
  assert.strictEqual(formationQuote.requiresMapTile, true, 'Formation hub wajib membutuhkan lahan peta');

  // 4. Max Tier Test
  const maxLaw = {
    facilities: {
      bodyCauldronTier: 4,
      abyssalAltarTier: 3
    }
  };
  const maxBody = getFacilityUpgradeQuote(maxLaw, 'body_cauldron', [], richWallet);
  assert.strictEqual(maxBody.isMaxTier, true);
  assert.strictEqual(maxBody.costSilver, 0);
  assert.strictEqual(maxBody.canAfford, true);

  const maxAbyss = getFacilityUpgradeQuote(maxLaw, 'abyssal_altar', [], richWallet);
  assert.strictEqual(maxAbyss.isMaxTier, true);
  assert.strictEqual(maxAbyss.costSilver, 0);
});

// ─────────────────────────────────────────────────────────────
// [CUR-5] normalizeCurrency & formatCopper deterministik & pre-save
// ─────────────────────────────────────────────────────────────
runTest('CUR-5', 'normalizeCurrency tidak negatif, copper < 100, formatCopper benar', () => {
  // 1. Normalisasi koin pecahan
  const rawCurrency = { copper: 350, silver: 105, gold: 2 };
  const normalized = normalizeCurrency(rawCurrency);

  // 350 copper = 3 silver + 50 copper
  // 105 + 3 = 108 silver = 1 gold + 8 silver
  // 2 + 1 = 3 gold
  assert.strictEqual(normalized.copper, 50, 'Copper harus < 100 (50)');
  assert.strictEqual(normalized.silver, 8, 'Silver harus < 100 (8)');
  assert.strictEqual(normalized.gold, 3, 'Gold harus 3');

  // Total copper konversi harus tetap identik (invariant test)
  const initialTotal = (2 * 10000) + (105 * 100) + 350;
  assert.strictEqual(convertToCopper(normalized), initialTotal, 'Total nilai kekayaan harus invariant');

  // 2. formatCopper test
  const formatted1 = formatCopper(10850);
  assert.strictEqual(formatted1, '1 Gold 8 Silver 50 Copper');

  const formatted2 = formatCopper(0);
  assert.strictEqual(formatted2, '0 Copper');

  const formatted3 = formatCopper(5000);
  assert.strictEqual(formatted3, '50 Silver');

  // 3. Sanitasi nilai negatif
  const negativeCurr = { copper: -50, silver: 2, gold: 0 };
  const fixedNegative = normalizeCurrency(negativeCurr);
  assert.ok(fixedNegative.copper >= 0, 'Copper tidak boleh negatif');
  assert.ok(fixedNegative.silver >= 0, 'Silver tidak boleh negatif');
  assert.ok(fixedNegative.gold >= 0, 'Gold tidak boleh negatif');
});

console.log(`\n═══════════════════════════════════════════════════════════════`);
console.log(`🏁 TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log(`═══════════════════════════════════════════════════════════════\n`);

if (passedTests === totalTests) {
  console.log('🎉 ALL CURRENCY & FACILITY UPGRADE CHECKS PASSED PERFECTLY!\n');
} else {
  process.exit(1);
}
