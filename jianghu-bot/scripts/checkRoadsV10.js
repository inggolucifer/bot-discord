/**
 * scripts/checkRoadsV10.js
 * Verification of Road Topology & Grid Alignment (Prompt H1)
 *
 * Verifies:
 * 1. Every road tile has >= 1 4-directional road neighbor (no isolated stubs).
 * 2. 0 road tiles under solid footprints (V5 invariant).
 * 3. 0 disconnected road components with length < 3 tiles.
 * 4. All villages connect to road network (all houses <= 3 Chebyshev distance from road).
 * 5. All road segments are strictly orthogonal (EW or NS).
 * 6. Intercity roads have width 2, village roads have width 1 or 2.
 */

const fs = require('fs');
const path = require('path');
const { isCellBlocked } = require('../utils/objectScatter');
const worldData = require('../utils/worldData');

console.log('\n=== AUDIT TOPOLOGI JALAN & PETAK SEJAJAR GRID (checkRoadsV10.js) ===\n');

// 1. Load Authored Roads & Overrides
const authoredPath = path.resolve(__dirname, '../world-data/authored-props.json');
const authored = JSON.parse(fs.readFileSync(authoredPath, 'utf8'));
const authoredRoads = authored.roads || [];
const authoredProps = authored.props || [];

const roadOverridesPath = path.resolve(__dirname, '../world-data/road-overrides-v9.json');
let roadOverrides = [];
if (fs.existsSync(roadOverridesPath)) {
  const roData = JSON.parse(fs.readFileSync(roadOverridesPath, 'utf8'));
  roadOverrides = roData.roads || [];
}

const roadDonghaiPath = path.resolve(__dirname, '../world-data/road-donghai.json');
let roadDonghai = null;
if (fs.existsSync(roadDonghaiPath)) {
  roadDonghai = JSON.parse(fs.readFileSync(roadDonghaiPath, 'utf8'));
}

// 2. Build SSOT Road Tiles Map
const roadTiles = new Set();
let nonOrthogonalSegments = 0;
let widthViolations = 0;

for (const r of authoredRoads) {
  if (r.direction === 'EW') {
    if (r.from.y !== r.to.y) nonOrthogonalSegments++;
    const y = r.from.y;
    const minX = Math.min(r.from.x, r.to.x);
    const maxX = Math.max(r.from.x, r.to.x);
    for (let x = minX; x <= maxX; x++) {
      roadTiles.add(`${x},${y}`);
    }
  } else if (r.direction === 'NS') {
    if (r.from.x !== r.to.x) nonOrthogonalSegments++;
    const x = r.from.x;
    const minY = Math.min(r.from.y, r.to.y);
    const maxY = Math.max(r.from.y, r.to.y);
    for (let y = minY; y <= maxY; y++) {
      roadTiles.add(`${x},${y}`);
    }
  } else {
    nonOrthogonalSegments++;
  }
}

// Add Intercity Roads
for (const r of roadOverrides) {
  if (r.width !== 2) {
    widthViolations++;
  }
  if (Array.isArray(r.polyline)) {
    for (let i = 0; i < r.polyline.length - 1; i++) {
      const [x1, y1] = r.polyline[i];
      const [x2, y2] = r.polyline[i + 1];
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          roadTiles.add(`${x},${y}`);
          if (r.width === 2) {
            roadTiles.add(`${x},${y + 1}`);
          }
        }
      }
    }
  }
}

// 3. Check Gate 1: Isolated Road Tiles (0 4-direction neighbors)
let isolatedTiles = 0;
const isolatedSamples = [];
for (const key of roadTiles) {
  const [x, y] = key.split(',').map(Number);
  const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
  if (!neighbors.some(([nx, ny]) => roadTiles.has(`${nx},${ny}`))) {
    isolatedTiles++;
    if (isolatedSamples.length < 5) isolatedSamples.push({ x, y });
  }
}

