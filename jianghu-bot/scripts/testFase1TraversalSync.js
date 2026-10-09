/**
 * testFase1TraversalSync.js
 * Verifikasi Mandiri Fase 1: Traversal Rules, Zero-Ambush Policy, & Position Synchronization.
 */

const assert = require('assert');
const { setPlayerAuthoritativePosition } = require('../services/movementService');
const { normalizeRegionSlug, getRegionAt, getTerritoryInfo } = require('../utils/worldRegionEngine');
const proceduralWorldEngine = require('../utils/proceduralWorldEngine');

async function testFase1() {
  console.log('--- [TEST FASE 1] Memulai Verifikasi Authoritative Math & Traversal ---');

  // Test 1: Normalisasi Slug Region
  console.log('1. Menguji Normalisasi Slug 22 Wilayah...');
  assert.strictEqual(normalizeRegionSlug('eastern_sea_region'), 'eastern_sea');
  assert.strictEqual(normalizeRegionSlug('western_sacred_deserts'), 'western_sacred_desert');
  assert.strictEqual(normalizeRegionSlug('northern_desolate_territory'), 'northern_desolate');
  assert.strictEqual(normalizeRegionSlug('azure_mountain'), 'azure_mountain_range');
  assert.strictEqual(normalizeRegionSlug('central_plains'), 'central_plains');
  console.log('   ✓ Normalisasi slug 100% lulus.');

  // Test 2: Zero-Ambush Policy
  console.log('2. Menguji Zero-Ambush Policy di Wilayah Aman...');
  const centralPlainsTerritory = getTerritoryInfo(2450, 2480, 'plains', false);
  const settlementTerritory = getTerritoryInfo(2450, 2480, 'settlement', true);
  const dangerTerritory = getTerritoryInfo(2300, 1900, 'swamp', false); // Scar of Heaven

  assert.strictEqual(settlementTerritory.ambushRiskRate, 0, 'Settlement harus memiliki 0% ambush risk.');
  assert.strictEqual(centralPlainsTerritory.ambushRiskRate, 0, 'Central Plains (Tier 1) harus memiliki 0% ambush risk.');
  assert.ok(dangerTerritory.ambushRiskRate > 0, 'Danger zone harus memiliki ambush risk > 0.');
  console.log('   ✓ Zero-Ambush policy 100% lulus.');

  // Test 3: Traversal & Solid Barrier
  console.log('3. Menguji Deteksi Solid Barrier & Out-of-bounds Hazard...');
  const oobTile = proceduralWorldEngine.getTileAt(-10, 2500);
  assert.strictEqual(oobTile.tileType, 'hazard');
  assert.strictEqual(oobTile.isSolid, true);

  const seaTile = proceduralWorldEngine.getTileAt(4500, 2500); // Eastern sea
  assert.strictEqual(seaTile.terrainType, 'ocean');
  assert.strictEqual(seaTile.isSolid, true);
  console.log(`   ✓ Ocean tile di [4500, 2500]: terrain=${seaTile.terrainType}, isSolid=${seaTile.isSolid}`);

  // Test Azure Mountain Solid Barrier & Passes
  const northPassTile = proceduralWorldEngine.getTileAt(2200, 3350);
  const mistPassTile = proceduralWorldEngine.getTileAt(2600, 3350);
  const swordGorgeTile = proceduralWorldEngine.getTileAt(3100, 3350);
  const azureWallTile = proceduralWorldEngine.getTileAt(2400, 3350);

  assert.strictEqual(northPassTile.isSolid, false, 'North Pass harus dapat dilalui');
  assert.strictEqual(northPassTile.terrainType, 'mountain_pass');
  assert.strictEqual(mistPassTile.isSolid, false, 'Mist Pass harus dapat dilalui');
  assert.strictEqual(mistPassTile.terrainType, 'mountain_pass');
  assert.strictEqual(swordGorgeTile.isSolid, false, 'Sword Gorge Pass harus dapat dilalui');
  assert.strictEqual(swordGorgeTile.terrainType, 'sword_gorge_pass');
  assert.strictEqual(azureWallTile.isSolid, true, 'Azure Mountain Wall harus solid barrier blocker');
  assert.strictEqual(azureWallTile.terrainType, 'azure_mountain');
  console.log('   ✓ Azure Mountain Solid Barrier & 3 Pass resmi 100% valid dan dapat dibedakan.');

  // Test 4: setPlayerAuthoritativePosition Mock
  console.log('4. Menguji Sinkronisasi Atomik setPlayerAuthoritativePosition...');
  const mockPlayer = {
    _id: 'mock_player_001',
    characterName: 'Murid Pendekar',
    gridPosition: { zoneId: 'tianyuan_world_map', tileX: 2455, tileY: 2485 },
    currentLocation: { regionSlug: 'unknown', settlementName: null },
    discoveredLocations: [],
    markModified: () => {}
  };

  await setPlayerAuthoritativePosition(mockPlayer, {
    zoneId: 'tianyuan_world_map',
    tileX: 2700,
    tileY: 2800
  }, { save: false });

  assert.strictEqual(mockPlayer.gridPosition.tileX, 2700);
  assert.strictEqual(mockPlayer.gridPosition.tileY, 2800);
  assert.strictEqual(mockPlayer.currentLocation.settlementName, 'Tianjing');
  assert.strictEqual(mockPlayer.currentLocation.regionSlug, 'central_plains');
  assert.ok(mockPlayer.discoveredLocations.includes('central_plains|Tianjing'));
  console.log('   ✓ Sinkronisasi atomik posisi, settlement, dan region 100% lulus.');

  console.log('=== [TEST FASE 1 SELESAI: SEMUA TES LULUS DENGAN SUKSES] ===');
}

testFase1().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
