/**
 * testWorldInvariants.js
 * Invariant Test Suite untuk Fase 2: Master World Map Overhaul
 * Menguji Invariant 1, 2, 4, 7, 10 dan integritas SSOT data dunia.
 */

const assert = require('assert');
const worldData = require('../utils/worldData');
const worldRegionEngine = require('../utils/worldRegionEngine');
const starterKits = require('../config/starterKits');

console.log('=== TEST SUITE: WORLD MAP INVARIANTS (FASE 2) ===\n');

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
// Test 1: Invariant 1 - Zero Void Guarantee (0% unknown_void)
// -------------------------------------------------------------
runTest('Invariant 1: Zero Void Guarantee (0% unknown_void across entire 5000x5000 canvas)', () => {
  const step = 100;
  let voidFound = 0;
  for (let y = 0; y < 5000; y += step) {
    for (let x = 0; x < 5000; x += step) {
      const reg = worldData.getRegionAt(x, y);
      if (!reg || reg.id === 'unknown_void') {
        voidFound++;
      }
    }
  }
  assert.strictEqual(voidFound, 0, 'Found ' + voidFound + ' void tiles in world map');
});

// -------------------------------------------------------------
// Test 2: Invariant 2 - All 29 Canonical Regions Active
// -------------------------------------------------------------
runTest('Invariant 2: All 29 Canonical Regions Active and Present in Raster Distribution', () => {
  const allRegions = worldData.getAllRegions();
  assert.strictEqual(allRegions.length, 29, `Expected 29 regions, got ${allRegions.length}`);

  const counts = new Map();
  for (let y = 0; y < 5000; y += 100) {
    for (let x = 0; x < 5000; x += 100) {
      const reg = worldData.getRegionAt(x, y);
      counts.set(reg.id, (counts.get(reg.id) || 0) + 1);
    }
  }

  for (const reg of allRegions) {
    assert.ok(counts.has(reg.id), `Region ${reg.id} has 0 representation in raster distribution`);
    assert.ok(counts.get(reg.id) >= 1, `Region ${reg.id} count is too small (${counts.get(reg.id)})`);
  }
});

// -------------------------------------------------------------
// Test 3: Invariant 4 - Starter Spawns Safety & Anchor Parity
// -------------------------------------------------------------
runTest('Invariant 4: All 8 Starter Spawns are Anchored in Safe Settlements (Tier <= 2)', () => {
  const spawns = worldData.getOriginSpawns();
  assert.strictEqual(spawns.length, 8, `Expected 8 starter spawns, got ${spawns.length}`);

  for (const spawn of spawns) {
    assert.ok(spawn.dangerTier <= 2, `Spawn ${spawn.id} dangerTier (${spawn.dangerTier}) > 2`);
    assert.ok(spawn.spawnCoords.tileX >= 0 && spawn.spawnCoords.tileX < 5000, `Spawn ${spawn.id} tileX out of bounds`);
    assert.ok(spawn.spawnCoords.tileY >= 0 && spawn.spawnCoords.tileY < 5000, `Spawn ${spawn.id} tileY out of bounds`);
    
    // Anchor verification
    const anchor = worldData.getAnchorById(spawn.anchorId);
    assert.ok(anchor, `Spawn ${spawn.id} references non-existent anchor ${spawn.anchorId}`);
    assert.strictEqual(anchor.x, spawn.spawnCoords.tileX, `Anchor X mismatch for ${spawn.id}`);
    assert.strictEqual(anchor.y, spawn.spawnCoords.tileY, `Anchor Y mismatch for ${spawn.id}`);

    // Region verification
    const region = worldData.getRegionAt(spawn.spawnCoords.tileX, spawn.spawnCoords.tileY);
    assert.ok(region, `No region found at spawn ${spawn.id}`);
    assert.notStrictEqual(region.id, 'unknown_void', `Spawn ${spawn.id} landed in void`);
  }
});

