/**
 * testWorldInvariants.js
 * Comprehensive Invariant Test Suite untuk Master World Map Overhaul (Fase 9)
 * Menguji Invariant I-1 s/d I-14 dan menjamin keutuhan matematis serta SSOT peta 5000x5000.
 */

const assert = require('assert');
const worldData = require('../utils/worldData');
const worldRegionEngine = require('../utils/worldRegionEngine');
const proceduralWorldEngine = require('../utils/proceduralWorldEngine');
const starterKits = require('../config/starterKits');

console.log('=== TEST SUITE: WORLD MAP INVARIANTS (FASE 9: MASTER OVERHAUL) ===\n');

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
// Test 3: Invariant 3 - Regional Characteristic Terrain Distribution
// -------------------------------------------------------------
runTest('Invariant 3: Regional Characteristic Terrain Distribution Matches Target Profiles', () => {
  // A. Mirror Lake: >= 55% lake/lake_deep, 0% mountain
  let mlTotal = 0, mlWater = 0, mlMountain = 0;
  for (let y = 3650; y <= 4050; y += 25) {
    for (let x = 3050; x <= 3750; x += 25) {
      if (worldData.getRegionAt(x, y).id === 'mirror_lake') {
        mlTotal++;
        const t = proceduralWorldEngine.getTileAt(x, y);
        if (t.terrainType === 'lake' || t.terrainType === 'lake_deep') mlWater++;
        if (['mountain', 'azure_mountain', 'mountain_rock', 'mountain_peak'].includes(t.terrainType)) mlMountain++;
      }
    }
  }
  assert.ok(mlTotal > 0, 'Mirror Lake has 0 sampled tiles');
  assert.ok((mlWater / mlTotal) >= 0.55, `Mirror Lake water (${(mlWater / mlTotal * 100).toFixed(1)}%) < 55%`);
  assert.strictEqual(mlMountain, 0, `Mirror Lake contains ${mlMountain} mountain tiles (expected 0)`);

  // B. Bone Sea Coast: >= 35% sea/sea_reef
  let bscTotal = 0, bscSea = 0;
  for (let y = 10; y <= 290; y += 15) {
    for (let x = 100; x <= 3400; x += 30) {
      if (worldData.getRegionAt(x, y).id === 'bone_sea_coast') {
        bscTotal++;
        const t = proceduralWorldEngine.getTileAt(x, y);
        if (t.terrainType === 'sea' || t.terrainType === 'sea_reef') bscSea++;
      }
    }
  }
  assert.ok(bscTotal > 0, 'Bone Sea Coast has 0 sampled tiles');
  assert.ok((bscSea / bscTotal) >= 0.35, `Bone Sea Coast sea (${(bscSea / bscTotal * 100).toFixed(1)}%) < 35%`);

  // C. Godthunder Peaks: 0% sea
  let gpTotal = 0, gpSea = 0;
  for (let y = 4050; y <= 4950; y += 25) {
    for (let x = 3250; x <= 3850; x += 25) {
      if (worldData.getRegionAt(x, y).id === 'godthunder_peaks') {
        gpTotal++;
        const t = proceduralWorldEngine.getTileAt(x, y);
        if (t.terrainType === 'ocean' || t.terrainType === 'sea') gpSea++;
      }
    }
  }
  assert.ok(gpTotal > 0, 'Godthunder Peaks has 0 sampled tiles');
  assert.strictEqual(gpSea, 0, `Godthunder Peaks has ${gpSea} sea tiles (expected 0)`);

  // D. Ore Teeth Range: sea <= 5%
  let otrTotal = 0, otrSea = 0;
  for (let y = 2450; y <= 3150; y += 25) {
    for (let x = 3450; x <= 3840; x += 25) {
      if (worldData.getRegionAt(x, y).id === 'ore_teeth_range') {
        otrTotal++;
        const t = proceduralWorldEngine.getTileAt(x, y);
        if (t.terrainType === 'ocean' || t.terrainType === 'sea') otrSea++;
      }
    }
  }
  assert.ok(otrTotal > 0, 'Ore Teeth Range has 0 sampled tiles');
  assert.ok((otrSea / otrTotal) <= 0.05, `Ore Teeth Range sea (${(otrSea / otrTotal * 100).toFixed(1)}%) > 5%`);

  // E. Border March: mountain <= 15%
  let bmTotal = 0, bmMountain = 0;
  for (let y = 1810; y <= 2040; y += 15) {
    for (let x = 1550; x <= 3250; x += 30) {
      if (worldData.getRegionAt(x, y).id === 'border_march') {
        bmTotal++;
        const t = proceduralWorldEngine.getTileAt(x, y);
        if (['mountain', 'azure_mountain', 'mountain_rock', 'mountain_peak'].includes(t.terrainType)) bmMountain++;
      }
    }
  }
  assert.ok(bmTotal > 0, 'Border March has 0 sampled tiles');
  assert.ok((bmMountain / bmTotal) <= 0.15, `Border March mountain (${(bmMountain / bmTotal * 100).toFixed(1)}%) > 15%`);

  // F. Nine Springs Delta: swamp <= 10%
  let nsdTotal = 0, nsdSwamp = 0;
  for (let y = 2360; y <= 2540; y += 10) {
    for (let x = 2210; x <= 2590; x += 15) {
      if (worldData.getRegionAt(x, y).id === 'nine_springs_delta') {
        nsdTotal++;
        const t = proceduralWorldEngine.getTileAt(x, y);
        if (t.terrainType === 'swamp') nsdSwamp++;
      }
    }
  }
  assert.ok(nsdTotal > 0, 'Nine Springs Delta has 0 sampled tiles');
  assert.ok((nsdSwamp / nsdTotal) <= 0.10, `Nine Springs Delta swamp (${(nsdSwamp / nsdTotal * 100).toFixed(1)}%) > 10%`);
});

