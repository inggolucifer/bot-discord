/**
 * JIANGHU WORLD — PROCEDURAL OBJECT & TERRAIN SHUIMO GENERATOR (T0 PIPELINE)
 * Style Bible Compliant: Traditional Chinese Ink-Wash (Shuimo/Xieyi).
 * Muted palette: Jade green (#5E8C7B), Slate blue (#7C97A6), Warm grey (#9A8F82), Xuan paper (#F4F1EA), Cinnabar (#9B3A2E).
 * Generates procedural tall objects (karst rock pillars, bamboo clumps, pavilions, mountains, trees)
 * and seamless paper wash textures when static atlas sprites are not yet loaded.
 */

import { WorldObjectDef, NpcAttitude } from '@/types/world';
import { atlasLoader } from './atlasLoader';

export function getAtlasNameForDefId(defId: string): string {
  if (
    defId.startsWith('building_') ||
    defId.startsWith('pavilion') ||
    defId.startsWith('village_house') ||
    defId.startsWith('sect_gate') ||
    defId.startsWith('stone_torii') ||
    defId.startsWith('pagoda') ||
    defId.startsWith('xitong_') ||
    defId.startsWith('dungeon_') ||
    defId.includes('_city_') ||
    (defId.startsWith('landmark_') && !defId.includes('monolith') && !defId.includes('pillar') && !defId.includes('crater') && !defId.includes('cairn') && !defId.includes('anchor'))
  ) {
    return 'objects_structures';
  }
  if (defId.startsWith('ring_') || defId.startsWith('marker_') || defId.startsWith('monster_')) {
    return 'markers_entities';
  }
  if (defId.startsWith('icon_')) {
    return 'icons';
  }
  if (defId.startsWith('resource_')) {
    return 'objects_nature';
  }
  if (defId.startsWith('autotile_')) {
    return 'autotiles';
  }
  return 'objects_nature';
}

// ============================================================================
// 1. OBJECT DEFINITIONS REGISTRY (T0 PROCEDURAL & ATLAS COMPATIBLE)
// ============================================================================

