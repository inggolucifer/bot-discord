'use strict';
/**
 * scripts/v12/latticeProbe.js
 * Probes 200 representative chunks across 29 regions for lattice alignment:
 * - Detects instances where >= 3 objects of the same family share identical x or y in a chunk.
 * - Measures colLattice count and empty 8x8 block counts.
 */

const path = require('path');
const fs = require('fs');
const objectScatter = require('../../utils/objectScatter');
const worldData = require('../../utils/worldData');
const { getTileAt } = require('../../utils/proceduralWorldEngine');

const WATER_TERRAINS = new Set(['sea', 'ocean', 'sea_reef', 'island_reef', 'lake_deep', 'lake', 'river', 'river_shallow']);

function probeLattice() {
  const regions = worldData.getAllRegions();
  const chunksToProbe = [];
  
  // Pick chunks from each region
  let seed = 20261028;
  function prng() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  
  for (const r of regions) {
    const rx = r.bounds?.minX ?? 2000;
    const ry = r.bounds?.minY ?? 2000;
    const rw = Math.max(32, (r.bounds?.maxX ?? 2500) - rx);
    const rh = Math.max(32, (r.bounds?.maxY ?? 2500) - ry);
    
    // Sample 7 chunks per region = 203 chunks total
    for (let i = 0; i < 7; i++) {
      const tx = rx + Math.floor(prng() * rw);
      const ty = ry + Math.floor(prng() * rh);
      const cx = Math.floor(tx / 32);
      const cy = Math.floor(ty / 32);
      if (cx >= 0 && cx < 156 && cy >= 0 && cy < 156) {
        chunksToProbe.push({ cx, cy, regionId: r.id });
      }
    }
  }

  const selected = chunksToProbe.slice(0, 200);
  console.log(`=== LATTICE & DENSITY PROBE (200 Chunks) ===`);

  let totalChunks = selected.length;
  let totalObjects = 0;
  let totalLatticeRows = 0;
  let totalLatticeCols = 0;
  let maxDominanceSeen = 0;
  let totalEmpty8x8Blocks = 0;
  let wilderness8x8Blocks = 0;

  for (const { cx, cy, regionId } of selected) {
    const objs = objectScatter.getChunkObjects(cx, cy);
    totalObjects += objs.length;

    // Check dominance
    const counts = {};
    for (const o of objs) {
      if (!o.defId) continue;
      counts[o.defId] = (counts[o.defId] || 0) + 1;
    }
    if (objs.length > 0) {
      for (const [defId, cnt] of Object.entries(counts)) {
        const pct = (cnt / objs.length) * 100;
        if (pct > maxDominanceSeen) maxDominanceSeen = pct;
      }
    }

    // Check lattice: >= 3 objects of same family on identical x or identical y
    const xMap = new Map();
    const yMap = new Map();

    for (const o of objs) {
      if (!o.defId) continue;
      const fam = o.defId.replace(/_v\d+$/, '').replace(/_\d+$/, '');
      const xKey = `${fam}_x_${o.x}`;
      const yKey = `${fam}_y_${o.y}`;
      xMap.set(xKey, (xMap.get(xKey) || 0) + 1);
      yMap.set(yKey, (yMap.get(yKey) || 0) + 1);
    }

    for (const [k, count] of xMap.entries()) {
      if (count >= 3) totalLatticeCols++;
    }
    for (const [k, count] of yMap.entries()) {
      if (count >= 3) totalLatticeRows++;
    }

    // Check 8x8 blocks in this 32x32 chunk (16 blocks of 8x8)
    const startX = cx * 32;
    const startY = cy * 32;
    for (let by = 0; by < 4; by++) {
      for (let bx = 0; bx < 4; bx++) {
        const bMinX = startX + bx * 8;
        const bMaxX = bMinX + 7;
        const bMinY = startY + by * 8;
        const bMaxY = bMinY + 7;

        // Check if block is water or extreme desert
        const centerTile = getTileAt(bMinX + 4, bMinY + 4);
        const tt = centerTile?.terrainType || '';
        const isWater = WATER_TERRAINS.has(tt);
        const isDesert = regionId.includes('desert') || tt.includes('dune');

        if (!isWater && !isDesert) {
          wilderness8x8Blocks++;
          const hasObj = objs.some(o => o.x >= bMinX && o.x <= bMaxX && o.y >= bMinY && o.y <= bMaxY);
          if (!hasObj) totalEmpty8x8Blocks++;
        }
      }
    }
  }

  const empty8x8Pct = wilderness8x8Blocks > 0 ? (totalEmpty8x8Blocks / wilderness8x8Blocks) * 100 : 0;

  const result = {
    chunksTested: totalChunks,
    totalObjects,
    avgObjectsPerChunk: (totalObjects / totalChunks).toFixed(1),
    latticeCols: totalLatticeCols,
    latticeRows: totalLatticeRows,
    totalLatticeViolations: totalLatticeCols + totalLatticeRows,
    maxDominancePct: maxDominanceSeen.toFixed(1),
    wilderness8x8Blocks,
    empty8x8Blocks: totalEmpty8x8Blocks,
    empty8x8Pct: empty8x8Pct.toFixed(2)
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  probeLattice();
}

module.exports = { probeLattice };
