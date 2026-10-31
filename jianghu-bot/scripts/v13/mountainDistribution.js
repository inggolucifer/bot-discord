/**
 * scripts/v13/mountainDistribution.js
 * Evaluates mountain footprint size distribution in mountainous regions.
 * Gate G_MOUNTAIN_SIZE_AZURE target: >= 50% are >= 4x2
 * Gate G_MOUNTAIN_SIZE_XL target: >= 15% are >= 6x3
 * Target 1x1: <= 20%
 */

const fs = require('fs');
const path = require('path');
const { getChunkObjects } = require('../../utils/objectScatter');
const { getTileAt } = require('../../utils/proceduralWorldEngine');

const gridCanonPath = path.resolve(__dirname, '../../world-data/grid-canon-v10.json');
const gridCanon = JSON.parse(fs.readFileSync(gridCanonPath, 'utf8')).frames || {};

const MOUNTAIN_REGIONS = [
  'azure_mountain_range',
  'godthunder_peaks',
  'western_gorge_labyrinth',
  'hermit_highlands',
  'lava_spine',
  'sword_gorge',
  'ore_teeth_range'
];

function getObjectDimensions(obj) {
  if (obj.cw && obj.ch) {
    return { w: obj.cw, h: obj.ch };
  }
  if (obj.w && obj.h) {
    return { w: obj.w, h: obj.h };
  }
  const frame = gridCanon[obj.defId];
  if (frame) {
    return { w: frame.fw || 1, h: frame.fh || 1 };
  }
  return { w: 1, h: 1 };
}

function isMountainObject(obj) {
  if (obj.isBarrierMassif) return true;
  if (obj.type === 'mountain') return true;
  if (obj.tags && obj.tags.includes('mountain')) return true;
  if (obj.defId) {
    if (obj.defId.startsWith('mountain_') || obj.defId.startsWith('mt_') || obj.defId.includes('karst')) return true;
    const frame = gridCanon[obj.defId];
    if (frame && frame.category === 'mountain') return true;
  }
  return false;
}

function measureMountainDistribution(options = {}) {
  const isBaseline = options.isBaseline || process.argv.includes('--baseline');
  const outFile = options.outFile || path.resolve(
    __dirname,
    isBaseline ? '../../review/v13_baseline_mountains.json' : '../../review/v13_mountains.json'
  );

  let totalMountains = 0;
  let countGe4x2 = 0;
  let countGe6x3 = 0;
  let count1x1 = 0;
  let count2x1 = 0;
  let count3x2 = 0;

  const sizeHistogram = {};
  const sampleChunks = [];

  // Sample chunks in mountain regions across the 5000x5000 map (0-155 chunks)
  // Step across chunks to cover mountain regions
  for (let cy = 0; cy < 156; cy += 2) {
    for (let cx = 0; cx < 156; cx += 2) {
      const tile = getTileAt(cx * 32 + 16, cy * 32 + 16);
      if (MOUNTAIN_REGIONS.includes(tile.regionId)) {
        sampleChunks.push({ cx, cy, regionId: tile.regionId });
      }
    }
  }

  // Cap at 120 sample chunks for fast deterministic evaluation
  const step = Math.max(1, Math.floor(sampleChunks.length / 100));
  const selectedChunks = [];
  for (let i = 0; i < sampleChunks.length; i += step) {
    selectedChunks.push(sampleChunks[i]);
  }

  for (const { cx, cy } of selectedChunks) {
    const objs = getChunkObjects(cx, cy);
    for (const obj of objs) {
      if (!isMountainObject(obj)) continue;

      const { w, h } = getObjectDimensions(obj);
      totalMountains++;
      const key = `${w}x${h}`;
      sizeHistogram[key] = (sizeHistogram[key] || 0) + 1;

      if ((w >= 4 && h >= 2) || (w >= 2 && h >= 4)) {
        countGe4x2++;
      }
      if ((w >= 6 && h >= 3) || (w >= 3 && h >= 6)) {
        countGe6x3++;
      }
      if (w <= 1 && h <= 1) {
        count1x1++;
      }
      if ((w === 2 && h === 1) || (w === 1 && h === 2)) {
        count2x1++;
      }
      if ((w === 3 && h === 2) || (w === 2 && h === 3)) {
        count3x2++;
      }
    }
  }

  const pctGe4x2 = totalMountains > 0 ? (countGe4x2 / totalMountains) * 100 : 0;
  const pctGe6x3 = totalMountains > 0 ? (countGe6x3 / totalMountains) * 100 : 0;
  const pct1x1 = totalMountains > 0 ? (count1x1 / totalMountains) * 100 : 0;

  const result = {
    totalMountains,
    sampleChunksCount: selectedChunks.length,
    countGe4x2,
    countGe6x3,
    count1x1,
    pctGe4x2: parseFloat(pctGe4x2.toFixed(2)),
    pctGe6x3: parseFloat(pctGe6x3.toFixed(2)),
    pct1x1: parseFloat(pct1x1.toFixed(2)),
    sizeHistogram,
    gates: {
      G_MOUNTAIN_SIZE_AZURE: {
        target: '>= 50.0%',
        actual: `${pctGe4x2.toFixed(2)}%`,
        pass: pctGe4x2 >= 50.0
      },
      G_MOUNTAIN_SIZE_XL: {
        target: '>= 15.0%',
        actual: `${pctGe6x3.toFixed(2)}%`,
        pass: pctGe6x3 >= 15.0
      }
    }
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');
  console.log(`[mountainDistribution] Output written to ${outFile}`);
  console.log(`Total: ${totalMountains}, >=4x2: ${result.pctGe4x2}% (target >=50%), >=6x3: ${result.pctGe6x3}% (target >=15%), 1x1: ${result.pct1x1}%`);

  return result;
}

if (require.main === module) {
  measureMountainDistribution();
}

module.exports = { measureMountainDistribution, getObjectDimensions, isMountainObject };