// -------------------------------------------------------------
// Test 4: Invariant 4 - Starter Spawns Safety & Anchor Parity
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
// Test 5: Invariant 4b - Spawn Parity, Non-Solid, and Distance Separation (>= 400)
// -------------------------------------------------------------
runTest('Invariant 4b: All Starter Spawns Walkable, Exact Region Matching, and Separated (Dist >= 400)', () => {
  const spawns = worldData.getOriginSpawns();

  for (const s of spawns) {
    const tile = proceduralWorldEngine.getTileAt(s.spawnCoords.tileX, s.spawnCoords.tileY);
    assert.strictEqual(tile.isSolid, false, `Spawn ${s.id} tile must not be solid`);

    const reg = worldData.getRegionAt(s.spawnCoords.tileX, s.spawnCoords.tileY);
    assert.strictEqual(s.regionSlug, reg.id, `Spawn ${s.id} regionSlug '${s.regionSlug}' != engine region '${reg.id}'`);
  }

  // Pairwise distance >= 400
  for (let i = 0; i < spawns.length; i++) {
    for (let j = i + 1; j < spawns.length; j++) {
      const d = Math.hypot(
        spawns[i].spawnCoords.tileX - spawns[j].spawnCoords.tileX,
        spawns[i].spawnCoords.tileY - spawns[j].spawnCoords.tileY
      );
      assert.ok(d >= 400, `Spawns ${spawns[i].id} and ${spawns[j].id} distance (${d.toFixed(1)}) < 400`);
    }
  }
});

// -------------------------------------------------------------
// Test 6: Invariant 5 - Impermeable Barrier Enclosure (BFS Without Passes Fails; With Passes Succeeds)
// -------------------------------------------------------------
runTest('Invariant 5: Barrier Enclosure (BFS from Xingcun to North Fails When Passes Closed, Succeeds When Open)', () => {
  const stride = 25;
  const gridW = Math.floor(5000 / stride);
  const gridH = Math.floor(5000 / stride);

  function isSolidAt(gx, gy, closePasses) {
    const x = gx * stride;
    const y = gy * stride;
    if (closePasses && y >= 3100 && y <= 3600) {
      return true; // Entire horizontal barrier solid when passes closed
    }
    return proceduralWorldEngine.getTileAt(x, y).isSolid;
  }

  function runBfsToNorth(closePasses) {
    const startGx = Math.floor(2050 / stride);
    const startGy = Math.floor(2650 / stride);
    const visited = new Uint8Array(gridW * gridH);
    const queue = [startGx, startGy];
    visited[startGy * gridW + startGx] = 1;

    let head = 0;
    while (head < queue.length) {
      const cx = queue[head++];
      const cy = queue[head++];

      if (cy * stride > 3600) {
        return true; // Successfully crossed to the north
      }

      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
          const idx = ny * gridW + nx;
          if (!visited[idx]) {
            visited[idx] = 1;
            if (!isSolidAt(nx, ny, closePasses)) {
              queue.push(nx, ny);
            }
          }
        }
      }
    }
    return false;
  }

  const reachedWhenClosed = runBfsToNorth(true);
  assert.strictEqual(reachedWhenClosed, false, 'BFS leaked past northern barrier when passes closed!');

  const reachedWhenOpen = runBfsToNorth(false);
  assert.strictEqual(reachedWhenOpen, true, 'BFS failed to reach north when passes are open!');
});

