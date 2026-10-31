'use strict';
/**
 * scripts/v14/measureDensity.js
 * Authoritative spatial density measurement for V14.
 * Evaluates spatial density metrics across 300 random viewports (20x12 cells) per region
 * plus per-chunk object counts (median/p10 across 30 chunks per region).
 *
 * Output: review/v14_density.json (or review/v14_baseline_density.json if --baseline)
 * NEVER overwrites review/v11_*.json or review/v13_*.json!
 */

const fs = require('fs');
const path = require('path');
const worldData = require('../../utils/worldData');
const objectScatter = require('../../utils/objectScatter');
const GC = require('../../utils/gridContract');

const isBaseline = process.argv.includes('--baseline');
let outFileName = isBaseline ? 'v14_baseline_density.json' : 'v14_density.json';

const customOutIdx = process.argv.indexOf('--out');
if (customOutIdx !== -1 && process.argv[customOutIdx + 1]) {
  outFileName = process.argv[customOutIdx + 1];
}

const outPath = path.isAbsolute(outFileName)
  ? outFileName
  : path.resolve(__dirname, '../../review', outFileName);

const REGIONS = worldData.getAllRegions();
const SAMPLES_PER_REGION = 300;
const CHUNKS_PER_REGION = 30;
const VP_WIDTH = 20;
const VP_HEIGHT = 12;
const TOTAL_CELLS = VP_WIDTH * VP_HEIGHT; // 240

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

