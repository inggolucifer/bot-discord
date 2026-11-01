'use strict';
/**
 * scripts/v16/generateRequiredPoints.js
 * Generates the locked test points list for V16 evaluation:
 * - P01..P17 (mandatory benchmark points)
 * - P20..P29 (family boundary cells: 5 in T1, 5 in Azure, seed=1618)
 * - P30..P34 (random road cells, seed=1618)
 */

const fs = require('fs');
const path = require('path');
const cse = require('../../utils/chunkStreamingEngine');
const manifest = require('../../web-dashboard/public/assets/ground/ground-manifest.json');

const terrainToFamily = {};
for (const [t, info] of Object.entries(manifest.terrains)) {
  terrainToFamily[t] = info.family || t;
}

function getFamily(t) {
  if (!t) return 'plains';
  if (t.includes('road')) return 'road_stone';
  return terrainToFamily[t] || 'plains';
}

function makeRng(seed) {
  let s = seed >>> 0;
  return function() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rng = makeRng(1618);

// Base required points P01..P17
const requiredPoints = [
  { id: "P01_xingcun", x: 2050, y: 2650, zoom: 1.4, class: "grass" },
  { id: "P02_xingcun_cross", x: 2062, y: 2648, zoom: 1.4, class: "grass", road: true },
  { id: "P03_wild", x: 2300, y: 3000, zoom: 1.4, class: "grass" },
  { id: "P04_farm", x: 2450, y: 2450, zoom: 1.4, class: "field", tile: "farmland" },
  { id: "P05_forest", x: 2700, y: 2300, zoom: 1.4, class: "grass", tile: "forest" },
  { id: "P06_azure_pass", x: 2200, y: 3340, zoom: 1.0, class: "stone" },
  { id: "P07_azure_west", x: 1500, y: 3350, zoom: 1.0, class: "stone" },
  { id: "P08_azure_far_west", x: 800, y: 3350, zoom: 1.0, class: "stone" },
  { id: "P09_azure_east", x: 3300, y: 3350, zoom: 1.0, class: "stone" },
  { id: "P10_azure_mist", x: 2600, y: 3340, zoom: 1.0, class: "stone" },
  { id: "P11_xueshan", x: 2350, y: 4300, zoom: 1.4, class: "snow", road: true },
  { id: "P12_desert", x: 900, y: 2600, zoom: 1.4, class: "sand" },
  { id: "P13_road_h", x: 2040, y: 2651, zoom: 1.4, class: "grass", road: true },
  { id: "P14_road_v", x: 2053, y: 2648, zoom: 1.4, class: "grass", road: true },
  { id: "P15_central", x: 2500, y: 2800, zoom: 1.4, class: "grass" },
  { id: "P16_west_farm", x: 1800, y: 2400, zoom: 1.4, class: "field" },
  { id: "P17_delta", x: 1600, y: 2200, zoom: 1.4, class: "grass" }
];

console.log('[generateRequiredPoints] Loading target chunks for boundary and road extraction...');

const tileMap = new Map();
function loadChunk(cx, cy) {
  const c = cse.getStaticChunk(cx, cy);
  const tiles = cse.unpackChunkTiles(c);
  if (tiles) {
    for (const t of tiles) {
      tileMap.set(`${t.tileX},${t.tileY}`, t);
    }
  }
}

// Preload focused chunks
// T1 chunks (Plains, Farmland, Forest, Rivers)
loadChunk(64, 82); // Xingcun (2048, 2624)
loadChunk(65, 82); // Xingcun East (2080, 2624)
loadChunk(76, 76); // Farm/Delta (2432, 2432)
loadChunk(84, 71); // Forest (2688, 2272)

// Azure Mountain chunks (Azure Wall, Passes, Highlands)
loadChunk(68, 104); // Azure Pass (2176, 3328)
loadChunk(69, 104); // Azure Pass East (2208, 3328)
loadChunk(46, 104); // Azure West (1472, 3328)

// Snow chunk
loadChunk(73, 134); // Xueshan (2336, 4288)

function getTile(x, y) {
  return tileMap.get(`${x},${y}`) || null;
}

// 1. T1 Boundary Candidates
const t1Boundaries = [];
for (const [key, t] of tileMap.entries()) {
  const [x, y] = key.split(',').map(Number);
  if (y > 3100) continue; // Only T1
  const fam = getFamily(t.terrainType);
  if (fam === 'road_stone' || fam === 'settlement_floor') continue;

  const neighbors = [getTile(x + 1, y), getTile(x - 1, y), getTile(x, y + 1), getTile(x, y - 1)];
  for (const n of neighbors) {
    if (n) {
      const nFam = getFamily(n.terrainType);
      if (nFam !== fam && nFam !== 'road_stone' && nFam !== 'settlement_floor') {
        t1Boundaries.push({ x, y, famA: fam, famB: nFam });
        break;
      }
    }
  }
}

// Deterministically pick 5 T1 boundary cells
for (let i = 0; i < 5; i++) {
  const pick = t1Boundaries[(i * 17 + 3) % t1Boundaries.length];
  requiredPoints.push({
    id: `P${20 + i}_boundary_t1`,
    x: pick.x,
    y: pick.y,
    zoom: 1.4,
    class: "boundary",
    boundaryType: "T1",
    famA: pick.famA,
    famB: pick.famB
  });
}

// 2. Azure Boundary Candidates
const azureBoundaries = [];
for (const [key, t] of tileMap.entries()) {
  const [x, y] = key.split(',').map(Number);
  if (y < 3300 || y > 3400) continue; // Only Azure
  const fam = getFamily(t.terrainType);

  const neighbors = [getTile(x + 1, y), getTile(x - 1, y), getTile(x, y + 1), getTile(x, y - 1)];
  for (const n of neighbors) {
    if (n) {
      const nFam = getFamily(n.terrainType);
      if (nFam !== fam) {
        azureBoundaries.push({ x, y, famA: fam, famB: nFam });
        break;
      }
    }
  }
}

// Deterministically pick 5 Azure boundary cells
for (let i = 0; i < 5; i++) {
  const pick = azureBoundaries[(i * 19 + 7) % azureBoundaries.length];
  requiredPoints.push({
    id: `P${25 + i}_boundary_azure`,
    x: pick.x,
    y: pick.y,
    zoom: 1.0,
    class: "boundary",
    boundaryType: "Azure",
    famA: pick.famA,
    famB: pick.famB
  });
}

// 3. Road Cells Candidates
const roadCells = [];
for (const [key, t] of tileMap.entries()) {
  const [x, y] = key.split(',').map(Number);
  if (t && t.terrainType && (t.terrainType.includes('road') || t.terrainType.includes('pass'))) {
    roadCells.push({ x, y, tile: t.terrainType });
  }
}

// Deterministically pick 5 road cells P30..P34
for (let i = 0; i < 5; i++) {
  const pick = roadCells[(i * 13 + 5) % roadCells.length];
  requiredPoints.push({
    id: `P${30 + i}_road_rand`,
    x: pick.x,
    y: pick.y,
    zoom: 1.4,
    class: "road",
    road: true,
    tile: pick.tile
  });
}

const outPath = path.resolve(__dirname, 'requiredPoints.json');
fs.writeFileSync(outPath, JSON.stringify(requiredPoints, null, 2), 'utf8');
console.log(`[generateRequiredPoints] Successfully generated ${requiredPoints.length} points to: ${outPath}`);
for (const p of requiredPoints) {
  console.log(`  ${p.id.padEnd(20)} (${p.x}, ${p.y}) z=${p.zoom} class=${p.class} ${p.boundaryType || p.tile || ''}`);
}