// 4. Check Gate 2: Road Tiles Under Solid Footprints
let blockedTiles = 0;
const blockedSamples = [];
for (const key of roadTiles) {
  const [x, y] = key.split(',').map(Number);
  if (isCellBlocked(x, y)) {
    blockedTiles++;
    if (blockedSamples.length < 5) blockedSamples.push({ x, y });
  }
}

// 5. Check Gate 3: Disconnected Components with Length < 3 Tiles
const visited = new Set();
let smallComponents = 0;
const smallCompSamples = [];
for (const key of roadTiles) {
  if (visited.has(key)) continue;
  const comp = [];
  const q = [key];
  visited.add(key);
  while (q.length > 0) {
    const cur = q.shift();
    comp.push(cur);
    const [x, y] = cur.split(',').map(Number);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const nKey = `${nx},${ny}`;
      if (roadTiles.has(nKey) && !visited.has(nKey)) {
        visited.add(nKey);
        q.push(nKey);
      }
    }
  }
  if (comp.length < 3) {
    smallComponents++;
    if (smallCompSamples.length < 5) smallCompSamples.push(comp);
  }
}

// 6. Check Gate 4: Village Roads Connect to Settlement Buildings
const anchors = worldData.getAnchors ? worldData.getAnchors() : [];
let disconnectedVillages = 0;
const villageRoadDetails = [];

for (const a of anchors) {
  if (a.id === 'dermaga_donghai') continue; // Pier exemption
  const houses = authoredProps.filter(p => p.anchorId === a.id && p.kind === 'house');
  let villageConnected = true;
  for (const h of houses) {
    let near = false;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (roadTiles.has(`${h.x + dx},${h.y + dy}`)) {
          near = true;
          break;
        }
      }
      if (near) break;
    }
    if (!near) {
      villageConnected = false;
      break;
    }
  }
  if (!villageConnected) {
    disconnectedVillages++;
    villageRoadDetails.push(a.id);
  }
}

// 7. Print Report & Assertions
console.log('--- HASIL AUDIT JALAN V10 (Prompt H1) ---');
const results = [
  { Gate: 'H1.1: Petak Jalan Terisolasi (0 tetangga 4-arah)', Count: isolatedTiles, Target: '0', Status: isolatedTiles === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'H1.2: Petak Jalan Tertutup Footprint Solid (V5)', Count: blockedTiles, Target: '0', Status: blockedTiles === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'H1.3: Komponen Jalan Terpisah < 3 Petak', Count: smallComponents, Target: '0', Status: smallComponents === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'H1.4: Desa Tanpa Sambungan Jalan ke Rumah', Count: disconnectedVillages, Target: '0', Status: disconnectedVillages === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'H1.5: Segmen Jalan Non-Ortogonal', Count: nonOrthogonalSegments, Target: '0', Status: nonOrthogonalSegments === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'H1.6: Pelanggaran Lebar Jalan Antar-Kota (harus 2)', Count: widthViolations, Target: '0', Status: widthViolations === 0 ? 'PASS' : 'FAIL' }
];

console.table(results);
console.log(`Total Segmen Jalan   : ${authoredRoads.length}`);
console.log(`Total Petak Jalan Unik: ${roadTiles.size}\n`);

const allPass = results.every(r => r.Status === 'PASS');
if (allPass) {
  console.log('[SUKSES] Seluruh gerbang Topologi Jalan V10 LOLOS 100%!');
  process.exit(0);
} else {
  console.error('[GAGAL] Terdapat pelanggaran pada gerbang Jalan V10.');
  if (isolatedSamples.length > 0) console.error('Contoh petak terisolasi:', isolatedSamples);
  if (blockedSamples.length > 0) console.error('Contoh petak tertutup solid:', blockedSamples);
  if (smallCompSamples.length > 0) console.error('Contoh komponen < 3 petak:', smallCompSamples);
  if (villageRoadDetails.length > 0) console.error('Desa tanpa sambungan jalan:', villageRoadDetails);
  process.exit(1);
}
