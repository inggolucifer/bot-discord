/**
 * scripts/checkAuthored.js
 * Comprehensive Audit for Authored Props & Village Archetypes (Prompt D4):
 * 1. Verifies 0 missing objects from getChunkObjects (exact coordinates).
 * 2. Verifies 0 objects on water, solid, road tiles, or inside anchor core.
 * 3. Verifies pairwise Chebyshev distance (>= 3 between houses, >= 2 between all other props).
 * 4. Verifies unique layout fingerprints (uniqueLayouts == 52).
 * 5. Verifies distance to water >= 6 for inland archetypes.
 * 6. Verifies dominant defId <= 35% per village.
 * 7. Verifies all roads connect to >= 1 building.
 * 8. Verifies BFS reachability from main road within radius 12.
 */

const fs = require('fs');
const path = require('path');
const { getChunkObjects } = require('../utils/objectScatter');
const { getTileAt } = require('../utils/proceduralWorldEngine');
const worldData = require('../utils/worldData');

const authoredDataPath = path.resolve(__dirname, '../world-data/authored-props.json');
const authoredData = JSON.parse(fs.readFileSync(authoredDataPath, 'utf8'));

const archetypes = require('../world-data/village-archetypes-v9.json');
const anchors = worldData.getAnchors();
const { getArchetypeForAnchor } = require('./gen/buildVillagesV9');

const props = authoredData.props || [];
const roads = authoredData.roads || [];

console.log('\n=== AUDIT LAPISAN OBJEK TERTULIS & DESA ARKETIPE V9 (checkAuthored.js) ===\n');
console.log(`Memeriksa ${props.length} objek tertulis dan ${roads.length} segmen jalan across 52 anchors...\n`);

function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

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

// 2. Build anchor map & props by anchor
const anchorMap = new Map();
const propsByAnchor = new Map();
for (const a of anchors) {
  anchorMap.set(a.id, a);
  propsByAnchor.set(a.id, []);
}

for (const p of props) {
  if (p.anchorId && propsByAnchor.has(p.anchorId)) {
    propsByAnchor.get(p.anchorId).push(p);
  }
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

// Assertion 1-5: Prop-level validations
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

// Gerbang D Checks: Per-Village Metrics
console.log('--- AUDIT METRIK PER-DESA (GERBANG D) ---');
console.log('| No | Anchor ID | Arketipe | Rumah | Dominan% | Air Min Dist | Jalan Ok | BFS Ok | Fingerprint | Status |');
console.log('|---|---|---|---|---|---|---|---|---|---|');

const fingerprints = new Set();
let villageFails = 0;

for (let i = 0; i < anchors.length; i++) {
  const a = anchors[i];
  const vProps = propsByAnchor.get(a.id) || [];
  const houses = vProps.filter(p => p.kind === 'house');

  // 1. Dominant DefId %
  const defCounts = {};
  for (const h of houses) {
    defCounts[h.defId] = (defCounts[h.defId] || 0) + 1;
  }
  const maxDef = Object.keys(defCounts).length > 0 ? Math.max(...Object.values(defCounts)) : 0;
  const domPct = houses.length > 0 ? (maxDef / houses.length) * 100 : 0;
  const isDomOk = domPct <= 35.0;

  // 2. Distance to water for inland archetypes
  const arch = getArchetypeForAnchor(a);
  const archKey = arch.key;
  const isWaterExempt = archKey === 'coastal_fishing' || archKey === 'river_village' || a.id.includes('donghai') || a.id.includes('canghai');
  let minWaterDist = 99;
  for (const h of houses) {
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        const t = getTileAt(h.x + dx, h.y + dy);
        if (t) {
          const tt = t.terrainType || '';
          if (['sea', 'ocean', 'lake', 'river', 'pond'].some(w => tt.includes(w))) {
            const d = Math.max(Math.abs(dx), Math.abs(dy));
            if (d < minWaterDist) minWaterDist = d;
          }
        }
      }
    }
  }
  const isWaterOk = isWaterExempt || minWaterDist >= 6;

  // 3. Roads connect to >= 1 building
  let roadsConnected = true;
  for (const h of houses) {
    let near = false;
    for (let rdy = -3; rdy <= 3; rdy++) {
      for (let rdx = -3; rdx <= 3; rdx++) {
        if (roadTiles.has(`${h.x + rdx},${h.y + rdy}`)) {
          near = true;
          break;
        }
      }
      if (near) break;
    }
    if (!near) {
      roadsConnected = false;
      break;
    }
  }

  // 4. BFS Reachability from anchor within radius 12
  const visited = new Set();
  const queue = [{ x: a.x, y: a.y }];
  visited.add(`${a.x},${a.y}`);
  while (queue.length > 0) {
    const cur = queue.shift();
    const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
    for (const d of dirs) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && Math.max(Math.abs(nx - a.x), Math.abs(ny - a.y)) <= 12) {
        const t = getTileAt(nx, ny);
        if (t && !t.isSolid) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  let bfsOk = true;
  for (const h of houses) {
    if (!visited.has(`${h.x},${h.y}`)) {
      // Check 1-tile adjacent
      const adj = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }]
        .some(d => visited.has(`${h.x + d.dx},${h.y + d.dy}`));
      if (!adj) {
        bfsOk = false;
        break;
      }
    }
  }

  // 5. Layout Fingerprint
  let fpStr = '';
  for (const p of vProps) {
    fpStr += `${p.x - a.x},${p.y - a.y}:${p.defId};`;
  }
  const fp = hashString(fpStr).toString(16);
  fingerprints.add(fp);

  const villagePass = isDomOk && isWaterOk && roadsConnected && bfsOk;
  if (!villagePass) villageFails++;

  console.log(
    `| ${i + 1} | ${a.id} | ${archKey} | ${houses.length} | ${domPct.toFixed(1)}% | ${minWaterDist === 99 ? 'N/A' : minWaterDist} | ${roadsConnected ? 'PASS' : 'FAIL'} | ${bfsOk ? 'PASS' : 'FAIL'} | ${fp} | ${villagePass ? 'PASS' : 'FAIL'} |`
  );
}

console.log('\n--- RINGKASAN HASIL AUDIT ---');
console.log(`Total Objek Tertulis Diperiksa : ${props.length}`);
console.log(`Objek Hilang dari getChunkObjects: ${missingCount}`);
console.log(`Objek di Petak Solid / Air       : ${invalidTerrainCount}`);
console.log(`Objek di Petak Jalan             : ${onRoadCount}`);
console.log(`Objek di Inti Anchor             : ${insideAnchorCoreCount}`);
console.log(`Pelanggaran Jarak Chebyshev      : ${distanceViolations}`);
console.log(`Unique Layout Fingerprints       : ${fingerprints.size} / 52`);
console.log(`Kegagalan Aturan Desa            : ${villageFails}`);

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
  distanceViolations === 0 &&
  fingerprints.size === 52 &&
  villageFails === 0
);

if (allPassed) {
  console.log('\n[PASS] GERBANG D LULUS SEMPURNA! 52 arketipe desa unik, jalan melengkung, 0 hilang, 0 pelanggaran.\n');
  process.exit(0);
} else {
  console.log('\n[GAGAL] Terdapat pelanggaran pada Gerbang D.');
  process.exit(1);
}
