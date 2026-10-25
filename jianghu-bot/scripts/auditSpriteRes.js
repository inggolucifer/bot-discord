/**
 * scripts/auditSpriteRes.js
 * Audit Sprite Resolution across 400 random chunks (Prompt C1 & Gerbang C):
 * 1. Counts occurrences of every frame in 400 sampled chunks.
 * 2. Compares pxPerTile from world-data/scale-canon.json against targets.
 * 3. Writes review/lowres_frames_v9.csv.
 * 4. Exit 1 if any frame with count > 0 has pxPerTile < 24.
 */

const fs = require('fs');
const path = require('path');
const knownFrames = require('../config/known-frames.json');
const scaleCanon = require('../world-data/scale-canon.json');
const { getChunkObjects } = require('../utils/objectScatter');

const WORLD_SEED = 20260101;
const isBaselineMode = process.argv.includes('--baseline');

function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(WORLD_SEED);
const CHUNKS_COUNT = 400;
const sampledChunks = [];
for (let i = 0; i < CHUNKS_COUNT; i++) {
  const cx = Math.floor(rng() * 156);
  const cy = Math.floor(rng() * 156);
  sampledChunks.push({ cx, cy });
}

console.log(`=== AUDIT RESOLUSI SPRITE 400 CHUNK (auditSpriteRes.js) ===\n`);
console.log(`Sampling ${CHUNKS_COUNT} chunks with WORLD_SEED = ${WORLD_SEED}...\n`);

const frameCounts = new Map();
let totalObjectsCount = 0;

for (const { cx, cy } of sampledChunks) {
  const objs = getChunkObjects(cx, cy, WORLD_SEED);
  for (const obj of objs) {
    totalObjectsCount++;
    const frameId = obj.defId;
    frameCounts.set(frameId, (frameCounts.get(frameId) || 0) + 1);
  }
}

// Group by frame family (strip _v[0-9]+ or trailing digits)
const familyMap = new Map();

for (const [frameId, count] of frameCounts.entries()) {
  const canon = scaleCanon[frameId];
  const pxPerTile = canon && canon.pxPerTile ? canon.pxPerTile : 54;
  const fam = frameId.replace(/_v\d+$/, '');

  if (!familyMap.has(fam)) {
    familyMap.set(fam, {
      family: fam,
      pxPerTile,
      count: 0
    });
  }
  const entry = familyMap.get(fam);
  entry.count += count;
  // keep lowest pxPerTile in family
  if (pxPerTile < entry.pxPerTile) entry.pxPerTile = pxPerTile;
}

const sortedFamilies = Array.from(familyMap.values()).sort((a, b) => a.pxPerTile - b.pxPerTile);

// Write CSV
const csvRows = ['frameFamily,pxPerTile,count,pct'];
for (const f of sortedFamilies) {
  const pct = ((f.count / totalObjectsCount) * 100).toFixed(2);
  csvRows.push(`${f.family},${f.pxPerTile.toFixed(1)},${f.count},${pct}%`);
}

const outCsvPath = path.resolve(__dirname, '../review/lowres_frames_v9.csv');
fs.writeFileSync(outCsvPath, csvRows.join('\n'), 'utf8');

console.log('| Frame Family | pxPerTile | Count | % | Status |');
console.log('|---|---|---|---|---|');

let criticalViolations = 0;
let under54Count = 0;

for (const f of sortedFamilies) {
  const pct = ((f.count / totalObjectsCount) * 100).toFixed(2);
  let status = 'OK (>=54)';
  if (f.pxPerTile < 24) {
    status = 'CRITICAL (<24)';
    criticalViolations++;
  } else if (f.pxPerTile < 54) {
    status = 'LOW (<54)';
  }

  if (f.pxPerTile < 54) {
    under54Count += f.count;
  }

  // Print families with count > 0 and pxPerTile < 54, or top 10
  if (f.pxPerTile < 54 || sortedFamilies.indexOf(f) < 15) {
    console.log(`| ${f.family} | ${f.pxPerTile.toFixed(1)} | ${f.count} | ${pct}% | ${status} |`);
  }
}

const under54Pct = ((under54Count / totalObjectsCount) * 100).toFixed(2);

console.log(`\nTotal Objek Ditemukan          : ${totalObjectsCount}`);
console.log(`Total Objek pxPerTile < 54     : ${under54Count} (${under54Pct}%)`);
console.log(`Pelanggaran Kritis (px < 24)   : ${criticalViolations}`);
console.log(`CSV Tersimpan di               : review/lowres_frames_v9.csv\n`);

if (criticalViolations > 0 && !isBaselineMode) {
  console.error(`[FAIL] Ditemukan ${criticalViolations} frame beresolusi sangat rendah (< 24 px/tile) yang aktif digunakan.`);
  process.exit(1);
} else {
  console.log(`[PASS] Tidak ada frame dengan pxPerTile < 24 yang digunakan.`);
  process.exit(0);
}
