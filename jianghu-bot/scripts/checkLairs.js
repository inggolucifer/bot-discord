/**
 * scripts/checkLairs.js
 * Validates boss lairs across all 29 regions:
 * 1. Checks that lair center is non-solid.
 * 2. Checks that raster region matches declared region.
 * 3. Measures percentage of solid tiles inside width x height footprint (target <= 5%).
 */

const fs = require('fs');
const path = require('path');
const worldData = require('../utils/worldData');
const { getTileAt } = require('../utils/proceduralWorldEngine');

const bestiaryPath = path.resolve(__dirname, '../world-data/bestiary-v2.json');
const bestiary = JSON.parse(fs.readFileSync(bestiaryPath, 'utf8'));

console.log('=== AUDIT SARANG BOSS (checkLairs.js) ===\n');
console.log('| Region | Sarang (x,y) | Terrain Pusat | Region Raster | Solid% (12x12) | Status |');
console.log('|---|---|---|---|---|---|');

let failCount = 0;
let maxSolidPct = 0;

for (const [regId, regData] of Object.entries(bestiary)) {
  const boss = regData.boss;
  if (!boss || !boss.lair) {
    console.log(`| ${regId} | TIDAK ADA SARANG | - | - | - | FAIL |`);
    failCount++;
    continue;
  }

  const lair = boss.lair;
  const cx = lair.centerX;
  const cy = lair.centerY;
  const w = lair.width || 12;
  const h = lair.height || 12;

  const centerTile = getTileAt(cx, cy);
  const centerSolid = centerTile ? centerTile.isSolid : true;
  const centerTerrain = centerTile ? centerTile.terrainType : 'unknown';

  const raster = worldData.getRegionAt(cx, cy);
  const rasterId = raster ? raster.id : 'unknown';
  const regionMatch = rasterId === regId;

  // Scan width x height area
  const halfW = Math.floor(w / 2);
  const halfH = Math.floor(h / 2);
  let solidCount = 0;
  let totalTiles = 0;

  for (let dy = -halfH; dy < halfH; dy++) {
    for (let dx = -halfW; dx < halfW; dx++) {
      totalTiles++;
      const tile = getTileAt(cx + dx, cy + dy);
      if (tile && tile.isSolid) {
        solidCount++;
      }
    }
  }

  const solidPct = totalTiles > 0 ? (solidCount / totalTiles) * 100 : 0;
  if (solidPct > maxSolidPct) maxSolidPct = solidPct;

  const pass = !centerSolid && regionMatch && solidPct <= 5.0;
  if (!pass) failCount++;

  console.log(`| ${regId} | (${cx},${cy}) | ${centerTerrain} | ${regionMatch ? rasterId : `FAIL(${rasterId})`} | ${solidPct.toFixed(1)}% | ${pass ? 'PASS' : 'FAIL'} |`);
}

console.log(`\nTotal Sarang Diperiksa : ${Object.keys(bestiary).length}`);
console.log(`Solid% Tertinggi       : ${maxSolidPct.toFixed(1)}% (target <= 5.0%)`);
console.log(`Pelanggaran Ditemukan  : ${failCount}\n`);

if (failCount > 0) {
  console.error('[GAGAL] Terdapat sarang boss yang solid, region salah, atau solid% > 5%');
  process.exit(1);
} else {
  console.log('[PASS] Seluruh 29 sarang boss valid, bebas solid, dan region cocok!');
  process.exit(0);
}
