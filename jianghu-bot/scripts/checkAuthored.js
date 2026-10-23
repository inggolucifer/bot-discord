/**
 * scripts/checkAuthored.js
 * Verifies all authored objects in world-data/authored-props.json:
 * 1. For every authored prop, calls getChunkObjects for its chunk and asserts the object appears exactly at (x, y).
 * 2. Verifies 0 missing objects.
 * 3. Verifies no authored prop is on water, solid, road, or inside anchor core.
 * 4. Verifies no two authored houses are within Chebyshev < 3, and no two objects within Chebyshev < 2.
 */

const fs = require('fs');
const path = require('path');
const { getChunkObjects } = require('../utils/objectScatter');
const { getTileAt } = require('../utils/proceduralWorldEngine');
const worldData = require('../utils/worldData');

const authoredDataPath = path.resolve(__dirname, '../world-data/authored-props.json');
const authoredData = JSON.parse(fs.readFileSync(authoredDataPath, 'utf8'));

const props = authoredData.props || [];
const roads = authoredData.roads || [];

console.log('\n=== AUDIT LAPISAN OBJEK TERTULIS (checkAuthored.js) ===\n');
console.log(`Memeriksa ${props.length} objek tertulis dan ${roads.length} segmen jalan...\n`);

// 1. Build road tile set
const roadTiles = new Set();
for (const r of roads) {
  if (r.direction === 'EW') {
    const y = r.from.y;
    for (let x = Math.min(r.from.x, r.to.x); x <= Math.max(r.from.x, r.to.x); x++) {
      roadTiles.add(`${x},${y}`);
    }
  } else if (r.direction === 'NS') {
    const x = r.from.x;
    for (let y = Math.min(r.from.y, r.to.y); y <= Math.max(r.from.y, r.to.y); y++) {
      roadTiles.add(`${x},${y}`);
    }
  }
}

// 2. Build anchor map
const anchorMap = new Map();
for (const a of worldData.getAnchors()) {
  anchorMap.set(a.id, a);
}

let missingCount = 0;
let invalidTerrainCount = 0;
let onRoadCount = 0;
let insideAnchorCoreCount = 0;
let distanceViolations = 0;

const missingSamples = [];
const terrainSamples = [];
const distanceSamples = [];

// Cache loaded chunks
const chunkCache = new Map();
function getObjectsForChunk(cx, cy) {
  const key = `${cx},${cy}`;
  if (!chunkCache.has(key)) {
    chunkCache.set(key, getChunkObjects(cx, cy));
  }
  return chunkCache.get(key);
}

for (let i = 0; i < props.length; i++) {
  const p = props[i];
  const cx = Math.floor(p.x / 32);
  const cy = Math.floor(p.y / 32);

  // Assertion 1: Object must appear in getChunkObjects exactly at (x, y)
  const chunkObjs = getObjectsForChunk(cx, cy);
  const found = chunkObjs.find(o => o.id === p.id && o.x === p.x && o.y === p.y);
  if (!found) {
    missingCount++;
    if (missingSamples.length < 10) {
      missingSamples.push({ id: p.id, x: p.x, y: p.y, anchorId: p.anchorId });
    }
  }

  // Assertion 2: Object must not be on solid or water
  const tile = getTileAt(p.x, p.y);
  const tt = tile ? tile.terrainType || '' : '';
  const isWater = ['sea', 'ocean', 'sea_reef', 'lake_deep', 'lake', 'river', 'river_shallow', 'pond_lotus'].includes(tt) || tt.includes('water');
  if (tile && (tile.isSolid || isWater)) {
    invalidTerrainCount++;
    if (terrainSamples.length < 10) {
      terrainSamples.push({ id: p.id, x: p.x, y: p.y, terrain: tt, isSolid: tile.isSolid });
    }
  }

  // Assertion 3: Object must not be on road
  if (roadTiles.has(`${p.x},${p.y}`)) {
    onRoadCount++;
  }

  // Assertion 4: Object must not be inside anchor core (±2 tiles from anchor center)
  const anc = anchorMap.get(p.anchorId);
  if (anc) {
    if (Math.abs(p.x - anc.x) <= 2 && Math.abs(p.y - anc.y) <= 2) {
      insideAnchorCoreCount++;
    }
  }

  // Assertion 5: Pairwise distances
  for (let j = i + 1; j < props.length; j++) {
    const q = props[j];
    const dist = Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y));
    const minDist = (p.kind === 'house' && q.kind === 'house') ? 3 : 2;
    if (dist < minDist) {
      distanceViolations++;
      if (distanceSamples.length < 10) {
        distanceSamples.push({ id1: p.id, id2: q.id, dist, minDist });
      }
    }
  }
}

console.log('--- HASIL AUDIT ---');
console.log(`Total Objek Tertulis Diperiksa : ${props.length}`);
console.log(`Objek Hilang dari getChunkObjects: ${missingCount}`);
console.log(`Objek di Petak Solid / Air       : ${invalidTerrainCount}`);
console.log(`Objek di Petak Jalan             : ${onRoadCount}`);
console.log(`Objek di Inti Anchor             : ${insideAnchorCoreCount}`);
console.log(`Pelanggaran Jarak Chebyshev      : ${distanceViolations}`);

if (missingCount > 0) {
  console.log('\nContoh Objek Hilang:');
  console.table(missingSamples);
}
if (invalidTerrainCount > 0) {
  console.log('\nContoh Objek di Medan Tidak Sah:');
  console.table(terrainSamples);
}
if (distanceViolations > 0) {
  console.log('\nContoh Pelanggaran Jarak:');
  console.table(distanceSamples);
}

const allPassed = (
  missingCount === 0 &&
  invalidTerrainCount === 0 &&
  onRoadCount === 0 &&
  insideAnchorCoreCount === 0 &&
  distanceViolations === 0
);

if (allPassed) {
  console.log('\n[PASS] Gerbang Lapisan Objek Tertulis LULUS SEMPURNA (0 hilang, 0 pelanggaran).');
  process.exit(0);
} else {
  console.log('\n[GAGAL] Terdapat pelanggaran pada lapisan objek tertulis.');
  process.exit(1);
}