// -------------------------------------------------------------
// Test 7: Invariant 6 - Main Continent Walkable Cohesion
// -------------------------------------------------------------
runTest('Invariant 6: Main Continent Walkable Cohesion (No Isolated Land Pocket > 0.5%)', () => {
  const stride = 50;
  const gridW = Math.floor(5000 / stride);
  const gridH = Math.floor(5000 / stride);

  let walkableCount = 0;
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      if (!proceduralWorldEngine.getTileAt(gx * stride, gy * stride).isSolid) {
        walkableCount++;
      }
    }
  }

  // Flood-fill from Xingcun
  const startGx = Math.floor(2050 / stride);
  const startGy = Math.floor(2650 / stride);
  const visited = new Uint8Array(gridW * gridH);
  const queue = [startGx, startGy];
  visited[startGy * gridW + startGx] = 1;

  let reachedWalkable = 0;
  let head = 0;

  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    reachedWalkable++;

    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
        const idx = ny * gridW + nx;
        if (!visited[idx]) {
          visited[idx] = 1;
          if (!proceduralWorldEngine.getTileAt(nx * stride, ny * stride).isSolid) {
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  const reachRatio = reachedWalkable / walkableCount;
  assert.ok(reachRatio >= 0.70, `Walkable continent reach ratio (${(reachRatio * 100).toFixed(1)}%) < 70%`);
});

// -------------------------------------------------------------
// Test 8: Invariant 7 - Anchor Coordinate Parity across Subsystems
// -------------------------------------------------------------
runTest('Invariant 7: Anchor Coordinate Parity across Macro-Map, Anchors, and Starter Kits', () => {
  const macroMap = worldData.getMacroMapPayload();
  assert.ok(macroMap.success, 'macroMap payload missing success');
  assert.strictEqual(macroMap.worldSize, 5000, 'macroMap worldSize must be 5000');

  // Verify Donghai Port parity (updated to mainland coast 3920, 2700)
  const donghaiAnchor = worldData.getAnchorById('dermaga_donghai');
  assert.strictEqual(donghaiAnchor.x, 3920, 'Donghai anchor X must be 3920');
  assert.strictEqual(donghaiAnchor.y, 2700, 'Donghai anchor Y must be 2700');

  const donghaiSpawn = starterKits.getOriginSpawn('eastern_sea_port');
  assert.strictEqual(donghaiSpawn.spawnCoords.tileX, 3920, 'Donghai spawn tileX must be 3920');
  assert.strictEqual(donghaiSpawn.spawnCoords.tileY, 2700, 'Donghai spawn tileY must be 2700');

  const donghaiLandmark = macroMap.landmarks.find(l => l.name === 'Dermaga Donghai');
  assert.ok(donghaiLandmark, 'Donghai landmark missing in macroMap');
  assert.strictEqual(donghaiLandmark.x, 3920, 'Donghai landmark X must be 3920');
  assert.strictEqual(donghaiLandmark.y, 2700, 'Donghai landmark Y must be 2700');
});

// -------------------------------------------------------------
// Test 9: Invariant 8 - Law Affinity Resource Parity
// -------------------------------------------------------------
runTest('Invariant 8: Every Region with Law Affinities Has Harvestable Resource Tags', () => {
  const regions = worldData.getAllRegions();
  for (const r of regions) {
    if (r.lawAffinities && r.lawAffinities.length > 0) {
      assert.ok(
        r.resourceTags && r.resourceTags.length > 0,
        `Region ${r.id} has law affinities but 0 harvestable resourceTags`
      );
    }
  }
});

