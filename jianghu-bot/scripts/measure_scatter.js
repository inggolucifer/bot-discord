/**
 * scripts/measure_scatter.js
 * Comprehensive Object Scatter & World Map Layout Measurement Tool
 * Samples 29 regions x 8 points = 232 test screens (seed 20261020).
 * Audits frame availability, hut proportions, object counts, diversity,
 * dominance ratios, empty cell percentages, and water violations.
 */

const fs = require('fs');
const path = require('path');
const { getViewportObjects, getCanonCollision } = require('../utils/objectScatter');
const { getTileAt } = require('../utils/proceduralWorldEngine');

const regionsPath = path.resolve(__dirname, '../world-data/regions.json');
const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));

// Load known atlas frames
const knownFramesPath = path.resolve(__dirname, '../config/known-frames.json');
let knownFramesSet = new Set();
if (fs.existsSync(knownFramesPath)) {
  knownFramesSet = new Set(JSON.parse(fs.readFileSync(knownFramesPath, 'utf8')));
} else {
  // Fallback: scan directly if known-frames.json not yet built
  const atlasDir = path.resolve(__dirname, '../web-dashboard/public/assets/atlas');
  if (fs.existsSync(atlasDir)) {
    for (const f of fs.readdirSync(atlasDir)) {
      if (!f.endsWith('.json') || f.includes('index')) continue;
      try {
        const c = JSON.parse(fs.readFileSync(path.join(atlasDir, f), 'utf8'));
        if (c && c.frames) {
          for (const k of Object.keys(c.frames)) knownFramesSet.add(k);
        }
      } catch (e) {}
    }
  }
}

// LCG PRNG with seed 20261020
let seed = 20261020;
function lcgRandom() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const WATER_TERRAINS = new Set(['sea', 'ocean', 'sea_reef', 'island_reef', 'lake_deep', 'lake', 'river', 'river_shallow']);
const WATER_OBJECT_REGEX = /lotus|coral|reef|boat|drift|dock|island|reed|stream|water/;

const POPULATED_REGIONS = new Set(['central_plains', 'nine_springs_delta', 'mirror_lake']);
const MOUNTAIN_DESERT_REGIONS = new Set(['azure_mountain_range', 'western_sacred_desert', 'hermit_highlands', 'thundersteppe', 'northern_desolate']);
const SEA_REGIONS = new Set(['eastern_sea', 'frostmoon_sea', 'floating_wind_isles', 'bone_sea_coast']);

let totalScreens = 0;
let screensWithHuts = 0;
let populatedScreensWithHuts = 0;
let populatedScreensTotal = 0;
let otherScreensWithHuts = 0;
let otherScreensTotal = 0;

let totalHuts = 0;
let abandonedHuts = 0;
let enterableHuts = 0;
let decorativeHuts = 0;

const missingFrames = {};
let totalObjectsCount = 0;
let minObjectsPerScreen = Infinity;
let maxObjectsPerScreen = -Infinity;
let minUniquePerScreen = Infinity;
let maxUniquePerScreen = -Infinity;
let minDominance = Infinity;
let maxDominance = -Infinity;

let total12x12Cells = 0;
let empty12x12Cells = 0;

let nonWaterObjectsOnWater = 0;
const waterViolationDetails = [];

const regionMetrics = {};

