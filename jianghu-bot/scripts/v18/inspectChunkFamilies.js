'use strict';
const cse = require('../../utils/chunkStreamingEngine');
const manifest = require('../../web-dashboard/public/assets/ground/ground-manifest.json');
const terrainToFamily = {};
for (const [t, info] of Object.entries(manifest.terrains)) terrainToFamily[t] = info.family || t;

function inspectChunk(cx, cy) {
  const c = cse.getStaticChunk(cx, cy);
  const tiles = cse.unpackChunkTiles(c);
  const terrainCounts = {};
  const familyCounts = {};
  for (const t of tiles) {
    terrainCounts[t.terrainType] = (terrainCounts[t.terrainType] || 0) + 1;
    const fam = terrainToFamily[t.terrainType] || t.terrainType;
    familyCounts[fam] = (familyCounts[fam] || 0) + 1;
  }
  console.log('Chunk (' + cx + ', ' + cy + '): bounds=[' + (cx*32) + '..' + (cx*32+31) + ', ' + (cy*32) + '..' + (cy*32+31) + ']');
  console.log('  Terrains:', JSON.stringify(terrainCounts));
  console.log('  Families:', JSON.stringify(familyCounts));
}

inspectChunk(46, 104);
inspectChunk(47, 104);
