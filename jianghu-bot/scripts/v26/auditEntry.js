/**
 * scripts/v26/auditEntry.js
 * Audit deterministik keterjangkauan seluruh 55 zona instans (V26 P6)
 * Memverifikasi: biaya masuk, ketersediaan item di coreItems/toko, batas stamina <= 100, dan integritas item hadiah.
 */

const fs = require('fs');
const path = require('path');

const zonesData = require('../../world-data/zones-v23.json');
const { CORE_ITEMS_DEFINITIONS } = require('../../services/coreItems');
const { SHOP_ITEM_KEYS } = require('../../services/coreShop');
const { requiredItems } = require('../../utils/instancedZoneCosts');

const coreItemKeysSet = new Set(CORE_ITEMS_DEFINITIONS.map(i => i.itemKey).filter(Boolean));
const shopKeysSet = new Set(SHOP_ITEM_KEYS);

// Daftar item yang dapat diperoleh sebagai hadiah klaim dari ekspedisi
const OBTAINABLE_FROM_CLAIMS = new Set([
  'item_spirit_herb_high',
  'item_spirit_stone_low',
  'item_spirit_fruit',
  'item_pure_qi_pill',
  'item_keping_roh_api',
  'item_keping_roh_air',
  'item_keping_roh_kayu',
  'item_keping_roh_logam',
  'item_keping_roh_tanah',
  'item_fire_shard'
]);

// Tabel pemetaan hadiah klaim per tipe zona
const CLAIM_REWARD_KEYS_BY_TYPE = {
  spirit_valley: ['item_spirit_herb_high'],
  land_of_spirits: ['item_spirit_stone_low', 'item_pure_qi_pill'],
  defense_circle: ['item_spirit_fruit', 'item_pure_qi_pill'],
  elemental_land: [
    'item_keping_roh_api',
    'item_keping_roh_air',
    'item_keping_roh_kayu',
    'item_keping_roh_logam',
    'item_keping_roh_tanah'
  ]
};

const TARGET_TYPES = ['spirit_valley', 'land_of_spirits', 'defense_circle', 'elemental_land'];

function runEntryAudit() {
  const allZones = zonesData.zones || [];
  const targetZones = allZones.filter(z => TARGET_TYPES.includes(z.type));

  const countsByType = {
    spirit_valley: 0,
    land_of_spirits: 0,
    defense_circle: 0,
    elemental_land: 0
  };

  const violations = [];

  for (const zone of targetZones) {
    countsByType[zone.type] = (countsByType[zone.type] || 0) + 1;

    // 1. Validasi Batas Stamina <= 100
    const staminaCost = Number(zone.entryCost?.stamina || 0);
    if (staminaCost > 100) {
      violations.push({
        zoneId: zone.id,
        issue: `Stamina cost ${staminaCost} melebihi kapasitas maksimal 100`
      });
    }

    // 2. Validasi Kebutuhan Item Biaya Masuk
    const reqs = requiredItems(zone.entryCost);
    for (const req of reqs) {
      // 2a. Harus ada di CORE_ITEMS_DEFINITIONS
      if (!coreItemKeysSet.has(req.itemKey)) {
        violations.push({
          zoneId: zone.id,
          issue: `ItemKey biaya masuk '${req.itemKey}' tidak terdaftar di CORE_ITEMS_DEFINITIONS`
        });
      }

      // 2b. Harus dapat diperoleh (ada di toko atau hasil drop/claim)
      const isAvailableInShop = shopKeysSet.has(req.itemKey);
      const isAvailableInClaims = OBTAINABLE_FROM_CLAIMS.has(req.itemKey);
      if (!isAvailableInShop && !isAvailableInClaims) {
        violations.push({
          zoneId: zone.id,
          issue: `ItemKey biaya masuk '${req.itemKey}' tidak memiliki sumber perolehan (tidak di toko & tidak di hadiah klaim)`
        });
      }
    }

    // 3. Validasi Hadiah Klaim untuk Tipe Zona
    const expectedRewardKeys = CLAIM_REWARD_KEYS_BY_TYPE[zone.type] || [];
    for (const rKey of expectedRewardKeys) {
      if (!coreItemKeysSet.has(rKey)) {
        violations.push({
          zoneId: zone.id,
          issue: `Item hadiah klaim '${rKey}' untuk tipe ${zone.type} tidak terdaftar di CORE_ITEMS_DEFINITIONS`
        });
      }
    }
  }

  // Validasi jumlah zona per tipe sesuai ekspektasi kanonikal V23/V26
  const EXPECTED_COUNTS = {
    spirit_valley: 26,
    land_of_spirits: 3,
    defense_circle: 21,
    elemental_land: 5
  };

  for (const type of TARGET_TYPES) {
    if (countsByType[type] !== EXPECTED_COUNTS[type]) {
      violations.push({
        zoneId: `COUNT_MISMATCH_${type.toUpperCase()}`,
        issue: `Jumlah zona ${type} (${countsByType[type]}) tidak sesuai target kanonikal (${EXPECTED_COUNTS[type]})`
      });
    }
  }

  const result = {
    timestamp: new Date().toISOString(),
    totalTargetZones: targetZones.length,
    countsByType,
    expectedCounts: EXPECTED_COUNTS,
    totalViolations: violations.length,
    violations
  };

  const rawOutDir = path.resolve(__dirname, '../../review/v26_raw');
  if (!fs.existsSync(rawOutDir)) {
    fs.mkdirSync(rawOutDir, { recursive: true });
  }

  const outPath = path.join(rawOutDir, 'entry_audit.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

  console.log('======================================================================');
  console.log(' AUDIT KETERJANGKAUAN 55 ZONA INSTANS V26 (P6)');
  console.log('======================================================================');
  console.log(`Total Zona Instans Diperiksa : ${targetZones.length} / 55`);
  console.log(`- Lembah Roh (spirit_valley) : ${countsByType.spirit_valley} / 26`);
  console.log(`- Tanah Warisan (land_of_spirits): ${countsByType.land_of_spirits} / 3`);
  console.log(`- Lingkaran Segel (defense_circle): ${countsByType.defense_circle} / 21`);
  console.log(`- Tanah Elemen (elemental_land): ${countsByType.elemental_land} / 5`);
  console.log('----------------------------------------------------------------------');
  console.log(`pelanggaran: ${violations.length}`);
  console.log('======================================================================');

  if (violations.length > 0) {
    console.error('❌ [AUDIT ENTRY GAGAL] Ditemukan pelanggaran berikut:');
    console.error(JSON.stringify(violations, null, 2));
    process.exit(1);
  } else {
    console.log('✅ [AUDIT ENTRY PASS] Seluruh 55 zona instans terbukti dapat diakses!');
    console.log(`[OUTPUT] Hasil audit disimpan ke: ${outPath}`);
    process.exit(0);
  }
}

runEntryAudit();
