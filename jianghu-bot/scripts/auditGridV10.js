/**
 * scripts/auditGridV10.js
 * Comprehensive Grid Contract & Collision Auditor (Prompt G6)
 * Audits 400 random chunks + 52 anchor viewports + 29 boss lairs against V1-V9 gates.
 */

const fs = require('fs');
const path = require('path');
const { getChunkObjects, isCellBlocked } = require('../utils/objectScatter');
const { getTileAt } = require('../utils/proceduralWorldEngine');
const worldData = require('../utils/worldData');
const GC = require('../utils/gridContract');

const isBaseline = process.argv.includes('--baseline');

const bestiaryPath = path.resolve(__dirname, '../world-data/bestiary-v2.json');
const bestiary = JSON.parse(fs.readFileSync(bestiaryPath, 'utf8'));
const anchors = worldData.getAnchors ? worldData.getAnchors() : [];

// 1. Collect unique chunks
const chunkSet = new Set();

function addChunk(cx, cy) {
  if (cx >= 0 && cx < 156 && cy >= 0 && cy < 156) {
    chunkSet.add(`${cx},${cy}`);
  }
}

// 400 random chunks with fixed seed
let seed = 20261026;
function prng() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

while (chunkSet.size < 400) {
  const cx = Math.floor(prng() * 154) + 1;
  const cy = Math.floor(prng() * 154) + 1;
  addChunk(cx, cy);
}

// 52 anchors (center chunk + neighbors)
for (const a of anchors) {
  const cx = Math.floor(a.x / 32);
  const cy = Math.floor(a.y / 32);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      addChunk(cx + dx, cy + dy);
    }
  }
}

// 29 boss lairs
for (const [regId, regData] of Object.entries(bestiary)) {
  if (regData.boss && regData.boss.lair) {
    const cx = Math.floor(regData.boss.lair.x / 32);
    const cy = Math.floor(regData.boss.lair.y / 32);
    addChunk(cx, cy);
  }
}

console.log(`\n=== AUDIT KONTRAK GRID V10 (auditGridV10.js) ===`);
console.log(`Jumlah chunk yang diaudit: ${chunkSet.size} chunk (400 acak + 52 anchor + 29 lair)`);
if (isBaseline) console.log(`[MODE: BASELINE — menghitung metrik tanpa gagal]`);

let totalObjects = 0;
let totalPairs = 0;
let visualOverlapPairs = 0;

let v1_noGridEntry = 0;
let v2_nonIntegerCoord = 0;
let v3_footprintOverlap = 0;
let v4_canopyOverlap = 0;
let v5_forbiddenTerrain = 0;
let v6_unblockedSolid = 0;
let v7_chunkBoundaryCross = 0;
let v9_houseNon1x1 = 0;

const WATER_TERRAINS = new Set(['sea', 'ocean', 'sea_reef', 'island_reef', 'lake_deep', 'lake', 'river', 'river_shallow']);

function rectOverlapArea(r1, r2) {
  const x_overlap = Math.max(0, Math.min(r1.x1, r2.x1) - Math.max(r1.x0, r2.x0));
  const y_overlap = Math.max(0, Math.min(r1.y1, r2.y1) - Math.max(r1.y0, r2.y0));
  return x_overlap * y_overlap;
}

