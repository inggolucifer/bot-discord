/**
 * testPhase3TerrainAndBarriers.js
 * Invariant & Functional Test Suite untuk Fase 3: Terrain Profile & Continuous Barrier
 * Menguji:
 * 1. Kontinuitas Tembok Azure (B-15, B-16) - tidak ada celah bocor selain 3 pass resmi
 * 2. Kelayakan jalan 5 pass resmi (isSolid === false)
 * 3. Eliminasi bug latitude northern_glacial (B-14)
 * 4. Aturan Traversal Mount (isTileObstructed untuk daratan solid & air)
 * 5. Sanitasi Suhu Regional berdasarkan tempRangeC
 */

const assert = require('assert');
const pwe = require('../utils/proceduralWorldEngine');
const explorationMath = require('../utils/explorationMath');
const worldData = require('../utils/worldData');

console.log('=== TEST SUITE: PHASE 3 TERRAIN PROFILE & CONTINUOUS BARRIERS ===\n');

let passCount = 0;
let failCount = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`[PASS] ${testName}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${testName}:`, err.message);
    failCount++;
  }
}

// -------------------------------------------------------------
// Test 1: Kontinuitas Tembok Azure (Continuous Barrier)
// -------------------------------------------------------------
runTest('Kontinuitas Tembok Azure: Setiap petak melintang adalah Solid kecuali di Pass resmi', () => {
  const y = 3350;
  const passXRanges = [
    { minX: 2200 - 3, maxX: 2200 + 3 }, // North Pass width 7
    { minX: 2600 - 4, maxX: 2600 + 4 }, // Mist Pass width 9
    { minX: 3100 - 4, maxX: 3100 + 4 }  // Sword Gorge width 8
  ];

  let solidCount = 0;
  let passCountObserved = 0;

  for (let x = 1600; x <= 3400; x += 5) {
    const tile = pwe.getTileAt(x, y);
    const inPass = passXRanges.some(p => x >= p.minX && x <= p.maxX);

    if (inPass) {
      assert.strictEqual(tile.isSolid, false, `Pass tile at (${x}, ${y}) must NOT be solid`);
      passCountObserved++;
    } else {
      assert.strictEqual(tile.isSolid, true, `Barrier tile at (${x}, ${y}) MUST be solid`);
      solidCount++;
    }
  }

  assert.ok(solidCount > 300, `Expected >300 solid barrier samples, got ${solidCount}`);
  assert.ok(passCountObserved >= 3, `Expected at least 3 pass samples, got ${passCountObserved}`);
});

// -------------------------------------------------------------
// Test 2: Seluruh 6 Pass Resmi Dapat Dilalui Jalan Kaki
// -------------------------------------------------------------
runTest('Seluruh 6 Pass Resmi Dapat Dilalui Jalan Kaki (isSolid === false & tileType walkable/settlement)', () => {
  const passes = worldData.getPasses();
  assert.strictEqual(passes.length, 6, `Expected 6 passes, got ${passes.length}`);

  for (const p of passes) {
    const tile = pwe.getTileAt(p.x, p.y);
    assert.strictEqual(tile.isSolid, false, `Pass ${p.id} at (${p.x}, ${p.y}) must be walkable`);
    assert.ok(
      tile.tileType === 'walkable' || tile.tileType === 'settlement',
      `Pass ${p.id} tileType must be walkable or settlement, got ${tile.tileType}`
    );
  }
});

// -------------------------------------------------------------
// Test 3: Eliminasi Bug Latitude Northern Glacial (B-14)
// -------------------------------------------------------------
runTest('Eliminasi Bug B-14: Thundersteppe dan Beast Prairies di utara tidak tertimpa northern_glacial', () => {
  // Koordinat utara (latitude > 0.65, y >= 3400)
  const nonGlacialPoints = [
    { x: 2200, y: 4000, expectedRegion: 'thundersteppe' },
    { x: 2500, y: 4200, expectedRegion: 'thundersteppe' },
    { x: 1400, y: 3800, expectedRegion: 'beast_prairies' }
  ];

  for (const pt of nonGlacialPoints) {
    const tile = pwe.getTileAt(pt.x, pt.y);
    assert.notStrictEqual(tile.terrainType, 'northern_glacial',
      `Tile at (${pt.x}, ${pt.y}) in ${tile.regionId} should NOT be northern_glacial`);
  }
});

// -------------------------------------------------------------
// Test 4: Aturan Traversal Mount (isTileObstructed)
// -------------------------------------------------------------
runTest('Aturan Traversal Mount: Solid Mountain & Ocean Traversal Validation', () => {
  // Mountain
  assert.strictEqual(
    explorationMath.isTileObstructed({ terrainType: 'azure_mountain', mountType: null, isSolid: true }),
    true, 'Jalan kaki di tebing azure harus terhalang'
  );
  assert.strictEqual(
    explorationMath.isTileObstructed({ terrainType: 'azure_mountain', mountType: 'ferghana_horse', isSolid: true }),
    true, 'Kuda biasa tidak boleh melompati tebing azure'
  );
  assert.strictEqual(
    explorationMath.isTileObstructed({ terrainType: 'azure_mountain', mountType: 'flying_sword', isSolid: true }),
    false, 'Pedang terbang harus bisa melintasi tebing azure'
  );

  // Ocean
  assert.strictEqual(
    explorationMath.isTileObstructed({ terrainType: 'ocean', mountType: null, isSolid: true }),
    true, 'Jalan kaki di laut harus terhalang'
  );
  assert.strictEqual(
    explorationMath.isTileObstructed({ terrainType: 'ocean', mountType: 'wooden_boat', isSolid: true }),
    false, 'Perahu kayu harus bisa melintasi laut'
  );
  assert.strictEqual(
    explorationMath.isTileObstructed({ terrainType: 'ocean', mountType: 'ship', isSolid: true }),
    false, 'Kapal layar harus bisa melintasi laut'
  );
  assert.strictEqual(
    explorationMath.isTileObstructed({ terrainType: 'ocean', mountType: 'flying_sword', isSolid: true }),
    false, 'Pedang terbang harus bisa terbang di atas laut'
  );
});

// -------------------------------------------------------------
// Test 5: Sanitasi Suhu Regional berdasarkan tempRangeC
// -------------------------------------------------------------
runTest('Sanitasi Suhu: Suhu tile sesuai dengan profil iklim daerah aktualnya', () => {
  const regions = worldData.getAllRegions();
  for (const reg of regions) {
    const midX = Math.floor((reg.bounds.minX + reg.bounds.maxX) / 2);
    const midY = Math.floor((reg.bounds.minY + reg.bounds.maxY) / 2);
    const tile = pwe.getTileAt(midX, midY);
    const actualReg = worldData.getRegionDef(tile.regionId);

    if (actualReg && actualReg.tempRangeC) {
      assert.ok(
        tile.baseTemperature >= actualReg.tempRangeC.min - 15 && tile.baseTemperature <= actualReg.tempRangeC.max + 15,
        `Temperature ${tile.baseTemperature}C in ${actualReg.id} out of plausible bounds [${actualReg.tempRangeC.min}, ${actualReg.tempRangeC.max}]`
      );
    }
  }
});

console.log(`\n========================================`);
console.log(`HASIL: ${passCount} LULUS, ${failCount} GAGAL`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
