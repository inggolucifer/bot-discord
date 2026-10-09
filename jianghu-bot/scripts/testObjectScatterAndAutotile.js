/**
 * TEST SUITE: OBJECT SCATTER & AUTOTILING VERIFICATION (FASE 12)
 * Tests:
 * 1. Determinism of getChunkObjects (100 repetitions)
 * 2. Performance budget constraint (<= 140 objects per chunk)
 * 3. Footprint collision safety (No objects blocking roads, settlements, or deep water)
 * 4. Automated Mountain Chains generation in Azure Wall
 * 5. Autotiling 4-bit 16-variant bitmask calculation and frame resolution
 * 6. Viewport multi-chunk querying and filtering
 */

const { getChunkObjects, getViewportObjects, CHUNK_SIZE } = require('../utils/objectScatter');
const { calculateAutotileBitmask, getAutotileFrameId, isTerrainConnected } = require('../utils/autotileEngine');
const { getTileAt, WORLD_SEED } = require('../utils/proceduralWorldEngine');
const worldData = require('../utils/worldData');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

console.log('=== TEST SUITE: OBJECT SCATTER & AUTOTILING VERIFICATION (FASE 12) ===\n');

// ----------------------------------------------------------------------------
// 1. Determinism of getChunkObjects (100 Repetitions)
// ----------------------------------------------------------------------------
const testChunkX = 70; // (2240, 2400) - central plains area
const testChunkY = 75;

const baseline = getChunkObjects(testChunkX, testChunkY, WORLD_SEED);
let isDeterministic = true;

for (let i = 0; i < 100; i++) {
  const current = getChunkObjects(testChunkX, testChunkY, WORLD_SEED);
  if (current.length !== baseline.length) {
    isDeterministic = false;
    break;
  }
  for (let j = 0; j < baseline.length; j++) {
    if (baseline[j].id !== current[j].id || baseline[j].x !== current[j].x || baseline[j].y !== current[j].y) {
      isDeterministic = false;
      break;
    }
  }
}
assert(isDeterministic, `getChunkObjects is 100% deterministic across 100 repetitions (${baseline.length} objects)`);

// ----------------------------------------------------------------------------
// 2. Performance Budget (<= 140 Objects per Chunk)
// ----------------------------------------------------------------------------
let maxObserved = 0;
const sampleChunks = [
  [65, 75], // central plains
  [75, 105], // azure wall
  [70, 70], // delta
  [25, 68], // western desert
  [38, 130] // hermit highlands
];

for (const [cx, cy] of sampleChunks) {
  const objs = getChunkObjects(cx, cy, WORLD_SEED);
  if (objs.length > maxObserved) maxObserved = objs.length;
  assert(objs.length <= 140, `Chunk (${cx}, ${cy}) has ${objs.length} objects (budget <= 140)`);
}
assert(maxObserved <= 140, `Peak object density (${maxObserved}) respects performance budget <= 140`);

// ----------------------------------------------------------------------------
// 3. Collision & Rejection Safety
// ----------------------------------------------------------------------------
let roadViolations = 0;
let waterViolations = 0;

for (const [cx, cy] of sampleChunks) {
  const objs = getChunkObjects(cx, cy, WORLD_SEED);
  for (const obj of objs) {
    const tile = getTileAt(obj.x, obj.y);
    const t = tile.terrainType || '';

    if (t.includes('road') || t.includes('pass')) {
      roadViolations++;
    }
    if (t === 'river' || t === 'ocean' || t === 'lake_deep') {
      waterViolations++;
    }
  }
}
assert(roadViolations === 0, 'No scattered object placed on top of roads or mountain passes');
assert(waterViolations === 0, 'No scattered land object placed on top of rivers or deep water');

// ----------------------------------------------------------------------------
// 4. Automated Mountain Chains in Azure Wall
// ----------------------------------------------------------------------------
// Azure wall at chunk (75, 105) which corresponds to y ≈ 3360
const mountainChunkObjs = getChunkObjects(75, 105, WORLD_SEED);
const hasMountainObj = mountainChunkObjs.some(o => o.defId.startsWith('mt_'));
assert(hasMountainObj, `Azure Mountain Range chunk contains multi-cell mountain formations (${mountainChunkObjs.filter(o => o.defId.startsWith('mt_')).length} peaks)`);

// ----------------------------------------------------------------------------
// 5. Autotiling 4-bit 16-Variant Bitmask Engine
// ----------------------------------------------------------------------------
// Mock terrain grid for bitmask testing
const mockGrid = {
  // Straight vertical river at (10, 10): connected to (10, 11) [N] and (10, 9) [S]
  '10,10': 'river',
  '10,11': 'river',
  '10,9': 'river',

  // Corner river at (20, 20): connected to (20, 21) [N] and (21, 20) [E]
  '20,20': 'river',
  '20,21': 'river',
  '21,20': 'river',

  // Cross intersection at (30, 30): connected in all 4 directions
  '30,30': 'road_stone',
  '30,31': 'road_stone',
  '31,30': 'road_stone',
  '30,29': 'road_stone',
  '29,30': 'road_stone'
};

function mockGetTerrain(x, y) {
  return mockGrid[`${x},${y}`] || 'plains';
}

const verticalBitmask = calculateAutotileBitmask(10, 10, mockGetTerrain);
assert(verticalBitmask === (1 | 4), `Vertical river has bitmask 5 (North | South): ${verticalBitmask}`);
assert(getAutotileFrameId('river', verticalBitmask) === 'autotile_river_m05', 'Vertical river resolves to autotile_river_m05');

const cornerBitmask = calculateAutotileBitmask(20, 20, mockGetTerrain);
assert(cornerBitmask === (1 | 2), `Corner river has bitmask 3 (North | East): ${cornerBitmask}`);
assert(getAutotileFrameId('river', cornerBitmask) === 'autotile_river_m03', 'Corner river resolves to autotile_river_m03');

const crossBitmask = calculateAutotileBitmask(30, 30, mockGetTerrain);
assert(crossBitmask === (1 | 2 | 4 | 8), `Cross road has bitmask 15 (All 4 directions): ${crossBitmask}`);
assert(getAutotileFrameId('road_stone', crossBitmask) === 'autotile_road_m0f', 'Cross road resolves to autotile_road_m0f');

const isolatedBitmask = calculateAutotileBitmask(99, 99, mockGetTerrain);
assert(isolatedBitmask === 0, `Isolated plains tile has bitmask 0: ${isolatedBitmask}`);

// ----------------------------------------------------------------------------
// 6. Viewport Multi-Chunk Filtering
// ----------------------------------------------------------------------------
const vpObjs = getViewportObjects(2000, 2400, 2032, 2432, WORLD_SEED);
assert(Array.isArray(vpObjs), `getViewportObjects returns array (${vpObjs.length} objects)`);
assert(vpObjs.length <= 140, `getViewportObjects strictly respects max 140 budget`);

let allInBounds = true;
for (const o of vpObjs) {
  if (o.x < 2000 || o.x > 2032 || o.y < 2400 || o.y > 2432) {
    allInBounds = false;
    break;
  }
}
assert(allInBounds, 'All objects returned by getViewportObjects lie strictly within viewport bounds');

console.log('\n========================================');
console.log(`HASIL: ${passCount} LULUS, ${failCount} GAGAL`);
console.log('========================================');

if (failCount > 0) process.exit(1);
