#!/usr/bin/env node
/**
 * scripts/v24/auditWalkConnectivity.js
 * Verifikasi Keterjangkauan Makro Antarpemukiman & Graf Konektivitas Darat (V24 H5)
 */

const fs = require('fs');
const path = require('path');
const anchors = require('../../world-data/anchors.json');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const allowedUnreachable = require('../../world-data/allowed-unreachable.json');

const RAW_DIR = path.resolve(__dirname, '../../review/v24_raw');
if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

console.log('='.repeat(70));
console.log(' AUDIT KETERJANGKAUAN MAKRO DUNIA V24 (GATE H5)');
console.log('='.repeat(70));

const BLOCK_SCALE = 4;
const GRID_SIZE = Math.floor(5000 / BLOCK_SCALE); // 1250
const totalCells = GRID_SIZE * GRID_SIZE;
const grid = new Uint8Array(totalCells);

console.log(`[1/3] Membangun grid makro ${GRID_SIZE}x${GRID_SIZE} (downsampling 4x4)...`);
const t0 = Date.now();

// 1. Downsample 5000x5000 into 1250x1250
for (let by = 0; by < GRID_SIZE; by++) {
  const baseTileY = by * BLOCK_SCALE;
  const rowOffset = by * GRID_SIZE;
  for (let bx = 0; bx < GRID_SIZE; bx++) {
    const baseTileX = bx * BLOCK_SCALE;

    // Sample 4 points in the 4x4 block
    const p1 = proceduralWorldEngine.getTileAt(baseTileX + 1, baseTileY + 1);
    const p2 = proceduralWorldEngine.getTileAt(baseTileX + 3, baseTileY + 1);
    const p3 = proceduralWorldEngine.getTileAt(baseTileX + 1, baseTileY + 3);
    const p4 = proceduralWorldEngine.getTileAt(baseTileX + 3, baseTileY + 3);

    let walkableCount = 0;
    if (!p1.isSolid) walkableCount++;
    if (!p2.isSolid) walkableCount++;
    if (!p3.isSolid) walkableCount++;
    if (!p4.isSolid) walkableCount++;

    if (walkableCount >= 2) {
      grid[rowOffset + bx] = 1;
    }
  }
}

// Pastikan blok setiap pintu masuk pemukiman berstatus walkable
for (const a of anchors) {
  const ent = a.v20?.entrance || { x: a.x + Math.floor(a.spanWidth / 2), y: a.y + a.spanHeight - 1 };
  const bx = Math.floor(ent.x / BLOCK_SCALE);
  const by = Math.floor(ent.y / BLOCK_SCALE);
  if (bx >= 0 && bx < GRID_SIZE && by >= 0 && by < GRID_SIZE) {
    grid[by * GRID_SIZE + bx] = 1;
  }
}

console.log(`Grid makro selesai dalam ${Date.now() - t0} ms.`);

// 2. Flood-Fill 8 Arah dari Pemukiman Utama (Desa Xingcun / Pusat Benua)
console.log('[2/3] Menjalankan Flood-Fill BFS 8 arah dari daratan utama...');
const rootAnchor = anchors.find(a => a.id === 'desa_xingcun') || anchors[0];
const rootEnt = rootAnchor.v20?.entrance || { x: rootAnchor.x, y: rootAnchor.y };
const rootBx = Math.floor(rootEnt.x / BLOCK_SCALE);
const rootBy = Math.floor(rootEnt.y / BLOCK_SCALE);

const visited = new Uint8Array(totalCells);
const queue = new Int32Array(totalCells);
let head = 0;
let tail = 0;

const startIdx = rootBy * GRID_SIZE + rootBx;
visited[startIdx] = 1;
queue[tail++] = startIdx;

// 8 directions
const dOffsets = [
  -GRID_SIZE - 1, -GRID_SIZE, -GRID_SIZE + 1,
  -1,                         1,
   GRID_SIZE - 1,  GRID_SIZE,  GRID_SIZE + 1
];

while (head < tail) {
  const curr = queue[head++];
  const cx = curr % GRID_SIZE;
  const cy = Math.floor(curr / GRID_SIZE);

  for (let dy = -1; dy <= 1; dy++) {
    const ny = cy + dy;
    if (ny < 0 || ny >= GRID_SIZE) continue;
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = cx + dx;
      if (nx < 0 || nx >= GRID_SIZE) continue;

      const nIdx = ny * GRID_SIZE + nx;
      if (visited[nIdx] === 0 && grid[nIdx] === 1) {
        visited[nIdx] = 1;
        queue[tail++] = nIdx;
      }
    }
  }
}

console.log(`Total blok terhubung dalam komponen utama daratan: ${tail} / ${totalCells}`);

// 3. Verifikasi Konektivitas 52 Pemukiman
console.log('[3/3] Memverifikasi konektivitas 52 pemukiman...');
const allowedSet = new Set(allowedUnreachable);

let connectedCount = 0;
let allowedUnreachableCount = 0;
const unexpectedUnreachable = [];
const settlementsReport = [];

for (const a of anchors) {
  const ent = a.v20?.entrance || { x: a.x + Math.floor(a.spanWidth / 2), y: a.y + a.spanHeight - 1 };
  const bx = Math.floor(ent.x / BLOCK_SCALE);
  const by = Math.floor(ent.y / BLOCK_SCALE);
  const idx = by * GRID_SIZE + bx;

  const isReachable = visited[idx] === 1;

  if (isReachable) {
    connectedCount++;
    settlementsReport.push({ id: a.id, name: a.name, status: 'connected', block: [bx, by] });
  } else if (allowedSet.has(a.id)) {
    allowedUnreachableCount++;
    settlementsReport.push({ id: a.id, name: a.name, status: 'allowed_unreachable', block: [bx, by] });
  } else {
    unexpectedUnreachable.push({ id: a.id, name: a.name, block: [bx, by], pos: [ent.x, ent.y] });
    settlementsReport.push({ id: a.id, name: a.name, status: 'unexpected_unreachable', block: [bx, by] });
  }
}

console.log(`Pemukiman Terhubung ke Daratan Utama : ${connectedCount} / 52`);
console.log(`Pemukiman Khusus Sah Terpisah Laut  : ${allowedUnreachableCount} / ${allowedSet.size}`);
console.log(`Pemukiman Terisolasi Tak Terduga   : ${unexpectedUnreachable.length}`);

if (unexpectedUnreachable.length > 0) {
  console.error('Pemukiman terisolasi:', unexpectedUnreachable);
}

const pass = (unexpectedUnreachable.length === 0) &&
             (connectedCount === 52 - allowedSet.size);

console.log('='.repeat(70));
console.log(`STATUS GATE H5: ${pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('='.repeat(70));

const outputData = {
  timestamp: new Date().toISOString(),
  gridScale: BLOCK_SCALE,
  macroDimensions: [GRID_SIZE, GRID_SIZE],
  mainComponentBlocks: tail,
  metrics: {
    totalAnchors: anchors.length,
    connectedCount,
    allowedUnreachableCount,
    unexpectedUnreachableCount: unexpectedUnreachable.length
  },
  allowedUnreachable,
  unexpectedUnreachable,
  pass,
  settlementsReport
};

fs.writeFileSync(
  path.join(RAW_DIR, 'connectivity.json'),
  JSON.stringify(outputData, null, 2),
  'utf8'
);

console.log('[OUTPUT] Hasil audit konektivitas disimpan ke review/v24_raw/connectivity.json');
if (!pass) process.exit(1);
