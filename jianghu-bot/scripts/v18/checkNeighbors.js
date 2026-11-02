'use strict';
const cse = require('../../utils/chunkStreamingEngine');
const manifest = require('../../web-dashboard/public/assets/ground/ground-manifest.json');
const terrainToFamily = {};
for (const [t, info] of Object.entries(manifest.terrains)) terrainToFamily[t] = info.family || t;

for (let dy = -1; dy <= 1; dy++) {
  for (let dx = -1; dx <= 1; dx++) {
    const cx = 47 + dx;
    const cy = 104 + dy;
    const c = cse.getStaticChunk(cx, cy);
    const tiles = c ? cse.unpackChunkTiles(c) : null;
    const fams = new Set();
    if (tiles) {
      for (const t of tiles) {
        fams.add(terrainToFamily[t.terrainType] || t.terrainType);
      }
    }
    console.log('Chunk (' + cx + ',' + cy + ') fams: ' + Array.from(fams).join(', '));
  }
}