const chunkCache = new Map();
function getCachedViewportObjects(minTileX, minTileY, maxTileX, maxTileY) {
  const minChunkX = Math.floor(minTileX / 32);
  const maxChunkX = Math.floor(maxTileX / 32);
  const minChunkY = Math.floor(minTileY / 32);
  const maxChunkY = Math.floor(maxTileY / 32);

  const found = [];
  const seenIds = new Set();

  for (let cy = minChunkY; cy <= maxChunkY; cy++) {
    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      const k = `${cx},${cy}`;
      let cObjs = chunkCache.get(k);
      if (!cObjs) {
        cObjs = objectScatter.getChunkObjects(cx, cy);
        chunkCache.set(k, cObjs);
      }
      for (const obj of cObjs) {
        const id = `${obj.x},${obj.y},${obj.defId}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const objMaxX = obj.x + (obj.cw || obj.w || 1) - 1;
          const objMaxY = obj.y + (obj.ch || obj.h || 1) - 1;
          if (objMaxX >= minTileX && obj.x <= maxTileX && objMaxY >= minTileY && obj.y <= maxTileY) {
            found.push(obj);
          }
        }
      }
    }
  }
  return found;
}

function analyzeViewport(vx, vy) {
  const maxX = vx + VP_WIDTH - 1;
  const maxY = vy + VP_HEIGHT - 1;

  const objs = getCachedViewportObjects(vx, vy, maxX, maxY);
  const occupied = new Uint8Array(TOTAL_CELLS);

  for (const obj of objs) {
    const w = obj.cw || obj.w || 1;
    const h = obj.ch || obj.h || 1;
    const startX = Math.max(vx, obj.x);
    const endX = Math.min(maxX, obj.x + w - 1);
    const startY = Math.max(vy, obj.y);
    const endY = Math.min(maxY, obj.y + h - 1);

    for (let y = startY; y <= endY; y++) {
      const rowIdx = (y - vy) * VP_WIDTH;
      for (let x = startX; x <= endX; x++) {
        occupied[rowIdx + (x - vx)] = 1;
      }
    }
  }

  let coveredCount = 0;
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (occupied[i] === 1) coveredCount++;
  }

  let maxEmptyRun = 0;
  for (let r = 0; r < VP_HEIGHT; r++) {
    let curRun = 0;
    const rowOffset = r * VP_WIDTH;
    for (let c = 0; c < VP_WIDTH; c++) {
      if (occupied[rowOffset + c] === 0) {
        curRun++;
        if (curRun > maxEmptyRun) maxEmptyRun = curRun;
      } else {
        curRun = 0;
      }
    }
  }

  const cellsCoveredPct = Math.round((coveredCount / TOTAL_CELLS) * 1000) / 10;
  const emptyRatio = Math.round(((TOTAL_CELLS - coveredCount) / TOTAL_CELLS) * 1000) / 1000;

  return {
    spriteCount: objs.length,
    coveredCount,
    cellsCoveredPct,
    emptyRatio,
    maxEmptyRun
  };
}

function checkCollinearLattice(objs) {
  const rowMap = new Map();
  const colMap = new Map();
  for (const o of objs) {
    if (!rowMap.has(o.y)) rowMap.set(o.y, []);
    rowMap.get(o.y).push(o.x);
    if (!colMap.has(o.x)) colMap.set(o.x, []);
    colMap.get(o.x).push(o.y);
  }

  let latticeViolations = 0;
  for (const [y, xs] of rowMap.entries()) {
    if (xs.length >= 6) {
      xs.sort((a, b) => a - b);
      let diff = xs[1] - xs[0];
      let streak = 2;
      for (let i = 2; i < xs.length; i++) {
        if (xs[i] - xs[i - 1] === diff && diff <= 4) {
          streak++;
          if (streak >= 6) {
            latticeViolations++;
            break;
          }
        } else {
          diff = xs[i] - xs[i - 1];
          streak = 2;
        }
      }
    }
  }
  return latticeViolations;
}

function createRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

console.log(`=== PENGUKURAN KEPADATAN SPASIAL V14 (measureDensity.js) ===`);
console.log(`Sampling ${SAMPLES_PER_REGION} viewport & ${CHUNKS_PER_REGION} chunk per region untuk ${REGIONS.length} region...`);

const rng = createRng(1337);
const results = {};

for (const reg of REGIONS) {
  const regId = reg.id || reg.slug;
  const bounds = reg.bounds || {
    minX: Math.max(0, reg.centerX - 250),
    maxX: Math.min(4980, reg.centerX + 250),
    minY: Math.max(0, reg.centerY - 250),
    maxY: Math.min(4980, reg.centerY + 250)
  };

  const spanX = Math.max(1, bounds.maxX - bounds.minX - VP_WIDTH);
  const spanY = Math.max(1, bounds.maxY - bounds.minY - VP_HEIGHT);

  const samples = [];
  let attempts = 0;

  while (samples.length < SAMPLES_PER_REGION && attempts < SAMPLES_PER_REGION * 5) {
    attempts++;
    const vx = bounds.minX + Math.floor(rng() * spanX);
    const vy = bounds.minY + Math.floor(rng() * spanY);

    const probe = worldData.getRegionAt(vx + Math.floor(VP_WIDTH / 2), vy + Math.floor(VP_HEIGHT / 2));
    if (probe.id === regId || probe.slug === regId || attempts > SAMPLES_PER_REGION * 3) {
      samples.push(analyzeViewport(vx, vy));
    }
  }

  // Sample chunks in region
  const chunkSpanX = Math.max(1, Math.floor((bounds.maxX - bounds.minX) / 32));
  const chunkSpanY = Math.max(1, Math.floor((bounds.maxY - bounds.minY) / 32));
  const chunkMinX = Math.floor(bounds.minX / 32);
  const chunkMinY = Math.floor(bounds.minY / 32);

  const chunkObjectCounts = [];
  let chunkAttempts = 0;
  while (chunkObjectCounts.length < CHUNKS_PER_REGION && chunkAttempts < CHUNKS_PER_REGION * 5) {
    chunkAttempts++;
    const rcx = chunkMinX + Math.floor(rng() * chunkSpanX);
    const rcy = chunkMinY + Math.floor(rng() * chunkSpanY);
    const centerTileX = rcx * 32 + 16;
    const centerTileY = rcy * 32 + 16;
    const probe = worldData.getRegionAt(centerTileX, centerTileY);
    if (probe.id === regId || probe.slug === regId || chunkAttempts > CHUNKS_PER_REGION * 3) {
      const k = `${rcx},${rcy}`;
      let cObjs = chunkCache.get(k);
      if (!cObjs) {
        cObjs = objectScatter.getChunkObjects(rcx, rcy);
        chunkCache.set(k, cObjs);
      }
      chunkObjectCounts.push(cObjs.length);
    }
  }
  chunkObjectCounts.sort((a, b) => a - b);

  // Aggregate metrics
  const spriteList = samples.map(s => s.spriteCount).sort((a, b) => a - b);
  const coveredList = samples.map(s => s.cellsCoveredPct).sort((a, b) => a - b);
  const emptyRatioList = samples.map(s => s.emptyRatio).sort((a, b) => a - b);
  const emptyRunList = samples.map(s => s.maxEmptyRun).sort((a, b) => a - b);

  results[regId] = {
    displayName: reg.displayName || reg.name || regId,
    sampleCount: samples.length,
    sprites: {
      p10: Math.round(percentile(spriteList, 0.10) * 10) / 10,
      median: Math.round(percentile(spriteList, 0.50) * 10) / 10,
      p90: Math.round(percentile(spriteList, 0.90) * 10) / 10
    },
    cellsCoveredPct: {
      p10: Math.round(percentile(coveredList, 0.10) * 10) / 10,
      median: Math.round(percentile(coveredList, 0.50) * 10) / 10,
      p90: Math.round(percentile(coveredList, 0.90) * 10) / 10
    },
    emptyRatio: {
      p10: Math.round(percentile(emptyRatioList, 0.10) * 1000) / 1000,
      median: Math.round(percentile(emptyRatioList, 0.50) * 1000) / 1000,
      p90: Math.round(percentile(emptyRatioList, 0.90) * 1000) / 1000
    },
    maxEmptyRun: {
      p10: Math.round(percentile(emptyRunList, 0.10) * 10) / 10,
      median: Math.round(percentile(emptyRunList, 0.50) * 10) / 10,
      p90: Math.round(percentile(emptyRunList, 0.90) * 10) / 10
    },
    perChunkObjects: {
      min: chunkObjectCounts[0] || 0,
      p10: Math.round(percentile(chunkObjectCounts, 0.10) * 10) / 10,
      median: Math.round(percentile(chunkObjectCounts, 0.50) * 10) / 10,
      max: chunkObjectCounts[chunkObjectCounts.length - 1] || 0
    }
  };
}

// Collinear check on cached chunks
let totalCollinear = 0;
for (const [k, cObjs] of chunkCache.entries()) {
  totalCollinear += checkCollinearLattice(cObjs);
}

results._summary = {
  measuredAt: new Date().toISOString(),
  mode: isBaseline ? 'BASELINE' : 'V14',
  totalRegions: Object.keys(results).length,
  totalCachedChunks: chunkCache.size,
  collinearLatticeCount: totalCollinear
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`Hasil kepadatan V14 berhasil ditulis ke: ${outPath}`);
