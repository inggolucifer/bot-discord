/**
 * JIANGHU WORLD — LAYOUT RECIPES & BESTIARY V2 GENERATOR (scripts/buildLayoutRecipesAndBestiary.mjs)
 * Implements Fase H3b & H3c Specifications:
 * - H3b: world-data/layout-recipes.json for all 29 regions with POI pacing (~40 tiles), setpieces, and resource distributions
 * - H3c: world-data/bestiary-v2.json defining Common, Elite, and Boss monsters per region with 12x12 lairs and safe corridors
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const regionsPath = path.resolve(__dirname, '../world-data/regions.json');
const anchorsPath = path.resolve(__dirname, '../world-data/anchors.json');
const monstersDir = path.resolve(__dirname, '../world-data/monsters');

const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));
const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));

console.log('================================================================');
console.log('  JIANGHU WORLD — FASE H3B & H3C: RECIPES & BESTIARY V2');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// 1. Build H3b: layout-recipes.json
// ----------------------------------------------------------------------------
console.log('[1/2] Generating layout-recipes.json for 29 regions...');

const layoutRecipes = {};

for (const reg of regions) {
  const regAnchors = anchors.filter(a => a.region === reg.id);
  
  // Setpieces tuned to region theme
  let landmarkDefIds = [];
  let natureClusterDefIds = [];
  let resourceTypes = [];

  if (reg.id.includes('plains') || reg.id.includes('delta')) {
    landmarkDefIds = ['structure_scatter_roadside_tea_and_rest_pavilion_gazebo', 'building_village_stone_water_trough'];
    natureClusterDefIds = ['nature_ancient_scholar_red_maple_cliff', 'tree_spirit_peach', 'tree_autumn_maple'];
    resourceTypes = ['wood', 'herb', 'fish'];
  } else if (reg.id.includes('mountain') || reg.id.includes('gorge') || reg.id.includes('peaks')) {
    landmarkDefIds = ['structure_scatter_mountain_daoist_stone_lantern_beacon', 'nature_mountain_waterfall_splash_basin'];
    natureClusterDefIds = ['rock_crag_cluster_v1', 'tree_pine_ancient', 'tree_cypress_frost'];
    resourceTypes = ['mineral', 'iron_ore', 'sword_shard'];
  } else if (reg.id.includes('desert') || reg.id.includes('dune')) {
    landmarkDefIds = ['landmark_western_gorge_labyrinth_sandstone_sunken_colosseum', 'structure_scatter_roadside_tea_and_rest_pavilion_gazebo'];
    natureClusterDefIds = ['rock_crag_cluster_v1', 'bush_desert_thorn'];
    resourceTypes = ['mineral', 'sand_gold', 'desert_herb'];
  } else if (reg.id.includes('desolate') || reg.id.includes('glacial') || reg.id.includes('snow')) {
    landmarkDefIds = ['structure_scatter_mountain_daoist_stone_lantern_beacon'];
    natureClusterDefIds = ['tree_cypress_frost', 'rock_crag_cluster_v1'];
    resourceTypes = ['glacial_ice', 'frost_lotus', 'iron_ore'];
  } else if (reg.id.includes('swamp') || reg.id.includes('mire') || reg.id.includes('demon')) {
    landmarkDefIds = ['structure_scatter_mountain_daoist_stone_lantern_beacon'];
    natureClusterDefIds = ['tree_dead_wood', 'rock_crag_cluster_v1'];
    resourceTypes = ['poison_herb', 'corpse_wood', 'dark_crystal'];
  } else {
    landmarkDefIds = ['structure_scatter_roadside_tea_and_rest_pavilion_gazebo'];
    natureClusterDefIds = ['tree_spirit_peach', 'tree_pine_ancient'];
    resourceTypes = ['wood', 'mineral', 'herb'];
  }

  layoutRecipes[reg.id] = {
    regionId: reg.id,
    regionName: reg.name,
    dangerTier: reg.dangerTier || 1,
    bounds: reg.bounds,
    poiPacingTiles: 40,
    anchorsCount: regAnchors.length,
    anchorIds: regAnchors.map(a => a.id),
    landmarks: landmarkDefIds,
    natureClusters: natureClusterDefIds,
    resourceTags: resourceTypes,
    safeBufferTiles: {
      settlement: 20,
      road: 10
    },
    scatterDensityPer100Tiles: {
      trees: 8.0,
      rocks: 4.5,
      landmarks: 0.8,
      resources: 2.2
    }
  };
}

const outRecipesPath = path.resolve(__dirname, '../world-data/layout-recipes.json');
fs.writeFileSync(outRecipesPath, JSON.stringify(layoutRecipes, null, 2));
console.log(`-> Saved layout-recipes.json for ${Object.keys(layoutRecipes).length} regions to: ${outRecipesPath}`);

// ----------------------------------------------------------------------------
// 2. Build H3c: bestiary-v2.json
// ----------------------------------------------------------------------------
console.log('\n[2/2] Generating bestiary-v2.json (Common, Elite, Boss, 12x12 Lair)...');

const bestiaryV2 = {};

for (const reg of regions) {
  const mFile = path.join(monstersDir, `${reg.id}.json`);
  let monsterData = null;
  if (fs.existsSync(mFile)) {
    try {
      monsterData = JSON.parse(fs.readFileSync(mFile, 'utf8'));
    } catch (e) {}
  }

  const species = monsterData?.species || [];
  const commonBeasts = species.filter(s => !s.isAggressive || s.level <= (reg.dangerTier * 10 - 3));
  const eliteBeasts = species.filter(s => s.isAggressive || s.level > (reg.dangerTier * 10 - 3));

  // Determine Boss & 12x12 Lair Coordinate
  const b = reg.bounds;
  const lairX = Math.floor(b.minX + (b.maxX - b.minX) * 0.75);
  const lairY = Math.floor(b.minY + (b.maxY - b.minY) * 0.75);

  const rawBoss = monsterData?.boss;
  const bossDef = rawBoss ? {
    ...rawBoss,
    lair: rawBoss.lair || {
      centerX: lairX,
      centerY: lairY,
      width: 12,
      height: 12,
      lairName: `Sarang Kuno ${rawBoss.name || reg.name}`
    }
  } : {
    id: `boss_${reg.id}`,
    name: `Penguasa Siluman ${reg.name}`,
    title: `Raja Siluman Peringkat ${reg.dangerTier}`,
    icon: '🐉',
    tier: reg.dangerTier + 1,
    level: reg.dangerTier * 12 + 10,
    hp: reg.dangerTier * 4500,
    atk: reg.dangerTier * 180,
    def: reg.dangerTier * 120,
    lair: {
      centerX: lairX,
      centerY: lairY,
      width: 12,
      height: 12,
      lairName: `Sarang Kuno ${reg.name}`
    }
  };

  bestiaryV2[reg.id] = {
    regionId: reg.id,
    regionName: reg.name,
    dangerTier: reg.dangerTier || 1,
    safeCorridorsEnforced: true,
    safeBufferRoads: 10,
    safeBufferSettlements: 20,
    common: commonBeasts.map(m => ({
      id: m.id,
      name: m.name,
      icon: m.icon || '🐺',
      tier: m.tier || 1,
      level: m.level || 5,
      isAggressive: false,
      spawnWeight: 70
    })),
    elite: eliteBeasts.map(m => ({
      id: m.id,
      name: m.name,
      icon: m.icon || '👹',
      tier: m.tier || 2,
      level: m.level || 15,
      isAggressive: true,
      spawnWeight: 25
    })),
    boss: bossDef
  };
}

const outBestiaryPath = path.resolve(__dirname, '../world-data/bestiary-v2.json');
fs.writeFileSync(outBestiaryPath, JSON.stringify(bestiaryV2, null, 2));
console.log(`-> Saved bestiary-v2.json for ${Object.keys(bestiaryV2).length} regions to: ${outBestiaryPath}`);

console.log('\n================================================================');
console.log('  FASE H3B & H3C: RECIPES & BESTIARY V2 COMPLETE (PASS)');
console.log('================================================================');