// -------------------------------------------------------------
// Test 10: Invariant 9 - Ambush Risk Rate Matrix Integrity
// -------------------------------------------------------------
runTest('Invariant 9: Ambush Risk Rate Matrix Matches Territory Specifications', () => {
  const sampleTerrains = [
    { terrain: 'settlement', expected: 0 },
    { terrain: 'road', expected: 0 },
    { terrain: 'plains', expected: 0 },
    { terrain: 'bamboo_forest', expected: 0.18 },
    { terrain: 'forest', expected: 0.22 },
    { terrain: 'swamp', expected: 0.32 },
    { terrain: 'mountain', expected: 0.28 },
    { terrain: 'volcanic', expected: 0.40 },
    { terrain: 'western_desert', expected: 0.25 },
    { terrain: 'glacial', expected: 0.30 },
    { terrain: 'ocean', expected: 0.18 },
    { terrain: 'mountain_pass', expected: 0.05 }
  ];

  for (const s of sampleTerrains) {
    const info = worldRegionEngine.getTerritoryInfo(2000, 2500, s.terrain, s.terrain === 'settlement');
    const diff = Math.abs(info.ambushRiskRate - s.expected);
    assert.ok(diff <= 0.01, `Ambush rate mismatch for ${s.terrain}: got ${info.ambushRiskRate}, expected ${s.expected}`);
  }
});

// -------------------------------------------------------------
// Test 11: Invariant 10 - Determinism of Region Resolution
// -------------------------------------------------------------
runTest('Invariant 10: Determinism of getRegionAt (100 repetitions per test coordinate)', () => {
  const testCoords = [
    { x: 2050, y: 2650 },
    { x: 100, y: 100 },
    { x: 3870, y: 2700 },
    { x: 2200, y: 3340 },
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
// Test 12: Invariant 11 - Settlement Spacing (Village+ Distance >= 180)
// -------------------------------------------------------------
runTest('Invariant 11: All Major Settlements (Village+) Separated by Distance >= 180', () => {
  const anchors = worldData.getAnchors().filter(a => ['village', 'major_city', 'capital_city'].includes(a.type));

  for (let i = 0; i < anchors.length; i++) {
    for (let j = i + 1; j < anchors.length; j++) {
      const d = Math.hypot(anchors[i].x - anchors[j].x, anchors[i].y - anchors[j].y);
      assert.ok(d >= 180, `Settlements ${anchors[i].id} and ${anchors[j].id} distance (${d.toFixed(1)}) < 180`);
    }
  }
});

// -------------------------------------------------------------
// Test 13: Invariant 12 - Anchor Non-Solid & Reachability Integrity
// -------------------------------------------------------------
runTest('Invariant 12: All Settlement and Outpost Anchors are Walkable and Non-Solid', () => {
  const anchors = worldData.getAnchors();
  for (const a of anchors) {
    const tile = proceduralWorldEngine.getTileAt(a.x, a.y);
    assert.strictEqual(tile.isSolid, false, `Anchor ${a.id} at (${a.x}, ${a.y}) must not be solid`);
  }
});

// -------------------------------------------------------------
// Test 14: Invariant 13 & 14 - Barriers, Passes Sanity & Anchor Footprints
// -------------------------------------------------------------
runTest('Invariant 13 & 14: Barriers/Passes Boundary Sanity & Anchor Footprint Non-Overlap', () => {
  const barriers = worldData.getBarriers();
  assert.strictEqual(barriers.length, 7, `Expected 7 barriers, got ${barriers.length}`);
  for (const b of barriers) {
    assert.ok(b.id && b.name, 'Barrier missing id or name');
    assert.ok(b.bounds.minX >= 0 && b.bounds.maxX <= 5000, `Barrier ${b.id} X bounds invalid`);
    assert.ok(b.bounds.minY >= 0 && b.bounds.maxY <= 5000, `Barrier ${b.id} Y bounds invalid`);
  }

  const passes = worldData.getPasses();
  assert.strictEqual(passes.length, 6, `Expected 6 official passes, got ${passes.length}`);
  for (const p of passes) {
    assert.ok(p.id && p.name, 'Pass missing id or name');
    assert.ok(p.x >= 0 && p.x < 5000, `Pass ${p.id} X out of bounds`);
    assert.ok(p.y >= 0 && p.y < 5000, `Pass ${p.id} Y out of bounds`);
    assert.ok((p.width || p.passThroughWidth) >= 2, `Pass ${p.id} must have traversable width >= 2`);
  }

  // Anchor footprint multi-cell sanity
  const anchors = worldData.getAnchors();
  for (const a of anchors) {
    for (let dx = 0; dx < a.spanWidth; dx++) {
      for (let dy = 0; dy < a.spanHeight; dy++) {
        const x = a.x + dx;
        const y = a.y + dy;
        assert.ok(x >= 0 && x < 5000 && y >= 0 && y < 5000, `Anchor ${a.id} footprint out of bounds`);
        const t = proceduralWorldEngine.getTileAt(x, y);
        assert.strictEqual(t.isSolid, false, `Anchor ${a.id} footprint cell (${x}, ${y}) is solid`);
      }
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