for (const key of chunkSet) {
  const [cx, cy] = key.split(',').map(Number);
  const objs = getChunkObjects(cx, cy);
  totalObjects += objs.length;

  const validObjs = [];

  for (const o of objs) {
    const g = GC.getGrid(o.defId);

    // V1: Tidak ada entri grid
    if (!g) {
      v1_noGridEntry++;
      continue;
    }

    // V2: x/y bukan integer
    if (!Number.isInteger(o.x) || !Number.isInteger(o.y)) {
      v2_nonIntegerCoord++;
    }

    if (g.mode === 'none') {
      continue; // mode none decor, skip overlap / collision
    }

    // V9: Rumah class house fw!=1 atau fh!=1
    if (g.class === 'house' && (g.fw !== 1 || g.fh !== 1)) {
      v9_houseNon1x1++;
    }

    // V7: Objek melewati batas chunk (selain set-piece / landmark)
    if (!g.isSetPiece && g.class !== 'landmark' && !GC.insideChunk(o.x, o.y, g)) {
      v7_chunkBoundaryCross++;
    }

    // V5: Sel footprint di terrain terlarang
    for (let dy = 0; dy < g.fh; dy++) {
      for (let dx = 0; dx < g.fw; dx++) {
        const tx = o.x + dx;
        const ty = o.y + dy;
        const tile = getTileAt(tx, ty);
        if (tile) {
          const isWaterObj = /lotus|coral|reef|boat|drift|dock|island|reed|stream|water/.test(o.defId);
          if (WATER_TERRAINS.has(tile.terrain) && !isWaterObj) {
            v5_forbiddenTerrain++;
          }
          if (tile.isRoad) {
            v5_forbiddenTerrain++;
          }
          if (tile.isSettlementCore) {
            v5_forbiddenTerrain++;
          }
        }
      }
    }

    // V6: Objek solid yang selnya tidak diblokir server
    const isSolid = o.collision === 'solid' || (g.mode === 'solid' && o.collision !== 'none' && o.collision !== 'open');
    if (isSolid && typeof isCellBlocked === 'function') {
      for (let dy = 0; dy < g.fh; dy++) {
        for (let dx = 0; dx < g.fw; dx++) {
          const tx = o.x + dx;
          const ty = o.y + dy;
          if (!isCellBlocked(tx, ty, getChunkObjects)) {
            v6_unblockedSolid++;
          }
        }
      }
    }

    validObjs.push({ o, g });
  }

  // Check pairwise overlaps within chunk
  for (let i = 0; i < validObjs.length; i++) {
    const { o: o1, g: g1 } = validObjs[i];
    const fp1 = GC.footprintRect(o1.x, o1.y, g1);
    const cp1 = GC.canopyRect(o1.x, o1.y, g1);
    const vr1 = GC.visualRect(o1.x, o1.y, g1);

    for (let j = i + 1; j < validObjs.length; j++) {
      const { o: o2, g: g2 } = validObjs[j];
      const fp2 = GC.footprintRect(o2.x, o2.y, g2);
      const cp2 = GC.canopyRect(o2.x, o2.y, g2);
      const vr2 = GC.visualRect(o2.x, o2.y, g2);

      totalPairs++;

      // V3: Footprint overlap
      if (rectOverlapArea(fp1, fp2) > 0) {
        v3_footprintOverlap++;
      }

      // V4: Canopy menutupi footprint atau canopy lain (ambang > 0.02 sel^2)
      if (cp1 && rectOverlapArea(cp1, fp2) > 0.02) v4_canopyOverlap++;
      if (cp2 && rectOverlapArea(cp2, fp1) > 0.02) v4_canopyOverlap++;
      if (!GC.CANOPY_OVERLAP_ALLOWED && cp1 && cp2 && rectOverlapArea(cp1, cp2) > 0.02) {
        v4_canopyOverlap++;
      }

      // V8: Visual overlap pairs
      if (rectOverlapArea(vr1, vr2) > 0.05) {
        visualOverlapPairs++;
      }
    }
  }
}

const v8_visualOverlapPct = totalPairs > 0 ? (visualOverlapPairs / totalPairs) * 100 : 0;

console.log('\n--- HASIL AUDIT GERBANG KONTRAK GRID V10 ---');
const tableData = [
  { Gate: 'V1: Entri Grid Canon Hilang', Count: v1_noGridEntry, Target: '0', Status: v1_noGridEntry === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'V2: Koordinat Non-Integer', Count: v2_nonIntegerCoord, Target: '0', Status: v2_nonIntegerCoord === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'V3: Tumpang Tindih Footprint', Count: v3_footprintOverlap, Target: '0', Status: v3_footprintOverlap === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'V4: Tumpang Tindih Canopy/Tajuk', Count: v4_canopyOverlap, Target: '0', Status: v4_canopyOverlap === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'V5: Footprint di Medan Terlarang', Count: v5_forbiddenTerrain, Target: '0', Status: v5_forbiddenTerrain === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'V6: Solid Tak Diblokir Server', Count: v6_unblockedSolid, Target: '0', Status: v6_unblockedSolid === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'V7: Lewati Batas Chunk (Non-Setpiece)', Count: v7_chunkBoundaryCross, Target: '0', Status: v7_chunkBoundaryCross === 0 ? 'PASS' : 'FAIL' },
  { Gate: 'V8: Rasio Pasangan Visual Overlap', Count: `${v8_visualOverlapPct.toFixed(3)}%`, Target: '<= 0.050%', Status: v8_visualOverlapPct <= 0.05 ? 'PASS' : 'FAIL' },
  { Gate: 'V9: Rumah Fana Non-1x1 Petak', Count: v9_houseNon1x1, Target: '0', Status: v9_houseNon1x1 === 0 ? 'PASS' : 'FAIL' }
];

console.table(tableData);
console.log(`Total Objek Dianalisis: ${totalObjects}`);
console.log(`Total Pasangan Objek: ${totalPairs}`);

const hasFails = tableData.some(r => r.Status === 'FAIL');

if (hasFails && !isBaseline) {
  console.error('\n[GAGAL] Terdapat pelanggaran Kontrak Grid V10!');
  process.exit(1);
} else {
  if (isBaseline) {
    console.log('\n[PASS BASELINE] Audit baseline selesai dicatat.');
  } else {
    console.log('\n[SUKSES] Seluruh gerbang Kontrak Grid V10 LOLOS 100%!');
  }
  process.exit(0);
}
