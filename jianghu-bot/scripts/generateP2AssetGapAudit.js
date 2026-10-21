/**
 * scripts/generateP2AssetGapAudit.js
 * 
 * Jianghu World - Fase G: P2 Asset Gap Audit
 * 
 * Scans all 29 regions in world-data/regions.json and inspects asset-bindings.json
 * and atlas frame indices to detect:
 * 1. Missing regional sub-landmarks and architectural styles
 * 2. Secondary regional monsters (regions with only 1 monster or shared beasts)
 * 3. Specific biome flora/trees (desert, permafrost, volcanic, abyssal, oceanic)
 * 4. Specific mineral/crag formations
 * 5. Regional settlement cultural architectural variants
 * 
 * Generates: review/missing_p2_assets.csv
 * Format: region_id,category,missing_feature,recommended_atlas_page,fallback_used
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const REGIONS_FILE = path.join(ROOT_DIR, 'world-data', 'regions.json');
const BINDINGS_FILE = path.join(ROOT_DIR, 'config', 'asset-bindings.json');
const ATLAS_INDEX_FILE = path.join(ROOT_DIR, 'web-dashboard', 'public', 'assets', 'atlas', 'index.json');
const OUTPUT_CSV = path.join(ROOT_DIR, 'review', 'missing_p2_assets.csv');

function runAudit() {
  console.log('[P2 Audit] Loading world definitions...');
  const regions = JSON.parse(fs.readFileSync(REGIONS_FILE, 'utf8'));
  const bindings = JSON.parse(fs.readFileSync(BINDINGS_FILE, 'utf8'));
  const atlasIndex = JSON.parse(fs.readFileSync(ATLAS_INDEX_FILE, 'utf8'));
  const atlasFrames = new Set(Object.keys(atlasIndex.frames || {}));

  const rows = [];
  rows.push(['region_id', 'category', 'missing_feature', 'recommended_atlas_page', 'fallback_used']);

  // Track monster distribution across regions to detect sharing
  const monsterUsage = new Map();
  for (const [rId, mList] of Object.entries(bindings.regionalMonsters || {})) {
    for (const m of mList) {
      if (!monsterUsage.has(m)) monsterUsage.set(m, []);
      monsterUsage.get(m).push(rId);
    }
  }

  // Pre-index flora and rock biomes from bindings
  const boundTrees = bindings.natureScatters?.trees || [];
  const boundRocks = bindings.natureScatters?.rocks || [];

  for (const reg of regions) {
    const rId = reg.id;

    // 1. Audit Landmark
    const boundLm = bindings.landmarks?.[rId];
    if (!boundLm) {
      rows.push([rId, 'landmark', 'primary_regional_landmark', 'settlement_0', 'ancient_relic_pagoda_ruin']);
    } else if (!atlasFrames.has(boundLm.defId)) {
      rows.push([rId, 'landmark', `missing_atlas_frame_${boundLm.defId}`, 'settlement_0', 'ancient_relic_pagoda_ruin']);
    }

    // Secondary Landmark / Shrines for Danger Tier >= 2
    if (reg.dangerTier >= 2) {
      rows.push([rId, 'landmark', 'secondary_ancient_relic_or_tribulation_altar', 'settlement_1', 'structure_scatter_mountain_daoist_stone_lantern_beacon']);
    }

    // 2. Audit Regional Monsters
    const mList = bindings.regionalMonsters?.[rId] || [];
    if (mList.length === 0) {
      rows.push([rId, 'monster', 'primary_regional_boss_beast', 'monsters_0', 'monster_demon_wolf']);
    } else {
      if (mList.length < 2) {
        rows.push([rId, 'monster', 'secondary_sub_regional_beast', 'monsters_1', mList[0]]);
      }
      for (const m of mList) {
        const users = monsterUsage.get(m) || [];
        if (users.length > 1 && users[0] !== rId) {
          // Region is reusing monster from another region
          rows.push([rId, 'monster', `dedicated_species_instead_of_shared_${m}`, 'monsters_1', m]);
        }
      }
    }

    // 3. Audit Flora / Botanical Scatter
    const profile = reg.terrainProfile || {};
    const treesForRegion = boundTrees.filter(t => t.biomes && (t.biomes.includes(rId) || Object.keys(profile).some(k => t.biomes.includes(k))));
    
    if (profile.desert && profile.desert > 0.3) {
      const hasCactus = treesForRegion.some(t => t.defId.includes('cactus') || t.defId.includes('succulent'));
      if (!hasCactus) {
        rows.push([rId, 'nature_tree', 'desert_giant_saguaro_cactus', 'biome_nature_3', 'nature_ancient_scholar_twisted_locust_tree']);
      }
    }

    if (profile.snow || profile.tundra || (reg.tempRangeC && reg.tempRangeC.max <= 0)) {
      const hasIceTree = treesForRegion.some(t => t.defId.includes('frost') || t.defId.includes('ice') || t.defId.includes('snow'));
      if (!hasIceTree) {
        rows.push([rId, 'nature_tree', 'permafrost_ice_crystal_willow', 'biome_nature_4', 'tree_cypress_frost_v1']);
      }
    }

    if (rId === 'lava_spine' || profile.lava) {
      rows.push([rId, 'nature_tree', 'magma_cinder_petrified_ironwood', 'biome_nature_5', 'tree_dead_wood_v1']);
    }

    if (rId === 'abyssal_scar' || rId === 'void_rift') {
      rows.push([rId, 'nature_tree', 'void_corrupted_eldritch_tendril', 'biome_nature_7', 'tree_dead_wood_v2']);
    }

    if (rId === 'eastern_sea' || rId === 'frostmoon_sea' || profile.water > 0.4 || profile.ocean > 0.4) {
      rows.push([rId, 'nature_tree', 'deep_sea_spirit_kelp_forest', 'biome_nature_2', 'nature_scatter_coastal_glowing_coral_rock']);
    }

    // 4. Audit Minerals / Rocks
    const rocksForRegion = boundRocks.filter(r => r.biomes && (r.biomes.includes(rId) || Object.keys(profile).some(k => r.biomes.includes(k))));
    if (rId.includes('thunder') || reg.lawAffinities?.some(l => l.includes('lightning') || l.includes('thunder'))) {
      const hasThunderRock = rocksForRegion.some(r => r.defId.includes('thunder') || r.defId.includes('magnetite'));
      if (!hasThunderRock) {
        rows.push([rId, 'nature_rock', 'thunder_conductive_magnetite_spire', 'biome_nature_1', 'rock_crag_cluster_v1']);
      }
    }

    if (rId.includes('bone') || rId === 'bone_sea_coast') {
      rows.push([rId, 'nature_rock', 'ancient_behemoth_fossilized_vertebrae', 'biome_nature_2', 'nature_scatter_coastal_glowing_coral_rock']);
    }

    if (rId.includes('sword') || rId === 'sword_gorge') {
      rows.push([rId, 'nature_rock', 'blade_sheared_cleaved_precipice', 'biome_nature_1', 'mt_bastion_wall_v1']);
    }

    if (rId === 'formation_barrens') {
      rows.push([rId, 'nature_rock', 'ancient_daoist_hexagram_pillar_array', 'biome_nature_0', 'landmark_formation_barrens_broken_bagua_array']);
    }

    // 5. Audit Regional Settlement Architecture
    if (profile.desert > 0.3) {
      rows.push([rId, 'settlement', 'desert_silk_caravan_nomadic_pavilion', 'settlement_2', 'building_village_thatched_cottage']);
    } else if (reg.tempRangeC && reg.tempRangeC.max <= 0) {
      rows.push([rId, 'settlement', 'northern_mammoth_bone_yurt', 'settlement_2', 'building_village_thatched_cottage']);
    } else if (reg.lawAffinities?.some(l => l.includes('demonic') || l.includes('asura') || l.includes('blood'))) {
      rows.push([rId, 'settlement', 'demonic_sect_blood_stone_shrine', 'settlement_3', 'building_village_thatched_cottage']);
    } else if (reg.lawAffinities?.some(l => l.includes('celestial') || l.includes('pure_yang'))) {
      rows.push([rId, 'settlement', 'celestial_daoist_white_jade_dais', 'settlement_1', 'building_sect_library']);
    }
  }

  // Ensure review directory exists
  const reviewDir = path.dirname(OUTPUT_CSV);
  if (!fs.existsSync(reviewDir)) {
    fs.mkdirSync(reviewDir, { recursive: true });
  }

  // Format to CSV
  const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  fs.writeFileSync(OUTPUT_CSV, csvContent, 'utf8');

  console.log(`[P2 Audit] Audit completed! Scanned ${regions.length} regions.`);
  console.log(`[P2 Audit] Identified ${rows.length - 1} P2 asset gap entries across 5 categories.`);
  console.log(`[P2 Audit] Report saved to: ${OUTPUT_CSV}`);

  // Summary by category
  const catCount = {};
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i][1];
    catCount[c] = (catCount[c] || 0) + 1;
  }
  console.log('[P2 Audit] Breakdown by category:', catCount);
}

runAudit();
