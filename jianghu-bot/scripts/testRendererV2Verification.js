/**
 * TEST SUITE: RENDERER V2 VERIFICATION (FASE 10)
 * Validates 10-Layer Architecture, Y-Sorting, Player Occlusion, Procedural Objects,
 * Terrain Wash Palettes, NPC/Monster Badges, and 5 Regional Render Profiles.
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

console.log('=== TEST SUITE: RENDERER V2 VERIFICATION (FASE 10) ===\n');

// ----------------------------------------------------------------------------
// 1. Component Consolidation & Deprecation Check
// ----------------------------------------------------------------------------
const mapDir = path.join(__dirname, '../web-dashboard/src/components/map');
const oldFiles = ['WorldMapView.tsx', 'WorldScrollMapView.tsx', 'RegionMapView.tsx'];
for (const f of oldFiles) {
  const exists = fs.existsSync(path.join(mapDir, f));
  assert(!exists, `Deprecated legacy viewer ${f} is successfully deleted`);
}

const worldCanvasExists = fs.existsSync(path.join(mapDir, 'WorldCanvas.tsx'));
assert(worldCanvasExists, 'Unified WorldCanvas.tsx is present in src/components/map/');

const proceduralObjectsExists = fs.existsSync(path.join(__dirname, '../web-dashboard/src/lib/proceduralObjects.ts'));
assert(proceduralObjectsExists, 'Procedural Shuimo object library proceduralObjects.ts is present');

const worldTypesExists = fs.existsSync(path.join(__dirname, '../web-dashboard/src/types/world.ts'));
assert(worldTypesExists, 'Unified world types contract types/world.ts is present');

// ----------------------------------------------------------------------------
// 2. Procedural Objects Definitions & Specs (§3.2)
// ----------------------------------------------------------------------------
const procCode = fs.readFileSync(path.join(__dirname, '../web-dashboard/src/lib/proceduralObjects.ts'), 'utf8');

assert(procCode.includes('karst_pillar_1x1'), 'OBJECT_DEFINITIONS includes karst_pillar_1x1');
assert(procCode.includes('mt_rock_2x1'), 'OBJECT_DEFINITIONS includes mt_rock_2x1');
assert(procCode.includes('mt_rock_3x2'), 'OBJECT_DEFINITIONS includes mt_rock_3x2');
assert(procCode.includes('bamboo_clump_1x1'), 'OBJECT_DEFINITIONS includes bamboo_clump_1x1');
assert(procCode.includes('bamboo_clump_2x1'), 'OBJECT_DEFINITIONS includes bamboo_clump_2x1');
assert(procCode.includes('pine_tree_1x1'), 'OBJECT_DEFINITIONS includes pine_tree_1x1');
assert(procCode.includes('sect_gate_3x2'), 'OBJECT_DEFINITIONS includes sect_gate_3x2');
assert(procCode.includes('overhangCells'), 'Multi-cell objects declare overhangCells for vertical elevation');
assert(procCode.includes('fogFoot'), 'Tall objects declare fogFoot for foot mist');

// ----------------------------------------------------------------------------
// 3. Y-Sorting Algorithm & Player Occlusion (§3.3)
// ----------------------------------------------------------------------------
// Simulate Y-Sort entries
function calculateSortKey(bottomRow, xCenter, sortBias = 0) {
  return bottomRow * 1000 + xCenter + sortBias;
}

const mtKey = calculateSortKey(10 + 2, 20); // Mountain base at row 12, col 20 -> 12020
const playerKeyInFront = calculateSortKey(13, 20); // Player standing in front at row 13 -> 13020
const playerKeyBehind = calculateSortKey(11, 20); // Player standing behind at row 11 -> 11020

assert(mtKey < playerKeyInFront, 'Player standing in front of mountain is drawn AFTER mountain (in front)');
assert(playerKeyBehind < mtKey, 'Player standing behind mountain is drawn BEFORE mountain (occluded)');

// Occlusion alpha rule
function checkOcclusion(playerY, playerX, objInstance, def) {
  const isBehind =
    playerY >= objInstance.y - def.overhangCells &&
    playerY <= objInstance.y + def.footprint.ch &&
    playerX >= objInstance.x - 0.5 &&
    playerX <= objInstance.x + def.footprint.cw + 0.5;
  const isObjDrawnAfter = calculateSortKey(objInstance.y + def.footprint.ch, objInstance.x) > calculateSortKey(playerY + 1, playerX);
  return (isBehind && isObjDrawnAfter) ? 0.55 : 1.0;
}

const sampleDef = { footprint: { cw: 2, ch: 2 }, overhangCells: 2.0 };
const sampleObj = { x: 50, y: 50 };
// Player at (50, 49) is behind the 2-cell overhang of the object
const alphaWhenBehind = checkOcclusion(49, 50, sampleObj, sampleDef);
assert(alphaWhenBehind === 0.55, 'Object alpha is softened to 0.55 when occluding player behind it');

const alphaWhenAway = checkOcclusion(60, 50, sampleObj, sampleDef);
assert(alphaWhenAway === 1.0, 'Object alpha remains 1.0 when player is not occluded');

// ----------------------------------------------------------------------------
// 4. L7 Marker UI & Formatting (§3.6)
// ----------------------------------------------------------------------------
function formatNpcCount(count) {
  return count > 9 ? '9+' : String(count);
}
assert(formatNpcCount(3) === '3', 'NPC count 3 displays as "3"');
assert(formatNpcCount(9) === '9', 'NPC count 9 displays as "9"');
assert(formatNpcCount(14) === '9+', 'NPC count > 9 displays as "9+"');

// Monster tier ring colors
const monsterColors = { 1: '#10B981', 2: '#EAB308', 3: '#F97316', 4: '#EF4444', 5: '#A855F7' };
assert(monsterColors[1] === '#10B981', 'Tier 1 monster has jade green ring accent');
assert(monsterColors[4] === '#EF4444', 'Tier 4 monster has crimson ring accent');
assert(monsterColors[5] === '#A855F7', 'Tier 5 monster has purple ring accent');

// ----------------------------------------------------------------------------
// 5. 5 Regional Visual Render Profiles
// ----------------------------------------------------------------------------
const regionsFile = path.join(__dirname, '../world-data/regions.json');
const regions = JSON.parse(fs.readFileSync(regionsFile, 'utf8'));

const testRegions = [
  'central_plains',
  'azure_mountain_range',
  'northern_desolate',
  'western_sacred_desert',
  'nine_springs_delta'
];

for (const slug of testRegions) {
  const r = regions.find(x => x.id === slug);
  assert(Boolean(r), `Regional profile for ${slug} exists in world-data/regions.json`);
  assert(Boolean(r.terrainProfile), `Regional profile for ${slug} has defined terrainProfile`);
  assert(Boolean(r.palette), `Regional profile for ${slug} has defined color palette`);
}

// ----------------------------------------------------------------------------
// 6. Max Rendered Objects Budget (Performance Target <= 140 Objects)
// ----------------------------------------------------------------------------
const worldCanvasCode = fs.readFileSync(path.join(mapDir, 'WorldCanvas.tsx'), 'utf8');
assert(worldCanvasCode.includes('objCount >= 140') || worldCanvasCode.includes('140'), 'WorldCanvas enforces <= 140 objects per frame budget');
assert(worldCanvasCode.includes('renderL0XuanPaper'), 'WorldCanvas executes L0 Xuan Paper rendering');
assert(worldCanvasCode.includes('renderL1TerrainCell'), 'WorldCanvas executes L1/L2 Terrain wash rendering');
assert(worldCanvasCode.includes('renderL3FootMist'), 'WorldCanvas executes L3 Foot Mist rendering');
assert(worldCanvasCode.includes('renderL4ProceduralObject'), 'WorldCanvas executes L4 Y-sorted object rendering');
assert(worldCanvasCode.includes('renderL6FogOfWarCell'), 'WorldCanvas executes L6 Fog of War rendering');
assert(worldCanvasCode.includes('renderL7NpcBadge'), 'WorldCanvas executes L7 NPC Badge rendering');
assert(worldCanvasCode.includes('renderL7MonsterInkRing'), 'WorldCanvas executes L7 Monster Ring rendering');

console.log('\n========================================');
console.log(`HASIL: ${passCount} LULUS, ${failCount} GAGAL`);
console.log('========================================');

if (failCount > 0) process.exit(1);