// -------------------------------------------------------------
// Test 4: Invariant 7 - Anchor Coordinate Parity across Subsystems
// -------------------------------------------------------------
runTest('Invariant 7: Anchor Coordinate Parity across Macro-Map and Starter Kits', () => {
  const macroMap = worldData.getMacroMapPayload();
  assert.ok(macroMap.success, 'macroMap payload missing success');
  assert.strictEqual(macroMap.worldSize, 5000, 'macroMap worldSize must be 5000');

  // Verify Donghai Port parity
  const donghaiAnchor = worldData.getAnchorById('dermaga_donghai');
  assert.strictEqual(donghaiAnchor.x, 4200, 'Donghai anchor X must be 4200');
  assert.strictEqual(donghaiAnchor.y, 2700, 'Donghai anchor Y must be 2700');

  const donghaiSpawn = starterKits.getOriginSpawn('eastern_sea_port');
  assert.strictEqual(donghaiSpawn.spawnCoords.tileX, 4200, 'Donghai spawn tileX must be 4200');
  assert.strictEqual(donghaiSpawn.spawnCoords.tileY, 2700, 'Donghai spawn tileY must be 2700');

  const donghaiLandmark = macroMap.landmarks.find(l => l.name === 'Dermaga Donghai');
  assert.ok(donghaiLandmark, 'Donghai landmark missing in macroMap');
  assert.strictEqual(donghaiLandmark.x, 4200, 'Donghai landmark X must be 4200');
  assert.strictEqual(donghaiLandmark.y, 2700, 'Donghai landmark Y must be 2700');
});

// -------------------------------------------------------------
// Test 5: Invariant 10 - Determinism of Region Resolution
// -------------------------------------------------------------
runTest('Invariant 10: Determinism of getRegionAt (100 repetitions per test coordinate)', () => {
  const testCoords = [
    { x: 2455, y: 2485 },
    { x: 100, y: 100 },
    { x: 4200, y: 2700 },
    { x: 1820, y: 2320 },
    { x: 3100, y: 3350 },
    { x: 4800, y: 4800 },
    { x: 1200, y: 4200 }
  ];

  for (const pt of testCoords) {
    const expected = worldData.getRegionAt(pt.x, pt.y).id;
    for (let i = 0; i < 100; i++) {
      const actualDirect = worldData.getRegionAt(pt.x, pt.y).id;
      const actualEngine = worldRegionEngine.getRegionAt(pt.x, pt.y).id;
      assert.strictEqual(actualDirect, expected, `Non-deterministic direct result at (${pt.x}, ${pt.y})`);
      assert.strictEqual(actualEngine, expected, `Non-deterministic engine result at (${pt.x}, ${pt.y})`);
    }
  }
});

// -------------------------------------------------------------
// Test 6: Invariant - Passes and Barriers Boundary Sanity
// -------------------------------------------------------------
runTest('Invariant: Barriers and Passes Boundary Sanity & Data Structure Integrity', () => {
  const barriers = worldData.getBarriers();
  assert.strictEqual(barriers.length, 7, `Expected 7 barriers, got ${barriers.length}`);
  for (const b of barriers) {
    assert.ok(b.id && b.name, 'Barrier missing id or name');
    assert.ok(b.bounds.minX >= 0 && b.bounds.maxX <= 5000, `Barrier ${b.id} X bounds invalid`);
    assert.ok(b.bounds.minY >= 0 && b.bounds.maxY <= 5000, `Barrier ${b.id} Y bounds invalid`);
  }

  const passes = worldData.getPasses();
  assert.strictEqual(passes.length, 5, `Expected 5 official passes, got ${passes.length}`);
  for (const p of passes) {
    assert.ok(p.id && p.name, 'Pass missing id or name');
    assert.ok(p.x >= 0 && p.x < 5000, `Pass ${p.id} X out of bounds`);
    assert.ok(p.y >= 0 && p.y < 5000, `Pass ${p.id} Y out of bounds`);
    assert.ok((p.width || p.passThroughWidth) >= 2, `Pass ${p.id} must have traversable width >= 2`);
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
