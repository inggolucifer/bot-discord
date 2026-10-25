/**
 * scripts/fixAnchorRegions.js
 * Synchronizes anchor declared regions with canonical raster getRegionAt(x, y).id
 * Principle: RASTER WINS.
 */

const fs = require('fs');
const path = require('path');
const worldData = require('../utils/worldData');

const anchorsPath = path.resolve(__dirname, '../world-data/anchors.json');
const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));

let changedCount = 0;
const changes = [];

for (const a of anchors) {
  const raster = worldData.getRegionAt(a.x, a.y);
  const rasterId = raster ? raster.id : a.region;

  if (a.region !== rasterId) {
    changes.push({
      id: a.id,
      coords: `(${a.x}, ${a.y})`,
      oldRegion: a.region,
      newRegion: rasterId
    });
    a.regionWas = a.region;
    a.region = rasterId;
    changedCount++;
  }
}

if (changedCount > 0) {
  fs.writeFileSync(anchorsPath, JSON.stringify(anchors, null, 2), 'utf8');
}

console.log(`\n=== FIX ANCHOR REGIONS (fixAnchorRegions.js) ===`);
console.log(`Total anchor diperiksa : ${anchors.length}`);
console.log(`Jumlah anchor diubah   : ${changedCount}`);

if (changes.length > 0) {
  console.log('\nRincian Perubahan:');
  for (const c of changes) {
    console.log(`  - ${c.id} ${c.coords}: ${c.oldRegion} -> ${c.newRegion}`);
  }
}

if (changedCount === 0) {
  console.log('0 diubah. Semua anchor sudah cocok dengan raster.');
}
