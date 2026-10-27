'use strict';
/**
 * scripts/v11/measureViewport.js
 * Evaluates spatial density metrics across 300 random viewports (20x12 cells) per region.
 * Metrics:
 * - sprites: count of non-marker/herb sprites
 * - cellsCoveredPct: footprint cells / 240 * 100
 * - emptyRatio: (240 - (footprint + canopy cells)) / 240
 * - maxEmptyRun: maximum distance between nearest neighbor sprites in the viewport
 *
 * Outputs: review/v11_density_before.json (or review/v11_density_after.json if --after passed)
 */

const fs = require('fs');
const path = require('path');
const worldData = require('../../utils/worldData');
const objectScatter = require('../../utils/objectScatter');
const GC = require('../../utils/gridContract');

const isAfter = process.argv.includes('--after');
const outFileName = isAfter ? 'v11_density_after.json' : 'v11_density_before.json';
const outPath = path.resolve(__dirname, '../../review', outFileName);

const REGIONS = worldData.getAllRegions();
const SAMPLES_PER_REGION = 300;
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
  const result = [];
  for (let cy = minChunkY; cy <= maxChunkY; cy++) {
    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      const k = `${cx},${cy}`;
      let chunkObjs = chunkCache.get(k);
      if (!chunkObjs) {
        chunkObjs = objectScatter.getChunkObjects(cx, cy);
        chunkCache.set(k, chunkObjs);
      }
      for (const obj of chunkObjs) {
        if (obj.x >= minTileX && obj.x <= maxTileX && obj.y >= minTileY && obj.y <= maxTileY) {
          result.push(obj);
        }
      }
    }
  }
  return result;
}

function analyzeViewport(vx, vy) {
  const objs = getCachedViewportObjects(vx, vy, vx + VP_WIDTH - 1, vy + VP_HEIGHT - 1);
  const sprites = objs.filter(o => {
    if (!o || !o.defId) return false;
    const id = o.defId.toLowerCase();
    if (id.includes('marker') || id.includes('sparkle') || id.includes('herb') || id.includes('resource_')) return false;
    return true;
  });

  const footprintCells = new Set();
  const allCoveredCells = new Set();

  for (const o of sprites) {
    const g = GC.getGrid(o.defId) || { fw: 1, fh: 1, rowsAbove: 0, mode: 'solid' };
    const fw = g.fw || 1;
    const fh = g.fh || 1;
    const rowsAbove = g.rowsAbove || 0;

    // Footprint
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        const cx = o.x + dx;
        const cy = o.y + dy;
        if (cx >= vx && cx < vx + VP_WIDTH && cy >= vy && cy < vy + VP_HEIGHT) {
          const k = `${cx - vx},${cy - vy}`;
          footprintCells.add(k);
          allCoveredCells.add(k);
        }
      }
    }

    // Canopy
    for (let dy = 1; dy <= rowsAbove; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        const cx = o.x + dx;
        const cy = o.y - dy;
        if (cx >= vx && cx < vx + VP_WIDTH && cy >= vy && cy < vy + VP_HEIGHT) {
          const k = `${cx - vx},${cy - vy}`;
          allCoveredCells.add(k);
        }
      }
    }
  }

  // maxEmptyRun: maximum nearest-neighbor distance among sprites
  let maxEmptyRun = 0;
  if (sprites.length <= 1) {
    maxEmptyRun = Math.hypot(VP_WIDTH, VP_HEIGHT); // ~23.3
  } else {
    for (let i = 0; i < sprites.length; i++) {
      let minDist = Infinity;
      for (let j = 0; j < sprites.length; j++) {
        if (i === j) continue;
        const dist = Math.hypot(sprites[i].x - sprites[j].x, sprites[i].y - sprites[j].y);
        if (dist < minDist) minDist = dist;
      }
      if (minDist > maxEmptyRun) {
        maxEmptyRun = minDist;
      }
    }
  }

  return {
    spriteCount: sprites.length,
    cellsCoveredPct: (footprintCells.size / TOTAL_CELLS) * 100,
    emptyRatio: (TOTAL_CELLS - allCoveredCells.size) / TOTAL_CELLS,
    maxEmptyRun
  };
}

// Pseudo-random deterministic generator for consistent sampling across before/after
function createRng(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

console.log(`=== MENGUKUR KEPADATAN VIEWPORT (measureViewport.js) ===`);
console.log(`Sampling ${SAMPLES_PER_REGION} viewport (20x12) per region untuk ${REGIONS.length} region...\n`);

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

    // Verify sample center belongs to region
    const probe = worldData.getRegionAt(vx + Math.floor(VP_WIDTH / 2), vy + Math.floor(VP_HEIGHT / 2));
    if (probe.id === regId || probe.slug === regId || attempts > SAMPLES_PER_REGION * 3) {
      samples.push(analyzeViewport(vx, vy));
    }
  }

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
      p10: Math.round(percentile(emptyRatioList, 0.10) * 100) / 100,
      median: Math.round(percentile(emptyRatioList, 0.50) * 100) / 100,
      p90: Math.round(percentile(emptyRatioList, 0.90) * 100) / 100
    },
    maxEmptyRun: {
      p10: Math.round(percentile(emptyRunList, 0.10) * 10) / 10,
      median: Math.round(percentile(emptyRunList, 0.50) * 10) / 10,
      p90: Math.round(percentile(emptyRunList, 0.90) * 10) / 10
    }
  };
  console.log(`[Progress] Region ${regId} selesai (${Object.keys(results).length}/${REGIONS.length})`);
}

fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`Laporan kepadatan berhasil disimpan ke ${outPath}`);

// Ringkasan untuk prompt P0 gate
console.log('\n--- RINGKASAN BASELINE KEPADATAN (MEDIAN SPRITES/VIEWPORT) ---');
const keyRegions = [
  { id: 'western_sacred_desert', label: 'Gurun Barat (western_sacred_desert)' },
  { id: 'central_plains', label: 'Wilderness Dataran Tengah (central_plains)' },
  { id: 'northern_desolate', label: 'Utara Beku (northern_desolate)' },
  { id: 'thundersteppe', label: 'Tundra Thundersteppe (thundersteppe)' },
  { id: 'azure_mountain_range', label: 'Pegunungan Azure (azure_mountain_range)' }
];

for (const k of keyRegions) {
  const r = results[k.id];
  if (r) {
    console.log(`- ${k.label}: median=${r.sprites.median}, p10=${r.sprites.p10}, p90=${r.sprites.p90}, emptyRatio=${r.emptyRatio.median}, maxEmptyRun=${r.maxEmptyRun.median}`);
  }
}