export const OBJECT_DEFINITIONS: Record<string, WorldObjectDef> = {
  // --- KARST PILLARS & PEAKS ---
  karst_pillar_1x1: {
    id: 'karst_pillar_1x1',
    name: 'Pilar Karst Tunggal',
    px: { w: 100, h: 220 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'karst']
  },
  mt_rock_2x1: {
    id: 'mt_rock_2x1',
    name: 'Tebing Batu Karst Sedang',
    px: { w: 200, h: 280 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 1.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'cliff']
  },
  mt_rock_2x2: {
    id: 'mt_rock_2x2',
    name: 'Gugusan Gunung Cadas',
    px: { w: 200, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'barrier']
  },
  mt_rock_3x2: {
    id: 'mt_rock_3x2',
    name: 'Puncak Gunung Azure Megah',
    px: { w: 300, h: 440 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 2.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'barrier']
  },
  mt_rock_4x3: {
    id: 'mt_rock_4x3',
    name: 'Dinding Benteng Pegunungan Raksasa',
    px: { w: 400, h: 560 },
    footprint: { cw: 4, ch: 3 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 2.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'barrier']
  },

  // --- BAMBOO GROVES & FORESTS ---
  bamboo_clump_1x1: {
    id: 'bamboo_clump_1x1',
    name: 'Rumpun Bambu Hijau',
    px: { w: 100, h: 180 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.25,
    sortBias: 0,
    fogFoot: true,
    tags: ['bamboo', 'vegetation']
  },
  bamboo_clump_2x1: {
    id: 'bamboo_clump_2x1',
    name: 'Rumpun Bambu Rimbun',
    px: { w: 200, h: 220 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.2,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 0,
    fogFoot: true,
    tags: ['bamboo', 'vegetation']
  },
  bamboo_clump_2x2: {
    id: 'bamboo_clump_2x2',
    name: 'Hutan Bambu Padat Tinta',
    px: { w: 200, h: 260 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.6,
    collision: 'soft',
    staminaMult: 1.35,
    sortBias: 0,
    fogFoot: true,
    tags: ['bamboo', 'vegetation']
  },

  // --- TREES ---
  pine_tree_1x1: {
    id: 'pine_tree_1x1',
    name: 'Pohon Pinus Kuno',
    px: { w: 100, h: 160 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.6,
    collision: 'soft',
    staminaMult: 1.15,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'pine']
  },
  spirit_tree_2x2: {
    id: 'spirit_tree_2x2',
    name: 'Pohon Roh Bertunas Cahaya',
    px: { w: 200, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'spirit']
  },

  // --- STRUCTURES & SET-PIECES ---
  pavilion_1x1: {
    id: 'pavilion_1x1',
    name: 'Paviliun Teh Tepi Jalan',
    px: { w: 100, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.4,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['building', 'pavilion']
  },
  village_house_2x1: {
    id: 'village_house_2x1',
    name: 'Gubuk Desa Beratap Jerami',
    px: { w: 200, h: 180 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['building', 'residence']
  },
  sect_gate_3x2: {
    id: 'sect_gate_3x2',
    name: 'Gerbang Megah Balai Sekte',
    px: { w: 300, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'sect']
  },
  building_inn_roadside: {
    id: 'building_inn_roadside',
    name: 'Kedai Arak Tepi Jalan Jianghu',
    px: { w: 300, h: 260 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'tavern', 'inn']
  },
  building_forge_workshop: {
    id: 'building_forge_workshop',
    name: 'Bengkel Tempa Senjata Jianghu',
    px: { w: 300, h: 260 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'workshop', 'forge']
  },
  building_tea_house: {
    id: 'building_tea_house',
    name: 'Kedai Teh Danau Bambu',
    px: { w: 300, h: 260 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'tea', 'pavilion']
  },
  building_alchemist_hall: {
    id: 'building_alchemist_hall',
    name: 'Balai Alkimia Pil Sekte',
    px: { w: 300, h: 260 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'alchemy', 'sect']
  },
  building_granary_silo: {
    id: 'building_granary_silo',
    name: 'Lumbung Padi & Gandum Desa',
    px: { w: 300, h: 260 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'granary', 'village']
  },
  building_residential_manor: {
    id: 'building_residential_manor',
    name: 'Kediaman Pendekar Jianghu',
    px: { w: 320, h: 260 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'residence', 'manor']
  },
  building_auction_house: {
    id: 'building_auction_house',
    name: 'Istana Lelang Langit',
    px: { w: 320, h: 280 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'auction', 'city']
  },
  building_sect_library: {
    id: 'building_sect_library',
    name: 'Paviliun Kitab Sutra Sekte',
    px: { w: 320, h: 280 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'library', 'sect']
  },
  building_spirit_pagoda: {
    id: 'building_spirit_pagoda',
    name: 'Pagoda Menara Sembilan Tingkat',
    px: { w: 320, h: 360 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'pagoda', 'landmark']
  },
  building_blacksmith_foundry: {
    id: 'building_blacksmith_foundry',
    name: 'Bengkel Peleburan Senjata Suci',
    px: { w: 320, h: 280 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'foundry', 'blacksmith']
  },
  building_apothecary_store: {
    id: 'building_apothecary_store',
    name: 'Balai Tabib & Apotek Miaoshou',
    px: { w: 320, h: 280 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'apothecary', 'shop']
  },
  building_dock_warehouse: {
    id: 'building_dock_warehouse',
    name: 'Gudang Dermaga & Pelabuhan',
    px: { w: 340, h: 260 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'dock', 'warehouse', 'water']
  },
  building_village_thatched_cottage: {
    id: 'building_village_thatched_cottage',
    name: 'Pondok Jerami Petani',
    px: { w: 320, h: 260 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'village', 'cottage', 'residence']
  },
  building_roadside_tea_stall: {
    id: 'building_roadside_tea_stall',
    name: 'Kedai Teh Tenda Jerami Tepi Jalan',
    px: { w: 320, h: 260 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'tea', 'stall', 'road']
  },
  building_watermill_stream: {
    id: 'building_watermill_stream',
    name: 'Kincir Air Penggilingan Kayu Tepi Sungai',
    px: { w: 340, h: 280 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'watermill', 'village', 'river']
  },
  building_ancestral_shrine_gate: {
    id: 'building_ancestral_shrine_gate',
    name: 'Gapura Kuil Leluhur Desa',
    px: { w: 320, h: 300 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'shrine', 'gate', 'paifang', 'village']
  },
  building_wooden_watchtower: {
    id: 'building_wooden_watchtower',
    name: 'Menara Pengawas Kayu Perbatasan',
    px: { w: 260, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 1.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'watchtower', 'outpost', 'defense', 'village']
  },
  building_ferry_dock_shed: {
    id: 'building_ferry_dock_shed',
    name: 'Pondok Dermaga Penyeberangan Sungai',
    px: { w: 340, h: 280 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'ferry', 'dock', 'pier', 'water']
  },
  building_village_well: {
    id: 'building_village_well',
    name: 'Sumur Air Batu Berlumut Desa',
    px: { w: 260, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'well', 'water', 'village']
  },
  building_rustic_wooden_bridge: {
    id: 'building_rustic_wooden_bridge',
    name: 'Jembatan Kayu Lengkung Pedesaan',
    px: { w: 340, h: 280 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'bridge', 'path', 'river', 'water']
  },
  building_wayside_stone_stele: {
    id: 'building_wayside_stone_stele',
    name: 'Prasasti Kura-Kura Penunjuk Arah',
    px: { w: 260, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'stele', 'monument', 'road', 'path']
  },
  building_rustic_drying_racks: {
    id: 'building_rustic_drying_racks',
    name: 'Rak Jemuran Bambu Desa',
    px: { w: 280, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'drying_rack', 'village', 'farm', 'craft']
  },
  building_stone_lantern_shrine: {
    id: 'building_stone_lantern_shrine',
    name: 'Lentera Batu Taman Kuil Kuno',
    px: { w: 260, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'lantern', 'shrine', 'temple', 'light']
  },
  building_spirit_gathering_gazebo: {
    id: 'building_spirit_gathering_gazebo',
    name: 'Gazebo Meditasi Kayu Segi Enam',
    px: { w: 340, h: 280 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'gazebo', 'pavilion', 'meditation', 'retreat']
  },
  building_mountain_hermitage_shack: {
    id: 'building_mountain_hermitage_shack',
    name: 'Gubuk Pertapaan Bambu Lereng Tebing',
    px: { w: 384, h: 320 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'cottage', 'hermitage', 'mountain', 'shack']
  },
  building_wayside_spirit_altar: {
    id: 'building_wayside_spirit_altar',
    name: 'Altar Sesaji Batu Pemujaan Dao',
    px: { w: 280, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'altar', 'dao', 'shrine', 'spiritual']
  },
  building_stone_water_basin: {
    id: 'building_stone_water_basin',
    name: 'Bak Air Batu Padas Berpancuran Bambu',
    px: { w: 260, h: 260 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'basin', 'water', 'zen', 'village']
  },
  building_blacksmith_weapon_rack: {
    id: 'building_blacksmith_weapon_rack',
    name: 'Rak Senjata Kayu Terbuka',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'weapon_rack', 'blacksmith', 'guard_post', 'village']
  },
  building_wayside_mile_marker_stele: {
    id: 'building_wayside_mile_marker_stele',
    name: 'Tonggak Prasasti Penunjuk Jalan Kuno',
    px: { w: 260, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'stele', 'mile_marker', 'road', 'navigation']
  },
  building_rustic_cart_straw_shed: {
    id: 'building_rustic_cart_straw_shed',
    name: 'Pondok Gerobak Jerami Petani',
    px: { w: 360, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'shed', 'cart', 'farm', 'village']
  },
  building_wine_tavern_flagpole_sign: {
    id: 'building_wine_tavern_flagpole_sign',
    name: 'Tiang Bendera Kain Kedai Arak',
    px: { w: 260, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'tavern', 'flagpole', 'wine', 'roadside']
  },
  building_stone_mill_grain_grinder: {
    id: 'building_stone_mill_grain_grinder',
    name: 'Penggilingan Gandum Batu Putar',
    px: { w: 300, h: 300 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'mill', 'grain', 'flour', 'village']
  },
  building_wayside_tea_resting_shed: {
    id: 'building_wayside_tea_resting_shed',
    name: 'Gubuk Naungan Teh Pinggir Jalan',
    px: { w: 360, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'tea_shed', 'pavilion', 'rest', 'roadside']
  },
  building_blacksmith_bellows_furnace: {
    id: 'building_blacksmith_bellows_furnace',
    name: 'Tungku Perapian Tempa Pompa Tiup',
    px: { w: 360, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'furnace', 'forge', 'blacksmith', 'workshop']
  },
  building_rustic_apiary_beehives: {
    id: 'building_rustic_apiary_beehives',
    name: 'Peternakan Lebah Madu Panggung Bambu',
    px: { w: 360, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'apiary', 'beehives', 'honey', 'farm']
  },
  building_countryside_thatched_gazebo: {
    id: 'building_countryside_thatched_gazebo',
    name: 'Gazebo Pematang Sawah Berteduh',
    px: { w: 360, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'gazebo', 'shelter', 'pavilion', 'rest']
  },
  nature_mossy_wild_stepping_boulders: {
    id: 'nature_mossy_wild_stepping_boulders',
    name: 'Batu Bulat Tepian Berlumut',
    px: { w: 320, h: 260 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.4,
    collision: 'soft',
    staminaMult: 1.1,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'rock', 'boulder', 'moss', 'stream']
  },
  nature_limestone_karst_cave_opening: {
    id: 'nature_limestone_karst_cave_opening',
    name: 'Mulut Gua Tebing Karst Berakar',
    px: { w: 360, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'cave', 'karst', 'cliff', 'dungeon']
  },
  nature_pine_wind_twisted_bonsai: {
    id: 'nature_pine_wind_twisted_bonsai',
    name: 'Pinus Puncak Tebing Meliuk Angin',
    px: { w: 360, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'pine', 'tree', 'cliff', 'bonsai']
  },
  nature_crystal_quartz_vein_crag: {
    id: 'nature_crystal_quartz_vein_crag',
    name: 'Batu Padas Rekahan Kuarsa Berpendar',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'rock', 'crystal', 'quartz', 'mine']
  },
  building_wayside_wooden_notice_board: {
    id: 'building_wayside_wooden_notice_board',
    name: 'Papan Maklumat Kayu Pinggir Jalan',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'notice_board', 'bounty', 'village', 'roadside']
  },
  building_village_thatched_granary_round: {
    id: 'building_village_thatched_granary_round',
    name: 'Lumbung Padi Bambu Bulat Atap Jerami',
    px: { w: 340, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'granary', 'silo', 'grain', 'farm']
  },
  building_riverside_watermill_paddle_wheel: {
    id: 'building_riverside_watermill_paddle_wheel',
    name: 'Kincir Air Penggilingan Tepi Sungai',
    px: { w: 360, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'watermill', 'mill', 'river', 'paddle']
  },
  nature_ancient_hollow_mulberry_tree: {
    id: 'nature_ancient_hollow_mulberry_tree',
    name: 'Pohon Murbei Sutra Roh Purba',
    px: { w: 380, h: 380 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tree', 'mulberry', 'silk', 'ancient']
  },
  nature_wild_mountain_peony_cluster: {
    id: 'nature_wild_mountain_peony_cluster',
    name: 'Rumpun Bunga Peoni Gunung Mekar',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'flower', 'peony', 'herb', 'garden']
  },
  building_village_chicken_coop_bamboo: {
    id: 'building_village_chicken_coop_bamboo',
    name: 'Kandang Unggas Bambu Pedesaan',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'coop', 'farm', 'chicken', 'poultry']
  },
  building_wayside_earth_god_miniature_shrine: {
    id: 'building_wayside_earth_god_miniature_shrine',
    name: 'Kuil Mini Dewa Bumi Pinggir Jalan',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'shrine', 'altar', 'earth_god', 'wayside']
  },
  nature_ancient_tea_bush_wild_terrace: {
    id: 'nature_ancient_tea_bush_wild_terrace',
    name: 'Rumpun Teh Gunung Liar Berteras Lumut',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tea', 'bush', 'herb', 'mountain']
  },
  building_rustic_bamboo_fish_drying_rack: {
    id: 'building_rustic_bamboo_fish_drying_rack',
    name: 'Rak Jemuran Ikan Bambu Nelayan',
    px: { w: 360, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'drying_rack', 'fish', 'bamboo', 'fishery']
  },
  nature_limestone_karst_arch_natural_bridge: {
    id: 'nature_limestone_karst_arch_natural_bridge',
    name: 'Jembatan Busur Karst Alami',
    px: { w: 380, h: 380 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'arch', 'bridge', 'karst', 'cliff']
  },
  building_countryside_thatched_haystack_cluster: {
    id: 'building_countryside_thatched_haystack_cluster',
    name: 'Gugusan Jerami Kering Pematang Sawah',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'haystack', 'straw', 'farm', 'grain']
  },
  nature_ancient_mossy_tree_stump_fungi: {
    id: 'nature_ancient_mossy_tree_stump_fungi',
    name: 'Tunggul Kayu Purba Berjamur Roh',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'stump', 'moss', 'lingzhi', 'fungi']
  },
  building_mountain_pass_stone_archway: {
    id: 'building_mountain_pass_stone_archway',
    name: 'Gapura Gerbang Cadas Celah Gunung',
    px: { w: 380, h: 380 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'gate', 'archway', 'pass', 'chokepoint']
  },
  nature_limestone_karst_sinkhole_pond: {
    id: 'nature_limestone_karst_sinkhole_pond',
    name: 'Danau Cekungan Karst Air Toska',
    px: { w: 380, h: 380 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'pond', 'sinkhole', 'karst', 'water']
  },
  building_countryside_bamboo_vegetable_trellis: {
    id: 'building_countryside_bamboo_vegetable_trellis',
    name: 'Para-Para Bambu Sayur Pedesaan',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'trellis', 'bamboo', 'farm', 'vegetable', 'countryside']
  },
  nature_bamboo_culm_breeze_cluster: {
    id: 'nature_bamboo_culm_breeze_cluster',
    name: 'Rumpun Batang Bambu Hijau Berayun',
    px: { w: 220, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'soft',
    staminaMult: 1.25,
    sortBias: 0,
    fogFoot: true,
    tags: ['bamboo', 'tree', 'vegetation', 'nature', 'wind']
  },
  nature_wild_medicinal_ginseng_flowering: {
    id: 'nature_wild_medicinal_ginseng_flowering',
    name: 'Ginseng Liar Berbunga Cadas Gunung',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'ginseng', 'herb', 'rock', 'medicinal', 'flora']
  },
  building_rustic_pottery_kiln_earthen: {
    id: 'building_rustic_pottery_kiln_earthen',
    name: 'Tungku Pembakaran Gerabah Tanah Liat',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'kiln', 'pottery', 'craft', 'artisan', 'earthen']
  },
  building_village_stone_water_trough: {
    id: 'building_village_stone_water_trough',
    name: 'Palung Air Batu Granit Pedesaan',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'trough', 'water', 'basin', 'village', 'spring']
  },
  nature_ancient_scholar_cypress_stone_cairn: {
    id: 'nature_ancient_scholar_cypress_stone_cairn',
    name: 'Cemara Kuno & Tumpukan Batu Doa',
    px: { w: 320, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'cypress', 'pine', 'cairn', 'shrine', 'nature']
  },
  nature_wild_mountain_medicinal_angelica: {
    id: 'nature_wild_mountain_medicinal_angelica',
    name: 'Herba Liar Angelica Dang Gui',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'angelica', 'herb', 'medicinal', 'flora']
  },
  building_wayside_bamboo_raft_mooring_post: {
    id: 'building_wayside_bamboo_raft_mooring_post',
    name: 'Tiang Tambatan Rakit Tepi Sungai',
    px: { w: 320, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'mooring', 'dock', 'river', 'raft', 'water']
  },
  building_wayside_bamboo_tea_shed_bench: {
    id: 'building_wayside_bamboo_tea_shed_bench',
    name: 'Pondok Rehat Teh Bambu Tepi Jalan',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'tea', 'shed', 'bench', 'wayside', 'rest']
  },
  nature_mountain_waterfall_splash_basin: {
    id: 'nature_mountain_waterfall_splash_basin',
    name: 'Kolam Percikan Air Terjun Batu Granit',
    px: { w: 340, h: 340 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'waterfall', 'pool', 'water', 'stream', 'rock']
  },
  building_rustic_bamboo_water_pipe_aqueduct: {
    id: 'building_rustic_bamboo_water_pipe_aqueduct',
    name: 'Talang Air Bambu Irigasi Sawah',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'aqueduct', 'irrigation', 'bamboo', 'water', 'farm']
  },
  nature_wild_mountain_medicinal_wolfberry_bush: {
    id: 'nature_wild_mountain_medicinal_wolfberry_bush',
    name: 'Rumpun Semak Buah Goji Liar',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.15,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'wolfberry', 'goji', 'herb', 'medicinal', 'flora']
  },
  building_wayside_stone_boundary_stele: {
    id: 'building_wayside_stone_boundary_stele',
    name: 'Prasasti Tugu Batas Wilayah Beratap Batu',
    px: { w: 320, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'stele', 'boundary', 'stone', 'shrine', 'wayside']
  },
  nature_mountain_wild_medicinal_polygonum: {
    id: 'nature_mountain_wild_medicinal_polygonum',
    name: 'Herba Liar He Shou Wu Merambat',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'polygonum', 'herb', 'medicinal', 'vine', 'flora']
  },
  building_village_bamboo_grain_drying_mat: {
    id: 'building_village_bamboo_grain_drying_mat',
    name: 'Anyaman Bambu Penjemur Gabah Padi',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'grain', 'drying', 'bamboo', 'mat', 'farm', 'village']
  },
  nature_ancient_scholar_twisted_juniper: {
    id: 'nature_ancient_scholar_twisted_juniper',
    name: 'Juniper Purba Memilin Karang Terjal',
    px: { w: 320, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'juniper', 'cliff', 'pine', 'nature']
  },
  building_wayside_fortune_teller_booth: {
    id: 'building_wayside_fortune_teller_booth',
    name: 'Kios Tenda Peramal Nasib Bagua',
    px: { w: 320, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'fortune', 'divination', 'bagua', 'booth', 'wayside']
  },
  nature_mountain_wild_medicinal_salvia_miltiorrhiza: {
    id: 'nature_mountain_wild_medicinal_salvia_miltiorrhiza',
    name: 'Herba Liar Dan Shen Akar Merah',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'salvia', 'danshen', 'herb', 'medicinal', 'flora']
  },
  building_village_stone_pigpen_pen: {
    id: 'building_village_stone_pigpen_pen',
    name: 'Kandang Ternak Pagar Batu Desa',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'pen', 'enclosure', 'stone', 'livestock', 'village']
  },
  nature_ancient_scholar_weeping_willow_bank: {
    id: 'nature_ancient_scholar_weeping_willow_bank',
    name: 'Pohon Dedalu Kuno Tepi Sungai',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'soft',
    staminaMult: 1.2,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'willow', 'river', 'bank', 'water', 'nature']
  },
  building_village_earthen_dyeing_vats: {
    id: 'building_village_earthen_dyeing_vats',
    name: 'Tempayan Tanah Liat Pewarna Kain Nila',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'dyeing', 'indigo', 'vats', 'fabric', 'village']
  },
  building_wayside_stone_well_windlass: {
    id: 'building_wayside_stone_well_windlass',
    name: 'Sumur Batu Kerekan Kayu Pedesaan',
    px: { w: 320, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'well', 'water', 'windlass', 'village', 'wayside']
  },
  nature_mountain_wild_medicinal_astragalus: {
    id: 'nature_mountain_wild_medicinal_astragalus',
    name: 'Herba Liar Huang Qi Penguat Qi',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'astragalus', 'huangqi', 'herb', 'medicinal', 'flora']
  },
  nature_ancient_scholar_twisted_wisteria_canopy: {
    id: 'nature_ancient_scholar_twisted_wisteria_canopy',
    name: 'Wisteria Purba Tirai Bunga Ungu',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'wisteria', 'flower', 'purple', 'canopy', 'nature']
  },
  building_wayside_straw_scarecrow_bamboo: {
    id: 'building_wayside_straw_scarecrow_bamboo',
    name: 'Orang-Orangan Sawah Topi Jerami',
    px: { w: 320, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'scarecrow', 'straw', 'farm', 'field', 'wayside']
  },
  building_village_stone_grain_mortar_pestle: {
    id: 'building_village_stone_grain_mortar_pestle',
    name: 'Lesung Penumbuk Padi Kayu Pedesaan',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'mortar', 'pestle', 'grain', 'rice', 'village', 'farm']
  },
  nature_mountain_wild_medicinal_licorice_root: {
    id: 'nature_mountain_wild_medicinal_licorice_root',
    name: 'Herba Liar Akar Manis Gan Cao',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'licorice', 'gancao', 'herb', 'medicinal', 'flora']
  },
  nature_ancient_scholar_silver_birch_grove: {
    id: 'nature_ancient_scholar_silver_birch_grove',
    name: 'Rumpun Pohon Birch Perak Kuno',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'birch', 'silver_birch', 'grove', 'forest', 'nature']
  },
  building_village_stone_grain_roller_mill: {
    id: 'building_village_stone_grain_roller_mill',
    name: 'Kilang Gilingan Gandum Batu Silinder',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'mill', 'roller', 'grain', 'flour', 'village', 'farm']
  },
  building_wayside_wooden_mile_marker_stele: {
    id: 'building_wayside_wooden_mile_marker_stele',
    name: 'Tugu Tiang Petunjuk Jalan & Pos Istirahat',
    px: { w: 320, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'signpost', 'marker', 'milestone', 'bench', 'wayside']
  },
  nature_mountain_wild_medicinal_aconite_monkshood: {
    id: 'nature_mountain_wild_medicinal_aconite_monkshood',
    name: 'Herba Beracun Fu Zi Bunga Helm Ungu',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'aconite', 'fuzi', 'monkshood', 'herb', 'medicinal', 'flora']
  },
  nature_ancient_scholar_red_maple_cliff: {
    id: 'nature_ancient_scholar_red_maple_cliff',
    name: 'Pohon Maple Merah Kuno Puncak Tebing',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'maple', 'red_maple', 'cliff', 'autumn', 'nature']
  },
  building_village_bamboo_weaving_shed: {
    id: 'building_village_bamboo_weaving_shed',
    name: 'Bangsal Bengkel Anyaman Bambu Pedesaan',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'weaving', 'bamboo', 'shed', 'workshop', 'craft', 'village']
  },
  building_wayside_stone_stele_shrine_arbor: {
    id: 'building_wayside_stone_stele_shrine_arbor',
    name: 'Kuil Gazebo Prasasti Batu Kuno',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'stele', 'bixi', 'shrine', 'arbor', 'pavilion', 'wayside']
  },
  nature_mountain_wild_medicinal_coptis_rhizome: {
    id: 'nature_mountain_wild_medicinal_coptis_rhizome',
    name: 'Herba Liar Kuning Emas Huang Lian',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'coptis', 'huanglian', 'herb', 'medicinal', 'flora']
  },
  building_wayside_stone_arch_bridge: {
    id: 'building_wayside_stone_arch_bridge',
    name: 'Jembatan Busur Batu Lengkung Pedesaan',
    px: { w: 360, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'bridge', 'stone', 'arch', 'water', 'wayside']
  },
  building_village_wooden_paddy_waterwheel: {
    id: 'building_village_wooden_paddy_waterwheel',
    name: 'Kincir Air Irigasi Bambu Sawah Tongche',
    px: { w: 360, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'waterwheel', 'noria', 'tongche', 'irrigation', 'bamboo', 'village', 'farm']
  },
  nature_mountain_wild_medicinal_dendrobium_orchid: {
    id: 'nature_mountain_wild_medicinal_dendrobium_orchid',
    name: 'Anggrek Tebing Liar Shi Hu',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'orchid', 'shihu', 'dendrobium', 'herb', 'medicinal', 'flora', 'cliff']
  },
  nature_ancient_scholar_ginkgo_gold_canopy: {
    id: 'nature_ancient_scholar_ginkgo_gold_canopy',
    name: 'Pohon Ginkgo Kuno Daun Emas',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'ginkgo', 'gold', 'autumn', 'ancient', 'nature']
  },
  building_village_stone_tofu_press_bench: {
    id: 'building_village_stone_tofu_press_bench',
    name: 'Bangku Penindih Cetakan Tahu Pedesaan',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'tofu', 'bench', 'press', 'village', 'food', 'farm']
  },
  building_wayside_bamboo_courier_mailbox_stand: {
    id: 'building_wayside_bamboo_courier_mailbox_stand',
    name: 'Tiang Pos Kurir Pengantar Surat',
    px: { w: 320, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'courier', 'mailbox', 'post', 'station', 'wayside']
  },
  nature_mountain_wild_medicinal_polygonatum_kingianum: {
    id: 'nature_mountain_wild_medicinal_polygonatum_kingianum',
    name: 'Herba Purba Huang Jing Rimpang Emas',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'huangjing', 'solomon', 'herb', 'medicinal', 'flora']
  },
  nature_ancient_scholar_weeping_peach_blossom: {
    id: 'nature_ancient_scholar_weeping_peach_blossom',
    name: 'Pohon Persik Menangis Bunga Merah Muda',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'peach', 'pantao', 'blossom', 'spring', 'nature']
  },
  building_village_bamboo_duck_coop_ramp: {
    id: 'building_village_bamboo_duck_coop_ramp',
    name: 'Kandang Bebek Anyaman Bambu Tepi Air',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'duck', 'coop', 'bamboo', 'village', 'water', 'farm']
  },
  building_wayside_stone_rain_shelter_arbor: {
    id: 'building_wayside_stone_rain_shelter_arbor',
    name: 'Gardu Batu Pelindung Hujan Tepi Jalan',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'arbor', 'shelter', 'pavilion', 'stone', 'wayside', 'road']
  },
  nature_mountain_wild_medicinal_codonopsis_dangshen: {
    id: 'nature_mountain_wild_medicinal_codonopsis_dangshen',
    name: 'Herba Dang Shen Liar Tebing Gunung',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'dangshen', 'codonopsis', 'herb', 'medicinal', 'rock', 'flora']
  },
  nature_ancient_scholar_golden_larch_ridge: {
    id: 'nature_ancient_scholar_golden_larch_ridge',
    name: 'Pohon Larch Emas Kuno Punggung Bukit',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'larch', 'golden', 'autumn', 'ancient', 'ridge', 'nature']
  },
  building_village_bamboo_fish_trap_weir: {
    id: 'building_village_bamboo_fish_trap_weir',
    name: 'Perangkap Ikan Anyaman Bambu Tepi Sungai',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'fish', 'trap', 'weir', 'bamboo', 'village', 'river', 'fishing']
  },
  building_wayside_stone_stele_pavilion_ruin: {
    id: 'building_wayside_stone_stele_pavilion_ruin',
    name: 'Reruntuhan Paviliun Prasasti Batu Kuno',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'stele', 'pavilion', 'ruin', 'stone', 'ancient', 'wayside']
  },
  nature_mountain_wild_medicinal_rehmannia_dihuang: {
    id: 'nature_mountain_wild_medicinal_rehmannia_dihuang',
    name: 'Herba Di Huang Liar Rimpang Segar',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'dihuang', 'rehmannia', 'herb', 'medicinal', 'rock', 'flora']
  },
  nature_ancient_scholar_twisted_locust_tree: {
    id: 'nature_ancient_scholar_twisted_locust_tree',
    name: 'Pohon Akasia Kuno Berbunga Putih',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'locust', 'scholar', 'white', 'blossom', 'ancient', 'nature']
  },
  building_wayside_bamboo_torch_beacon_brazier: {
    id: 'building_wayside_bamboo_torch_beacon_brazier',
    name: 'Tiang Obor Suar Bambu Tepi Jalan Gunung',
    px: { w: 320, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'torch', 'beacon', 'brazier', 'bamboo', 'fire', 'wayside']
  },
  building_village_stone_grain_soaking_cistern: {
    id: 'building_village_stone_grain_soaking_cistern',
    name: 'Bak Batu Perendaman Padi Desa',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'cistern', 'soaking', 'grain', 'stone', 'village', 'water', 'farm']
  },
  nature_mountain_wild_medicinal_baical_skullcap_huangqin: {
    id: 'nature_mountain_wild_medicinal_baical_skullcap_huangqin',
    name: 'Herba Huang Qin Liar Bunga Ungu Biru',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'huangqin', 'scutellaria', 'herb', 'medicinal', 'rock', 'flora']
  },
  nature_ancient_scholar_twisted_camphor_canopy: {
    id: 'nature_ancient_scholar_twisted_camphor_canopy',
    name: 'Pohon Kamper Kuno Kanopi Payung Raksasa',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'camphor', 'ancient', 'umbrella', 'canopy', 'green', 'nature']
  },
  landmark_central_plains_tianjing_palace_gate: {
    id: 'landmark_central_plains_tianjing_palace_gate',
    name: 'Gerbang Naga Giok Istana Tianjing',
    px: { w: 460, h: 420 },
    footprint: { cw: 4, ch: 3 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'tianjing', 'palace', 'gate', 'capital', 'imperial', 'building']
  },
  landmark_northern_desolate_frozen_mammoth_shrine: {
    id: 'landmark_northern_desolate_frozen_mammoth_shrine',
    name: 'Kuil Es Purba Gading Mammoth',
    px: { w: 420, h: 420 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'shrine', 'mammoth', 'frost', 'tundra', 'altar', 'building']
  },
  landmark_western_sacred_desert_silk_caravan_oasis: {
    id: 'landmark_western_sacred_desert_silk_caravan_oasis',
    name: 'Oase Benteng Jalur Sutra Shadi',
    px: { w: 480, h: 460 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'oasis', 'desert', 'caravan', 'silk', 'fortress', 'building']
  },
  landmark_azure_mountain_sword_peak_monolith: {
    id: 'landmark_azure_mountain_sword_peak_monolith',
    name: 'Monolit Batu Puncak Pedang Azure',
    px: { w: 380, h: 500 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 15,
    fogFoot: true,
    tags: ['landmark', 'monolith', 'sword', 'mountain', 'crag', 'rock', 'nature']
  },
  landmark_nine_springs_delta_dragon_water_pavilion: {
    id: 'landmark_nine_springs_delta_dragon_water_pavilion',
    name: 'Paviliun Air Naga Sembilan Mata Air',
    px: { w: 480, h: 480 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'pavilion', 'water', 'dragon', 'spring', 'delta', 'building']
  },
  landmark_mirror_lake_submerged_daoist_pavilion: {
    id: 'landmark_mirror_lake_submerged_daoist_pavilion',
    name: 'Paviliun Daois Terapung Danau Cermin',
    px: { w: 480, h: 480 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'pavilion', 'lake', 'daoist', 'water', 'lotus', 'building']
  },
  landmark_hermit_highlands_cloud_bamboo_observatory: {
    id: 'landmark_hermit_highlands_cloud_bamboo_observatory',
    name: 'Observatorium Bambu Awan Dataran Pertapa',
    px: { w: 480, h: 500 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 12,
    fogFoot: true,
    tags: ['landmark', 'observatory', 'bamboo', 'highlands', 'cloud', 'astronomy', 'building']
  },
  landmark_border_march_iron_garrison_gatehouse: {
    id: 'landmark_border_march_iron_garrison_gatehouse',
    name: 'Benteng Gerbang Besi Perbatasan Militer',
    px: { w: 460, h: 420 },
    footprint: { cw: 4, ch: 3 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'garrison', 'fortress', 'gatehouse', 'iron', 'border', 'military', 'building']
  },
  landmark_thundersteppe_lightning_attractor_pillar: {
    id: 'landmark_thundersteppe_lightning_attractor_pillar',
    name: 'Pilar Penangkal Petir Padang Halilintar',
    px: { w: 380, h: 500 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 15,
    fogFoot: true,
    tags: ['landmark', 'pillar', 'lightning', 'thunder', 'steppe', 'rune', 'obelisk', 'nature']
  },
  landmark_beast_prairies_tribal_totem_encampment: {
    id: 'landmark_beast_prairies_tribal_totem_encampment',
    name: 'Perkemahan Totem Suku Padang Siluman',
    px: { w: 480, h: 480 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'camp', 'yurt', 'totem', 'prairie', 'tribal', 'beast', 'building']
  },
  landmark_lava_spine_magma_forge_crater: {
    id: 'landmark_lava_spine_magma_forge_crater',
    name: 'Kawah Tempa Magma Punggung Lahar',
    px: { w: 480, h: 480 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'crater', 'forge', 'magma', 'lava', 'volcano', 'obsidian', 'nature']
  },
  landmark_venom_mire_sunken_serpent_pagoda: {
    id: 'landmark_venom_mire_sunken_serpent_pagoda',
    name: 'Pagoda Ular Tenggelam Rawa Beracun',
    px: { w: 460, h: 500 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 12,
    fogFoot: true,
    tags: ['landmark', 'pagoda', 'serpent', 'mire', 'poison', 'venom', 'swamp', 'building']
  },
  landmark_southern_demon_domain_skull_gate: {
    id: 'landmark_southern_demon_domain_skull_gate',
    name: 'Gerbang Tengkorak Iblis Wilayah Selatan',
    px: { w: 480, h: 420 },
    footprint: { cw: 4, ch: 3 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'gate', 'skull', 'demon', 'fortress', 'domain', 'building']
  },
  landmark_crimson_battlefield_broken_halberd_cairn: {
    id: 'landmark_crimson_battlefield_broken_halberd_cairn',
    name: 'Gundukan Tombak Patah Medan Tempur Berdarah',
    px: { w: 420, h: 420 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'cairn', 'halberd', 'weapons', 'battlefield', 'crimson', 'war', 'nature']
  },
  landmark_abyssal_scar_void_chain_anchor: {
    id: 'landmark_abyssal_scar_void_chain_anchor',
    name: 'Jangkar Rantai Hampa Jurang Bekas Luka',
    px: { w: 380, h: 500 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 15,
    fogFoot: true,
    tags: ['landmark', 'anchor', 'chain', 'void', 'abyss', 'scar', 'seal', 'nature']
  },
  resource_spirit_spring: {
    id: 'resource_spirit_spring',
    name: 'Mata Air Roh Alami',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'spring', 'water']
  },
  resource_heavenly_iron_ore: {
    id: 'resource_heavenly_iron_ore',
    name: 'Bijih Besi Bintang Jatuh',
    px: { w: 220, h: 220 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'mine', 'ore']
  },
  resource_spirit_koi_pool: {
    id: 'resource_spirit_koi_pool',
    name: 'Kolam Ikan Koi Spiritual',
    px: { w: 240, h: 240 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'pool', 'fish']
  },
  resource_ancient_herb_garden: {
    id: 'resource_ancient_herb_garden',
    name: 'Petak Kebun Herbal Rohani',
    px: { w: 240, h: 240 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'farm', 'herb']
  },
  resource_ancient_sword_tomb: {
    id: 'resource_ancient_sword_tomb',
    name: 'Makam Pedang Purba',
    px: { w: 240, h: 240 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'tomb', 'sword']
  },
  resource_ancient_lightning_bamboo: {
    id: 'resource_ancient_lightning_bamboo',
    name: 'Rumpun Bambu Petir Kuno',
    px: { w: 240, h: 240 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'bamboo', 'lightning']
  },
  nature_bamboo_sparse_single: {
    id: 'nature_bamboo_sparse_single',
    name: 'Bambu Ramping Tunggal',
    px: { w: 120, h: 240 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['nature', 'bamboo']
  },
  nature_pine_ancient_twisted: {
    id: 'nature_pine_ancient_twisted',
    name: 'Pinus Kuno Meliuk',
    px: { w: 240, h: 260 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tree', 'pine']
  },
  nature_karst_twin_peaks: {
    id: 'nature_karst_twin_peaks',
    name: 'Tebing Karst Kembar',
    px: { w: 260, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'karst', 'cliff']
  },
  nature_plum_blossom_lone: {
    id: 'nature_plum_blossom_lone',
    name: 'Pohon Prem Mekar Kuno',
    px: { w: 240, h: 260 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tree', 'blossom']
  },
  nature_boulder_cluster_river: {
    id: 'nature_boulder_cluster_river',
    name: 'Gugusan Batu Kali Berlumut',
    px: { w: 240, h: 240 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['nature', 'rock', 'river']
  },
  nature_cypress_grove_mist: {
    id: 'nature_cypress_grove_mist',
    name: 'Rumpun Cemara Kuno Berkabut',
    px: { w: 300, h: 320 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'soft',
    staminaMult: 1.2,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tree', 'cypress', 'grove']
  },
  nature_willow_lone_stream: {
    id: 'nature_willow_lone_stream',
    name: 'Pohon Willow Menunduk Tepi Air',
    px: { w: 260, h: 260 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tree', 'willow', 'water']
  },
  nature_rock_stepping_stones: {
    id: 'nature_rock_stepping_stones',
    name: 'Batu Loncatan Penyeberangan Sungai',
    px: { w: 260, h: 240 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.4,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['nature', 'rock', 'stepping_stone', 'river']
  },
  nature_pine_windswept_cliff: {
    id: 'nature_pine_windswept_cliff',
    name: 'Pinus Meliuk Terpaan Angin di Cadas',
    px: { w: 280, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tree', 'pine', 'cliff', 'crag']
  },
  nature_reed_bed_marsh: {
    id: 'nature_reed_bed_marsh',
    name: 'Rumpun Gelagah & Ilalang Rawa',
    px: { w: 260, h: 260 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.15,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'marsh', 'reed', 'water', 'vegetation']
  },
  nature_lotus_pond_cluster: {
    id: 'nature_lotus_pond_cluster',
    name: 'Rumpun Teratai Mekar Air Tenang',
    px: { w: 260, h: 260 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.4,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['nature', 'water', 'lotus', 'pond', 'flower']
  },
  nature_autumn_maple_grove: {
    id: 'nature_autumn_maple_grove',
    name: 'Rumpun Maple Merah Musim Gugur',
    px: { w: 280, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'soft',
    staminaMult: 1.1,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tree', 'maple', 'autumn', 'foliage']
  },
  nature_wisteria_ancient_arbor: {
    id: 'nature_wisteria_ancient_arbor',
    name: 'Pohon Wisteria Ungu Menjuntai',
    px: { w: 280, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'soft',
    staminaMult: 1.1,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tree', 'wisteria', 'flower', 'flora']
  },
  nature_mossy_stream_cascade: {
    id: 'nature_mossy_stream_cascade',
    name: 'Undakan Air Terjun Cadas Berlumut',
    px: { w: 280, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'water', 'waterfall', 'cascade', 'rock']
  },
  nature_ginkgo_ancient_gold: {
    id: 'nature_ginkgo_ancient_gold',
    name: 'Pohon Ginkgo Emas Kuno',
    px: { w: 300, h: 320 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'soft',
    staminaMult: 1.15,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tree', 'ginkgo', 'gold', 'autumn']
  },
  nature_crystal_cluster_cave_rock: {
    id: 'nature_crystal_cluster_cave_rock',
    name: 'Cadas Karang Kristal Roh',
    px: { w: 280, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'rock', 'crystal', 'mineral', 'cave']
  },
  nature_limestone_stalagmite_spire: {
    id: 'nature_limestone_stalagmite_spire',
    name: 'Pilar Karst Batu Kapur Runcing',
    px: { w: 260, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 1.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'rock', 'karst', 'spire', 'pinnacle', 'mountain']
  },
  nature_cherry_blossom_twin: {
    id: 'nature_cherry_blossom_twin',
    name: 'Rumpun Sakura Gunung Mekar',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'soft',
    staminaMult: 1.1,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tree', 'cherry_blossom', 'sakura', 'flower', 'spring']
  },
  nature_river_pebble_shoal: {
    id: 'nature_river_pebble_shoal',
    name: 'Hamparan Kerikil dan Pasir Tepi Sungai',
    px: { w: 340, h: 220 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.4,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['nature', 'river', 'pebble', 'shoal', 'sand', 'water_edge']
  },
  nature_bamboo_sunlit_grove: {
    id: 'nature_bamboo_sunlit_grove',
    name: 'Rumpun Bambu Rebung Segar',
    px: { w: 320, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'soft',
    staminaMult: 1.2,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'bamboo', 'grove', 'shoots', 'spring']
  },
  nature_granite_boulder_basking: {
    id: 'nature_granite_boulder_basking',
    name: 'Bongkahan Batu Granit Meditasi',
    px: { w: 340, h: 280 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'rock', 'granite', 'boulder', 'meditation', 'mountain']
  },
  nature_ancient_scholar_tree_pagoda: {
    id: 'nature_ancient_scholar_tree_pagoda',
    name: 'Pohon Sarjana Kuno Rimbun',
    px: { w: 340, h: 340 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'soft',
    staminaMult: 1.15,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'tree', 'scholar_tree', 'pagoda_tree', 'shade']
  },
  nature_mossy_river_driftwood: {
    id: 'nature_mossy_river_driftwood',
    name: 'Batang Kayu Hanyut Purba Berlumut',
    px: { w: 340, h: 240 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['nature', 'river', 'driftwood', 'wood', 'water_edge']
  },
  nature_wild_mountain_camellia_shrub: {
    id: 'nature_wild_mountain_camellia_shrub',
    name: 'Rumpun Semak Kamelia Liar Mekar',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.0,
    collision: 'soft',
    staminaMult: 1.1,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'flower', 'camellia', 'shrub', 'mountain']
  },
  nature_bamboo_hanging_creeper: {
    id: 'nature_bamboo_hanging_creeper',
    name: 'Rumpun Bambu Rambat Menjuntai',
    px: { w: 320, h: 340 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'soft',
    staminaMult: 1.2,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'bamboo', 'vines', 'creeper', 'forest']
  },
  nature_crag_layered_shale_shelf: {
    id: 'nature_crag_layered_shale_shelf',
    name: 'Tebing Cadas Serpih Berlapis',
    px: { w: 340, h: 300 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'rock', 'crag', 'shale', 'strata', 'mountain']
  },
  boulder_1x1: {
    id: 'boulder_1x1',
    name: 'Bongkahan Batu Cadas',
    px: { w: 100, h: 110 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['rock']
  },

  // --- SCATTER CATALOG SPECIFIC IDS ---
  bamboo_jade_2x2_l_dense: {
    id: 'bamboo_jade_2x2_l_dense',
    name: 'Hutan Bambu Giok Padat',
    px: { w: 200, h: 260 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.6,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 0,
    fogFoot: true,
    tags: ['bamboo']
  },
  bamboo_jade_2x1_m_dense: {
    id: 'bamboo_jade_2x1_m_dense',
    name: 'Rumpun Bambu Giok Rimbun',
    px: { w: 200, h: 220 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.2,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 0,
    fogFoot: true,
    tags: ['bamboo']
  },
  bamboo_jade_1x1_s_sparse: {
    id: 'bamboo_jade_1x1_s_sparse',
    name: 'Rumpun Bambu Giok Muda',
    px: { w: 100, h: 180 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.25,
    sortBias: 0,
    fogFoot: true,
    tags: ['bamboo']
  },
  tree_spirit_peach_v1: {
    id: 'tree_spirit_peach_v1',
    name: 'Pohon Persik Roh Kuno',
    px: { w: 200, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'spirit']
  },
  tree_willow_river_v1: {
    id: 'tree_willow_river_v1',
    name: 'Pohon Gandaria Sungai',
    px: { w: 200, h: 200 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.0,
    collision: 'soft',
    staminaMult: 1.15,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'willow']
  },
  tree_pine_ancient_v1: {
    id: 'tree_pine_ancient_v1',
    name: 'Pinus Kuno Jianghu',
    px: { w: 100, h: 160 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.6,
    collision: 'soft',
    staminaMult: 1.15,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'pine']
  },
  rock_crag_cluster_v1: {
    id: 'rock_crag_cluster_v1',
    name: 'Gugusan Cadas Kuno',
    px: { w: 200, h: 160 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['rock']
  },
  rock_boulder_moss_v1: {
    id: 'rock_boulder_moss_v1',
    name: 'Batu Karang Berlumut',
    px: { w: 100, h: 100 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['rock']
  },
  building_sect_gate_v1: {
    id: 'building_sect_gate_v1',
    name: 'Gerbang Suci Sekte',
    px: { w: 300, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'sect']
  },
  building_road_inn_v1: {
    id: 'building_road_inn_v1',
    name: 'Kedai Minum Tepi Jalan',
    px: { w: 200, h: 240 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['building']
  },
  building_farm_hut_v1: {
    id: 'building_farm_hut_v1',
    name: 'Gubuk Ladang Petani',
    px: { w: 200, h: 180 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['building']
  },
  building_tea_pavilion_v1: {
    id: 'building_tea_pavilion_v1',
    name: 'Paviliun Teh Bambu',
    px: { w: 100, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.4,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['building']
  },
  mt_bastion_wall_v1: {
    id: 'mt_bastion_wall_v1',
    name: 'Dinding Tebing Raksasa',
    px: { w: 400, h: 560 },
    footprint: { cw: 4, ch: 3 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 2.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'barrier']
  },
  mt_twin_peaks_v1: {
    id: 'mt_twin_peaks_v1',
    name: 'Puncak Kembar Azure',
    px: { w: 300, h: 440 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 2.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'barrier']
  },
  mt_azure_crag_v1: {
    id: 'mt_azure_crag_v1',
    name: 'Cadas Karst Azure',
    px: { w: 200, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'barrier']
  },
  mt_ridge_double_v1: {
    id: 'mt_ridge_double_v1',
    name: 'Punggung Bukit Karst Ganda',
    px: { w: 200, h: 280 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 1.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'cliff']
  },
  mt_karst_pillar_v1: {
    id: 'mt_karst_pillar_v1',
    name: 'Pilar Karst Menjulang',
    px: { w: 100, h: 220 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'karst']
  },
  xitong_city_landmark: {
    id: 'xitong_city_landmark',
    name: 'Kota Pusat XiTong',
    px: { w: 512, h: 384 },
    footprint: { cw: 5, ch: 4 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['city', 'settlement', 'landmark']
  },
  bamboo_forest_cluster: {
    id: 'bamboo_forest_cluster',
    name: 'Rumpun Hutan Bambu Hijau',
    px: { w: 256, h: 256 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.0,
    collision: 'soft',
    staminaMult: 1.1,
    sortBias: 0,
    fogFoot: true,
    tags: ['bamboo', 'forest', 'nature']
  },
  azure_peak_crag: {
    id: 'azure_peak_crag',
    name: 'Puncak Tebing Cadas Azure',
    px: { w: 256, h: 256 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'cliff', 'karst']
  },
  willow_river_curve: {
    id: 'willow_river_curve',
    name: 'Pohon Dedalu Tepi Sungai',
    px: { w: 256, h: 256 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.0,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['willow', 'tree', 'riverbank']
  },
  monster_swirl_den: {
    id: 'monster_swirl_den',
    name: 'Sarang Pusaran Siluman Iblis',
    px: { w: 256, h: 256 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0,
    collision: 'soft',
    staminaMult: 1.2,
    sortBias: 0,
    fogFoot: false,
    tags: ['monster', 'den', 'swirl']
  },
  building_ferry_dock: {
    id: 'building_ferry_dock',
    name: 'Dermaga Rakit Penyeberangan Sungai',
    px: { w: 384, h: 288 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 5,
    fogFoot: true,
    tags: ['building', 'dock', 'ferry']
  },
  resource_spirit_jade: {
    id: 'resource_spirit_jade',
    name: 'Endapan Giok Roh Hijau',
    px: { w: 192, h: 192 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'jade', 'rock']
  },
  resource_iron_ore: {
    id: 'resource_iron_ore',
    name: 'Bongkahan Bijih Besi Hitam',
    px: { w: 192, h: 192 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'iron', 'ore']
  },
  dungeon_cave_entrance: {
    id: 'dungeon_cave_entrance',
    name: 'Mulut Gua Kuno Labirin Bertuah',
    px: { w: 256, h: 256 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 5,
    fogFoot: true,
    tags: ['dungeon', 'cave', 'structure']
  },
  resource_golden_carp: {
    id: 'resource_golden_carp',
    name: 'Ikan Mas Roh Jianghu',
    px: { w: 192, h: 192 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.2,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['resource', 'fish', 'water']
  },
  resource_spirit_wood: {
    id: 'resource_spirit_wood',
    name: 'Kayu Gelondongan Roh Purba',
    px: { w: 192, h: 192 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'wood', 'timber']
  }
};

// ============================================================================
// 2. TERRAIN COLOR PALETTES (L1 WASH ENGINE)
// ============================================================================

export interface TerrainWashPalette {
  baseColor: string;
  accentColor: string;
  mistColor: string;
  isWater?: boolean;
  isHazard?: boolean;
  staminaCost: number;
}

export function getTerrainWashPalette(terrainType: string): TerrainWashPalette {
  switch (terrainType) {
    // Water
    case 'river':
    case 'river_shallow':
      return { baseColor: '#A4C4CE', accentColor: '#7C97A6', mistColor: '#DCE8EC', isWater: true, staminaCost: 1.5 };
    case 'lake':
    case 'lake_deep':
      return { baseColor: '#7C9EB2', accentColor: '#53788F', mistColor: '#C8DEE8', isWater: true, staminaCost: 2.0 };
    case 'ocean':
    case 'eastern_sea':
    case 'sea':
    case 'sea_reef':
      return { baseColor: '#5C8299', accentColor: '#3E5E73', mistColor: '#B0C9D6', isWater: true, staminaCost: 3.0 };
    case 'pond_lotus':
      return { baseColor: '#93B7AA', accentColor: '#5E8C7B', mistColor: '#D7E9E2', isWater: true, staminaCost: 1.4 };

    // Vegetation & Farmland
    case 'meadow':
      return { baseColor: '#D4DEC9', accentColor: '#A8BC99', mistColor: '#EFF3EA', staminaCost: 1.0 };
    case 'farmland':
    case 'herb_field':
      return { baseColor: '#C9D6B8', accentColor: '#8CA37A', mistColor: '#E9EFE0', staminaCost: 1.0 };
    case 'bamboo_grove':
    case 'bamboo_dense':
    case 'bamboo_forest':
      return { baseColor: '#BDCEBA', accentColor: '#5E8C7B', mistColor: '#E2EBE0', staminaCost: 1.3 };
    case 'spirit_wood':
    case 'forest':
      return { baseColor: '#B5C4B1', accentColor: '#4A6B53', mistColor: '#DFE7DC', staminaCost: 1.2 };
    case 'dead_wood':
      return { baseColor: '#C4BCB1', accentColor: '#736B60', mistColor: '#E5E0DA', staminaCost: 1.4 };

    // Mountains, Hills & Cliffs
    case 'hill':
    case 'ridge_low':
      return { baseColor: '#CDC4B5', accentColor: '#9A8F82', mistColor: '#ECE7E0', staminaCost: 1.6 };
    case 'mountain':
    case 'azure_mountain':
    case 'mountain_rock':
    case 'cliff':
      return { baseColor: '#B2ABA0', accentColor: '#5C5449', mistColor: '#DDD7CF', staminaCost: 3.5 };
    case 'mountain_peak':
      return { baseColor: '#999187', accentColor: '#3D372E', mistColor: '#CECBC5', staminaCost: 4.0 };
    case 'canyon_floor':
      return { baseColor: '#C2B4A3', accentColor: '#7E6F5E', mistColor: '#E8E1D7', staminaCost: 1.8 };
    case 'mountain_pass':
    case 'sword_gorge_pass':
      return { baseColor: '#B8AF9F', accentColor: '#706454', mistColor: '#E2DCD2', staminaCost: 1.2 };

    // Desert & Sand
    case 'western_desert':
    case 'desert_sand':
    case 'dune':
    case 'desert':
      return { baseColor: '#E6D7B8', accentColor: '#C4AF86', mistColor: '#F5EFE0', staminaCost: 1.4 };
    case 'oasis':
      return { baseColor: '#C4D6B0', accentColor: '#6B9668', mistColor: '#EAF2DF', staminaCost: 1.0 };

    // Snow & Ice
    case 'snow':
    case 'northern_glacial':
      return { baseColor: '#E5ECF2', accentColor: '#AFC4D6', mistColor: '#F6F9FC', staminaCost: 1.5 };
    case 'glacier':
    case 'ice_crack':
      return { baseColor: '#D0E0EC', accentColor: '#7C9FB8', mistColor: '#EDF5FB', staminaCost: 2.2 };

    // Dangerous / Hazard
    case 'swamp':
    case 'demonic_swamp':
      return { baseColor: '#BDB3C7', accentColor: '#6E5D7A', mistColor: '#E5DFEB', isHazard: true, staminaCost: 2.0 };
    case 'poison_pool':
    case 'miasma_waste':
      return { baseColor: '#B29BBF', accentColor: '#583669', mistColor: '#E2D6E9', isHazard: true, staminaCost: 2.5 };
    case 'lava_flow':
    case 'crater':
      return { baseColor: '#D1A392', accentColor: '#8C3D2E', mistColor: '#EED9D2', isHazard: true, staminaCost: 3.0 };
    case 'battlefield_ash':
    case 'abyss_edge':
      return { baseColor: '#A89E9D', accentColor: '#453B3A', mistColor: '#DCD4D4', isHazard: true, staminaCost: 2.2 };

    // Cultural / Settlement
    case 'settlement':
    case 'sect_ground':
      return { baseColor: '#DDD5C7', accentColor: '#8C775D', mistColor: '#F0ECE4', staminaCost: 1.0 };
    case 'ruin_floor':
    case 'formation_tile':
      return { baseColor: '#C7C2BA', accentColor: '#6E6B66', mistColor: '#E8E5E0', staminaCost: 1.1 };
    case 'road_stone':
    case 'road_dirt':
      return { baseColor: '#D8CFBF', accentColor: '#A39682', mistColor: '#EDE7DC', staminaCost: 0.8 };

    // Default Plains
    case 'plains':
    default:
      return { baseColor: '#E2DACB', accentColor: '#B5A894', mistColor: '#F4EFE6', staminaCost: 1.0 };
  }
}

// ============================================================================
// 3. PROCEDURAL PROCEDURES FOR L0, L1, L2, L3, L4, L6, L7
// ============================================================================

/**
 * L0: Renders parchment paper grain and faint grid (alpha ~0.06).
 */
export function renderL0XuanPaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  paperImg?: HTMLImageElement | null
) {
  if (paperImg && paperImg.complete && paperImg.naturalWidth > 0) {
    ctx.drawImage(paperImg, 0, 0, width, height);
  } else {
    // Warm Xuan paper gradient
    const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, width * 0.8);
    grad.addColorStop(0, '#FAF7F0');
    grad.addColorStop(0.6, '#F4EFE3');
    grad.addColorStop(1, '#EAE1CE');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle paper fibers (Xuan silk dust)
    ctx.fillStyle = 'rgba(120, 100, 80, 0.025)';
    for (let i = 0; i < 50; i++) {
      const fx = (i * 187.3) % width;
      const fy = (i * 329.7) % height;
      ctx.fillRect(fx, fy, 2, 2);
    }
  }
}

/**
 * L1 & L2: Renders flat ground wash and micro details within tile cell.
 */
export function renderL1TerrainCell(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileSize: number,
  terrainType: string,
  time: number,
  tx: number,
  ty: number
) {
  const p = getTerrainWashPalette(terrainType);

  // Soft wash fill
  ctx.fillStyle = p.baseColor;
  ctx.fillRect(sx, sy, tileSize, tileSize);

  // Subtle ink bleeding border
  ctx.strokeStyle = p.accentColor;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(sx, sy, tileSize, tileSize);

  // L2: Flat ground details (strictly 1 cell, no overflow)
  if (p.isWater) {
    // Water ripple strokes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    const wave1 = Math.sin(time * 1.5 + tx * 0.6 + ty * 0.4) * 2.5;
    ctx.beginPath();
    ctx.moveTo(sx + tileSize * 0.15, sy + tileSize * 0.45 + wave1);
    ctx.quadraticCurveTo(sx + tileSize * 0.5, sy + tileSize * 0.4 - wave1, sx + tileSize * 0.85, sy + tileSize * 0.45 + wave1);
    ctx.moveTo(sx + tileSize * 0.25, sy + tileSize * 0.75 - wave1);
    ctx.quadraticCurveTo(sx + tileSize * 0.6, sy + tileSize * 0.7 + wave1, sx + tileSize * 0.75, sy + tileSize * 0.75 - wave1);
    ctx.stroke();
  } else if (terrainType.includes('road')) {
    // Road stone paving / path track
    ctx.fillStyle = 'rgba(130, 115, 95, 0.25)';
    ctx.fillRect(sx + tileSize * 0.2, sy + tileSize * 0.2, tileSize * 0.6, tileSize * 0.6);
  } else if (terrainType.includes('meadow') || terrainType.includes('farmland') || terrainType === 'plains') {
    // Gentle grass tufts
    ctx.strokeStyle = 'rgba(70, 95, 65, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + tileSize * 0.3, sy + tileSize * 0.7);
    ctx.lineTo(sx + tileSize * 0.32, sy + tileSize * 0.58);
    ctx.moveTo(sx + tileSize * 0.65, sy + tileSize * 0.6);
    ctx.lineTo(sx + tileSize * 0.68, sy + tileSize * 0.48);
    ctx.stroke();
  } else if (terrainType.includes('desert') || terrainType.includes('dune')) {
    // Sand ripple
    ctx.strokeStyle = 'rgba(180, 150, 110, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx + tileSize * 0.1, sy + tileSize * 0.5);
    ctx.quadraticCurveTo(sx + tileSize * 0.5, sy + tileSize * 0.45, sx + tileSize * 0.9, sy + tileSize * 0.52);
    ctx.stroke();
  }
}

/**
 * L3: Soft foot mist (kabut di kaki objek menjulang).
 */
export function renderL3FootMist(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  footprintWidth: number,
  mistHeight: number
) {
  const mistGrad = ctx.createLinearGradient(0, baseY - mistHeight, 0, baseY + mistHeight * 0.5);
  mistGrad.addColorStop(0, 'rgba(244, 241, 234, 0)');
  mistGrad.addColorStop(0.6, 'rgba(244, 241, 234, 0.75)');
  mistGrad.addColorStop(1, 'rgba(244, 241, 234, 0.95)');

  ctx.fillStyle = mistGrad;
  ctx.beginPath();
  ctx.ellipse(baseX, baseY, footprintWidth * 0.7, mistHeight, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * L4: Tall procedural object renderer (Shuimo style).
 */
export function renderL4ProceduralObject(
  ctx: CanvasRenderingContext2D,
  defId: string,
  screenX: number,
  screenY: number,
  tileSize: number,
  time: number,
  alpha: number = 1.0,
  flipX: boolean = false
) {
  // 1. Try rendering from WebP texture atlas first (Song Dynasty Shuimo asset)
  const atlasName = getAtlasNameForDefId(defId);
  const def = OBJECT_DEFINITIONS[defId];
  const dw = def ? def.footprint.cw * tileSize : tileSize;
  const dh = def ? (def.footprint.ch + def.overhangCells) * tileSize : tileSize * 2;

  if (atlasLoader.drawAtlasFrame(ctx, atlasName, defId, screenX, screenY, dw, dh, alpha, flipX)) {
    return;
  }

  // 2. Fallback to procedural vector rendering if atlas not yet loaded or missing
  ctx.save();
  ctx.globalAlpha = alpha;

  if (flipX) {
    ctx.translate(screenX + tileSize, screenY);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(screenX, screenY);
  }

  if (defId.startsWith('karst_pillar') || defId.startsWith('mt_rock')) {
    // KARST ROCK PILLAR / MOUNTAIN PEAK
    const def = OBJECT_DEFINITIONS[defId] || OBJECT_DEFINITIONS.karst_pillar_1x1;
    const w = def.footprint.cw * tileSize;
    const h = (def.footprint.ch + def.overhangCells) * tileSize;
    const topX = w * 0.5;
    const baseY = h;

    // Body of mountain / karst cliff (Layered Ink Wash)
    const cliffGrad = ctx.createLinearGradient(0, 0, w, h);
    cliffGrad.addColorStop(0, '#5C6B66'); // Slate-grey jade tint
    cliffGrad.addColorStop(0.5, '#454C47'); // Charcoal ink
    cliffGrad.addColorStop(1, '#2D3330'); // Deep ink base
    ctx.fillStyle = cliffGrad;

    ctx.beginPath();
    ctx.moveTo(w * 0.15, baseY);
    ctx.lineTo(w * 0.25, h * 0.4);
    ctx.lineTo(topX - w * 0.1, h * 0.05);
    ctx.lineTo(topX + w * 0.1, h * 0.05);
    ctx.lineTo(w * 0.75, h * 0.35);
    ctx.lineTo(w * 0.85, baseY);
    ctx.closePath();
    ctx.fill();

    // Shading side (Dry-brush side cleft)
    ctx.fillStyle = '#222724';
    ctx.beginPath();
    ctx.moveTo(topX, h * 0.05);
    ctx.lineTo(w * 0.75, h * 0.35);
    ctx.lineTo(w * 0.85, baseY);
    ctx.lineTo(topX + w * 0.05, baseY);
    ctx.closePath();
    ctx.fill();

    // Ochre / Cinnabar rock strata streak
    ctx.strokeStyle = 'rgba(185, 162, 122, 0.45)';
    ctx.lineWidth = Math.max(1, tileSize * 0.03);
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.3);
    ctx.lineTo(w * 0.65, h * 0.45);
    ctx.moveTo(w * 0.25, h * 0.65);
    ctx.lineTo(w * 0.75, h * 0.75);
    ctx.stroke();

    // Mountain peak mist wash
    const peakMist = ctx.createLinearGradient(0, 0, 0, h * 0.2);
    peakMist.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    peakMist.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = peakMist;
    ctx.fillRect(w * 0.15, 0, w * 0.7, h * 0.2);

  } else if (defId.startsWith('bamboo_clump')) {
    // BAMBOO CLUMP (Slender vertical stalks with feathery leaves)
    const def = OBJECT_DEFINITIONS[defId] || OBJECT_DEFINITIONS.bamboo_clump_1x1;
    const w = def.footprint.cw * tileSize;
    const h = (def.footprint.ch + def.overhangCells) * tileSize;
    const stalks = def.footprint.cw * 3;
    const sway = Math.sin(time * 1.5 + screenX * 0.05) * (tileSize * 0.04);

    for (let s = 0; s < stalks; s++) {
      const bx = w * (0.15 + (s / (stalks - 1 || 1)) * 0.7);
      const by = h * 0.95;
      const tx = bx + sway * (0.7 + s * 0.1);
      const ty = h * (0.1 + (s % 2) * 0.15);

      // Stalk
      ctx.strokeStyle = s % 2 === 0 ? '#3B5742' : '#2A3F30';
      ctx.lineWidth = Math.max(1.5, tileSize * 0.035);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo((bx + tx) / 2 + sway, (by + ty) / 2, tx, ty);
      ctx.stroke();

      // Nodes
      ctx.fillStyle = '#1D2A20';
      for (let n = 1; n <= 3; n++) {
        const ny = by - (by - ty) * (n * 0.25);
        const nx = bx + (tx - bx) * (n * 0.25);
        ctx.fillRect(nx - 2, ny - 1, 4, 2);
      }

      // Leaves (Feathery lanceolate strokes)
      ctx.fillStyle = s % 2 === 0 ? '#4F7257' : '#395340';
      for (let l = -2; l <= 2; l++) {
        ctx.beginPath();
        const lx = tx + l * tileSize * 0.08;
        const ly = ty + Math.abs(l) * tileSize * 0.05;
        ctx.ellipse(lx, ly, tileSize * 0.12, tileSize * 0.04, l * 0.35 + sway * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }

  } else if (defId.startsWith('pine_tree') || defId.startsWith('spirit_tree')) {
    // PINE TREE / SPIRIT TREE (Twisted gnarled trunk + tiered cloud canopy)
    const def = OBJECT_DEFINITIONS[defId] || OBJECT_DEFINITIONS.pine_tree_1x1;
    const w = def.footprint.cw * tileSize;
    const h = (def.footprint.ch + def.overhangCells) * tileSize;

    // Gnarled trunk
    ctx.strokeStyle = '#4A3B32';
    ctx.lineWidth = Math.max(2, tileSize * 0.08);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.95);
    ctx.quadraticCurveTo(w * 0.35, h * 0.6, w * 0.5, h * 0.35);
    ctx.stroke();

    // Pine needle tiers (Cloud cluster layers)
    const isSpirit = defId.includes('spirit');
    const leafColor1 = isSpirit ? '#5E8C7B' : '#334839';
    const leafColor2 = isSpirit ? '#7C97A6' : '#223327';

    for (let t = 0; t < 3; t++) {
      const cy = h * (0.35 - t * 0.12);
      const rx = w * (0.35 - t * 0.05);
      const ry = tileSize * 0.15;

      ctx.fillStyle = t % 2 === 0 ? leafColor1 : leafColor2;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (defId.startsWith('pavilion') || defId.startsWith('sect_gate') || defId.startsWith('village_house')) {
    // CHINESE PAVILION / HOUSE
    const def = OBJECT_DEFINITIONS[defId] || OBJECT_DEFINITIONS.pavilion_1x1;
    const w = def.footprint.cw * tileSize;
    const h = (def.footprint.ch + def.overhangCells) * tileSize;

    // Base stone platform
    ctx.fillStyle = '#6E675F';
    ctx.fillRect(w * 0.15, h * 0.75, w * 0.7, h * 0.2);

    // Columns
    ctx.fillStyle = '#7A2E26'; // Vermilion pillars
    ctx.fillRect(w * 0.22, h * 0.45, w * 0.08, h * 0.32);
    ctx.fillRect(w * 0.7, h * 0.45, w * 0.08, h * 0.32);

    // Upturned roof eaves
    ctx.fillStyle = '#9B3A2E'; // Cinnabar tile roof
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.48);
    ctx.quadraticCurveTo(w * 0.5, h * 0.22, w * 0.95, h * 0.48);
    ctx.lineTo(w * 0.85, h * 0.48);
    ctx.lineTo(w * 0.5, h * 0.32);
    ctx.lineTo(w * 0.15, h * 0.48);
    ctx.closePath();
    ctx.fill();

  } else {
    // Generic Boulder / Rock
    const w = tileSize;
    const h = tileSize;
    ctx.fillStyle = '#6A635B';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.7, w * 0.35, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * L6: Fog of war ink wash mask (3 states: unknown, silhouette, explored).
 */
export function renderL6FogOfWarCell(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileSize: number,
  status: 'unknown' | 'silhouette' | 'explored'
) {
  if (status === 'explored') return;

  if (status === 'unknown') {
    // Deep dark ink wash
    ctx.fillStyle = 'rgba(28, 32, 30, 0.96)';
    ctx.fillRect(sx - 1, sy - 1, tileSize + 2, tileSize + 2);
  } else if (status === 'silhouette') {
    // Misty semi-transparent fog
    ctx.fillStyle = 'rgba(215, 208, 195, 0.75)';
    ctx.fillRect(sx - 1, sy - 1, tileSize + 2, tileSize + 2);
  }
}

/**
 * L7: Monster dry-brush ink ring with tier color accent.
 */
export function renderL7MonsterInkRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  tier: number = 1,
  isBoss: boolean = false,
  time: number = 0
) {
  // 1. Try rendering authentic dry-brush monster ring from WebP atlas
  const ringFrameId = isBoss ? 'ring_monster_boss' : `ring_monster_tier${Math.min(5, Math.max(1, tier))}`;
  const ringSize = radius * 2.2;
  if (atlasLoader.drawAtlasFrame(ctx, 'markers_entities', ringFrameId, cx - ringSize / 2, cy - ringSize / 2, ringSize, ringSize, 0.9)) {
    return;
  }

  // 2. Procedural fallback
  ctx.save();

  // Tier accent color
  let accentColor = '#10B981'; // Tier 1: Jade green
  if (tier === 2) accentColor = '#EAB308'; // Tier 2: Amber gold
  else if (tier === 3) accentColor = '#F97316'; // Tier 3: Orange
  else if (tier === 4) accentColor = '#EF4444'; // Tier 4: Crimson
  else if (tier >= 5) accentColor = '#A855F7'; // Tier 5: Purple

  // Pulse rotation
  const rot = (time * 0.5) % (Math.PI * 2);
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  // Outer irregular dry-brush ring
  ctx.strokeStyle = '#222927';
  ctx.lineWidth = Math.max(2, radius * 0.22);
  ctx.setLineDash([radius * 0.8, radius * 0.2, radius * 0.4]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner tier color glow ring
  ctx.setLineDash([]);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(1, radius * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // Double ring for boss monsters
  if (isBoss) {
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = Math.max(1.5, radius * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Resolves species emoji / icon for monsters based on name, key, or category.
 */
export function getMonsterIcon(name?: string, key?: string): string {
  const text = `${name || ''} ${key || ''}`.toLowerCase();
  if (text.includes('naga') || text.includes('dragon') || text.includes('wyrm')) return '🐉';
  if (text.includes('harimau') || text.includes('macan') || text.includes('tiger')) return '🐯';
  if (text.includes('ular') || text.includes('snake') || text.includes('viper') || text.includes('piton')) return '🐍';
  if (text.includes('elang') || text.includes('rajawali') || text.includes('bird') || text.includes('roc')) return '🦅';
  if (text.includes('beruang') || text.includes('bear')) return '🐻';
  if (text.includes('laba') || text.includes('spider')) return '🕷️';
  if (text.includes('rubah') || text.includes('fox')) return '🦊';
  if (text.includes('serigala') || text.includes('wolf')) return '🐺';
  if (text.includes('iblis') || text.includes('demon') || text.includes('siluman') || text.includes('asura')) return '👹';
  if (text.includes('hantu') || text.includes('ghost') || text.includes('arwah')) return '👻';
  return '🐾';
}

/**
 * L7: Resource sparkling spiritual particle node (herb, ore, wood, fish).
 */
export function renderL7ResourceSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  resourceType: 'herb' | 'ore' | 'wood' | 'fish' | string = 'herb',
  time: number = 0,
  isDormant: boolean = false
) {
  ctx.save();

  if (isDormant) {
    ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Sparkling colors per resource type
  let primaryColor = '#10B981';
  let sparkleColor = '#6EE7B7';
  let icon = '🌱';
  if (resourceType === 'ore') {
    primaryColor = '#F59E0B';
    sparkleColor = '#FDE68A';
    icon = '⛏️';
  } else if (resourceType === 'wood') {
    primaryColor = '#059669';
    sparkleColor = '#A7F3D0';
    icon = '🪵';
  } else if (resourceType === 'fish') {
    primaryColor = '#0284C7';
    sparkleColor = '#7DD3FC';
    icon = '🐟';
  }

  // Soft spiritual pulse aura
  const pulse = Math.sin(time * 3) * 0.2 + 0.8;
  const auraR = radius * 0.65 * pulse;
  const auraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraR);
  auraGrad.addColorStop(0, primaryColor + '66');
  auraGrad.addColorStop(0.7, primaryColor + '22');
  auraGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
  ctx.fill();

  // Floating sparkle particles (4 orbiting stars)
  const particleCount = 4;
  for (let i = 0; i < particleCount; i++) {
    const angle = time * 2 + (i * Math.PI * 2) / particleCount;
    const dist = (radius * 0.45) + Math.sin(time * 4 + i) * (radius * 0.1);
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const starR = Math.max(1, radius * 0.08 * (Math.sin(time * 5 + i) * 0.3 + 0.7));

    ctx.fillStyle = sparkleColor;
    ctx.beginPath();
    ctx.arc(px, py, starR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Resource Icon in center
  ctx.font = `${Math.max(10, radius * 0.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, cx, cy);

  ctx.restore();
}

/**
 * L7: Monster aggro radius preview.
 */
export function renderL7AggroRadius(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radiusPx: number,
  time: number = 0
) {
  ctx.save();
  ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
  ctx.beginPath();
  ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -time * 15;
  ctx.beginPath();
  ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * L7: NPC badge with attitude color ring and "9+" formatting.
 */
export function renderL7NpcBadge(
  ctx: CanvasRenderingContext2D,
  badgeX: number,
  badgeY: number,
  radius: number,
  npcCount: number,
  attitude: NpcAttitude = 'neutral'
) {
  ctx.save();

  // Attitude border color
  let ringColor = '#9CA3AF'; // neutral
  if (attitude === 'friendly') ringColor = '#10B981';
  else if (attitude === 'hostile') ringColor = '#EF4444';
  else if (attitude === 'quest') ringColor = '#F59E0B';

  // Solid Ink Black #1B1F1E Base
  ctx.fillStyle = '#1B1F1E';
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Attitude / subtle accent ring
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = Math.max(0.75, radius * 0.2);
  ctx.stroke();

  // Clean white counter text
  const text = npcCount > 9 ? '9+' : String(npcCount);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.max(7, Math.floor(radius * 1.2))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, badgeX, badgeY);

  ctx.restore();
}

/**
 * World edge cloud border (x/y in 0 or 4999).
 */
export function renderWorldEdgeClouds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isLeftEdge: boolean,
  isRightEdge: boolean,
  isTopEdge: boolean,
  isBottomEdge: boolean,
  time: number
) {
  if (!isLeftEdge && !isRightEdge && !isTopEdge && !isBottomEdge) return;

  ctx.save();
  const cloudGrad = (x1: number, y1: number, x2: number, y2: number) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, 'rgba(40, 48, 45, 0.85)');
    g.addColorStop(0.5, 'rgba(75, 88, 83, 0.45)');
    g.addColorStop(1, 'rgba(244, 241, 234, 0)');
    return g;
  };

  const cloudSize = 100;
  if (isTopEdge) {
    ctx.fillStyle = cloudGrad(0, 0, 0, cloudSize);
    ctx.fillRect(0, 0, width, cloudSize);
  }
  if (isBottomEdge) {
    ctx.fillStyle = cloudGrad(0, height, 0, height - cloudSize);
    ctx.fillRect(0, height - cloudSize, width, cloudSize);
  }
  if (isLeftEdge) {
    ctx.fillStyle = cloudGrad(0, 0, cloudSize, 0);
    ctx.fillRect(0, 0, cloudSize, height);
  }
  if (isRightEdge) {
    ctx.fillStyle = cloudGrad(width, 0, width - cloudSize, 0);
    ctx.fillRect(width - cloudSize, 0, cloudSize, height);
  }
  ctx.restore();
}
