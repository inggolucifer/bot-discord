/**
 * scripts/checkObjectsOnWater.js
 * Audits 6 random points per region across all 29 regions (174 points).
 * Verifies that no non-water objects sit on sea/ocean/reef/water tiles.
 * Target: 0 violations.
 */

const fs = require('fs');
const path = require('path');
const { getViewportObjects } = require('../utils/objectScatter');
const { getTileAt } = require('../utils/proceduralWorldEngine');

const regionsPath = path.resolve(__dirname, '../world-data/regions.json');
const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));

let seed = 20261021;
function lcgRandom() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const SEA_TERRAINS = new Set(['sea', 'ocean', 'sea_reef', 'island_reef', 'lake_deep', 'lake', 'river', 'river_shallow']);
const WATER_OBJECT_REGEX = /lotus|coral|reef|boat|drift|dock|island|isle|reed|stream|water|ship|dragon|iceberg|bridge|pagoda/;

let totalPoints = 0;
let totalObjects = 0;
let violations = 0;
const violationList = [];

for (const r of regions) {
  for (let i = 0; i < 6; i++) {
    totalPoints++;
    const b = r.bounds;
    const minX = b.minX + 30;
    const maxX = Math.max(minX, b.maxX - 30);
    const minY = b.minY + 17;
    const maxY = Math.max(minY, b.maxY - 17);

    const cx = Math.floor(minX + lcgRandom() * (maxX - minX));
    const cy = Math.floor(minY + lcgRandom() * (maxY - minY));

    const objs = getViewportObjects(cx - 30, cy - 17, cx + 29, cy + 16, 20261021);
    totalObjects += objs.length;

    for (const obj of objs) {
      const tile = getTileAt(obj.x, obj.y);
      const t = tile ? tile.terrainType : '';
      if (SEA_TERRAINS.has(t)) {
        if (!WATER_OBJECT_REGEX.test(obj.defId)) {
          violations++;
          if (violationList.length < 20) {
            violationList.push({
              region: r.id,
              x: obj.x,
              y: obj.y,
              terrain: t,
              defId: obj.defId
            });
          }
        }
      }
    }
  }
}

console.log('\n=== AUDIT OBJEK NON-AIR DI PETAK LAUT & AIR (checkObjectsOnWater.js) ===\n');
console.log(`Titik uji: ${totalPoints} titik (29 region × 6 titik)`);
console.log(`Total objek diperiksa: ${totalObjects}`);
console.log(`Pelanggaran ditemukan: ${violations}`);

if (violations > 0) {
  console.log('\nContoh pelanggaran:');
  console.table(violationList.slice(0, 10));
  console.log(`\n[GAGAL] Ditemukan ${violations} objek non-air di petak laut.`);
  process.exit(1);
} else {
  console.log('\n[PASS] 0 objek non-air di petak laut. Semua objek di atas air sah.');
  process.exit(0);
}
