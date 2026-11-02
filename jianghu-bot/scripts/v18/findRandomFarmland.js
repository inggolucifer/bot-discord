'use strict';
const cse = require('../../utils/chunkStreamingEngine');
const manifest = require('../../web-dashboard/public/assets/ground/ground-manifest.json');
const terrainToFamily = {};
for (const [t, info] of Object.entries(manifest.terrains)) terrainToFamily[t] = info.family || t;

function makeRng(seed) {
  let s = seed >>> 0;
  return function() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const farmPoints = [];
// Search chunks around farmland areas (cx: 50..80, cy: 70..85)
for (let cy = 72; cy <= 82; cy += 2) {
  for (let cx = 55; cx <= 78; cx += 2) {
    const chunk = cse.getStaticChunk(cx, cy);
    if (!chunk) continue;
    const tiles = cse.unpackChunkTiles(chunk);
    if (!tiles) continue;
    for (const tile of tiles) {
      if (tile.terrainType === 'farmland') {
        farmPoints.push({ x: tile.tileX, y: tile.tileY });
      }
    }
  }
}
console.log('Total farmland tiles found:', farmPoints.length);
const rng = makeRng(1618);
const selectedFarm = [];
for (let i = 0; i < 5; i++) {
  const idx = Math.floor(rng() * farmPoints.length);
  selectedFarm.push(farmPoints[idx]);
}
console.log('5 random farmland points (seed 1618):', JSON.stringify(selectedFarm, null, 2));
