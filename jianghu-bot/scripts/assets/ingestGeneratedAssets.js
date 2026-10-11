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
