const assert = require('assert');
const { getTerritoryInfo } = require('../utils/worldRegionEngine');
const proceduralWorldEngine = require('../utils/proceduralWorldEngine');

console.log('================================================================');
console.log('⚔️ PENGUJIAN ZONASI WILAYAH AMAN VS ZONA BAHAYA BERBURU & FARMING');
console.log('================================================================\n');

// 1. Uji Zona Aman di Wilayah Biasa (Central Plains & Wilayah Lain)
const safeSettlement = getTerritoryInfo(2455, 2485, 'settlement', true);
assert.strictEqual(safeSettlement.ambushRiskRate, 0, 'Pemukiman kota wajib 0% ambush!');
assert.strictEqual(safeSettlement.type, 'settlement');
console.log('✓ Pemukiman (Desa/Kota): 100% Aman, 0% Ambush.');

const safeRoad = getTerritoryInfo(2400, 2500, 'road', false);
assert.strictEqual(safeRoad.ambushRiskRate, 0, 'Jalan raya kerajaan wajib 0% ambush!');
assert.strictEqual(safeRoad.type, 'safe_zone');
console.log('✓ Jalan Raya Kerajaan: 100% Aman, 0% Ambush.');

const safePlains = getTerritoryInfo(2450, 2480, 'plains', false);
assert.strictEqual(safePlains.ambushRiskRate, 0, 'Dataran terbuka umum wajib 0% ambush!');
assert.strictEqual(safePlains.type, 'safe_zone');
console.log('✓ Dataran Terbuka Umum: 100% Aman, 0% Ambush.');

// 2. Uji Zona Bahaya saat Melangkah Keluar ke Alam Liar
const bambooWild = getTerritoryInfo(2460, 2490, 'bamboo_forest', false);
assert(bambooWild.ambushRiskRate > 0, 'Hutan Bambu liar wajib memiliki risiko ambush!');
assert.strictEqual(bambooWild.type, 'hunting_zone');
console.log(`✓ Hutan Bambu Liar: Zona Berburu & Panen Rebung Aktif (${Math.round(bambooWild.ambushRiskRate * 100)}% Ambush).`);

const deepForest = getTerritoryInfo(2400, 2300, 'forest', false);
assert(deepForest.ambushRiskRate > 0, 'Rimba belantara wajib memiliki risiko ambush!');
assert.strictEqual(deepForest.type, 'hunting_zone');
console.log(`✓ Rimba Belantara: Zona Berburu Satwa & Panen Kayu Aktif (${Math.round(deepForest.ambushRiskRate * 100)}% Ambush).`);

const azureMtn = getTerritoryInfo(2550, 3350, 'azure_mountain', false);
assert(azureMtn.ambushRiskRate > 0, 'Tebing gunung wajib memiliki risiko ambush!');
assert.strictEqual(azureMtn.type, 'danger_zone');
console.log(`✓ Tebing Gunung Azure: Zona Bahaya Tambang Bijih Mineral (${Math.round(azureMtn.ambushRiskRate * 100)}% Ambush).`);

const venomSwamp = getTerritoryInfo(500, 1000, 'venom_mire', false);
assert(venomSwamp.ambushRiskRate >= 0.3, 'Rawa racun wajib bahaya tinggi!');
assert.strictEqual(venomSwamp.type, 'danger_zone');
console.log(`✓ Rawa Racun Miasma: Zona Bahaya Monster Berbisa (${Math.round(venomSwamp.ambushRiskRate * 100)}% Ambush).`);

const lavaSpine = getTerritoryInfo(1300, 1200, 'lava_spine', false);
assert.strictEqual(lavaSpine.type, 'death_zone');
assert.strictEqual(lavaSpine.ambushRiskRate, 0.40);
console.log(`✓ Kawah Magma Lava Spine: Zona Maut Ekstrem (${Math.round(lavaSpine.ambushRiskRate * 100)}% Ambush).`);

// 3. Uji Node Farming Spasial di Grid Prosedural
const testTile1 = proceduralWorldEngine.getTileAt(2460, 2490); // Petak Hutan Bambu
console.log(`✓ Resource Node di Petak (${testTile1.tileX}, ${testTile1.tileY}): ${testTile1.resourceType || 'Tanah Subur'} (Medan: ${testTile1.terrainType}, Zona: ${testTile1.territoryType})`);

console.log('\n🏆 SEMUA VALIDASI ZONASI AMAN VS ZONA BAHAYA BERBURU & FARMING LULUS 100%!\n');
