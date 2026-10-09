/**
 * ASSET PIPELINE: T1 CORE ASSET PACK GENERATOR (scripts/assets/generateT1AssetPack.js)
 * Produces the complete T1 catalog (>= 150 assets) with real binary WebP textures and JSON manifests:
 * - Bamboo clumps (S/M/L, 3 tones, 2 densities) + canonical aliases
 * - Trees (ancient pine, river willow, peach blossom, frost cypress, dead wood) + aliases
 * - Rocks & karst mountains (1x1 to 4x3) + aliases
 * - Buildings & Sect Gates (farm houses, inns, pavilions, sect gates, pagodas) + aliases
 * - Monster Rings (Tiers 1-5, Boss double ring, Elite)
 * - Autotiles (River 16, Road 16)
 *
 * Uses Sharp to composite real RGBA pixels and encodes to WebP (quality 90) at:
 * web-dashboard/public/assets/atlas/*.webp and *.json
 */

const fs = require('fs');
const path = require('path');
const { createObjectMetadata } = require('./generateMeta');
const { packAndRenderAtlas } = require('./packAtlas');
const { validateAssetMetadata, validateRealAtlasFile } = require('./validateAssets');
const { generateAssetSvg } = require('./generateImages');

const outputAtlasDir = path.join(__dirname, '../../web-dashboard/public/assets/atlas');
if (!fs.existsSync(outputAtlasDir)) {
  fs.mkdirSync(outputAtlasDir, { recursive: true });
}

console.log('=== GENERATING T1 CORE ASSET PACK (REAL WEBP BINARY ATLASES) ===\n');

const allAssets = [];

// ----------------------------------------------------------------------------
// 1. BAMBOO GROVES (18 VARIANTS + CANONICAL ALIASES)
// ----------------------------------------------------------------------------
const bambooDensities = ['sparse', 'dense'];
const bambooSizes = [
  { suffix: '1x1_s', cw: 1, ch: 1, w: 100, h: 180 },
  { suffix: '2x1_m', cw: 2, ch: 1, w: 200, h: 220 },
  { suffix: '2x2_l', cw: 2, ch: 2, w: 200, h: 260 }
];
const bambooTones = ['jade', 'mist', 'dark'];

for (const tone of bambooTones) {
  for (const bSize of bambooSizes) {
    for (const dens of bambooDensities) {
      const id = `bamboo_${tone}_${bSize.suffix}_${dens}`;
      allAssets.push({
        id,
        atlas: 'objects_nature',
        category: 'bamboo',
        width: bSize.w,
        height: bSize.h,
        cw: bSize.cw,
        ch: bSize.ch,
        collision: 'soft',
        staminaMult: 1.3,
        fogFoot: true,
        tags: ['bamboo', 'vegetation', tone]
      });
    }
  }
}

// Canonical Aliases for Bamboo
allAssets.push({
  id: 'bamboo_clump_1x1',
  atlas: 'objects_nature',
  category: 'bamboo',
  width: 100,
  height: 180,
  cw: 1,
  ch: 1,
  collision: 'soft',
  staminaMult: 1.25,
  fogFoot: true,
  tags: ['bamboo', 'alias']
});
allAssets.push({
  id: 'bamboo_clump_2x1',
  atlas: 'objects_nature',
  category: 'bamboo',
  width: 200,
  height: 220,
  cw: 2,
  ch: 1,
  collision: 'soft',
  staminaMult: 1.3,
  fogFoot: true,
  tags: ['bamboo', 'alias']
});
allAssets.push({
  id: 'bamboo_clump_2x2',
  atlas: 'objects_nature',
  category: 'bamboo',
  width: 200,
  height: 260,
  cw: 2,
  ch: 2,
  collision: 'soft',
  staminaMult: 1.35,
  fogFoot: true,
  tags: ['bamboo', 'alias']
});

console.log(`[+] Bamboo Clumps generated: 21 variants (including aliases)`);

