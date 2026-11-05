#!/usr/bin/env node
/**
 * scripts/v24/auditClearance.js
 * Verifikasi Area Bebas Rintangan Halaman Depan & Koridor Gerbang Pemukiman (V24 H3)
 */

const fs = require('fs');
const path = require('path');
const anchors = require('../../world-data/anchors.json');
const objectScatter = require('../../utils/objectScatter');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const { isInSettlementClearance } = require('../../utils/settlementZones');

const RAW_DIR = path.resolve(__dirname, '../../review/v24_raw');
if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

console.log('='.repeat(70));
console.log(' AUDIT AREA CLEARANCE PEMUKIMAN V24 (GATE H3)');
console.log('='.repeat(70));

let solidInClearance = 0;
let totalClearanceCells = 0;
const solidObjectsFound = [];

// 1. Audit Solid Scatter in Clearance Zones (52 Anchors)
for (const a of anchors) {
  const sw = a.spanWidth || 2;
  const sh = a.spanHeight || 2;
  const ent = a.v20?.entrance || { x: a.x + Math.floor(sw / 2), y: a.y + sh - 1, facing: 'south' };
  const facing = ent.facing || 'south';

  if (facing === 'west') {
    for (let y = a.y - 1; y <= a.y + sh; y++) {
      for (let x = a.x - 3; x < a.x; x++) {
        totalClearanceCells++;
        if (objectScatter.isCellBlocked(x, y)) {
          solidInClearance++;
          const cov = objectScatter.getObjectCoveringCell(x, y);
          solidObjectsFound.push({ anchorId: a.id, x, y, type: 'forecourt', defId: cov?.o?.defId });
        }
      }
    }
    for (let y = ent.y - 1; y <= ent.y + 1; y++) {
      for (let x = ent.x - 8; x < ent.x; x++) {
        totalClearanceCells++;
        if (objectScatter.isCellBlocked(x, y)) {
          solidInClearance++;
          const cov = objectScatter.getObjectCoveringCell(x, y);
          solidObjectsFound.push({ anchorId: a.id, x, y, type: 'corridor', defId: cov?.o?.defId });
        }
      }
    }
  } else {
    // Forecourt clearance: (sw + 2) x 3 below footprint
    for (let y = a.y + sh; y <= a.y + sh + 2; y++) {
      for (let x = a.x - 1; x <= a.x + sw; x++) {
        totalClearanceCells++;
        if (objectScatter.isCellBlocked(x, y)) {
          solidInClearance++;
          const cov = objectScatter.getObjectCoveringCell(x, y);
          solidObjectsFound.push({ anchorId: a.id, x, y, type: 'forecourt', defId: cov?.o?.defId });
        }
      }
    }

    // Gate corridor clearance: 3-wide x 8-long south of door
    for (let y = ent.y + 1; y <= ent.y + 8; y++) {
      for (let x = ent.x - 1; x <= ent.x + 1; x++) {
        totalClearanceCells++;
        if (objectScatter.isCellBlocked(x, y)) {
          solidInClearance++;
          const cov = objectScatter.getObjectCoveringCell(x, y);
          solidObjectsFound.push({ anchorId: a.id, x, y, type: 'corridor', defId: cov?.o?.defId });
        }
      }
    }
  }
}

// 2. Audit 4 Petak Lurus Tepat di Depan Pintu Masuk (52/52)
let unblockedDoorFronts = 0;
const doorFrontFailures = [];

for (const a of anchors) {
  const sw = a.spanWidth || 2;
  const sh = a.spanHeight || 2;
  const ent = a.v20?.entrance || { x: a.x + Math.floor(sw / 2), y: a.y + sh - 1, facing: 'south' };
  const facing = ent.facing || 'south';

  let all4Clear = true;
  for (let step = 1; step <= 4; step++) {
    let tx = ent.x;
    let ty = ent.y;
    if (facing === 'west') tx -= step;
    else if (facing === 'east') tx += step;
    else if (facing === 'north') ty -= step;
    else ty += step;

    const tile = proceduralWorldEngine.getTileAt(tx, ty);
    const blocked = tile.isSolid || objectScatter.isCellBlocked(tx, ty);
    if (blocked) {
      all4Clear = false;
      doorFrontFailures.push({ anchorId: a.id, x: tx, y: ty, step, terrain: tile.terrainType });
    }
  }

  if (all4Clear) {
    unblockedDoorFronts++;
  }
}

// 3. BFS Reachability dari Radius 11 Petak di Luar Pemukiman Menuju Pintu Masuk
function bfsToDoor(a) {
  const sw = a.spanWidth || 2;
  const sh = a.spanHeight || 2;
  const ent = a.v20?.entrance || { x: a.x + Math.floor(sw / 2), y: a.y + sh - 1, facing: 'south' };
  const facing = ent.facing || 'south';

  // Start tile at radius 11 in facing direction
  let startX = ent.x;
  let startY = ent.y;
  if (facing === 'west') startX -= 11;
  else if (facing === 'east') startX += 11;
  else if (facing === 'north') startY -= 11;
  else startY += 11;

  // BFS queue
  const queue = [{ x: startX, y: startY, dist: 0 }];
  const visited = new Set([`${startX},${startY}`]);

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.x === ent.x && curr.y === ent.y) {
      return { reachable: true, steps: curr.dist };
    }

    if (curr.dist >= 45) continue; // max search depth

    const neighbors = [
      { x: curr.x, y: curr.y - 1 },
      { x: curr.x, y: curr.y + 1 },
      { x: curr.x - 1, y: curr.y },
      { x: curr.x + 1, y: curr.y }
    ];

    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (visited.has(key)) continue;

      const tile = proceduralWorldEngine.getTileAt(n.x, n.y);
      const isBlocked = (tile.isSolid && !tile.isSettlementEntrance) || objectScatter.isCellBlocked(n.x, n.y);
      if (isBlocked) continue;

      visited.add(key);
      queue.push({ x: n.x, y: n.y, dist: curr.dist + 1 });
    }
  }
  return { reachable: false };
}

let bfsReachableCount = 0;
const bfsFailures = [];

for (const a of anchors) {
  const res = bfsToDoor(a);
  if (res.reachable) {
    bfsReachableCount++;
  } else {
    bfsFailures.push({ anchorId: a.id, reason: 'unreachable_from_radius_11' });
  }
}

console.log(`Total Sel Clearance Diperiksa        : ${totalClearanceCells}`);
console.log(`Objek Scatter Padat di Clearance     : ${solidInClearance}`);
console.log(`4 Petak Depan Pintu Bebas Rintangan  : ${unblockedDoorFronts} / 52`);
console.log(`BFS Keterjangkauan Pintu Masuk       : ${bfsReachableCount} / 52`);

const pass = (solidInClearance === 0) &&
             (unblockedDoorFronts === 52) &&
             (bfsReachableCount === 52);

console.log('='.repeat(70));
console.log(`STATUS GATE H3: ${pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('='.repeat(70));

const auditResult = {
  timestamp: new Date().toISOString(),
  totalClearanceCells,
  solidInClearance,
  solidObjectsFound,
  unblockedDoorFronts,
  doorFrontFailures,
  bfsReachableCount,
  bfsFailures,
  pass
};

fs.writeFileSync(
  path.join(RAW_DIR, 'reserved_diff.json'),
  JSON.stringify(auditResult, null, 2),
  'utf8'
);

console.log('[OUTPUT] Hasil verifikasi clearance disimpan ke review/v24_raw/reserved_diff.json');
if (!pass) process.exit(1);
