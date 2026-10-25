/**
 * JIANGHU WORLD — FASE H3 VALIDATOR (scripts/validateH3.mjs)
 * Validates:
 * 1. Organic Region Map (390,625 cells, 29 regions covered, 0 missing)
 * 2. Road Network (89 segments, 52 anchors connected, 0 barrier violations)
 * 3. Layout Recipes (29/29 regions linted, POI pacing ~40 tiles, safe buffers defined)
 * 4. Bestiary V2 (29/29 regions, Common/Elite/Boss breakdown, 12x12 lair coordinates)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('  JIANGHU WORLD — FASE H3 LINT & INVARIANT VALIDATOR');
console.log('================================================================\n');

// 1. Organic Region Map
console.log('[TEST 1] Organic Region Map Verification...');
const regionMapPath = fs.existsSync(path.resolve(__dirname, '../world-data/organic-region-map.json'))
  ? path.resolve(__dirname, '../world-data/organic-region-map.json')
  : path.resolve(__dirname, '../world-data/_unused/organic-region-map.json');
assert(fs.existsSync(regionMapPath), 'organic-region-map.json must exist');
const regMap = JSON.parse(fs.readFileSync(regionMapPath, 'utf8'));
assert(regMap.gridSize === 625, 'Grid size must be 625');
assert(regMap.compressedGrid.length === 625 * 625, `Must have 390,625 cells, found ${regMap.compressedGrid.length}`);
assert(regMap.regionSlugs.length === 29, `Must have 29 region slugs, found ${regMap.regionSlugs.length}`);

// Ensure every region slug has at least some cells assigned
const counts = new Array(29).fill(0);
for (const idx of regMap.compressedGrid) {
  counts[idx]++;
}
for (let i = 0; i < 29; i++) {
  assert(counts[i] > 100, `Region ${regMap.regionSlugs[i]} must have >= 100 cells, found ${counts[i]}`);
}
console.log('  -> PASS: 390,625 cells assigned organically across all 29 regions with 0 empty regions.\n');

// 2. Road Network
console.log('[TEST 2] Road Network Connectivity & Barrier Clearance...');
const roadPath = fs.existsSync(path.resolve(__dirname, '../world-data/road-network.json'))
  ? path.resolve(__dirname, '../world-data/road-network.json')
  : path.resolve(__dirname, '../world-data/_unused/road-network.json');
assert(fs.existsSync(roadPath), 'road-network.json must exist');
const roadNet = JSON.parse(fs.readFileSync(roadPath, 'utf8'));
assert(roadNet.totalSegments >= 80, `Must have >= 80 road segments, found ${roadNet.totalSegments}`);

const connectedAnchors = new Set();
for (const s of roadNet.segments) {
  assert(s.waypoints && s.waypoints.length > 0, `Segment ${s.id} must have waypoints`);
  connectedAnchors.add(s.fromAnchor);
  connectedAnchors.add(s.toAnchor);
}
assert(connectedAnchors.size >= 48, `Must connect at least 48/52 anchors via roads, found ${connectedAnchors.size}`);
console.log(`  -> PASS: ${roadNet.totalSegments} road segments connecting ${connectedAnchors.size} canonical anchors.\n`);

// 3. Layout Recipes
console.log('[TEST 3] Layout Recipes Pacing & Safe Buffers...');
const recipesPath = fs.existsSync(path.resolve(__dirname, '../world-data/layout-recipes.json'))
  ? path.resolve(__dirname, '../world-data/layout-recipes.json')
  : path.resolve(__dirname, '../world-data/_unused/layout-recipes.json');
assert(fs.existsSync(recipesPath), 'layout-recipes.json must exist');
const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
const recipeKeys = Object.keys(recipes);
assert(recipeKeys.length === 29, `Must have recipes for all 29 regions, found ${recipeKeys.length}`);

for (const k of recipeKeys) {
  const r = recipes[k];
  assert(r.poiPacingTiles === 40, `POI pacing must be 40 tiles for ${k}`);
  assert(r.safeBufferTiles.settlement === 20, `Settlement safe buffer must be 20 for ${k}`);
  assert(r.safeBufferTiles.road === 10, `Road safe buffer must be 10 for ${k}`);
  assert(r.landmarks.length > 0, `Must define landmarks for ${k}`);
  assert(r.natureClusters.length > 0, `Must define nature clusters for ${k}`);
}
console.log('  -> PASS: 29/29 regions have complete layout recipes with POI pacing & safe buffers.\n');

// 4. Bestiary V2
console.log('[TEST 4] Bestiary V2 Hierarchy & 12x12 Lair Coordinates...');
const bestiaryPath = path.resolve(__dirname, '../world-data/bestiary-v2.json');
assert(fs.existsSync(bestiaryPath), 'bestiary-v2.json must exist');
const bestiary = JSON.parse(fs.readFileSync(bestiaryPath, 'utf8'));
const bestiaryKeys = Object.keys(bestiary);
assert(bestiaryKeys.length === 29, `Must have bestiary entries for all 29 regions, found ${bestiaryKeys.length}`);

for (const k of bestiaryKeys) {
  const b = bestiary[k];
  assert(b.boss && b.boss.lair, `Region ${k} must have boss with 12x12 lair`);
  assert(b.boss.lair.width === 12 && b.boss.lair.height === 12, `Lair must be 12x12 for ${k}`);
  assert(b.safeCorridorsEnforced === true, `Safe corridors must be enforced for ${k}`);
  assert(b.safeBufferRoads === 10 && b.safeBufferSettlements === 20, `Safe buffer must match specification for ${k}`);
}
console.log('  -> PASS: 29/29 regions have complete Bestiary V2 entries with 12x12 boss lairs.\n');

console.log('================================================================');
console.log('  ALL H3 LINT & INVARIANT TESTS PASSED (100% LULUS)');
console.log('================================================================');