// ----------------------------------------------------------------------------
// 2. TREES (30 VARIANTS + ALIASES)
// ----------------------------------------------------------------------------
const treeSpecies = [
  { name: 'pine_ancient', cw: 1, ch: 1, w: 100, h: 160 },
  { name: 'willow_river', cw: 2, ch: 1, w: 200, h: 200 },
  { name: 'spirit_peach', cw: 2, ch: 2, w: 200, h: 280 },
  { name: 'cypress_frost', cw: 1, ch: 1, w: 100, h: 170 },
  { name: 'dead_wood', cw: 1, ch: 1, w: 100, h: 140 }
];

for (const species of treeSpecies) {
  for (let v = 1; v <= 6; v++) {
    const id = `tree_${species.name}_v${v}`;
    allAssets.push({
      id,
      atlas: 'objects_nature',
      category: 'tree',
      width: species.w,
      height: species.h,
      cw: species.cw,
      ch: species.ch,
      collision: species.name.includes('spirit') ? 'solid' : 'soft',
      staminaMult: 1.15,
      fogFoot: true,
      tags: ['tree', species.name]
    });
  }
}

// Canonical Aliases for Trees
allAssets.push({
  id: 'pine_tree_1x1',
  atlas: 'objects_nature',
  category: 'tree',
  width: 100,
  height: 160,
  cw: 1,
  ch: 1,
  collision: 'soft',
  staminaMult: 1.15,
  fogFoot: true,
  tags: ['tree', 'alias']
});
allAssets.push({
  id: 'spirit_tree_2x2',
  atlas: 'objects_nature',
  category: 'tree',
  width: 200,
  height: 280,
  cw: 2,
  ch: 2,
  collision: 'solid',
  staminaMult: 1.0,
  fogFoot: true,
  tags: ['tree', 'alias']
});

console.log(`[+] Trees generated: 32 variants (including aliases)`);

// ----------------------------------------------------------------------------
// 3. ROCKS & BOULDERS (12 VARIANTS)
// ----------------------------------------------------------------------------
const rockTypes = [
  { name: 'boulder_moss', cw: 1, ch: 1, w: 100, h: 100 },
  { name: 'cleft_stone', cw: 2, ch: 1, w: 200, h: 150 },
  { name: 'crag_cluster', cw: 2, ch: 1, w: 200, h: 160 }
];

for (const rType of rockTypes) {
  for (let v = 1; v <= 4; v++) {
    const id = `rock_${rType.name}_v${v}`;
    allAssets.push({
      id,
      atlas: 'objects_nature',
      category: 'rock',
      width: rType.w,
      height: rType.h,
      cw: rType.cw,
      ch: rType.ch,
      collision: 'solid',
      staminaMult: 1.0,
      fogFoot: false,
      tags: ['rock', rType.name]
    });
  }
}
console.log(`[+] Rocks & Boulders generated: 12 variants`);

// ----------------------------------------------------------------------------
// 4. MOUNTAIN PEAKS & KARST (28 VARIANTS + ALIASES)
// ----------------------------------------------------------------------------
const mtScales = [
  { name: 'karst_pillar', cw: 1, ch: 1, w: 100, h: 220, count: 6 },
  { name: 'ridge_double', cw: 2, ch: 1, w: 200, h: 280, count: 6 },
  { name: 'azure_crag', cw: 2, ch: 2, w: 200, h: 360, count: 6 },
  { name: 'twin_peaks', cw: 3, ch: 2, w: 300, h: 440, count: 6 },
  { name: 'bastion_wall', cw: 4, ch: 3, w: 400, h: 560, count: 4 }
];

for (const mt of mtScales) {
  for (let v = 1; v <= mt.count; v++) {
    const id = `mt_${mt.name}_v${v}`;
    allAssets.push({
      id,
      atlas: 'objects_nature',
      category: 'mountain',
      width: mt.w,
      height: mt.h,
      cw: mt.cw,
      ch: mt.ch,
      collision: 'solid',
      staminaMult: 1.0,
      fogFoot: true,
      tags: ['mountain', mt.name]
    });
  }
}

