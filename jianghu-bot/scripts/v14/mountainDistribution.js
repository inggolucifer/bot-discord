'use strict';
/**
 * scripts/v14/mountainDistribution.js
 * Evaluates mountain footprint size distribution in mountainous regions for V14.
 * Gate G_MOUNTAIN_SIZE_AZURE target: >= 50% are >= 4x2
 * Gate G_MOUNTAIN_SIZE_XL target: >= 15% are >= 6x3
 * Output: review/v14_mountains.json (or review/v14_baseline_mountains.json)
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
    isBaseline ? '../../review/v14_baseline_mountains.json' : '../../review/v14_mountains.json'
  );

  let totalMountains = 0;
  let countGe4x2 = 0;
  let countGe6x3 = 0;
  let count1x1 = 0;

  // Sample mountain chunks
  const sampleChunks = [
    [50, 95], [51, 95], [52, 95], [53, 95],
    [65, 100], [66, 100], [67, 100], [68, 100],
    [70, 102], [71, 102], [72, 102], [73, 102],
    [25, 60], [26, 60], [27, 60],
    [90, 80], [91, 80], [92, 80]
  ];

  for (const [cx, cy] of sampleChunks) {
    const objs = getChunkObjects(cx, cy);
    for (const obj of objs) {
      if (isMountainObject(obj)) {
        totalMountains++;
        const dim = getObjectDimensions(obj);
        if (dim.w >= 4 && dim.h >= 2) countGe4x2++;
        if (dim.w >= 6 && dim.h >= 3) countGe6x3++;
        if (dim.w === 1 && dim.h === 1) count1x1++;
      }
    }
  }

  const pctGe4x2 = totalMountains > 0 ? Math.round((countGe4x2 / totalMountains) * 1000) / 10 : 0;
  const pctGe6x3 = totalMountains > 0 ? Math.round((countGe6x3 / totalMountains) * 1000) / 10 : 0;
  const pct1x1 = totalMountains > 0 ? Math.round((count1x1 / totalMountains) * 1000) / 10 : 0;

  const result = {
    measuredAt: new Date().toISOString(),
    mode: isBaseline ? 'BASELINE' : 'V14',
    totalMountains,
    countGe4x2,
    countGe6x3,
    count1x1,
    pctGe4x2,
    pctGe6x3,
    pct1x1,
    passAzureSize: pctGe4x2 >= 50.0,
    passXLSize: pctGe6x3 >= 15.0
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');
  console.log(`[mountainDistribution] Output written to: ${outFile}`);
  console.log(`Total: ${totalMountains}, >=4x2: ${pctGe4x2}%, >=6x3: ${pctGe6x3}%, 1x1: ${pct1x1}%`);

  return result;
}

if (require.main === module) {
  measureMountainDistribution();
}

module.exports = { measureMountainDistribution };
