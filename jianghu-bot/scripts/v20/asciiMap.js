#!/usr/bin/env node
/**
 * scripts/v20/asciiMap.js
 * Visualisasi ASCII peta dunia untuk verifikasi terminal tanpa browser/screenshot.
 *
 * Usage:
 *   node scripts/v20/asciiMap.js <anchorId|name> [radius]
 *   node scripts/v20/asciiMap.js <centerX> <centerY> [radius]
 */

const path = require('path');
const anchors = require('../../world-data/anchors.json');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const objectScatter = require('../../utils/objectScatter');
const { isInSettlementExclusion } = require('../../utils/settlementZones');
const MANMADE_SET = new Set(require('../../world-data/manmade-defids-v20.json'));

function isManmadeDefId(defId) {
  if (!defId) return false;
  if (MANMADE_SET.has(defId)) return true;
  const d = defId.toLowerCase();
  return d.startsWith('building_') ||
         d.startsWith('house_') ||
         d.startsWith('hut_') ||
         d.startsWith('prop_') ||
         d.startsWith('craft_') ||
         d.startsWith('shop_') ||
         d.startsWith('furn_') ||
         d.startsWith('decor_') ||
         d.startsWith('market_') ||
         d.startsWith('structure_') ||
         d.startsWith('facility_') ||
         d.startsWith('fence_') ||
         d.startsWith('wall_');
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/v20/asciiMap.js <anchorId|name> [radius]');
  console.log('       node scripts/v20/asciiMap.js <centerX> <centerY> [radius]');
  process.exit(1);
}

let centerX, centerY, radius = 12, label = '';

if (isNaN(Number(args[0]))) {
  const query = args[0].toLowerCase().trim();
  const found = anchors.find(a =>
    a.id.toLowerCase() === query ||
    a.name.toLowerCase() === query ||
    a.name.toLowerCase().includes(query)
  );
  if (!found) {
    console.error(`Anchor '${args[0]}' tidak ditemukan.`);
    process.exit(1);
  }
  centerX = found.x + Math.floor((found.spanWidth || 2) / 2);
  centerY = found.y + Math.floor((found.spanHeight || 2) / 2);
  radius = args[1] ? parseInt(args[1], 10) : ((found.v20 && found.v20.exclusionRadius) || 12);
  label = `${found.name} (${found.id}) @ [${found.x}, ${found.y}] span ${found.spanWidth}x${found.spanHeight}`;
} else {
  centerX = parseInt(args[0], 10);
  centerY = parseInt(args[1], 10);
  radius = args[2] ? parseInt(args[2], 10) : 12;
  label = `Custom Center [${centerX}, ${centerY}] radius ${radius}`;
}

const minX = centerX - radius;
const maxX = centerX + radius;
const minY = centerY - radius;
const maxY = centerY + radius;

// Cache chunk objects
const minChunkX = Math.floor(minX / 32);
const maxChunkX = Math.floor(maxX / 32);
const minChunkY = Math.floor(minY / 32);
const maxChunkY = Math.floor(maxY / 32);

const objectsByTile = new Map();
for (let cy = minChunkY; cy <= maxChunkY; cy++) {
  for (let cx = minChunkX; cx <= maxChunkX; cx++) {
    const objs = objectScatter.getChunkObjects(cx, cy);
    for (const obj of objs) {
      const k = `${obj.x},${obj.y}`;
      if (!objectsByTile.has(k)) objectsByTile.set(k, []);
      objectsByTile.get(k).push(obj);
    }
  }
}

console.log('='.repeat(radius * 2 + 35));
console.log(` ASCII MAP: ${label}`);
console.log(` Legend: [M] Marker  [E] Entrance  [T] Nature  [#] Road  [~] Water  [^] Mountain  [X] VIOLATION`);
console.log('='.repeat(radius * 2 + 35));

const violations = [];
let markerTileCount = 0;
let entranceCount = 0;
let natureCount = 0;

for (let y = minY; y <= maxY; y++) {
  let row = `${String(y).padStart(5, ' ')} | `;
  for (let x = minX; x <= maxX; x++) {
    const tile = proceduralWorldEngine.getTileAt(x, y);
    const objs = objectsByTile.get(`${x},${y}`) || [];
    const ex = isInSettlementExclusion(x, y);

    let char = '.';

    // Check objects first
    let hasMarker = false;
    let hasViolation = false;
    let hasNature = false;

    for (const obj of objs) {
      if (obj.tags && obj.tags.includes('settlement_marker')) {
        hasMarker = true;
      } else if (ex.inZone && isManmadeDefId(obj.defId)) {
        hasViolation = true;
        violations.push({ x, y, defId: obj.defId, id: obj.id, anchor: ex.anchor.id });
      } else {
        hasNature = true;
      }
    }

    if (hasViolation) {
      char = 'X';
    } else if (tile.isSettlementEntrance) {
      char = 'E';
      entranceCount++;
    } else if (tile.isSolid && tile.terrainType === 'settlement') {
      char = 'M';
      markerTileCount++;
    } else if (hasMarker) {
      char = 'M';
      markerTileCount++;
    } else if (hasNature) {
      char = 'T';
      natureCount++;
    } else if (tile.terrainType && tile.terrainType.includes('road')) {
      char = '#';
    } else if (tile.terrainType && (tile.terrainType.includes('water') || tile.terrainType.includes('ocean') || tile.terrainType.includes('lake') || tile.terrainType.includes('river'))) {
      char = '~';
    } else if (tile.terrainType && (tile.terrainType.includes('mountain') || tile.terrainType.includes('cliff') || tile.terrainType.includes('peak'))) {
      char = '^';
    } else if (ex.inZone) {
      char = '·'; // within exclusion zone
    } else {
      char = '.';
    }

    row += char;
  }
  console.log(row);
}

console.log('='.repeat(radius * 2 + 35));
console.log(` Stats: Marker Tiles: ${markerTileCount} | Entrances: ${entranceCount} | Nature Props: ${natureCount} | Violations: ${violations.length}`);
if (violations.length > 0) {
  console.log(` ⚠️ VIOLATIONS DETECTED (${violations.length}):`);
  violations.forEach(v => console.log(`   - [${v.x}, ${v.y}] defId: ${v.defId} id: ${v.id} inside ${v.anchor}`));
} else {
  console.log(` ✅ Zero man-made clutter violations in exclusion zone.`);
}
console.log('='.repeat(radius * 2 + 35));
