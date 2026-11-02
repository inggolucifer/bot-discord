'use strict';
const cse = require('../../utils/chunkStreamingEngine');
const manifest = require('../../web-dashboard/public/assets/ground/ground-manifest.json');
const terrainToFamily = {};
for (const [t, info] of Object.entries(manifest.terrains)) terrainToFamily[t] = info.family || t;

console.log('--- Inspecting y=3350, x=1490..1530 on current HEAD ---');
for (let x = 1490; x <= 1530; x += 2) {
  const cx = Math.floor(x / 32);
  const cy = Math.floor(3350 / 32);
  const chunk = cse.getStaticChunk(cx, cy);
  const tiles = cse.unpackChunkTiles(chunk);
  const tile = tiles ? tiles.find(t => t.tileX === x && t.tileY === 3350) : null;
  console.log(`x=${x}, y=3350, cx=${cx}, cy=${cy}: terrainType=${tile ? tile.terrainType : 'none'}, family=${tile ? (terrainToFamily[tile.terrainType] || tile.terrainType) : 'none'}`);
}
