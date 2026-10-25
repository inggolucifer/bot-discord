/**
 * scripts/checkFerry.js
 * Validates all ferry routes in web-api/routes/ferry.js:
 * (a) Destination tile must be non-solid (getTileAt).
 * (b) Destination name must match closest anchor within 40 tiles (or custom landmark destination).
 * (c) Destination region must match canonical raster getRegionAt(x, y).id.
 */

const path = require('path');
const worldData = require('../utils/worldData');
const { getTileAt } = require('../utils/proceduralWorldEngine');

// Extract FERRY_ROUTES from routes/ferry.js
const ferryModule = require('../web-api/routes/ferry.js');
const FERRY_ROUTES = ferryModule.FERRY_ROUTES || [];

const anchors = worldData.getAnchors();

console.log('=== AUDIT RUTE PENYEBERANGAN FERRY (checkFerry.js) ===\n');
console.log('| Rute ID | Asal -> Tujuan | Status Koordinat & Region | Status |');
console.log('|---|---|---|---|');

let failCount = 0;

for (const route of FERRY_ROUTES) {
  const dest = route.to;
  const tile = getTileAt(dest.tileX, dest.tileY);
  const isSolid = tile ? tile.isSolid : true;
  const terrain = tile ? tile.terrainType : 'unknown';

  const raster = worldData.getRegionAt(dest.tileX, dest.tileY);
  const rasterRegion = raster ? raster.id : 'unknown';
  const regionMatch = dest.regionSlug === rasterRegion;

  // Find nearest anchor
  let nearestAnchor = null;
  let minAnchorDist = Infinity;
  for (const a of anchors) {
    const d = Math.hypot(a.x - dest.tileX, a.y - dest.tileY);
    if (d < minAnchorDist) {
      minAnchorDist = d;
      nearestAnchor = a;
    }
  }

  // Anchor name matching
  let nameOk = false;
  let nameNote = '';
  if (minAnchorDist <= 40 && nearestAnchor) {
    nameOk = dest.settlementName === nearestAnchor.name || dest.settlementName === nearestAnchor.id;
    nameNote = `Anchor: ${nearestAnchor.name} (${minAnchorDist.toFixed(1)}t)`;
  } else if (dest.settlementName === 'Pulau Tengkorak Naga Beku' && dest.regionSlug === 'frostmoon_sea') {
    // Special landmark destination in sealed region without settlements
    nameOk = true;
    nameNote = 'Special Sealed Landmark';
  } else {
    nameNote = `Terlalu jauh dari anchor (min ${minAnchorDist.toFixed(1)}t)`;
  }

  const routeOk = !isSolid && regionMatch && nameOk;
  if (!routeOk) failCount++;

  const details = `(${dest.tileX},${dest.tileY}) [${terrain}] solid=${isSolid ? 'YES' : 'NO'}, reg=${dest.regionSlug}${regionMatch ? '==raster' : `!=${rasterRegion}`}, ${nameNote}`;
  console.log(`| ${route.id} | ${route.from.settlementName} -> ${dest.settlementName} | ${details} | ${routeOk ? 'OK' : 'FAIL'} |`);
}

console.log(`\nTotal Rute Diperiksa: ${FERRY_ROUTES.length}`);
console.log(`Rute Gagal: ${failCount}\n`);

if (failCount > 0) {
  console.error('[GAGAL] Terdapat rute ferry dengan tujuan rusak atau region salah.');
  process.exit(1);
} else {
  console.log('[PASS] Semua rute ferry valid, non-solid, dan sinkron dengan raster!');
  process.exit(0);
}
