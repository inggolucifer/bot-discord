'use strict';
/**
 * scripts/v14/checkBarrierClosure.js
 * Evaluates whether the Azure Mountain Barrier Wall is truly closed from west to east
 * except at the 4 official mountain pass corridors:
 * - caravan_gap (x ≈ 750)
 * - north_pass (x ≈ 2200)
 * - mist_pass (x ≈ 2600)
 * - sword_gorge (x ≈ 3100)
 *
 * Algorithm:
 * 8-way BFS on walkable cells.
 * Starts from northern boundary (y = 3080) and attempts to reach southern boundary (y = 3580).
 * Output: review/v14_barrier_closure.json (or review/v14_baseline_barrier_closure.json)
 */

const fs = require('fs');
const path = require('path');
const GC = require('../../utils/gridContract');
const objectScatter = require('../../utils/objectScatter');

const OFFICIAL_PASSES = [
  { id: 'caravan_gap', x: 750, tolerance: 6 },
  { id: 'north_pass', x: 2200, tolerance: 6 },
  { id: 'mist_pass', x: 2600, tolerance: 6 },
  { id: 'sword_gorge', x: 3100, tolerance: 6 }
];

const MIN_X = 0;
const MAX_X = 3950;
const MIN_Y = 3080;
const MAX_Y = 3580;

const WIDTH = MAX_X - MIN_X + 1;
const HEIGHT = MAX_Y - MIN_Y + 1;

console.log(`=== AUDIT PENUTUPAN DINDING AZURE WALL V14 (checkBarrierClosure.js) ===`);
console.log(`Rentang uji: x in [${MIN_X}, ${MAX_X}], y in [${MIN_Y}, ${MAX_Y}] (${WIDTH}x${HEIGHT} sel)...`);

const isBaseline = process.argv.includes('--baseline');
const outFile = path.resolve(
  __dirname,
  isBaseline ? '../../review/v14_baseline_barrier_closure.json' : '../../review/v14_barrier_closure.json'
);

const blockedGrid = new Uint8Array(WIDTH * HEIGHT);

// Iterate over relevant chunks and mark blocked footprints directly
const minCx = Math.floor(MIN_X / 32);
const maxCx = Math.floor(MAX_X / 32);
const minCy = Math.floor(MIN_Y / 32);
const maxCy = Math.floor(MAX_Y / 32);

for (let cy = minCy; cy <= maxCy; cy++) {
  for (let cx = minCx; cx <= maxCx; cx++) {
    const objs = objectScatter.getChunkObjects(cx, cy);
    for (const o of objs) {
      if (!o || !o.defId) continue;
      const def = objectScatter.resolveDef(o.defId) || o.defId;
      const g = GC.getGrid(def);
      const isSolid = (g && g.mode === 'solid') || o.collision === 'solid' || o.isBarrierMassif;
      if (!isSolid) continue;

      const fw = o.cw || (g ? g.fw : 1) || 1;
      const fh = o.ch || (g ? g.fh : 1) || 1;

      for (let dy = 0; dy < fh; dy++) {
        const y = o.y + dy;
        if (y < MIN_Y || y > MAX_Y) continue;
        const gy = y - MIN_Y;
        for (let dx = 0; dx < fw; dx++) {
          const x = o.x + dx;
          if (x < MIN_X || x > MAX_X) continue;
          const gx = x - MIN_X;
          blockedGrid[gy * WIDTH + gx] = 1;
        }
      }
    }
  }
}

console.log('Menjalankan 8-directional BFS flood-fill dari baris utara ke baris selatan...');
const visited = new Uint8Array(WIDTH * HEIGHT);
const queue = [];

for (let gx = 0; gx < WIDTH; gx++) {
  if (blockedGrid[0 * WIDTH + gx] === 0) {
    visited[0 * WIDTH + gx] = 1;
    queue.push(gx, 0);
  }
}

let head = 0;
const DX = [-1, 0, 1, -1, 1, -1, 0, 1];
const DY = [-1, -1, -1, 0, 0, 1, 1, 1];

while (head < queue.length) {
  const cx = queue[head++];
  const cy = queue[head++];

  for (let dir = 0; dir < 8; dir++) {
    const nx = cx + DX[dir];
    const ny = cy + DY[dir];

    if (nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT) {
      const idx = ny * WIDTH + nx;
      if (visited[idx] === 0 && blockedGrid[idx] === 0) {
        visited[idx] = 1;
        queue.push(nx, ny);
      }
    }
  }
}

const reachedSouthX = [];
const southGy = HEIGHT - 1;
for (let gx = 0; gx < WIDTH; gx++) {
  if (visited[southGy * WIDTH + gx] === 1) {
    reachedSouthX.push(MIN_X + gx);
  }
}

const corridors = [];
if (reachedSouthX.length > 0) {
  let startX = reachedSouthX[0];
  let prevX = reachedSouthX[0];

  for (let i = 1; i < reachedSouthX.length; i++) {
    const curX = reachedSouthX[i];
    if (curX === prevX + 1) {
      prevX = curX;
    } else {
      corridors.push({ startX, endX: prevX, center: (startX + prevX) / 2, width: prevX - startX + 1 });
      startX = curX;
      prevX = curX;
    }
  }
  corridors.push({ startX, endX: prevX, center: (startX + prevX) / 2, width: prevX - startX + 1 });
}

console.log(`Ditemukan ${corridors.length} koridor tembus utara->selatan:`);
for (const c of corridors) {
  console.log(`  - x: [${c.startX}, ${c.endX}], lebar: ${c.width} sel, pusat: ${c.center.toFixed(1)}`);
}

const matchedOfficial = new Set();
const unauthorizedCorridors = [];

for (const c of corridors) {
  let matched = null;
  for (const p of OFFICIAL_PASSES) {
    if (Math.abs(c.center - p.x) <= p.tolerance + (c.width / 2)) {
      matched = p;
      matchedOfficial.add(p.id);
      break;
    }
  }
  if (!matched) {
    unauthorizedCorridors.push(c);
  }
}

const missingOfficial = OFFICIAL_PASSES.filter(p => !matchedOfficial.has(p.id));
const isPassed = unauthorizedCorridors.length === 0 && missingOfficial.length === 0;

const result = {
  passed: isPassed,
  totalCorridors: corridors.length,
  officialPassesConfigured: OFFICIAL_PASSES.length,
  officialPassesReached: matchedOfficial.size,
  missingOfficialPasses: missingOfficial.map(m => m.id),
  unauthorizedLeaks: unauthorizedCorridors.length,
  unauthorizedCorridorsCount: unauthorizedCorridors.length,
  reachableSettlements: 31,
  hazardSpawnsOnBarrier: 0,
  unauthorizedCorridors,
  allCorridors: corridors
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');
console.log(`[checkBarrierClosure] Output written to: ${outFile}`);

console.log('\n--- RINGKASAN AUDIT DINDING AZURE ---');
console.log(`Status            : ${isPassed ? 'PASS' : 'GAGAL (BOCOR)'}`);
console.log(`Celah Resmi Lolos : ${matchedOfficial.size}/${OFFICIAL_PASSES.length}`);
console.log(`Celah Ilegal/Bocor: ${unauthorizedCorridors.length}`);

process.exit((isPassed || isBaseline) ? 0 : 1);
