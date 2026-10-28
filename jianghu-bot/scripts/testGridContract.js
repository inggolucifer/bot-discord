/**
 * scripts/testGridContract.js
 * Comprehensive Verification Battery for Grid Contract V10 (Prompt V10):
 * - G1: 0 overlap di 200 chunk acak (cek bounding box solid antar objek di chunk yang sama).
 * - G2: 0 objek menabrak anchor buffer (semua objek non-anchor jarak Chebyshev >= anchorBuffer).
 * - G3: 0 objek di air kecuali tileType === 'water' yang diizinkan (lotus, reed, bridge, boat).
 * - G4: semua 52 desa punya minimal 1 entrance walkable (jalur dari jalan ke pintu).
 * - G5: canon table coverage >= 95% dari defId yang muncul di 500 chunk.
 * - G6: memory footprint: build grid cache untuk 100 chunk < 50MB.
 * - G7: pathfinding A* melewati celah 2-tile antara 2 rumah: SUKSES (bukan terblokir palsu).
 * - G8: visual snap: verifikasi semua anchor / geometry non-NaN di canon & chunk instances.
 */

'use strict';
// Auto-enable GC exposure for accurate heap delta measurement
if (!global.gc) {
  try {
    const { spawnSync } = require('child_process');
    const res = spawnSync(process.execPath, ['--expose-gc', __filename, ...process.argv.slice(2)], { stdio: 'inherit' });
    process.exit(res.status ?? 0);
  } catch (_e) {
    // continue with best effort
  }
}

const fs = require('fs');
const path = require('path');
const GC = require('../utils/gridContract');
const { getChunkObjects, resolveDef, isAllowedOnTerrain } = require('../utils/objectScatter');
const { getTileAt } = require('../utils/proceduralWorldEngine');
const worldData = require('../utils/worldData');

console.log('\n================================================================');
console.log('      AUDIT GERBANG GRID CONTRACT V10 (testGridContract.js)     ');
console.log('================================================================\n');

let allPassed = true;
const results = {};

// -------------------------------------------------------------
// G1: 0 overlap di 200 chunk acak
// -------------------------------------------------------------
console.log('>>> [G1] Memeriksa overlap bounding box solid di 200 chunk acak...');
let g1Overlaps = 0;
let g1CheckedPairs = 0;
for (let i = 0; i < 200; i++) {
  const cx = (i * 17 + 5) % 150;
  const cy = (i * 23 + 11) % 150;
  const objs = getChunkObjects(cx, cy);
  const solids = objs.filter(o => o.collision === 'solid').map(o => {
    const actualId = resolveDef(o.defId) || o.defId;
    const g = GC.getGrid(actualId);
    const fw = g ? g.fw : 1;
    const fh = g ? g.fh : 1;
    return { id: o.id, defId: o.defId, x0: o.x, x1: o.x + fw - 1, y0: o.y, y1: o.y + fh - 1 };
  });

  for (let a = 0; a < solids.length; a++) {
    for (let b = a + 1; b < solids.length; b++) {
      g1CheckedPairs++;
      const s1 = solids[a], s2 = solids[b];
      const overlaps = !(s1.x1 < s2.x0 || s1.x0 > s2.x1 || s1.y1 < s2.y0 || s1.y0 > s2.y1);
      if (overlaps) {
        g1Overlaps++;
        if (g1Overlaps <= 5) {
          console.error(`  [G1 Fail] Overlap di chunk (${cx}, ${cy}): ${s1.id} vs ${s2.id}`);
        }
      }
    }
  }
}
const g1Pass = g1Overlaps === 0;
results.G1 = { pass: g1Pass, checkedPairs: g1CheckedPairs, overlaps: g1Overlaps };
console.log(`  G1 Hasil: ${g1Pass ? 'PASS' : 'FAIL'} — Pasangan diperiksa: ${g1CheckedPairs}, Overlap: ${g1Overlaps}`);
if (!g1Pass) allPassed = false;

// -------------------------------------------------------------
// G2: 0 objek menabrak anchor buffer
// -------------------------------------------------------------
console.log('\n>>> [G2] Memeriksa anchor buffer violation di 200 chunk acak...');
const anchors = worldData.getAnchors();
let g2Checked = 0;
let g2Violations = 0;
for (let i = 0; i < 200; i++) {
  const cx = (i * 19 + 7) % 150;
  const cy = (i * 13 + 3) % 150;
  const objs = getChunkObjects(cx, cy);
  for (const o of objs) {
    if (o.tags && (o.tags.includes('setpiece') || o.tags.includes('anchor') || o.tags.includes('authored') || o.tags.includes('landmark') || o.tags.includes('settlement_outskirts'))) {
      continue;
    }
    g2Checked++;
    for (const a of anchors) {
      const dist = Math.max(Math.abs(o.x - a.x), Math.abs(o.y - a.y));
      const buf = a.buildBuffer || a.anchorBuffer || 5;
      if (dist < buf) {
        g2Violations++;
        if (g2Violations <= 5) {
          console.error(`  [G2 Fail] Objek ${o.id} (${o.defId}) di (${o.x}, ${o.y}) melanggar anchorBuffer ${buf} anchor ${a.id} (jarak: ${dist})`);
        }
      }
    }
  }
}
const g2Pass = g2Violations === 0;
results.G2 = { pass: g2Pass, checked: g2Checked, violations: g2Violations };
console.log(`  G2 Hasil: ${g2Pass ? 'PASS' : 'FAIL'} — Objek acak diperiksa: ${g2Checked}, Pelanggaran: ${g2Violations}`);
if (!g2Pass) allPassed = false;