for (const r of regions) {
  regionMetrics[r.id] = {
    totalObjects: 0,
    totalHuts: 0,
    abandonedHuts: 0,
    screensWithHuts: 0,
    uniqueTypes: [],
    dominances: [],
    waterViolations: 0,
    screensCount: 0
  };

  const isPopulated = POPULATED_REGIONS.has(r.id);

  for (let i = 0; i < 8; i++) {
    totalScreens++;
    regionMetrics[r.id].screensCount++;
    if (isPopulated) populatedScreensTotal++;
    else otherScreensTotal++;

    const b = r.bounds;
    const minX = b.minX + 30;
    const maxX = Math.max(minX, b.maxX - 30);
    const minY = b.minY + 17;
    const maxY = Math.max(minY, b.maxY - 17);

    const cx = Math.floor(minX + lcgRandom() * (maxX - minX));
    const cy = Math.floor(minY + lcgRandom() * (maxY - minY));

    const viewMinX = cx - 30;
    const viewMaxX = cx + 29;
    const viewMinY = cy - 17;
    const viewMaxY = cy + 16;

    const objs = getViewportObjects(viewMinX, viewMinY, viewMaxX, viewMaxY, 20261020);
    const count = objs.length;
    totalObjectsCount += count;
    regionMetrics[r.id].totalObjects += count;

    if (count < minObjectsPerScreen) minObjectsPerScreen = count;
    if (count > maxObjectsPerScreen) maxObjectsPerScreen = count;

    // Check unique types and dominance
    const typeCounts = new Map();
    for (const obj of objs) {
      const def = obj.defId;
      typeCounts.set(def, (typeCounts.get(def) || 0) + 1);

      // Frame atlas availability audit
      if (!knownFramesSet.has(def)) {
        missingFrames[def] = (missingFrames[def] || 0) + 1;
      }

      // Water placement check
      const tile = getTileAt(obj.x, obj.y);
      const t = tile ? tile.terrainType : '';
      if (WATER_TERRAINS.has(t)) {
        if (!WATER_OBJECT_REGEX.test(def)) {
          nonWaterObjectsOnWater++;
          regionMetrics[r.id].waterViolations++;
          if (waterViolationDetails.length < 10) {
            waterViolationDetails.push({ defId: def, terrain: t, x: obj.x, y: obj.y, region: r.id });
          }
        }
      }
    }

    const uniqueCount = typeCounts.size;
    regionMetrics[r.id].uniqueTypes.push(uniqueCount);
    if (uniqueCount < minUniquePerScreen) minUniquePerScreen = uniqueCount;
    if (uniqueCount > maxUniquePerScreen) maxUniquePerScreen = uniqueCount;

    let highestCount = 0;
    for (const c of typeCounts.values()) {
      if (c > highestCount) highestCount = c;
    }
    const dominance = count > 0 ? (highestCount / count) : 0;
    regionMetrics[r.id].dominances.push(dominance);
    if (dominance < minDominance) minDominance = dominance;
    if (dominance > maxDominance) maxDominance = dominance;

    // Empty 12x12 cells (viewport 60x34 -> 5 cells x 3 cells = 15 cells)
    for (let cellY = 0; cellY < 3; cellY++) {
      for (let cellX = 0; cellX < 5; cellX++) {
        total12x12Cells++;
        const cMinX = viewMinX + cellX * 12;
        const cMaxX = cMinX + 11;
        const cMinY = viewMinY + cellY * 11;
        const cMaxY = cMinY + 10;
        const cellObjs = objs.filter(o => o.x >= cMinX && o.x <= cMaxX && o.y >= cMinY && o.y <= cMaxY);
        if (cellObjs.length === 0) {
          empty12x12Cells++;
        }
      }
    }

    // Hut audit
    const huts = objs.filter(o => o.tags && (o.tags.includes('hut') || o.tags.includes('shelter')));
    if (huts.length > 0) {
      screensWithHuts++;
      regionMetrics[r.id].screensWithHuts++;
      if (isPopulated) populatedScreensWithHuts++;
      else otherScreensWithHuts++;
    }

    for (const h of huts) {
      totalHuts++;
      regionMetrics[r.id].totalHuts++;
      if (h.isAbandoned || h.defId === 'hut_abandoned_thatched_ruin') {
        abandonedHuts++;
        regionMetrics[r.id].abandonedHuts++;
      } else if (h.enterable) {
        enterableHuts++;
      } else {
        decorativeHuts++;
      }
    }
  }
}

// Compute aggregate metrics
const abandonedRatio = totalHuts > 0 ? (abandonedHuts / totalHuts) * 100 : 0;
const hutScreenPercent = totalScreens > 0 ? (screensWithHuts / totalScreens) * 100 : 0;
const populatedHutPercent = populatedScreensTotal > 0 ? (populatedScreensWithHuts / populatedScreensTotal) * 100 : 0;
const otherHutPercent = otherScreensTotal > 0 ? (otherScreensWithHuts / otherScreensTotal) * 100 : 0;
const emptyCellsPercent = total12x12Cells > 0 ? (empty12x12Cells / total12x12Cells) * 100 : 0;
const waterViolationPercent = totalObjectsCount > 0 ? (nonWaterObjectsOnWater / totalObjectsCount) * 100 : 0;

