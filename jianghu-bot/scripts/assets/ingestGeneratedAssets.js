/**
 * ingestGeneratedAssets.js
 * Memproses gambar hasil generasi Antigravity AI:
 * 1. Luminance keying (putih ke transparan)
 * 2. Auto-trim padding
 * 3. Scaling & format PNG transparan ke assets_picked/
 * 4. Integrasi ke WebP atlas di web-dashboard/public/assets/atlas/
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { processLuminanceKey } = require('./luminanceKey');
const { packAndRenderAtlas } = require('./packAtlas');

const brainDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\5f45876c-f5a0-489a-9c9a-51feae0b2915';
const pickedDir = path.join(__dirname, '../../assets_picked');
const atlasDir = path.join(__dirname, '../../web-dashboard/public/assets/atlas');

if (!fs.existsSync(pickedDir)) fs.mkdirSync(pickedDir, { recursive: true });
if (!fs.existsSync(atlasDir)) fs.mkdirSync(atlasDir, { recursive: true });

// Pemetaan file hasil generate
const GENERATED_ITEMS = [
  {
    id: 'xitong_city_landmark',
    pattern: 'xitong_city_landmark',
    targetAtlas: 'objects_structures',
    width: 512,
    height: 384,
    k: 1.45,
    lumaThreshold: 0.94,
    metadata: {
      id: 'xitong_city_landmark',
      atlas: 'objects_structures',
      frame: 'xitong_city_landmark',
      category: 'building',
      footprint: { cw: 5, ch: 4 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 2
    }
  },
  {
    id: 'bamboo_forest_cluster',
    pattern: 'bamboo_forest_cluster',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'bamboo_forest_cluster',
      atlas: 'objects_nature',
      frame: 'bamboo_forest_cluster',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 1
    }
  },
  {
    id: 'azure_peak_crag',
    pattern: 'azure_peak_crag',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.35,
    lumaThreshold: 0.95,
    metadata: {
      id: 'azure_peak_crag',
      atlas: 'objects_nature',
      frame: 'azure_peak_crag',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1
    }
  },
  {
    id: 'willow_river_curve',
    pattern: 'willow_river_curve',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'willow_river_curve',
      atlas: 'objects_nature',
      frame: 'willow_river_curve',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 1
    }
  },
  {
    id: 'monster_swirl_den',
    pattern: 'monster_swirl_den',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'monster_swirl_den',
      atlas: 'markers_entities',
      frame: 'monster_swirl_den',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0
    }
  },
  {
    id: 'icon_res_herb',
    pattern: 'icon_spiritual_herb',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.35,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_res_herb',
      atlas: 'icons',
      frame: 'icon_res_herb',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_mount_flying_sword',
    pattern: 'icon_flying_sword_mount',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.35,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_mount_flying_sword',
      atlas: 'icons',
      frame: 'icon_mount_flying_sword',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'sect_gate_3x2',
    pattern: 'sect_gate_3x2',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'sect_gate_3x2',
      atlas: 'objects_structures',
      frame: 'sect_gate_3x2',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.92 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'pagoda_2x2',
    pattern: 'pagoda_2x2',
    targetAtlas: 'objects_structures',
    width: 256,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'pagoda_2x2',
      atlas: 'objects_structures',
      frame: 'pagoda_2x2',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.95 },
      collision: 'solid',
      overhangCells: 2.0
    }
  },
  {
    id: 'pavilion_1x1',
    pattern: 'pavilion_1x1',
    targetAtlas: 'objects_structures',
    width: 192,
    height: 192,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'pavilion_1x1',
      atlas: 'objects_structures',
      frame: 'pavilion_1x1',
      category: 'building',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 0.5
    }
  },
  {
    id: 'village_house_2x1',
    pattern: 'village_house_2x1',
    targetAtlas: 'objects_structures',
    width: 256,
    height: 192,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'village_house_2x1',
      atlas: 'objects_structures',
      frame: 'village_house_2x1',
      category: 'building',
      footprint: { cw: 2, ch: 1 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 0.5
    }
  },
  {
    id: 'stone_torii_1x1',
    pattern: 'stone_torii_1x1',
    targetAtlas: 'objects_structures',
    width: 192,
    height: 192,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'stone_torii_1x1',
      atlas: 'objects_structures',
      frame: 'stone_torii_1x1',
      category: 'building',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 0.5
    }
  },
  {
    id: 'building_ferry_dock',
    pattern: 'building_ferry_dock',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_ferry_dock',
      atlas: 'objects_structures',
      frame: 'building_ferry_dock',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'pine_tree_1x1',
    pattern: 'pine_tree_1x1',
    targetAtlas: 'objects_nature',
    width: 192,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'pine_tree_1x1',
      atlas: 'objects_nature',
      frame: 'pine_tree_1x1',
      category: 'tree',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'soft',
      overhangCells: 1.0
    }
  },
  {
    id: 'spirit_tree_2x2',
    pattern: 'spirit_tree_2x2',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'spirit_tree_2x2',
      atlas: 'objects_nature',
      frame: 'spirit_tree_2x2',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'bamboo_clump_1x1',
    pattern: 'bamboo_clump_1x1',
    targetAtlas: 'objects_nature',
    width: 192,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'bamboo_clump_1x1',
      atlas: 'objects_nature',
      frame: 'bamboo_clump_1x1',
      category: 'bamboo',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'soft',
      overhangCells: 0.8
    }
  },
  {
    id: 'karst_pillar_1x1',
    pattern: 'karst_pillar_1x1',
    targetAtlas: 'objects_nature',
    width: 192,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'karst_pillar_1x1',
      atlas: 'objects_nature',
      frame: 'karst_pillar_1x1',
      category: 'mountain',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.95 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'resource_spirit_jade',
    pattern: 'resource_spirit_jade',
    targetAtlas: 'objects_nature',
    width: 192,
    height: 192,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_spirit_jade',
      atlas: 'objects_nature',
      frame: 'resource_spirit_jade',
      category: 'rock',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.2
    }
  },
  {
    id: 'resource_iron_ore',
    pattern: 'resource_iron_ore',
    targetAtlas: 'objects_nature',
    width: 192,
    height: 192,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_iron_ore',
      atlas: 'objects_nature',
      frame: 'resource_iron_ore',
      category: 'rock',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.2
    }
  },
  {
    id: 'dungeon_cave_entrance',
    pattern: 'dungeon_cave_entrance',
    targetAtlas: 'objects_structures',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'dungeon_cave_entrance',
      atlas: 'objects_structures',
      frame: 'dungeon_cave_entrance',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.5
    }
  },
  {
    id: 'ring_monster_boss',
    pattern: 'ring_monster_boss',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'ring_monster_boss',
      atlas: 'markers_entities',
      frame: 'ring_monster_boss',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_pill_cultivation',
    pattern: 'icon_pill_cultivation',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_pill_cultivation',
      atlas: 'icons',
      frame: 'icon_pill_cultivation',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_talisman_taoist',
    pattern: 'icon_talisman_taoist',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_talisman_taoist',
      atlas: 'icons',
      frame: 'icon_talisman_taoist',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_alchemy_cauldron',
    pattern: 'icon_alchemy_cauldron',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_alchemy_cauldron',
      atlas: 'icons',
      frame: 'icon_alchemy_cauldron',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_pickaxe_mining',
    pattern: 'icon_pickaxe_mining',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_pickaxe_mining',
      atlas: 'icons',
      frame: 'icon_pickaxe_mining',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_fishing_rod',
    pattern: 'icon_fishing_rod',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_fishing_rod',
      atlas: 'icons',
      frame: 'icon_fishing_rod',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_sect_badge',
    pattern: 'icon_sect_badge',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    colorDistThreshold: 26,
    allowInternalCavities: true,
    minCavitySize: 80,
    metadata: {
      id: 'icon_sect_badge',
      atlas: 'icons',
      frame: 'icon_sect_badge',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_storage_ring',
    pattern: 'icon_storage_ring',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_storage_ring',
      atlas: 'icons',
      frame: 'icon_storage_ring',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'mt_rock_2x1',
    pattern: 'mt_rock_2x1',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 192,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'mt_rock_2x1',
      atlas: 'objects_nature',
      frame: 'mt_rock_2x1',
      category: 'mountain',
      footprint: { cw: 2, ch: 1 },
      anchor: { x: 0.5, y: 0.95 },
      collision: 'solid',
      overhangCells: 1.8
    }
  },
  {
    id: 'mt_rock_2x2',
    pattern: 'mt_rock_2x2',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'mt_rock_2x2',
      atlas: 'objects_nature',
      frame: 'mt_rock_2x2',
      category: 'mountain',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.95 },
      collision: 'solid',
      overhangCells: 1.6
    }
  },
  {
    id: 'mt_rock_3x2',
    pattern: 'mt_rock_3x2',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'mt_rock_3x2',
      atlas: 'objects_nature',
      frame: 'mt_rock_3x2',
      category: 'mountain',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.95 },
      collision: 'solid',
      overhangCells: 2.4
    }
  },
  {
    id: 'mt_rock_4x3',
    pattern: 'mt_rock_4x3',
    targetAtlas: 'objects_nature',
    width: 512,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'mt_rock_4x3',
      atlas: 'objects_nature',
      frame: 'mt_rock_4x3',
      category: 'mountain',
      footprint: { cw: 4, ch: 3 },
      anchor: { x: 0.5, y: 0.95 },
      collision: 'solid',
      overhangCells: 2.6
    }
  },
  {
    id: 'resource_golden_carp',
    pattern: 'resource_golden_carp',
    targetAtlas: 'objects_nature',
    width: 192,
    height: 192,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_golden_carp',
      atlas: 'objects_nature',
      frame: 'resource_golden_carp',
      category: 'rock',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'none',
      overhangCells: 0.2
    }
  },
  {
    id: 'resource_spirit_wood',
    pattern: 'resource_spirit_wood',
    targetAtlas: 'objects_nature',
    width: 192,
    height: 192,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_spirit_wood',
      atlas: 'objects_nature',
      frame: 'resource_spirit_wood',
      category: 'rock',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.2
    }
  },
  {
    id: 'ring_monster_elite',
    pattern: 'ring_monster_elite',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'ring_monster_elite',
      atlas: 'markers_entities',
      frame: 'ring_monster_elite',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_map_compass',
    pattern: 'icon_map_compass',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_map_compass',
      atlas: 'icons',
      frame: 'icon_map_compass',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_map_search',
    pattern: 'icon_map_search',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_map_search',
      atlas: 'icons',
      frame: 'icon_map_search',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_map_build',
    pattern: 'icon_map_build',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_map_build',
      atlas: 'icons',
      frame: 'icon_map_build',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_weather_rain',
    pattern: 'icon_weather_rain',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_weather_rain',
      atlas: 'icons',
      frame: 'icon_weather_rain',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_weather_snow',
    pattern: 'icon_weather_snow',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_weather_snow',
      atlas: 'icons',
      frame: 'icon_weather_snow',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'building_inn_roadside',
    pattern: 'building_inn_roadside',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_inn_roadside',
      atlas: 'objects_structures',
      frame: 'building_inn_roadside',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'resource_snow_lotus',
    pattern: 'resource_snow_lotus',
    targetAtlas: 'objects_nature',
    width: 192,
    height: 192,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_snow_lotus',
      atlas: 'objects_nature',
      frame: 'resource_snow_lotus',
      category: 'rock',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.2
    }
  },
  {
    id: 'monster_demon_wolf',
    pattern: 'monster_demon_wolf',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'monster_demon_wolf',
      atlas: 'markers_entities',
      frame: 'monster_demon_wolf',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.5
    }
  },
  {
    id: 'icon_elixir_bottle',
    pattern: 'icon_elixir_bottle',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_elixir_bottle',
      atlas: 'icons',
      frame: 'icon_elixir_bottle',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'ring_monster_tier1',
    pattern: 'ring_monster_tier1',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'ring_monster_tier1',
      atlas: 'markers_entities',
      frame: 'ring_monster_tier1',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_gold_ingot',
    pattern: 'icon_gold_ingot',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_gold_ingot',
      atlas: 'icons',
      frame: 'icon_gold_ingot',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_spirit_stone',
    pattern: 'icon_spirit_stone',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_spirit_stone',
      atlas: 'icons',
      frame: 'icon_spirit_stone',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'building_forge_workshop',
    pattern: 'building_forge_workshop',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    colorDistThreshold: 55,
    featherMargin: 20,
    metadata: {
      id: 'building_forge_workshop',
      atlas: 'objects_structures',
      frame: 'building_forge_workshop',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'ring_monster_boss_crimson',
    pattern: 'ring_monster_boss_crimson',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'ring_monster_boss_crimson',
      atlas: 'markers_entities',
      frame: 'ring_monster_boss_crimson',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'resource_dragon_blood_grass',
    pattern: 'resource_dragon_blood_grass',
    targetAtlas: 'objects_nature',
    width: 192,
    height: 192,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_dragon_blood_grass',
      atlas: 'objects_nature',
      frame: 'resource_dragon_blood_grass',
      category: 'rock',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.2
    }
  },
  {
    id: 'icon_sword_celestial',
    pattern: 'icon_sword_celestial',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.96,
    metadata: {
      id: 'icon_sword_celestial',
      atlas: 'icons',
      frame: 'icon_sword_celestial',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'building_tea_house',
    pattern: 'building_tea_house',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_tea_house',
      atlas: 'objects_structures',
      frame: 'building_tea_house',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_alchemist_hall',
    pattern: 'building_alchemist_hall',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_alchemist_hall',
      atlas: 'objects_structures',
      frame: 'building_alchemist_hall',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'resource_ironwood_log',
    pattern: 'resource_ironwood_log',
    targetAtlas: 'objects_nature',
    width: 192,
    height: 192,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_ironwood_log',
      atlas: 'objects_nature',
      frame: 'resource_ironwood_log',
      category: 'rock',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.2
    }
  },
  {
    id: 'building_granary_silo',
    pattern: 'building_granary_silo',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_granary_silo',
      atlas: 'objects_structures',
      frame: 'building_granary_silo',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'monster_blood_serpent',
    pattern: 'monster_blood_serpent',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'monster_blood_serpent',
      atlas: 'markers_entities',
      frame: 'monster_blood_serpent',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.5
    }
  },
  {
    id: 'icon_pill_breakthrough',
    pattern: 'icon_pill_breakthrough',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_pill_breakthrough',
      atlas: 'icons',
      frame: 'icon_pill_breakthrough',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_shield_spirit',
    pattern: 'icon_shield_spirit',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_shield_spirit',
      atlas: 'icons',
      frame: 'icon_shield_spirit',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'building_residential_manor',
    pattern: 'building_residential_manor',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_residential_manor',
      atlas: 'objects_structures',
      frame: 'building_residential_manor',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'monster_iron_bear',
    pattern: 'monster_iron_bear',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'monster_iron_bear',
      atlas: 'markers_entities',
      frame: 'monster_iron_bear',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.5
    }
  },
  {
    id: 'resource_spirit_spring',
    pattern: 'resource_spirit_spring',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_spirit_spring',
      atlas: 'objects_nature',
      frame: 'resource_spirit_spring',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.5
    }
  },
  {
    id: 'icon_formation_compass',
    pattern: 'icon_formation_compass',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_formation_compass',
      atlas: 'icons',
      frame: 'icon_formation_compass',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_herb_thousand_ginseng',
    pattern: 'icon_herb_thousand_ginseng',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_herb_thousand_ginseng',
      atlas: 'icons',
      frame: 'icon_herb_thousand_ginseng',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'mount_shadow_tiger',
    pattern: 'mount_shadow_tiger',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'mount_shadow_tiger',
      atlas: 'markers_entities',
      frame: 'mount_shadow_tiger',
      category: 'mount',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.5
    }
  },
  {
    id: 'monster_storm_roc',
    pattern: 'monster_storm_roc',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'monster_storm_roc',
      atlas: 'markers_entities',
      frame: 'monster_storm_roc',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.5
    }
  },
  {
    id: 'building_auction_house',
    pattern: 'building_auction_house',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_auction_house',
      atlas: 'objects_structures',
      frame: 'building_auction_house',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'mount_feather_crane',
    pattern: 'mount_feather_crane',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'mount_feather_crane',
      atlas: 'markers_entities',
      frame: 'mount_feather_crane',
      category: 'mount',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.5
    }
  },
  {
    id: 'icon_weapon_spear_dragon',
    pattern: 'icon_weapon_spear_dragon',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_weapon_spear_dragon',
      atlas: 'icons',
      frame: 'icon_weapon_spear_dragon',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'monster_abyssal_serpent',
    pattern: 'monster_abyssal_serpent',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'monster_abyssal_serpent',
      atlas: 'markers_entities',
      frame: 'monster_abyssal_serpent',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.5
    }
  },
  {
    id: 'building_sect_library',
    pattern: 'building_sect_library',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_sect_library',
      atlas: 'objects_structures',
      frame: 'building_sect_library',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'resource_heavenly_iron_ore',
    pattern: 'resource_heavenly_iron_ore',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_heavenly_iron_ore',
      atlas: 'objects_nature',
      frame: 'resource_heavenly_iron_ore',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.5
    }
  },
  {
    id: 'monster_flame_ape',
    pattern: 'monster_flame_ape',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'monster_flame_ape',
      atlas: 'markers_entities',
      frame: 'monster_flame_ape',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.5
    }
  },
  {
    id: 'icon_dan_cauldron_nine_dragons',
    pattern: 'icon_dan_cauldron_nine_dragons',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_dan_cauldron_nine_dragons',
      atlas: 'icons',
      frame: 'icon_dan_cauldron_nine_dragons',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_weapon_saber_dragon',
    pattern: 'icon_weapon_saber_dragon',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_weapon_saber_dragon',
      atlas: 'icons',
      frame: 'icon_weapon_saber_dragon',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'building_spirit_pagoda',
    pattern: 'building_spirit_pagoda',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_spirit_pagoda',
      atlas: 'objects_structures',
      frame: 'building_spirit_pagoda',
      category: 'building',
      footprint: { cw: 3, ch: 3 },
      anchor: { x: 0.5, y: 0.92 },
      collision: 'solid',
      overhangCells: 2.0
    }
  },
  {
    id: 'resource_spirit_koi_pool',
    pattern: 'resource_spirit_koi_pool',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_spirit_koi_pool',
      atlas: 'objects_nature',
      frame: 'resource_spirit_koi_pool',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.5
    }
  },
  {
    id: 'icon_armor_celestial_robe',
    pattern: 'icon_armor_celestial_robe',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_armor_celestial_robe',
      atlas: 'icons',
      frame: 'icon_armor_celestial_robe',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_spirit_wine_gourd',
    pattern: 'icon_spirit_wine_gourd',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_spirit_wine_gourd',
      atlas: 'icons',
      frame: 'icon_spirit_wine_gourd',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'resource_ancient_herb_garden',
    pattern: 'resource_ancient_herb_garden',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_ancient_herb_garden',
      atlas: 'objects_nature',
      frame: 'resource_ancient_herb_garden',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.5
    }
  },
  {
    id: 'monster_rock_golem',
    pattern: 'monster_rock_golem',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'monster_rock_golem',
      atlas: 'markers_entities',
      frame: 'monster_rock_golem',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.5
    }
  },
  {
    id: 'building_blacksmith_foundry',
    pattern: 'building_blacksmith_foundry',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_blacksmith_foundry',
      atlas: 'objects_structures',
      frame: 'building_blacksmith_foundry',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'icon_weapon_sword_jade',
    pattern: 'icon_weapon_sword_jade',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_weapon_sword_jade',
      atlas: 'icons',
      frame: 'icon_weapon_sword_jade',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_formation_talisman_gold',
    pattern: 'icon_formation_talisman_gold',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_formation_talisman_gold',
      atlas: 'icons',
      frame: 'icon_formation_talisman_gold',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'building_apothecary_store',
    pattern: 'building_apothecary_store',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_apothecary_store',
      atlas: 'objects_structures',
      frame: 'building_apothecary_store',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'resource_ancient_sword_tomb',
    pattern: 'resource_ancient_sword_tomb',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_ancient_sword_tomb',
      atlas: 'objects_nature',
      frame: 'resource_ancient_sword_tomb',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.5
    }
  },
  {
    id: 'monster_white_tiger',
    pattern: 'monster_white_tiger',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'monster_white_tiger',
      atlas: 'markers_entities',
      frame: 'monster_white_tiger',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.5
    }
  },
  {
    id: 'icon_elixir_longevity_peach',
    pattern: 'icon_elixir_longevity_peach',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_elixir_longevity_peach',
      atlas: 'icons',
      frame: 'icon_elixir_longevity_peach',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_weapon_hidden_needles',
    pattern: 'icon_weapon_hidden_needles',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_weapon_hidden_needles',
      atlas: 'icons',
      frame: 'icon_weapon_hidden_needles',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'monster_sand_scorpion',
    pattern: 'monster_sand_scorpion',
    targetAtlas: 'markers_entities',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'monster_sand_scorpion',
      atlas: 'markers_entities',
      frame: 'monster_sand_scorpion',
      category: 'marker',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.5
    }
  },
  {
    id: 'resource_ancient_lightning_bamboo',
    pattern: 'resource_ancient_lightning_bamboo',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'resource_ancient_lightning_bamboo',
      atlas: 'objects_nature',
      frame: 'resource_ancient_lightning_bamboo',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'building_dock_warehouse',
    pattern: 'building_dock_warehouse',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_dock_warehouse',
      atlas: 'objects_structures',
      frame: 'building_dock_warehouse',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'nature_bamboo_sparse_single',
    pattern: 'nature_bamboo_sparse_single',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'nature_bamboo_sparse_single',
      atlas: 'objects_nature',
      frame: 'nature_bamboo_sparse_single',
      category: 'tree',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'soft',
      overhangCells: 0.8
    }
  },
  {
    id: 'nature_pine_ancient_twisted',
    pattern: 'nature_pine_ancient_twisted',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'nature_pine_ancient_twisted',
      atlas: 'objects_nature',
      frame: 'nature_pine_ancient_twisted',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 1.0
    }
  },
  {
    id: 'nature_karst_twin_peaks',
    pattern: 'nature_karst_twin_peaks',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'nature_karst_twin_peaks',
      atlas: 'objects_nature',
      frame: 'nature_karst_twin_peaks',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.92 },
      collision: 'solid',
      overhangCells: 1.8
    }
  },
  {
    id: 'building_village_thatched_cottage',
    pattern: 'building_village_thatched_cottage',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_village_thatched_cottage',
      atlas: 'objects_structures',
      frame: 'building_village_thatched_cottage',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'icon_badge_mastery_alchemy',
    pattern: 'icon_badge_mastery_alchemy',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_badge_mastery_alchemy',
      atlas: 'icons',
      frame: 'icon_badge_mastery_alchemy',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'nature_plum_blossom_lone',
    pattern: 'nature_plum_blossom_lone',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'nature_plum_blossom_lone',
      atlas: 'objects_nature',
      frame: 'nature_plum_blossom_lone',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 1.0
    }
  },
  {
    id: 'nature_boulder_cluster_river',
    pattern: 'nature_boulder_cluster_river',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'nature_boulder_cluster_river',
      atlas: 'objects_nature',
      frame: 'nature_boulder_cluster_river',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.5
    }
  },
  {
    id: 'building_roadside_tea_stall',
    pattern: 'building_roadside_tea_stall',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 288,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'building_roadside_tea_stall',
      atlas: 'objects_structures',
      frame: 'building_roadside_tea_stall',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'icon_badge_mastery_smithing',
    pattern: 'icon_badge_mastery_smithing',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_badge_mastery_smithing',
      atlas: 'icons',
      frame: 'icon_badge_mastery_smithing',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_badge_mastery_herbology',
    pattern: 'icon_badge_mastery_herbology',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_badge_mastery_herbology',
      atlas: 'icons',
      frame: 'icon_badge_mastery_herbology',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_badge_mastery_mining',
    pattern: 'icon_badge_mastery_mining',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_badge_mastery_mining',
      atlas: 'icons',
      frame: 'icon_badge_mastery_mining',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_badge_mastery_fishing',
    pattern: 'icon_badge_mastery_fishing',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_badge_mastery_fishing',
      atlas: 'icons',
      frame: 'icon_badge_mastery_fishing',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_badge_mastery_cooking',
    pattern: 'icon_badge_mastery_cooking',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_badge_mastery_cooking',
      atlas: 'icons',
      frame: 'icon_badge_mastery_cooking',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'icon_badge_mastery_talismans',
    pattern: 'icon_badge_mastery_talismans',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'icon_badge_mastery_talismans',
      atlas: 'icons',
      frame: 'icon_badge_mastery_talismans',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'nature_cypress_grove_mist',
    pattern: 'nature_cypress_grove_mist',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    metadata: {
      id: 'nature_cypress_grove_mist',
      atlas: 'objects_nature',
      frame: 'nature_cypress_grove_mist',
      category: 'tree',
      footprint: { cw: 3, ch: 3 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_willow_lone_stream',
    pattern: 'nature_willow_lone_stream',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_willow_lone_stream',
      atlas: 'objects_nature',
      frame: 'nature_willow_lone_stream',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 1.0
    }
  },
  {
    id: 'building_watermill_stream',
    pattern: 'building_watermill_stream',
    targetAtlas: 'objects_structures',
    width: 320,
    height: 280,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_watermill_stream',
      atlas: 'objects_structures',
      frame: 'building_watermill_stream',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'nature_rock_stepping_stones',
    pattern: 'nature_rock_stepping_stones',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_rock_stepping_stones',
      atlas: 'objects_nature',
      frame: 'nature_rock_stepping_stones',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.4
    }
  },
  {
    id: 'building_ancestral_shrine_gate',
    pattern: 'building_ancestral_shrine_gate',
    targetAtlas: 'objects_structures',
    width: 320,
    height: 280,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_ancestral_shrine_gate',
      atlas: 'objects_structures',
      frame: 'building_ancestral_shrine_gate',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.92 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'icon_commodity_spirit_grain',
    pattern: 'icon_commodity_spirit_grain',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_grain',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_grain',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'nature_pine_windswept_cliff',
    pattern: 'nature_pine_windswept_cliff',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_pine_windswept_cliff',
      atlas: 'objects_nature',
      frame: 'nature_pine_windswept_cliff',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_wooden_watchtower',
    pattern: 'building_wooden_watchtower',
    targetAtlas: 'objects_structures',
    width: 256,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wooden_watchtower',
      atlas: 'objects_structures',
      frame: 'building_wooden_watchtower',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.95 },
      collision: 'solid',
      overhangCells: 1.8
    }
  },
  {
    id: 'nature_reed_bed_marsh',
    pattern: 'nature_reed_bed_marsh',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_reed_bed_marsh',
      atlas: 'objects_nature',
      frame: 'nature_reed_bed_marsh',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 0.8
    }
  },
  {
    id: 'building_ferry_dock_shed',
    pattern: 'building_ferry_dock_shed',
    targetAtlas: 'objects_structures',
    width: 320,
    height: 280,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_ferry_dock_shed',
      atlas: 'objects_structures',
      frame: 'building_ferry_dock_shed',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'icon_commodity_spirit_ore_ingot',
    pattern: 'icon_commodity_spirit_ore_ingot',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_ore_ingot',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_ore_ingot',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'building_village_well',
    pattern: 'building_village_well',
    targetAtlas: 'objects_structures',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_village_well',
      atlas: 'objects_structures',
      frame: 'building_village_well',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.0
    }
  },
  {
    id: 'nature_lotus_pond_cluster',
    pattern: 'nature_lotus_pond_cluster',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_lotus_pond_cluster',
      atlas: 'objects_nature',
      frame: 'nature_lotus_pond_cluster',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.4
    }
  },
  {
    id: 'building_rustic_wooden_bridge',
    pattern: 'building_rustic_wooden_bridge',
    targetAtlas: 'objects_structures',
    width: 320,
    height: 280,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_rustic_wooden_bridge',
      atlas: 'objects_structures',
      frame: 'building_rustic_wooden_bridge',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'none',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_autumn_maple_grove',
    pattern: 'nature_autumn_maple_grove',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_autumn_maple_grove',
      atlas: 'objects_nature',
      frame: 'nature_autumn_maple_grove',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 1.0
    }
  },
  {
    id: 'icon_commodity_spirit_herbal_bundle',
    pattern: 'icon_commodity_spirit_herbal_bundle',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_herbal_bundle',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_herbal_bundle',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'building_wayside_stone_stele',
    pattern: 'building_wayside_stone_stele',
    targetAtlas: 'objects_structures',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_wayside_stone_stele',
      atlas: 'objects_structures',
      frame: 'building_wayside_stone_stele',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'building_rustic_drying_racks',
    pattern: 'building_rustic_drying_racks',
    targetAtlas: 'objects_structures',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_rustic_drying_racks',
      atlas: 'objects_structures',
      frame: 'building_rustic_drying_racks',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.0
    }
  },
  {
    id: 'nature_wisteria_ancient_arbor',
    pattern: 'nature_wisteria_ancient_arbor',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_wisteria_ancient_arbor',
      atlas: 'objects_nature',
      frame: 'nature_wisteria_ancient_arbor',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mossy_stream_cascade',
    pattern: 'nature_mossy_stream_cascade',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_mossy_stream_cascade',
      atlas: 'objects_nature',
      frame: 'nature_mossy_stream_cascade',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_silk_bolt',
    pattern: 'icon_commodity_spirit_silk_bolt',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_silk_bolt',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_silk_bolt',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'building_stone_lantern_shrine',
    pattern: 'building_stone_lantern_shrine',
    targetAtlas: 'objects_structures',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_stone_lantern_shrine',
      atlas: 'objects_structures',
      frame: 'building_stone_lantern_shrine',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_wine_jar',
    pattern: 'icon_commodity_spirit_wine_jar',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_wine_jar',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_wine_jar',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0
    }
  },
  {
    id: 'nature_ginkgo_ancient_gold',
    pattern: 'nature_ginkgo_ancient_gold',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_ginkgo_ancient_gold',
      atlas: 'objects_nature',
      frame: 'nature_ginkgo_ancient_gold',
      category: 'tree',
      footprint: { cw: 3, ch: 3 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'soft',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_spirit_gathering_gazebo',
    pattern: 'building_spirit_gathering_gazebo',
    targetAtlas: 'objects_structures',
    width: 320,
    height: 280,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_spirit_gathering_gazebo',
      atlas: 'objects_structures',
      frame: 'building_spirit_gathering_gazebo',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.92 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'nature_crystal_cluster_cave_rock',
    pattern: 'nature_crystal_cluster_cave_rock',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_crystal_cluster_cave_rock',
      atlas: 'objects_nature',
      frame: 'nature_crystal_cluster_cave_rock',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'nature_limestone_stalagmite_spire',
    pattern: 'nature_limestone_stalagmite_spire',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_limestone_stalagmite_spire',
      atlas: 'objects_nature',
      frame: 'nature_limestone_stalagmite_spire',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.95 },
      collision: 'solid',
      overhangCells: 1.8
    }
  },
  {
    id: 'building_mountain_hermitage_shack',
    pattern: 'building_mountain_hermitage_shack',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 320,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_mountain_hermitage_shack',
      atlas: 'objects_structures',
      frame: 'building_mountain_hermitage_shack',
      category: 'building',
      footprint: { cw: 3, ch: 3 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'building_wayside_spirit_altar',
    pattern: 'building_wayside_spirit_altar',
    targetAtlas: 'objects_structures',
    width: 280,
    height: 280,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_wayside_spirit_altar',
      atlas: 'objects_structures',
      frame: 'building_wayside_spirit_altar',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.0
    }
  },
  {
    id: 'icon_commodity_spirit_beast_pelt',
    pattern: 'icon_commodity_spirit_beast_pelt',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_beast_pelt',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_beast_pelt',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_cherry_blossom_twin',
    pattern: 'nature_cherry_blossom_twin',
    targetAtlas: 'objects_nature',
    width: 320,
    height: 320,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_cherry_blossom_twin',
      atlas: 'objects_nature',
      frame: 'nature_cherry_blossom_twin',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'soft',
      overhangCells: 1.4
    }
  },
  {
    id: 'nature_river_pebble_shoal',
    pattern: 'nature_river_pebble_shoal',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_river_pebble_shoal',
      atlas: 'objects_nature',
      frame: 'nature_river_pebble_shoal',
      category: 'nature',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'none',
      overhangCells: 0.4
    }
  },
  {
    id: 'icon_commodity_spirit_fish_carp',
    pattern: 'icon_commodity_spirit_fish_carp',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_fish_carp',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_fish_carp',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_bamboo_sunlit_grove',
    pattern: 'nature_bamboo_sunlit_grove',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_bamboo_sunlit_grove',
      atlas: 'objects_nature',
      frame: 'nature_bamboo_sunlit_grove',
      category: 'tree',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'soft',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_stone_water_basin',
    pattern: 'building_stone_water_basin',
    targetAtlas: 'objects_structures',
    width: 280,
    height: 280,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_stone_water_basin',
      atlas: 'objects_structures',
      frame: 'building_stone_water_basin',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'building_blacksmith_weapon_rack',
    pattern: 'building_blacksmith_weapon_rack',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_blacksmith_weapon_rack',
      atlas: 'objects_structures',
      frame: 'building_blacksmith_weapon_rack',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.0
    }
  },
  {
    id: 'building_wayside_mile_marker_stele',
    pattern: 'building_wayside_mile_marker_stele',
    targetAtlas: 'objects_structures',
    width: 280,
    height: 340,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_wayside_mile_marker_stele',
      atlas: 'objects_structures',
      frame: 'building_wayside_mile_marker_stele',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'nature_granite_boulder_basking',
    pattern: 'nature_granite_boulder_basking',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 320,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_granite_boulder_basking',
      atlas: 'objects_nature',
      frame: 'nature_granite_boulder_basking',
      category: 'rock',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.0
    }
  },
  {
    id: 'nature_ancient_scholar_tree_pagoda',
    pattern: 'nature_ancient_scholar_tree_pagoda',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_ancient_scholar_tree_pagoda',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_tree_pagoda',
      category: 'tree',
      footprint: { cw: 3, ch: 3 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'soft',
      overhangCells: 1.4
    }
  },
  {
    id: 'building_rustic_cart_straw_shed',
    pattern: 'building_rustic_cart_straw_shed',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 340,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_rustic_cart_straw_shed',
      atlas: 'objects_structures',
      frame: 'building_rustic_cart_straw_shed',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'icon_commodity_spirit_cotton_yarn',
    pattern: 'icon_commodity_spirit_cotton_yarn',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_cotton_yarn',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_cotton_yarn',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_mossy_river_driftwood',
    pattern: 'nature_mossy_river_driftwood',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mossy_river_driftwood',
      atlas: 'objects_nature',
      frame: 'nature_mossy_river_driftwood',
      category: 'rock',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.5
    }
  },
  {
    id: 'building_wine_tavern_flagpole_sign',
    pattern: 'building_wine_tavern_flagpole_sign',
    targetAtlas: 'objects_structures',
    width: 320,
    height: 450,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wine_tavern_flagpole_sign',
      atlas: 'objects_structures',
      frame: 'building_wine_tavern_flagpole_sign',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.92 },
      collision: 'solid',
      overhangCells: 1.6
    }
  },
  {
    id: 'nature_wild_mountain_camellia_shrub',
    pattern: 'nature_wild_mountain_camellia_shrub',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_wild_mountain_camellia_shrub',
      atlas: 'objects_nature',
      frame: 'nature_wild_mountain_camellia_shrub',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'soft',
      overhangCells: 1.0
    }
  },
  {
    id: 'building_stone_mill_grain_grinder',
    pattern: 'building_stone_mill_grain_grinder',
    targetAtlas: 'objects_structures',
    width: 340,
    height: 340,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_stone_mill_grain_grinder',
      atlas: 'objects_structures',
      frame: 'building_stone_mill_grain_grinder',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_clay_lump',
    pattern: 'icon_commodity_spirit_clay_lump',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_clay_lump',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_clay_lump',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_wayside_tea_resting_shed',
    pattern: 'building_wayside_tea_resting_shed',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_tea_resting_shed',
      atlas: 'objects_structures',
      frame: 'building_wayside_tea_resting_shed',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'icon_commodity_spirit_charcoal_briquette',
    pattern: 'icon_commodity_spirit_charcoal_briquette',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_charcoal_briquette',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_charcoal_briquette',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_bamboo_hanging_creeper',
    pattern: 'nature_bamboo_hanging_creeper',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_bamboo_hanging_creeper',
      atlas: 'objects_nature',
      frame: 'nature_bamboo_hanging_creeper',
      category: 'tree',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'soft',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_crag_layered_shale_shelf',
    pattern: 'nature_crag_layered_shale_shelf',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 340,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_crag_layered_shale_shelf',
      atlas: 'objects_nature',
      frame: 'nature_crag_layered_shale_shelf',
      category: 'rock',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.0
    }
  },
  {
    id: 'building_blacksmith_bellows_furnace',
    pattern: 'building_blacksmith_bellows_furnace',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 340,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_blacksmith_bellows_furnace',
      atlas: 'objects_structures',
      frame: 'building_blacksmith_bellows_furnace',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mossy_wild_stepping_boulders',
    pattern: 'nature_mossy_wild_stepping_boulders',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 320,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mossy_wild_stepping_boulders',
      atlas: 'objects_nature',
      frame: 'nature_mossy_wild_stepping_boulders',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'soft',
      overhangCells: 0.4
    }
  },
  {
    id: 'nature_limestone_karst_cave_opening',
    pattern: 'nature_limestone_karst_cave_opening',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_limestone_karst_cave_opening',
      atlas: 'objects_nature',
      frame: 'nature_limestone_karst_cave_opening',
      category: 'rock',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'building_rustic_apiary_beehives',
    pattern: 'building_rustic_apiary_beehives',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_rustic_apiary_beehives',
      atlas: 'objects_structures',
      frame: 'building_rustic_apiary_beehives',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.3
    }
  },
  {
    id: 'building_countryside_thatched_gazebo',
    pattern: 'building_countryside_thatched_gazebo',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_countryside_thatched_gazebo',
      atlas: 'objects_structures',
      frame: 'building_countryside_thatched_gazebo',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'icon_commodity_spirit_wild_honey_jar',
    pattern: 'icon_commodity_spirit_wild_honey_jar',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_wild_honey_jar',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_wild_honey_jar',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_pine_wind_twisted_bonsai',
    pattern: 'nature_pine_wind_twisted_bonsai',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_pine_wind_twisted_bonsai',
      atlas: 'objects_nature',
      frame: 'nature_pine_wind_twisted_bonsai',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'nature_crystal_quartz_vein_crag',
    pattern: 'nature_crystal_quartz_vein_crag',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_crystal_quartz_vein_crag',
      atlas: 'objects_nature',
      frame: 'nature_crystal_quartz_vein_crag',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'building_wayside_wooden_notice_board',
    pattern: 'building_wayside_wooden_notice_board',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_wooden_notice_board',
      atlas: 'objects_structures',
      frame: 'building_wayside_wooden_notice_board',
      category: 'building',
      footprint: { cw: 2, ch: 1 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'building_village_thatched_granary_round',
    pattern: 'building_village_thatched_granary_round',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 420,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_village_thatched_granary_round',
      atlas: 'objects_structures',
      frame: 'building_village_thatched_granary_round',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.6
    }
  },
  {
    id: 'icon_commodity_spirit_bamboo_shoots_basket',
    pattern: 'icon_commodity_spirit_bamboo_shoots_basket',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_bamboo_shoots_basket',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_bamboo_shoots_basket',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_riverside_watermill_paddle_wheel',
    pattern: 'building_riverside_watermill_paddle_wheel',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_riverside_watermill_paddle_wheel',
      atlas: 'objects_structures',
      frame: 'building_riverside_watermill_paddle_wheel',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'nature_ancient_hollow_mulberry_tree',
    pattern: 'nature_ancient_hollow_mulberry_tree',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_ancient_hollow_mulberry_tree',
      atlas: 'objects_nature',
      frame: 'nature_ancient_hollow_mulberry_tree',
      category: 'tree',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'nature_wild_mountain_peony_cluster',
    pattern: 'nature_wild_mountain_peony_cluster',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_wild_mountain_peony_cluster',
      atlas: 'objects_nature',
      frame: 'nature_wild_mountain_peony_cluster',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 0.8
    }
  },
  {
    id: 'building_village_chicken_coop_bamboo',
    pattern: 'building_village_chicken_coop_bamboo',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_village_chicken_coop_bamboo',
      atlas: 'objects_structures',
      frame: 'building_village_chicken_coop_bamboo',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'icon_commodity_spirit_silk_cocoon_basket',
    pattern: 'icon_commodity_spirit_silk_cocoon_basket',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_silk_cocoon_basket',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_silk_cocoon_basket',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_wayside_earth_god_miniature_shrine',
    pattern: 'building_wayside_earth_god_miniature_shrine',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_wayside_earth_god_miniature_shrine',
      atlas: 'objects_structures',
      frame: 'building_wayside_earth_god_miniature_shrine',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_ancient_tea_bush_wild_terrace',
    pattern: 'nature_ancient_tea_bush_wild_terrace',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_tea_bush_wild_terrace',
      atlas: 'objects_nature',
      frame: 'nature_ancient_tea_bush_wild_terrace',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 1.0
    }
  },
  {
    id: 'building_rustic_bamboo_fish_drying_rack',
    pattern: 'building_rustic_bamboo_fish_drying_rack',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_rustic_bamboo_fish_drying_rack',
      atlas: 'objects_structures',
      frame: 'building_rustic_bamboo_fish_drying_rack',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'nature_limestone_karst_arch_natural_bridge',
    pattern: 'nature_limestone_karst_arch_natural_bridge',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_limestone_karst_arch_natural_bridge',
      atlas: 'objects_nature',
      frame: 'nature_limestone_karst_arch_natural_bridge',
      category: 'rock',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'icon_commodity_spirit_tea_leaves_brick',
    pattern: 'icon_commodity_spirit_tea_leaves_brick',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_tea_leaves_brick',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_tea_leaves_brick',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_countryside_thatched_haystack_cluster',
    pattern: 'building_countryside_thatched_haystack_cluster',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_countryside_thatched_haystack_cluster',
      atlas: 'objects_structures',
      frame: 'building_countryside_thatched_haystack_cluster',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_ancient_mossy_tree_stump_fungi',
    pattern: 'nature_ancient_mossy_tree_stump_fungi',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_mossy_tree_stump_fungi',
      atlas: 'objects_nature',
      frame: 'nature_ancient_mossy_tree_stump_fungi',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.85 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'building_mountain_pass_stone_archway',
    pattern: 'building_mountain_pass_stone_archway',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_mountain_pass_stone_archway',
      atlas: 'objects_structures',
      frame: 'building_mountain_pass_stone_archway',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'nature_limestone_karst_sinkhole_pond',
    pattern: 'nature_limestone_karst_sinkhole_pond',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_limestone_karst_sinkhole_pond',
      atlas: 'objects_nature',
      frame: 'nature_limestone_karst_sinkhole_pond',
      category: 'rock',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'icon_commodity_spirit_lingzhi_mushroom_cluster',
    pattern: 'icon_commodity_spirit_lingzhi_mushroom_cluster',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_lingzhi_mushroom_cluster',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_lingzhi_mushroom_cluster',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_countryside_bamboo_vegetable_trellis',
    pattern: 'building_countryside_bamboo_vegetable_trellis',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_countryside_bamboo_vegetable_trellis',
      atlas: 'objects_structures',
      frame: 'building_countryside_bamboo_vegetable_trellis',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_bamboo_culm_breeze_cluster',
    pattern: 'nature_bamboo_culm_breeze_cluster',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'nature_bamboo_culm_breeze_cluster',
      atlas: 'objects_nature',
      frame: 'nature_bamboo_culm_breeze_cluster',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 1.5
    }
  },
  {
    id: 'nature_wild_medicinal_ginseng_flowering',
    pattern: 'nature_wild_medicinal_ginseng_flowering',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_wild_medicinal_ginseng_flowering',
      atlas: 'objects_nature',
      frame: 'nature_wild_medicinal_ginseng_flowering',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'building_rustic_pottery_kiln_earthen',
    pattern: 'building_rustic_pottery_kiln_earthen',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_rustic_pottery_kiln_earthen',
      atlas: 'objects_structures',
      frame: 'building_rustic_pottery_kiln_earthen',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.0
    }
  },
  {
    id: 'icon_commodity_spirit_dried_ginseng_slice',
    pattern: 'icon_commodity_spirit_dried_ginseng_slice',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_dried_ginseng_slice',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_dried_ginseng_slice',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_village_stone_water_trough',
    pattern: 'building_village_stone_water_trough',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_village_stone_water_trough',
      atlas: 'objects_structures',
      frame: 'building_village_stone_water_trough',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'nature_ancient_scholar_cypress_stone_cairn',
    pattern: 'nature_ancient_scholar_cypress_stone_cairn',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_scholar_cypress_stone_cairn',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_cypress_stone_cairn',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'nature_wild_mountain_medicinal_angelica',
    pattern: 'nature_wild_mountain_medicinal_angelica',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_wild_mountain_medicinal_angelica',
      atlas: 'objects_nature',
      frame: 'nature_wild_mountain_medicinal_angelica',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_tea_seed_oil_jar',
    pattern: 'icon_commodity_spirit_tea_seed_oil_jar',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_tea_seed_oil_jar',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_tea_seed_oil_jar',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_wayside_bamboo_raft_mooring_post',
    pattern: 'building_wayside_bamboo_raft_mooring_post',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_wayside_bamboo_raft_mooring_post',
      atlas: 'objects_structures',
      frame: 'building_wayside_bamboo_raft_mooring_post',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_wayside_bamboo_tea_shed_bench',
    pattern: 'building_wayside_bamboo_tea_shed_bench',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_bamboo_tea_shed_bench',
      atlas: 'objects_structures',
      frame: 'building_wayside_bamboo_tea_shed_bench',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mountain_waterfall_splash_basin',
    pattern: 'nature_mountain_waterfall_splash_basin',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_waterfall_splash_basin',
      atlas: 'objects_nature',
      frame: 'nature_mountain_waterfall_splash_basin',
      category: 'rock',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'icon_commodity_spirit_earthen_incense_burner',
    pattern: 'icon_commodity_spirit_earthen_incense_burner',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_earthen_incense_burner',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_earthen_incense_burner',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_rustic_bamboo_water_pipe_aqueduct',
    pattern: 'building_rustic_bamboo_water_pipe_aqueduct',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_rustic_bamboo_water_pipe_aqueduct',
      atlas: 'objects_structures',
      frame: 'building_rustic_bamboo_water_pipe_aqueduct',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'nature_wild_mountain_medicinal_wolfberry_bush',
    pattern: 'nature_wild_mountain_medicinal_wolfberry_bush',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_wild_mountain_medicinal_wolfberry_bush',
      atlas: 'objects_nature',
      frame: 'nature_wild_mountain_medicinal_wolfberry_bush',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 0.8
    }
  },
  {
    id: 'building_wayside_stone_boundary_stele',
    pattern: 'building_wayside_stone_boundary_stele',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_wayside_stone_boundary_stele',
      atlas: 'objects_structures',
      frame: 'building_wayside_stone_boundary_stele',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.0
    }
  },
  {
    id: 'nature_mountain_wild_medicinal_polygonum',
    pattern: 'nature_mountain_wild_medicinal_polygonum',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_wild_medicinal_polygonum',
      atlas: 'objects_nature',
      frame: 'nature_mountain_wild_medicinal_polygonum',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_cured_beast_meat_strip',
    pattern: 'icon_commodity_spirit_cured_beast_meat_strip',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_cured_beast_meat_strip',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_cured_beast_meat_strip',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_village_bamboo_grain_drying_mat',
    pattern: 'building_village_bamboo_grain_drying_mat',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_village_bamboo_grain_drying_mat',
      atlas: 'objects_structures',
      frame: 'building_village_bamboo_grain_drying_mat',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.6
    }
  },
  {
    id: 'nature_ancient_scholar_twisted_juniper',
    pattern: 'nature_ancient_scholar_twisted_juniper',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_scholar_twisted_juniper',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_twisted_juniper',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'icon_commodity_spirit_glazed_wine_gourd',
    pattern: 'icon_commodity_spirit_glazed_wine_gourd',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_glazed_wine_gourd',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_glazed_wine_gourd',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_wayside_fortune_teller_booth',
    pattern: 'building_wayside_fortune_teller_booth',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_fortune_teller_booth',
      atlas: 'objects_structures',
      frame: 'building_wayside_fortune_teller_booth',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mountain_wild_medicinal_salvia_miltiorrhiza',
    pattern: 'nature_mountain_wild_medicinal_salvia_miltiorrhiza',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_wild_medicinal_salvia_miltiorrhiza',
      atlas: 'objects_nature',
      frame: 'nature_mountain_wild_medicinal_salvia_miltiorrhiza',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'building_village_stone_pigpen_pen',
    pattern: 'building_village_stone_pigpen_pen',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_village_stone_pigpen_pen',
      atlas: 'objects_structures',
      frame: 'building_village_stone_pigpen_pen',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.0
    }
  },
  {
    id: 'nature_ancient_scholar_weeping_willow_bank',
    pattern: 'nature_ancient_scholar_weeping_willow_bank',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_scholar_weeping_willow_bank',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_weeping_willow_bank',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'soft',
      overhangCells: 1.5
    }
  },
  {
    id: 'building_village_earthen_dyeing_vats',
    pattern: 'building_village_earthen_dyeing_vats',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_village_earthen_dyeing_vats',
      atlas: 'objects_structures',
      frame: 'building_village_earthen_dyeing_vats',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_wayside_stone_well_windlass',
    pattern: 'building_wayside_stone_well_windlass',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_stone_well_windlass',
      atlas: 'objects_structures',
      frame: 'building_wayside_stone_well_windlass',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mountain_wild_medicinal_astragalus',
    pattern: 'nature_mountain_wild_medicinal_astragalus',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_wild_medicinal_astragalus',
      atlas: 'objects_nature',
      frame: 'nature_mountain_wild_medicinal_astragalus',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_dried_red_dates_basket',
    pattern: 'icon_commodity_spirit_dried_red_dates_basket',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_dried_red_dates_basket',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_dried_red_dates_basket',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_ancient_scholar_twisted_wisteria_canopy',
    pattern: 'nature_ancient_scholar_twisted_wisteria_canopy',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_scholar_twisted_wisteria_canopy',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_twisted_wisteria_canopy',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'building_wayside_straw_scarecrow_bamboo',
    pattern: 'building_wayside_straw_scarecrow_bamboo',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_wayside_straw_scarecrow_bamboo',
      atlas: 'objects_structures',
      frame: 'building_wayside_straw_scarecrow_bamboo',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_village_stone_grain_mortar_pestle',
    pattern: 'building_village_stone_grain_mortar_pestle',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_village_stone_grain_mortar_pestle',
      atlas: 'objects_structures',
      frame: 'building_village_stone_grain_mortar_pestle',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mountain_wild_medicinal_licorice_root',
    pattern: 'nature_mountain_wild_medicinal_licorice_root',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_wild_medicinal_licorice_root',
      atlas: 'objects_nature',
      frame: 'nature_mountain_wild_medicinal_licorice_root',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_fermented_bean_paste_jar',
    pattern: 'icon_commodity_spirit_fermented_bean_paste_jar',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_fermented_bean_paste_jar',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_fermented_bean_paste_jar',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_ancient_scholar_silver_birch_grove',
    pattern: 'nature_ancient_scholar_silver_birch_grove',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_scholar_silver_birch_grove',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_silver_birch_grove',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'building_village_stone_grain_roller_mill',
    pattern: 'building_village_stone_grain_roller_mill',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_village_stone_grain_roller_mill',
      atlas: 'objects_structures',
      frame: 'building_village_stone_grain_roller_mill',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_wayside_wooden_mile_marker_stele',
    pattern: 'building_wayside_wooden_mile_marker_stele',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_wooden_mile_marker_stele',
      atlas: 'objects_structures',
      frame: 'building_wayside_wooden_mile_marker_stele',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mountain_wild_medicinal_aconite_monkshood',
    pattern: 'nature_mountain_wild_medicinal_aconite_monkshood',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_wild_medicinal_aconite_monkshood',
      atlas: 'objects_nature',
      frame: 'nature_mountain_wild_medicinal_aconite_monkshood',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_salted_bamboo_shoots_jar',
    pattern: 'icon_commodity_spirit_salted_bamboo_shoots_jar',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_salted_bamboo_shoots_jar',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_salted_bamboo_shoots_jar',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_ancient_scholar_red_maple_cliff',
    pattern: 'nature_ancient_scholar_red_maple_cliff',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_scholar_red_maple_cliff',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_red_maple_cliff',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'building_village_bamboo_weaving_shed',
    pattern: 'building_village_bamboo_weaving_shed',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_village_bamboo_weaving_shed',
      atlas: 'objects_structures',
      frame: 'building_village_bamboo_weaving_shed',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_wayside_stone_stele_shrine_arbor',
    pattern: 'building_wayside_stone_stele_shrine_arbor',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_stone_stele_shrine_arbor',
      atlas: 'objects_structures',
      frame: 'building_wayside_stone_stele_shrine_arbor',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mountain_wild_medicinal_coptis_rhizome',
    pattern: 'nature_mountain_wild_medicinal_coptis_rhizome',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_wild_medicinal_coptis_rhizome',
      atlas: 'objects_nature',
      frame: 'nature_mountain_wild_medicinal_coptis_rhizome',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_fermented_rice_wine_jug',
    pattern: 'icon_commodity_spirit_fermented_rice_wine_jug',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_fermented_rice_wine_jug',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_fermented_rice_wine_jug',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_wayside_stone_arch_bridge',
    pattern: 'building_wayside_stone_arch_bridge',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_stone_arch_bridge',
      atlas: 'objects_structures',
      frame: 'building_wayside_stone_arch_bridge',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'icon_commodity_spirit_fermented_tofu_jar',
    pattern: 'icon_commodity_spirit_fermented_tofu_jar',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_fermented_tofu_jar',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_fermented_tofu_jar',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'building_village_wooden_paddy_waterwheel',
    pattern: 'building_village_wooden_paddy_waterwheel',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_village_wooden_paddy_waterwheel',
      atlas: 'objects_structures',
      frame: 'building_village_wooden_paddy_waterwheel',
      category: 'building',
      footprint: { cw: 3, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.4
    }
  },
  {
    id: 'nature_mountain_wild_medicinal_dendrobium_orchid',
    pattern: 'nature_mountain_wild_medicinal_dendrobium_orchid',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_wild_medicinal_dendrobium_orchid',
      atlas: 'objects_nature',
      frame: 'nature_mountain_wild_medicinal_dendrobium_orchid',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'nature_ancient_scholar_ginkgo_gold_canopy',
    pattern: 'nature_ancient_scholar_ginkgo_gold_canopy',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_scholar_ginkgo_gold_canopy',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_ginkgo_gold_canopy',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'building_village_stone_tofu_press_bench',
    pattern: 'building_village_stone_tofu_press_bench',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_village_stone_tofu_press_bench',
      atlas: 'objects_structures',
      frame: 'building_village_stone_tofu_press_bench',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_wayside_bamboo_courier_mailbox_stand',
    pattern: 'building_wayside_bamboo_courier_mailbox_stand',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_bamboo_courier_mailbox_stand',
      atlas: 'objects_structures',
      frame: 'building_wayside_bamboo_courier_mailbox_stand',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mountain_wild_medicinal_polygonatum_kingianum',
    pattern: 'nature_mountain_wild_medicinal_polygonatum_kingianum',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_wild_medicinal_polygonatum_kingianum',
      atlas: 'objects_nature',
      frame: 'nature_mountain_wild_medicinal_polygonatum_kingianum',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_steamed_lotus_seed_paste_tin',
    pattern: 'icon_commodity_spirit_steamed_lotus_seed_paste_tin',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_steamed_lotus_seed_paste_tin',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_steamed_lotus_seed_paste_tin',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_ancient_scholar_weeping_peach_blossom',
    pattern: 'nature_ancient_scholar_weeping_peach_blossom',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_scholar_weeping_peach_blossom',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_weeping_peach_blossom',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'building_village_bamboo_duck_coop_ramp',
    pattern: 'building_village_bamboo_duck_coop_ramp',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_village_bamboo_duck_coop_ramp',
      atlas: 'objects_structures',
      frame: 'building_village_bamboo_duck_coop_ramp',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_wayside_stone_rain_shelter_arbor',
    pattern: 'building_wayside_stone_rain_shelter_arbor',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_stone_rain_shelter_arbor',
      atlas: 'objects_structures',
      frame: 'building_wayside_stone_rain_shelter_arbor',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mountain_wild_medicinal_codonopsis_dangshen',
    pattern: 'nature_mountain_wild_medicinal_codonopsis_dangshen',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_wild_medicinal_codonopsis_dangshen',
      atlas: 'objects_nature',
      frame: 'nature_mountain_wild_medicinal_codonopsis_dangshen',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_fermented_black_soybean_crock',
    pattern: 'icon_commodity_spirit_fermented_black_soybean_crock',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_fermented_black_soybean_crock',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_fermented_black_soybean_crock',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_ancient_scholar_golden_larch_ridge',
    pattern: 'nature_ancient_scholar_golden_larch_ridge',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_scholar_golden_larch_ridge',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_golden_larch_ridge',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'building_village_bamboo_fish_trap_weir',
    pattern: 'building_village_bamboo_fish_trap_weir',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_village_bamboo_fish_trap_weir',
      atlas: 'objects_structures',
      frame: 'building_village_bamboo_fish_trap_weir',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_wayside_stone_stele_pavilion_ruin',
    pattern: 'building_wayside_stone_stele_pavilion_ruin',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_stone_stele_pavilion_ruin',
      atlas: 'objects_structures',
      frame: 'building_wayside_stone_stele_pavilion_ruin',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mountain_wild_medicinal_rehmannia_dihuang',
    pattern: 'nature_mountain_wild_medicinal_rehmannia_dihuang',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_wild_medicinal_rehmannia_dihuang',
      atlas: 'objects_nature',
      frame: 'nature_mountain_wild_medicinal_rehmannia_dihuang',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_fermented_rice_koji_brick',
    pattern: 'icon_commodity_spirit_fermented_rice_koji_brick',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_fermented_rice_koji_brick',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_fermented_rice_koji_brick',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_ancient_scholar_twisted_locust_tree',
    pattern: 'nature_ancient_scholar_twisted_locust_tree',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_scholar_twisted_locust_tree',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_twisted_locust_tree',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'building_wayside_bamboo_torch_beacon_brazier',
    pattern: 'building_wayside_bamboo_torch_beacon_brazier',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'building_wayside_bamboo_torch_beacon_brazier',
      atlas: 'objects_structures',
      frame: 'building_wayside_bamboo_torch_beacon_brazier',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'building_village_stone_grain_soaking_cistern',
    pattern: 'building_village_stone_grain_soaking_cistern',
    targetAtlas: 'objects_structures',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'building_village_stone_grain_soaking_cistern',
      atlas: 'objects_structures',
      frame: 'building_village_stone_grain_soaking_cistern',
      category: 'building',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.2
    }
  },
  {
    id: 'nature_mountain_wild_medicinal_baical_skullcap_huangqin',
    pattern: 'nature_mountain_wild_medicinal_baical_skullcap_huangqin',
    targetAtlas: 'objects_nature',
    width: 256,
    height: 256,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_mountain_wild_medicinal_baical_skullcap_huangqin',
      atlas: 'objects_nature',
      frame: 'nature_mountain_wild_medicinal_baical_skullcap_huangqin',
      category: 'rock',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 0.8
    }
  },
  {
    id: 'icon_commodity_spirit_salted_duck_egg_clay_pot',
    pattern: 'icon_commodity_spirit_salted_duck_egg_clay_pot',
    targetAtlas: 'icons',
    width: 128,
    height: 128,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'icon_commodity_spirit_salted_duck_egg_clay_pot',
      atlas: 'icons',
      frame: 'icon_commodity_spirit_salted_duck_egg_clay_pot',
      category: 'icon',
      footprint: { cw: 1, ch: 1 },
      anchor: { x: 0.5, y: 0.5 },
      collision: 'none',
      overhangCells: 0.0
    }
  },
  {
    id: 'nature_ancient_scholar_twisted_camphor_canopy',
    pattern: 'nature_ancient_scholar_twisted_camphor_canopy',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 384,
    k: 1.4,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'nature_ancient_scholar_twisted_camphor_canopy',
      atlas: 'objects_nature',
      frame: 'nature_ancient_scholar_twisted_camphor_canopy',
      category: 'tree',
      footprint: { cw: 2, ch: 2 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'landmark_central_plains_tianjing_palace_gate',
    pattern: 'landmark_central_plains_tianjing_palace_gate',
    targetAtlas: 'objects_structures',
    width: 512,
    height: 384,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'landmark_central_plains_tianjing_palace_gate',
      atlas: 'objects_structures',
      frame: 'landmark_central_plains_tianjing_palace_gate',
      category: 'building',
      footprint: { cw: 4, ch: 3 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 2.0
    }
  },
  {
    id: 'landmark_northern_desolate_frozen_mammoth_shrine',
    pattern: 'landmark_northern_desolate_frozen_mammoth_shrine',
    targetAtlas: 'objects_structures',
    width: 512,
    height: 384,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'landmark_northern_desolate_frozen_mammoth_shrine',
      atlas: 'objects_structures',
      frame: 'landmark_northern_desolate_frozen_mammoth_shrine',
      category: 'building',
      footprint: { cw: 3, ch: 3 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.5
    }
  },
  {
    id: 'landmark_western_sacred_desert_silk_caravan_oasis',
    pattern: 'landmark_western_sacred_desert_silk_caravan_oasis',
    targetAtlas: 'objects_structures',
    width: 512,
    height: 512,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'landmark_western_sacred_desert_silk_caravan_oasis',
      atlas: 'objects_structures',
      frame: 'landmark_western_sacred_desert_silk_caravan_oasis',
      category: 'building',
      footprint: { cw: 4, ch: 4 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 2.0
    }
  },
  {
    id: 'landmark_azure_mountain_sword_peak_monolith',
    pattern: 'landmark_azure_mountain_sword_peak_monolith',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 512,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'landmark_azure_mountain_sword_peak_monolith',
      atlas: 'objects_nature',
      frame: 'landmark_azure_mountain_sword_peak_monolith',
      category: 'rock',
      footprint: { cw: 3, ch: 3 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 2.5
    }
  },
  {
    id: 'landmark_nine_springs_delta_dragon_water_pavilion',
    pattern: 'landmark_nine_springs_delta_dragon_water_pavilion',
    targetAtlas: 'objects_structures',
    width: 512,
    height: 512,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'landmark_nine_springs_delta_dragon_water_pavilion',
      atlas: 'objects_structures',
      frame: 'landmark_nine_springs_delta_dragon_water_pavilion',
      category: 'building',
      footprint: { cw: 4, ch: 4 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 2.0
    }
  },
  {
    id: 'landmark_mirror_lake_submerged_daoist_pavilion',
    pattern: 'landmark_mirror_lake_submerged_daoist_pavilion',
    targetAtlas: 'objects_structures',
    width: 512,
    height: 512,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'landmark_mirror_lake_submerged_daoist_pavilion',
      atlas: 'objects_structures',
      frame: 'landmark_mirror_lake_submerged_daoist_pavilion',
      category: 'building',
      footprint: { cw: 4, ch: 4 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 2.0
    }
  },
  {
    id: 'landmark_hermit_highlands_cloud_bamboo_observatory',
    pattern: 'landmark_hermit_highlands_cloud_bamboo_observatory',
    targetAtlas: 'objects_structures',
    width: 512,
    height: 512,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'landmark_hermit_highlands_cloud_bamboo_observatory',
      atlas: 'objects_structures',
      frame: 'landmark_hermit_highlands_cloud_bamboo_observatory',
      category: 'building',
      footprint: { cw: 4, ch: 4 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 2.2
    }
  },
  {
    id: 'landmark_border_march_iron_garrison_gatehouse',
    pattern: 'landmark_border_march_iron_garrison_gatehouse',
    targetAtlas: 'objects_structures',
    width: 512,
    height: 384,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'landmark_border_march_iron_garrison_gatehouse',
      atlas: 'objects_structures',
      frame: 'landmark_border_march_iron_garrison_gatehouse',
      category: 'building',
      footprint: { cw: 4, ch: 3 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 2.0
    }
  },
  {
    id: 'landmark_thundersteppe_lightning_attractor_pillar',
    pattern: 'landmark_thundersteppe_lightning_attractor_pillar',
    targetAtlas: 'objects_nature',
    width: 384,
    height: 512,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'landmark_thundersteppe_lightning_attractor_pillar',
      atlas: 'objects_nature',
      frame: 'landmark_thundersteppe_lightning_attractor_pillar',
      category: 'rock',
      footprint: { cw: 3, ch: 3 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 2.5
    }
  },
  {
    id: 'landmark_beast_prairies_tribal_totem_encampment',
    pattern: 'landmark_beast_prairies_tribal_totem_encampment',
    targetAtlas: 'objects_structures',
    width: 512,
    height: 512,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: true,
    metadata: {
      id: 'landmark_beast_prairies_tribal_totem_encampment',
      atlas: 'objects_structures',
      frame: 'landmark_beast_prairies_tribal_totem_encampment',
      category: 'building',
      footprint: { cw: 4, ch: 4 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 2.0
    }
  },
  {
    id: 'landmark_lava_spine_magma_forge_crater',
    pattern: 'landmark_lava_spine_magma_forge_crater',
    targetAtlas: 'objects_nature',
    width: 512,
    height: 512,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'landmark_lava_spine_magma_forge_crater',
      atlas: 'objects_nature',
      frame: 'landmark_lava_spine_magma_forge_crater',
      category: 'rock',
      footprint: { cw: 4, ch: 4 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 2.0
    }
  },
  {
    id: 'landmark_venom_mire_sunken_serpent_pagoda',
    pattern: 'landmark_venom_mire_sunken_serpent_pagoda',
    targetAtlas: 'objects_structures',
    width: 480,
    height: 512,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'landmark_venom_mire_sunken_serpent_pagoda',
      atlas: 'objects_structures',
      frame: 'landmark_venom_mire_sunken_serpent_pagoda',
      category: 'building',
      footprint: { cw: 4, ch: 4 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 2.2
    }
  },
  {
    id: 'landmark_southern_demon_domain_skull_gate',
    pattern: 'landmark_southern_demon_domain_skull_gate',
    targetAtlas: 'objects_structures',
    width: 512,
    height: 440,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'landmark_southern_demon_domain_skull_gate',
      atlas: 'objects_structures',
      frame: 'landmark_southern_demon_domain_skull_gate',
      category: 'building',
      footprint: { cw: 4, ch: 3 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 2.0
    }
  },
  {
    id: 'landmark_crimson_battlefield_broken_halberd_cairn',
    pattern: 'landmark_crimson_battlefield_broken_halberd_cairn',
    targetAtlas: 'objects_nature',
    width: 480,
    height: 480,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'landmark_crimson_battlefield_broken_halberd_cairn',
      atlas: 'objects_nature',
      frame: 'landmark_crimson_battlefield_broken_halberd_cairn',
      category: 'rock',
      footprint: { cw: 3, ch: 3 },
      anchor: { x: 0.5, y: 0.88 },
      collision: 'solid',
      overhangCells: 1.8
    }
  },
  {
    id: 'landmark_abyssal_scar_void_chain_anchor',
    pattern: 'landmark_abyssal_scar_void_chain_anchor',
    targetAtlas: 'objects_nature',
    width: 420,
    height: 512,
    k: 1.45,
    lumaThreshold: 0.95,
    allowInternalCavities: false,
    metadata: {
      id: 'landmark_abyssal_scar_void_chain_anchor',
      atlas: 'objects_nature',
      frame: 'landmark_abyssal_scar_void_chain_anchor',
      category: 'rock',
      footprint: { cw: 3, ch: 3 },
      anchor: { x: 0.5, y: 0.9 },
      collision: 'solid',
      overhangCells: 2.2
    }
  }
];

async function run() {
  console.log('=== INGEST & POST-PROCESS GENERATED ASSETS ===\n');

  // Baca file di direktori brain
  const brainFiles = fs.readdirSync(brainDir);
  const processedSprites = {
    objects_structures: [],
    objects_nature: [],
    markers_entities: [],
    icons: []
  };

  for (const item of GENERATED_ITEMS) {
    const matchedFile = brainFiles.find(f => f.startsWith(item.pattern) && (f.endsWith('.jpg') || f.endsWith('.png')));
    if (!matchedFile) {
      console.warn(`[WARN] File untuk ${item.id} (${item.pattern}) belum ditemukan di brain directory.`);
      continue;
    }

    const inputPath = path.join(brainDir, matchedFile);
    console.log(`[PROCESS] ${item.id} <- ${matchedFile}`);

    // 1. Baca metadata & raw pixel buffer RGBA
    const { data, info } = await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 2. Terapkan smart cavity & edge keying:
    // HANYA struktur bercelah tiang (pavilion, torii, lumbung panggung) dan lubang cincin yang membolehkan rongga internal transparan.
    // Seluruh monster/hewan (termasuk monster_white_tiger, mount_feather_crane), jubah, senjata, dan ikon
    // DIJAMIN 100% solid pada bulu putih, kain sutra, dan bilah logamnya!
    const cavityItemIds = new Set([
      'pavilion_1x1',
      'stone_torii_1x1',
      'building_granary_silo',
      'ring_monster_tier1',
      'ring_monster_elite',
      'ring_monster_boss',
      'ring_monster_boss_crimson'
    ]);
    const allowInternalCavities = item.allowInternalCavities !== undefined
      ? item.allowInternalCavities
      : cavityItemIds.has(item.id);

    const keyedBuffer = processLuminanceKey(data, info.width, info.height, {
      colorDistThreshold: item.colorDistThreshold || 18,
      allowInternalCavities,
      minCavitySize: item.minCavitySize || 100,
      featherMargin: item.featherMargin || 22
    });

    // 3. Trim bounding box dan resize ke target resolusi HD @2X
    // Menggunakan skala 2x untuk ikon dan 1.33x-1.5x untuk bangunan/markers dengan resampling lanczos3
    const scale = item.targetAtlas === 'icons' ? 2 : (item.width <= 256 ? 1.5 : 1.333);
    const targetW = Math.round(item.width * scale);
    const targetH = Math.round(item.height * scale);

    const processedPng = await sharp(keyedBuffer, {
      raw: { width: info.width, height: info.height, channels: 4 }
    })
      .trim()
      .resize(targetW, targetH, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3
      })
      .png()
      .toBuffer();

    // 4. Simpan hasil bersih ke assets_picked/
    const pickedPath = path.join(pickedDir, `${item.id}.png`);
    fs.writeFileSync(pickedPath, processedPng);
    console.log(`   -> Disimpan ke assets_picked/${item.id}.png (${targetW}x${targetH}px HD, ${processedPng.length} bytes)`);

    processedSprites[item.targetAtlas].push({
      id: item.id,
      width: targetW,
      height: targetH,
      buffer: processedPng,
      metadata: item.metadata
    });
  }

  // 5. Update atau buat atlas WebP di web-dashboard/public/assets/atlas/
  for (const [atlasName, sprites] of Object.entries(processedSprites)) {
    if (sprites.length === 0) continue;

    console.log(`\n[PACK] Memperbarui atlas: ${atlasName} (${sprites.length} sprites baru)...`);

    // Ambil sprite lama yang sudah ada di atlas manifest jika ada
    const existingJsonPath = path.join(atlasDir, `${atlasName}.json`);
    const existingWebpPath = path.join(atlasDir, `${atlasName}.webp`);
    let combinedSprites = [...sprites];

    if (fs.existsSync(existingJsonPath) && fs.existsSync(existingWebpPath)) {
      try {
        const existingManifest = JSON.parse(fs.readFileSync(existingJsonPath, 'utf8'));
        sharp.cache(false);
        const existingBuf = fs.readFileSync(existingWebpPath);
        const existingImg = await sharp(existingBuf).png().toBuffer();
        
        for (const [frameId, frameData] of Object.entries(existingManifest.frames)) {
          // Jangan duplikasi jika sprite baru menimpa ID lama
          if (sprites.some(s => s.id === frameId)) continue;

          const f = frameData.frame;
          const extractedFrame = await sharp(existingImg)
            .extract({ left: f.x, top: f.y, width: f.w, height: f.h })
            .png()
            .toBuffer();

          combinedSprites.push({
            id: frameId,
            width: f.w,
            height: f.h,
            buffer: extractedFrame,
            metadata: frameData.metadata
          });
        }
      } catch (err) {
        console.warn(`[WARN] Gagal membaca atlas lama ${atlasName}, mem-pack ulang fresh: ${err.message}`);
      }
    }

    const packResult = await packAndRenderAtlas(atlasName, combinedSprites, atlasDir, 2048);
    console.log(`   -> Atlas ${packResult.atlasName}.webp dihasilkan (${packResult.frameCount} frames, ${(packResult.byteSize / 1024).toFixed(1)} KB)`);
  }

  console.log('\n========================================');
  console.log('[SUCCESS] Seluruh aset ter-ingest & atlas terintegrasi mulus!');
  console.log('========================================\n');
}

run().catch(err => {
  console.error('[FATAL] Ingest error:', err);
  process.exit(1);
});