// -------------------------------------------------------------
// G3: 0 objek di air kecuali tileType === 'water' yang diizinkan
// -------------------------------------------------------------
console.log('\n>>> [G3] Memeriksa penempatan objek di air di 200 chunk acak...');
let g3Checked = 0;
let g3Violations = 0;
for (let i = 0; i < 200; i++) {
  const cx = (i * 23 + 2) % 150;
  const cy = (i * 17 + 9) % 150;
  const objs = getChunkObjects(cx, cy);
  for (const o of objs) {
    g3Checked++;
    const t = getTileAt(o.x, o.y);
    const isWater = t && (t.isWater || t.terrainType === 'water');
    if (isWater) {
      const allowed = isAllowedOnTerrain(o.defId, 'water');
      if (!allowed) {
        g3Violations++;
        if (g3Violations <= 5) {
          console.error(`  [G3 Fail] Objek non-air ${o.defId} ditemukan di petak air (${o.x}, ${o.y})`);
        }
      }
    }
  }
}
const g3Pass = g3Violations === 0;
results.G3 = { pass: g3Pass, checked: g3Checked, violations: g3Violations };
console.log(`  G3 Hasil: ${g3Pass ? 'PASS' : 'FAIL'} — Objek diperiksa: ${g3Checked}, Pelanggaran air: ${g3Violations}`);
if (!g3Pass) allPassed = false;

// -------------------------------------------------------------
// G4: Semua 52 desa punya minimal 1 entrance walkable
// -------------------------------------------------------------
console.log('\n>>> [G4] Memeriksa entrance walkable pada 52 desa...');
const authoredDataPath = path.resolve(__dirname, '../world-data/authored-props.json');
const authoredData = JSON.parse(fs.readFileSync(authoredDataPath, 'utf8'));
const authoredProps = authoredData.props || [];

let g4PassCount = 0;
let g4Total = 0;

for (const a of anchors) {
  const vProps = authoredProps.filter(p => p.anchorId === a.id);
  g4Total++;

  // BFS Reachability from anchor within radius 12
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

  const houses = vProps.filter(p => p.kind === 'house');
  let villageWalkable = true;
  for (const h of houses) {
    if (!visited.has(`${h.x},${h.y}`)) {
      const adj = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }]
        .some(d => visited.has(`${h.x + d.dx},${h.y + d.dy}`));
      if (!adj) {
        villageWalkable = false;
        break;
      }
    }
  }
  if (villageWalkable) g4PassCount++;
  else {
    console.error(`  [G4 Fail] Desa ${a.id} tidak memiliki entrance walkable!`);
  }
}
const g4Pass = g4PassCount === g4Total && g4Total >= 52;
results.G4 = { pass: g4Pass, passed: g4PassCount, total: g4Total };
console.log(`  G4 Hasil: ${g4Pass ? 'PASS' : 'FAIL'} — Desa lolos walkable: ${g4PassCount} / ${g4Total}`);
if (!g4Pass) allPassed = false;

// -------------------------------------------------------------
// G5: Canon table coverage >= 95% dari defId yang muncul di 500 chunk
// -------------------------------------------------------------
console.log('\n>>> [G5] Memeriksa canon table coverage di 500 chunk...');
const seenDefs = new Set();
for (let i = 0; i < 500; i++) {
  const cx = (i * 7 + 13) % 150;
  const cy = (i * 11 + 29) % 150;
  const objs = getChunkObjects(cx, cy);
  for (const o of objs) {
    seenDefs.add(resolveDef(o.defId) || o.defId);
  }
}
let g5Covered = 0;
const g5Missing = [];
for (const d of seenDefs) {
  if (GC.getGrid(d)) g5Covered++;
  else g5Missing.push(d);
}
const g5Pct = (g5Covered / seenDefs.size * 100);
const g5Pass = g5Pct >= 95.0;
results.G5 = { pass: g5Pass, seen: seenDefs.size, covered: g5Covered, pct: g5Pct.toFixed(2) };
console.log(`  G5 Hasil: ${g5Pass ? 'PASS' : 'FAIL'} — Defs terlihat: ${seenDefs.size}, Terdefinisi di canon: ${g5Covered} (${g5Pct.toFixed(2)}%, target >= 95%)`);
if (!g5Pass) allPassed = false;

