/**
 * scripts/v12/diagnoseSettlementFloor.js
 * Diagnoses terrain, family, macro, and RGB at (2052, 2650) and (2350, 4302) for P1.
 */

const fs = require('fs');
const path = require('path');
const { getTileAt } = require('../../utils/proceduralWorldEngine');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'web-dashboard', 'public', 'assets', 'ground', 'ground-manifest.json');

const COORDS = [
  { name: 'Xingcun', x: 2052, y: 2650 },
  { name: 'Xueshan', x: 2350, y: 4302 }
];

function main() {
  console.log('=== P1 DIAGNOSIS: SETTLEMENT FLOOR (R3) ===');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

  for (const c of COORDS) {
    const tile = getTileAt(c.x, c.y);
    const terrain = tile.terrainType || 'plains';
    const famInfo = manifest.terrains[terrain] || { family: 'plains', variants: [] };
    const fam = famInfo.family;
    const famSpec = manifest.families[fam] || {};

    console.log(`\nLocation: ${c.name} (${c.x}, ${c.y})`);
    console.log(`  Terrain      : ${terrain}`);
    console.log(`  Family       : ${fam}`);
    console.log(`  Target Lum   : ${famSpec.targetLuminance}`);
    console.log(`  Palette Base : ${famSpec.palette?.base}`);
    console.log(`  Palette Acc  : ${famSpec.palette?.accent}`);
    console.log(`  Macros       : ${famSpec.macros?.join(', ')}`);
  }
}

main();
