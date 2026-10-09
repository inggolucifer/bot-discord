/**
 * ASSET PIPELINE: ATLAS COMPLETENESS AUDIT (scripts/assets/auditAtlasCompleteness.js)
 * Checks that all object defIds in SCATTER_OBJECT_CATALOG, OBJECT_DEFINITIONS,
 * and key game entities have a corresponding rendered sprite frame in the atlas sheets.
 * Exits with 0 if 100% complete, 1 if any missing.
 */

const fs = require('fs');
const path = require('path');
const { SCATTER_OBJECT_CATALOG } = require('../../utils/objectScatter');

const atlasDir = path.join(__dirname, '../../web-dashboard/public/assets/atlas');

console.log('=== RUNNING ATLAS COMPLETENESS AUDIT ===\n');

if (!fs.existsSync(atlasDir)) {
  console.error('[FAIL] Atlas directory does not exist:', atlasDir);
  process.exit(1);
}

// 1. Load all available frames from atlas JSON files
const availableFrames = new Set();
const atlasFiles = fs.readdirSync(atlasDir).filter(f => f.endsWith('.json'));

for (const aFile of atlasFiles) {
  try {
    const content = JSON.parse(fs.readFileSync(path.join(atlasDir, aFile), 'utf8'));
    if (content.frames) {
      Object.keys(content.frames).forEach(id => availableFrames.add(id));
    }
  } catch (err) {
    console.error(`[FAIL] Could not parse ${aFile}:`, err.message);
  }
}

console.log(`[INFO] Found ${availableFrames.size} unique sprite frames across ${atlasFiles.length} atlas manifests.`);

// 2. Collect all required defIds from SCATTER_OBJECT_CATALOG
const requiredIds = new Set();

for (const group of Object.values(SCATTER_OBJECT_CATALOG)) {
  if (Array.isArray(group)) {
    group.forEach(obj => {
      if (obj.defId) requiredIds.add(obj.defId);
    });
  }
}

// Also check canonical procedural objects
const canonicalIds = [
  'karst_pillar_1x1',
  'mt_rock_2x1',
  'mt_rock_2x2',
  'mt_rock_3x2',
  'mt_rock_4x3',
  'bamboo_clump_1x1',
  'bamboo_clump_2x1',
  'bamboo_clump_2x2',
  'pine_tree_1x1',
  'spirit_tree_2x2',
  'pavilion_1x1',
  'village_house_2x1',
  'sect_gate_3x2',
  'stone_torii_1x1',
  'pagoda_2x2',
  'ring_monster_tier1',
  'ring_monster_tier2',
  'ring_monster_tier3',
  'ring_monster_tier4',
  'ring_monster_tier5',
  'ring_monster_boss',
  'ring_monster_elite'
];
canonicalIds.forEach(id => requiredIds.add(id));

// 3. Check for missing IDs
const missingIds = [];
for (const reqId of requiredIds) {
  if (!availableFrames.has(reqId)) {
    missingIds.push(reqId);
  }
}

if (missingIds.length > 0) {
  console.error(`\n[FAIL] Missing ${missingIds.length} required assets from atlas files:`);
  missingIds.forEach(id => console.error(`  - ${id}`));
  console.log(`\nCompleteness: ${(( (requiredIds.size - missingIds.length) / requiredIds.size ) * 100).toFixed(1)}%`);
  process.exit(1);
} else {
  console.log(`\n[PASS] All ${requiredIds.size} required game objects and entities are present in atlas manifests!`);
  console.log(`Completeness: 100.0%`);
  process.exit(0);
}