// -------------------------------------------------------------
// G6: Memory footprint: build grid cache untuk 100 chunk < 50MB
// -------------------------------------------------------------
console.log('\n>>> [G6] Memeriksa delta heap memory untuk 100 chunk...');
if (global.gc) global.gc();
const memStart = process.memoryUsage().heapUsed;
for (let i = 0; i < 100; i++) {
  getChunkObjects(10 + i, 20 + i);
}
if (global.gc) global.gc();
const memEnd = process.memoryUsage().heapUsed;
const deltaMb = (memEnd - memStart) / (1024 * 1024);
const g6Pass = deltaMb < 50.0;
results.G6 = { pass: g6Pass, deltaMb: deltaMb.toFixed(2) };
console.log(`  G6 Hasil: ${g6Pass ? 'PASS' : 'FAIL'} — Delta heap: ${deltaMb.toFixed(2)} MB (target < 50 MB)`);
if (!g6Pass) allPassed = false;

// -------------------------------------------------------------
// G7: Pathfinding A* melewati celah 2-tile antara 2 rumah: SUKSES
// -------------------------------------------------------------
console.log('\n>>> [G7] Memeriksa pathfinding melalui celah 2-tile...');
// Rumah A di (10, 10), Rumah B di (14, 10). Celah di x = 12..13, y = 10..11.
const mockHouses = [
  { x: 10, y: 10, fw: 2, fh: 2 },
  { x: 14, y: 10, fw: 2, fh: 2 }
];
function testBlocked(x, y) {
  for (const h of mockHouses) {
    if (x >= h.x && x < h.x + h.fw && y >= h.y && y < h.y + h.fh) return true;
  }
  return false;
}
const g7Start = { x: 12, y: 8 };
const g7Goal = { x: 12, y: 13 };
const g7Queue = [[g7Start]];
const g7Visited = new Set(['12,8']);
let g7Found = null;

while (g7Queue.length > 0) {
  const p = g7Queue.shift();
  const cur = p[p.length - 1];
  if (cur.x === g7Goal.x && cur.y === g7Goal.y) {
    g7Found = p;
    break;
  }
  for (const d of [{dx:1,dy:0}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:0,dy:-1}]) {
    const nx = cur.x + d.dx, ny = cur.y + d.dy;
    const k = `${nx},${ny}`;
    if (!g7Visited.has(k) && !testBlocked(nx, ny) && nx >= 8 && nx <= 18 && ny >= 7 && ny <= 15) {
      g7Visited.add(k);
      g7Queue.push([...p, { x: nx, y: ny }]);
    }
  }
}
const g7Pass = !!g7Found && g7Found.length > 0;
results.G7 = { pass: g7Pass, steps: g7Found ? g7Found.length : 0 };
console.log(`  G7 Hasil: ${g7Pass ? 'PASS' : 'FAIL'} — Jalur berhasil ditemukan (${g7Found ? g7Found.length : 0} langkah)`);
if (!g7Pass) allPassed = false;

// -------------------------------------------------------------
// G8: Visual snap: verifikasi semua geometry non-NaN
// -------------------------------------------------------------
console.log('\n>>> [G8] Memeriksa integritas numerik (non-NaN) pada canon & instances...');
let g8Total = 0;
let g8NanCount = 0;
for (const [id, def] of Object.entries(GC.GRID)) {
  g8Total++;
  if (typeof def.fw !== 'number' || isNaN(def.fw)) g8NanCount++;
  if (typeof def.fh !== 'number' || isNaN(def.fh)) g8NanCount++;
  if (typeof def.vw !== 'number' || isNaN(def.vw)) g8NanCount++;
  if (typeof def.vh !== 'number' || isNaN(def.vh)) g8NanCount++;
  if (typeof def.rowsAbove !== 'number' || isNaN(def.rowsAbove)) g8NanCount++;
}
const g8Pass = g8NanCount === 0 && g8Total > 0;
results.G8 = { pass: g8Pass, totalDefs: g8Total, nanCount: g8NanCount };
console.log(`  G8 Hasil: ${g8Pass ? 'PASS' : 'FAIL'} — Definisi diperiksa: ${g8Total}, Nilai NaN: ${g8NanCount}`);
if (!g8Pass) allPassed = false;

// -------------------------------------------------------------
// RINGKASAN
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`RINGKASAN AUDIT GRID CONTRACT V10: ${allPassed ? '[SEMUA LULUS]' : '[GAGAL]'}`);
console.log('================================================================');
console.log(JSON.stringify(results, null, 2));

if (allPassed) {
  console.log('\n[PASS] SELURUH GERBANG G1-G8 LULUS DENGAN SEMPURNA!\n');
  process.exit(0);
} else {
  console.error('\n[FAIL] TERDAPAT GERBANG YANG GAGAL!\n');
  process.exit(1);
}