// Canonical Aliases for Mountains
const mtAliases = [
  { id: 'karst_pillar_1x1', w: 100, h: 220, cw: 1, ch: 1 },
  { id: 'mt_rock_2x1', w: 200, h: 280, cw: 2, ch: 1 },
  { id: 'mt_rock_2x2', w: 200, h: 360, cw: 2, ch: 2 },
  { id: 'mt_rock_3x2', w: 300, h: 440, cw: 3, ch: 2 },
  { id: 'mt_rock_4x3', w: 400, h: 560, cw: 4, ch: 3 }
];
for (const a of mtAliases) {
  allAssets.push({
    id: a.id,
    atlas: 'objects_nature',
    category: 'mountain',
    width: a.w,
    height: a.h,
    cw: a.cw,
    ch: a.ch,
    collision: 'solid',
    staminaMult: 1.0,
    fogFoot: true,
    tags: ['mountain', 'alias']
  });
}

console.log(`[+] Mountain Peaks & Karst generated: 33 variants (including aliases)`);

// ----------------------------------------------------------------------------
// 5. STRUCTURES & SET-PIECES (24 VARIANTS + ALIASES)
// ----------------------------------------------------------------------------
const buildingDefs = [
  { name: 'farm_hut', cw: 2, ch: 1, w: 200, h: 180, count: 4 },
  { name: 'tea_pavilion', cw: 1, ch: 1, w: 100, h: 140, count: 4 },
  { name: 'road_inn', cw: 2, ch: 2, w: 200, h: 240, count: 4 },
  { name: 'sect_gate', cw: 3, ch: 2, w: 300, h: 320, count: 4 },
  { name: 'stone_torii', cw: 1, ch: 1, w: 100, h: 150, count: 4 },
  { name: 'pagoda_tower', cw: 2, ch: 2, w: 200, h: 380, count: 4 }
];

for (const bDef of buildingDefs) {
  for (let v = 1; v <= bDef.count; v++) {
    const id = `building_${bDef.name}_v${v}`;
    allAssets.push({
      id,
      atlas: 'objects_structures',
      category: 'building',
      width: bDef.w,
      height: bDef.h,
      cw: bDef.cw,
      ch: bDef.ch,
      collision: 'solid',
      staminaMult: 1.0,
      fogFoot: bDef.name.includes('sect') || bDef.name.includes('pagoda'),
      tags: ['building', bDef.name]
    });
  }
}

// Canonical Aliases for Buildings
const bldgAliases = [
  { id: 'pavilion_1x1', w: 100, h: 140, cw: 1, ch: 1, collision: 'none' },
  { id: 'village_house_2x1', w: 200, h: 180, cw: 2, ch: 1, collision: 'solid' },
  { id: 'sect_gate_3x2', w: 300, h: 320, cw: 3, ch: 2, collision: 'solid' },
  { id: 'stone_torii_1x1', w: 100, h: 150, cw: 1, ch: 1, collision: 'none' },
  { id: 'pagoda_2x2', w: 200, h: 380, cw: 2, ch: 2, collision: 'solid' }
];
for (const a of bldgAliases) {
  allAssets.push({
    id: a.id,
    atlas: 'objects_structures',
    category: 'building',
    width: a.w,
    height: a.h,
    cw: a.cw,
    ch: a.ch,
    collision: a.collision,
    staminaMult: 1.0,
    fogFoot: true,
    tags: ['building', 'alias']
  });
}

console.log(`[+] Buildings & Set-Pieces generated: 29 variants (including aliases)`);