console.log('\n======================================================');
console.log('       JIANGHU WORLD V8 — MEASURE SCATTER REPORT      ');
console.log('======================================================\n');

console.log(`Titik uji: ${totalScreens} layar (29 region × 8 titik, benih 20261020)`);
console.log(`Total objek tertangkap: ${totalObjectsCount}\n`);

console.log('--- 1. VALIDASI FRAME ATLAS ---');
console.log(`Frame TIDAK ADA di atlas: ${JSON.stringify(missingFrames, null, 2)}`);
const framePass = Object.keys(missingFrames).length === 0;
console.log(`Status Frame Atlas: ${framePass ? 'PASS (Semua frame ada di atlas)' : 'GAGAL (' + Object.keys(missingFrames).length + ' defId hilang)'}\n`);

console.log('--- 2. PROPORSI PONDOK ---');
console.log(`Total pondok ditemukan: ${totalHuts}`);
console.log(`  - Bisa dimasuki (Enterable): ${enterableHuts} (${totalHuts > 0 ? (enterableHuts / totalHuts * 100).toFixed(1) : 0}%)`);
console.log(`  - Dekoratif (Decorative): ${decorativeHuts} (${totalHuts > 0 ? (decorativeHuts / totalHuts * 100).toFixed(1) : 0}%)`);
console.log(`  - Terbengkalai (Abandoned): ${abandonedHuts} (${abandonedRatio.toFixed(1)}%)`);
const abandonedPass = abandonedRatio >= 8 && abandonedRatio <= 20;
console.log(`Status Proporsi Terbengkalai (Target 8–20%): ${abandonedPass ? 'PASS' : 'GAGAL (' + abandonedRatio.toFixed(1) + '%)'}\n`);

console.log('--- 3. SEBARAN PONDOK PER LAYAR ---');
console.log(`Layar memuat pondok: ${screensWithHuts}/${totalScreens} (${hutScreenPercent.toFixed(1)}%)`);
console.log(`  - Region berpenduduk (Populated): ${populatedScreensWithHuts}/${populatedScreensTotal} (${populatedHutPercent.toFixed(1)}%, target >= 70%)`);
console.log(`  - Region lainnya (Other): ${otherScreensWithHuts}/${otherScreensTotal} (${otherHutPercent.toFixed(1)}%, target >= 35%)\n`);

console.log('--- 4. DENSITAS, KERAGAMAN & DOMINASI ---');
console.log(`Objek per layar: min ${minObjectsPerScreen}, max ${maxObjectsPerScreen}, rata-rata ${(totalObjectsCount / totalScreens).toFixed(1)}`);
console.log(`Jenis unik per layar: min ${minUniquePerScreen}, max ${maxUniquePerScreen}`);
console.log(`Dominasi satu jenis: min ${(minDominance * 100).toFixed(1)}%, max ${(maxDominance * 100).toFixed(1)}% (Target max <= 18%)`);
const dominancePass = maxDominance <= 0.1801;
console.log(`Status Dominasi: ${dominancePass ? 'PASS' : 'GAGAL (max ' + (maxDominance * 100).toFixed(1) + '% > 18%)'}\n`);

console.log('--- 5. KEKOSONGAN SEL 12x12 ---');
console.log(`Sel 12x12 kosong: ${empty12x12Cells}/${total12x12Cells} (${emptyCellsPercent.toFixed(1)}%)\n`);

console.log('--- 6. INTEGRITAS MEDAN AIR (OBJEK DI PETAK LAUT) ---');
console.log(`Objek non-air di petak laut/air: ${nonWaterObjectsOnWater} (${waterViolationPercent.toFixed(2)}% dari total objek)`);
if (waterViolationDetails.length > 0) {
  console.log('Contoh pelanggaran:', waterViolationDetails.slice(0, 5));
}
const waterPass = nonWaterObjectsOnWater === 0;
console.log(`Status Integritas Air: ${waterPass ? 'PASS (0 pelanggaran)' : 'GAGAL (' + nonWaterObjectsOnWater + ' objek di air)'}\n`);

console.log('======================================================');
const allPass = framePass && abandonedPass && dominancePass && waterPass;
console.log(`HASIL KESELURUHAN PROMPT 1 GATES: ${allPass ? 'SEMUA GERBANG LULUS' : 'ADA GERBANG BELUM LULUS'}`);
console.log('======================================================\n');