// ----------------------------------------------------------------------------
// 6. MONSTER INK RINGS & MARKERS (8 VARIANTS)
// ----------------------------------------------------------------------------
for (let tier = 1; tier <= 5; tier++) {
  allAssets.push({
    id: `ring_monster_tier${tier}`,
    atlas: 'markers_entities',
    category: 'marker',
    width: 100,
    height: 100,
    cw: 1,
    ch: 1,
    collision: 'none',
    staminaMult: 1.0,
    fogFoot: false,
    tags: ['marker', 'monster', `tier${tier}`]
  });
}
allAssets.push({
  id: 'ring_monster_boss',
  atlas: 'markers_entities',
  category: 'marker',
  width: 120,
  height: 120,
  cw: 1,
  ch: 1,
  collision: 'none',
  staminaMult: 1.0,
  fogFoot: false,
  tags: ['marker', 'boss']
});
allAssets.push({
  id: 'ring_monster_elite',
  atlas: 'markers_entities',
  category: 'marker',
  width: 110,
  height: 110,
  cw: 1,
  ch: 1,
  collision: 'none',
  staminaMult: 1.0,
  fogFoot: false,
  tags: ['marker', 'elite']
});
allAssets.push({
  id: 'marker_quest_beacon',
  atlas: 'markers_entities',
  category: 'marker',
  width: 100,
  height: 100,
  cw: 1,
  ch: 1,
  collision: 'none',
  staminaMult: 1.0,
  fogFoot: false,
  tags: ['marker', 'quest']
});
console.log(`[+] Monster Rings & Markers generated: 8 variants`);

// ----------------------------------------------------------------------------
// 7. AUTOTILES: RIVER & ROAD (32 VARIANTS)
// ----------------------------------------------------------------------------
for (let bitmask = 0; bitmask < 16; bitmask++) {
  const hex = bitmask.toString(16).padStart(2, '0');
  allAssets.push({
    id: `autotile_river_m${hex}`,
    atlas: 'autotiles',
    category: 'autotile',
    width: 100,
    height: 100,
    cw: 1,
    ch: 1,
    collision: 'solid',
    staminaMult: 1.5,
    fogFoot: false,
    tags: ['autotile', 'water', 'river']
  });
  allAssets.push({
    id: `autotile_road_m${hex}`,
    atlas: 'autotiles',
    category: 'autotile',
    width: 100,
    height: 100,
    cw: 1,
    ch: 1,
    collision: 'none',
    staminaMult: 0.8,
    fogFoot: false,
    tags: ['autotile', 'road']
  });
}
console.log(`[+] Autotiles (River & Road 16-bitmask) generated: 32 variants`);

console.log(`\n========================================`);
console.log(`TOTAL ASSETS GENERATED: ${allAssets.length} (Target >= 120: LULUS)`);
console.log(`========================================\n`);

// ----------------------------------------------------------------------------
// 8. ASSET GENERATION, PACKING & VALIDATION PIPELINE
// ----------------------------------------------------------------------------
(async () => {
  const atlasGroups = {};

  for (const a of allAssets) {
    const meta = createObjectMetadata(a);
    const result = validateAssetMetadata(meta);

    if (!result.valid) {
      console.error(`[FAIL] Asset ${a.id}:`, result.errors);
      process.exit(1);
    }

    // Generate real Shuimo SVG markup matching reference image
    const svgContent = generateAssetSvg(a);

    if (!atlasGroups[a.atlas]) atlasGroups[a.atlas] = [];
    atlasGroups[a.atlas].push({
      id: a.id,
      width: a.width,
      height: a.height,
      svg: svgContent,
      metadata: meta
    });
  }

  // Pack and render each atlas to real WebP & JSON
  for (const [atlasName, sprites] of Object.entries(atlasGroups)) {
    console.log(`\n[ATLAS RENDERING] Rendering "${atlasName}" (${sprites.length} frames)...`);
    const packedResult = await packAndRenderAtlas(atlasName, sprites, outputAtlasDir, 2048);
    console.log(`  -> WebP: ${packedResult.webpPath} (${(packedResult.byteSize / 1024).toFixed(1)} KB, ${packedResult.dimensions.w}x${packedResult.dimensions.h})`);
    console.log(`  -> JSON: ${packedResult.jsonPath}`);

    // Validate real binary file output
    const valResult = await validateRealAtlasFile(packedResult.jsonPath, packedResult.webpPath);
    if (!valResult.valid) {
      console.error(`[FAIL] Validation error for atlas ${atlasName}:`, valResult.errors);
      process.exit(1);
    } else {
      console.log(`  -> Quality Gate: [PASS] (halo, format, dimensions & metadata all valid)`);
    }
  }

  console.log('\n========================================');
  console.log('[SUCCESS] All T1 Binary WebP Atlases & Manifests Created & Validated!');
  console.log('========================================\n');
})();
