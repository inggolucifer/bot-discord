/**
 * JIANGHU WORLD — PROCEDURAL OBJECT & TERRAIN SHUIMO GENERATOR (T0 PIPELINE)
 * Style Bible Compliant: Traditional Chinese Ink-Wash (Shuimo/Xieyi).
 * Muted palette: Jade green (#5E8C7B), Slate blue (#7C97A6), Warm grey (#9A8F82), Xuan paper (#F4F1EA), Cinnabar (#9B3A2E).
 * Generates procedural tall objects (karst rock pillars, bamboo clumps, pavilions, mountains, trees)
 * and seamless paper wash textures when static atlas sprites are not yet loaded.
 */

import { WorldObjectDef, NpcAttitude } from '@/types/world';
import { atlasLoader } from './atlasLoader';
import { isDefIdQuarantined } from '@/config/assetQuarantine';
import scaleCanonRaw from '@/config/scaleCanon.json';

export const scaleCanon: Record<string, any> = scaleCanonRaw;

const warnedMissingAtlasDefs = new Set<string>();

export function getAtlasNameForDefId(defId: string): string {
  if (
    defId.startsWith('building_') ||
    defId.startsWith('structure_') ||
    defId.startsWith('pavilion') ||
    defId.startsWith('village_house') ||
    defId.startsWith('sect_gate') ||
    defId.startsWith('stone_torii') ||
    defId.startsWith('pagoda') ||
    defId.startsWith('xitong_') ||
    defId.startsWith('dungeon_') ||
    defId.includes('_city_') ||
    (defId.startsWith('landmark_') && (
      defId.includes('gate') ||
      defId.includes('pavilion') ||
      defId.includes('observatory') ||
      defId.includes('pier') ||
      defId.includes('array') ||
      defId.includes('encampment') ||
      defId.includes('pagoda') ||
      defId.includes('oasis') ||
      defId.includes('colosseum') ||
      defId.includes('bridge') ||
      defId.includes('minehead') ||
      defId.includes('citadel') ||
      (defId.includes('shrine') && !defId.includes('plague_woods'))
    ))
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'basin', 'water', 'zen', 'village']
  },
  building_blacksmith_weapon_rack: {
    id: 'building_blacksmith_weapon_rack',
    name: 'Rak Senjata Kayu Terbuka',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'weapon_rack', 'blacksmith', 'guard_post', 'village']
  },
  building_wayside_mile_marker_stele: {
    id: 'building_wayside_mile_marker_stele',
    name: 'Tonggak Prasasti Penunjuk Jalan Kuno',
    px: { w: 140, h: 170 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.2,
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
    px: { w: 140, h: 197 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'tavern', 'flagpole', 'wine', 'roadside']
  },
  building_stone_mill_grain_grinder: {
    id: 'building_stone_mill_grain_grinder',
    name: 'Penggilingan Gandum Batu Putar',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'flower', 'peony', 'herb', 'garden']
  },
  building_village_chicken_coop_bamboo: {
    id: 'building_village_chicken_coop_bamboo',
    name: 'Kandang Unggas Bambu Pedesaan',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'coop', 'farm', 'chicken', 'poultry']
  },
  building_wayside_earth_god_miniature_shrine: {
    id: 'building_wayside_earth_god_miniature_shrine',
    name: 'Kuil Mini Dewa Bumi Pinggir Jalan',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'shrine', 'altar', 'earth_god', 'wayside']
  },
  nature_ancient_tea_bush_wild_terrace: {
    id: 'nature_ancient_tea_bush_wild_terrace',
    name: 'Rumpun Teh Gunung Liar Berteras Lumut',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'angelica', 'herb', 'medicinal', 'flora']
  },
  building_wayside_bamboo_raft_mooring_post: {
    id: 'building_wayside_bamboo_raft_mooring_post',
    name: 'Tiang Tambatan Rakit Tepi Sungai',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'mooring', 'dock', 'river', 'raft', 'water']
  },
  building_wayside_bamboo_tea_shed_bench: {
    id: 'building_wayside_bamboo_tea_shed_bench',
    name: 'Pondok Rehat Teh Bambu Tepi Jalan',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
    staminaMult: 1.15,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'wolfberry', 'goji', 'herb', 'medicinal', 'flora']
  },
  building_wayside_stone_boundary_stele: {
    id: 'building_wayside_stone_boundary_stele',
    name: 'Prasasti Tugu Batas Wilayah Beratap Batu',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'stele', 'boundary', 'stone', 'shrine', 'wayside']
  },
  nature_mountain_wild_medicinal_polygonum: {
    id: 'nature_mountain_wild_medicinal_polygonum',
    name: 'Herba Liar He Shou Wu Merambat',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'polygonum', 'herb', 'medicinal', 'vine', 'flora']
  },
  building_village_bamboo_grain_drying_mat: {
    id: 'building_village_bamboo_grain_drying_mat',
    name: 'Anyaman Bambu Penjemur Gabah Padi',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'fortune', 'divination', 'bagua', 'booth', 'wayside']
  },
  nature_mountain_wild_medicinal_salvia_miltiorrhiza: {
    id: 'nature_mountain_wild_medicinal_salvia_miltiorrhiza',
    name: 'Herba Liar Dan Shen Akar Merah',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'well', 'water', 'windlass', 'village', 'wayside']
  },
  nature_mountain_wild_medicinal_astragalus: {
    id: 'nature_mountain_wild_medicinal_astragalus',
    name: 'Herba Liar Huang Qi Penguat Qi',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'scarecrow', 'straw', 'farm', 'field', 'wayside']
  },
  building_village_stone_grain_mortar_pestle: {
    id: 'building_village_stone_grain_mortar_pestle',
    name: 'Lesung Penumbuk Padi Kayu Pedesaan',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'mortar', 'pestle', 'grain', 'rice', 'village', 'farm']
  },
  nature_mountain_wild_medicinal_licorice_root: {
    id: 'nature_mountain_wild_medicinal_licorice_root',
    name: 'Herba Liar Akar Manis Gan Cao',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'mill', 'roller', 'grain', 'flour', 'village', 'farm']
  },
  building_wayside_wooden_mile_marker_stele: {
    id: 'building_wayside_wooden_mile_marker_stele',
    name: 'Tugu Tiang Petunjuk Jalan & Pos Istirahat',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'signpost', 'marker', 'milestone', 'bench', 'wayside']
  },
  nature_mountain_wild_medicinal_aconite_monkshood: {
    id: 'nature_mountain_wild_medicinal_aconite_monkshood',
    name: 'Herba Beracun Fu Zi Bunga Helm Ungu',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'stele', 'bixi', 'shrine', 'arbor', 'pavilion', 'wayside']
  },
  nature_mountain_wild_medicinal_coptis_rhizome: {
    id: 'nature_mountain_wild_medicinal_coptis_rhizome',
    name: 'Herba Liar Kuning Emas Huang Lian',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'tofu', 'bench', 'press', 'village', 'food', 'farm']
  },
  building_wayside_bamboo_courier_mailbox_stand: {
    id: 'building_wayside_bamboo_courier_mailbox_stand',
    name: 'Tiang Pos Kurir Pengantar Surat',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'courier', 'mailbox', 'post', 'station', 'wayside']
  },
  nature_mountain_wild_medicinal_polygonatum_kingianum: {
    id: 'nature_mountain_wild_medicinal_polygonatum_kingianum',
    name: 'Herba Purba Huang Jing Rimpang Emas',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'torch', 'beacon', 'brazier', 'bamboo', 'fire', 'wayside']
  },
  building_village_stone_grain_soaking_cistern: {
    id: 'building_village_stone_grain_soaking_cistern',
    name: 'Bak Batu Perendaman Padi Desa',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'cistern', 'soaking', 'grain', 'stone', 'village', 'water', 'farm']
  },
  nature_mountain_wild_medicinal_baical_skullcap_huangqin: {
    id: 'nature_mountain_wild_medicinal_baical_skullcap_huangqin',
    name: 'Herba Huang Qin Liar Bunga Ungu Biru',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
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
  landmark_southern_plague_woods_blight_root_shrine: {
    id: 'landmark_southern_plague_woods_blight_root_shrine',
    name: 'Kuil Akar Wabah Hutan Penyakit Selatan',
    px: { w: 480, h: 500 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 12,
    fogFoot: true,
    tags: ['landmark', 'shrine', 'tree', 'plague', 'woods', 'banyan', 'nature']
  },
  landmark_bone_sea_coast_leviathan_rib_pier: {
    id: 'landmark_bone_sea_coast_leviathan_rib_pier',
    name: 'Dermaga Tulang Iga Monster Laut Pesisir Tulang',
    px: { w: 512, h: 440 },
    footprint: { cw: 4, ch: 3 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'pier', 'bone', 'leviathan', 'coast', 'sea', 'dock', 'building']
  },
  landmark_spirit_wood_sea_celestial_banyan_hearth: {
    id: 'landmark_spirit_wood_sea_celestial_banyan_hearth',
    name: 'Pohon Roh Beringin Surgawi Laut Kayu Roh',
    px: { w: 512, h: 512 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 15,
    fogFoot: true,
    tags: ['landmark', 'tree', 'banyan', 'spirit', 'wood', 'hearth', 'sacred', 'nature']
  },
  landmark_mist_insect_valley_chitin_hive_monolith: {
    id: 'landmark_mist_insect_valley_chitin_hive_monolith',
    name: 'Monolit Sarang Kitin Lembah Serangga Kabut',
    px: { w: 420, h: 512 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 15,
    fogFoot: true,
    tags: ['landmark', 'hive', 'monolith', 'insect', 'spire', 'chitin', 'valley', 'nature']
  },
  landmark_formation_barrens_broken_bagua_array: {
    id: 'landmark_formation_barrens_broken_bagua_array',
    name: 'Formasi Bagua Patah Tanah Tandus Formasi',
    px: { w: 480, h: 480 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'bagua', 'formation', 'array', 'altar', 'barrens', 'building']
  },
  landmark_godthunder_peaks_heavenly_tribulation_platform: {
    id: 'landmark_godthunder_peaks_heavenly_tribulation_platform',
    name: 'Altar Kesengsaraan Surgawi Puncak Petir Dewa',
    px: { w: 480, h: 500 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 15,
    fogFoot: true,
    tags: ['landmark', 'platform', 'lightning', 'tribulation', 'thunder', 'peaks', 'nature']
  },
  landmark_western_gorge_labyrinth_sandstone_sunken_colosseum: {
    id: 'landmark_western_gorge_labyrinth_sandstone_sunken_colosseum',
    name: 'Koloseum Pasir Tenggelam Labirin Ngarai Barat',
    px: { w: 512, h: 480 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'colosseum', 'arena', 'sandstone', 'gorge', 'labyrinth', 'building']
  },
  landmark_sword_gorge_giant_fallen_blade_bridge: {
    id: 'landmark_sword_gorge_giant_fallen_blade_bridge',
    name: 'Jembatan Bilah Raksasa Ngarai Pedang',
    px: { w: 512, h: 440 },
    footprint: { cw: 4, ch: 3 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'bridge', 'blade', 'sword', 'gorge', 'chasm', 'building']
  },
  landmark_ore_teeth_range_abandoned_dwarf_minehead: {
    id: 'landmark_ore_teeth_range_abandoned_dwarf_minehead',
    name: 'Mulut Tambang Kuno Pegunungan Gigi Bijih',
    px: { w: 480, h: 480 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'minehead', 'mine', 'ore', 'tracks', 'mountain', 'building']
  },
  landmark_eastern_sea_dragon_turtle_shell_shrine: {
    id: 'landmark_eastern_sea_dragon_turtle_shell_shrine',
    name: 'Kuil Tempurung Kura-Kura Naga Laut Timur',
    px: { w: 512, h: 480 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'shrine', 'turtle', 'dragon', 'shell', 'sea', 'reef', 'building']
  },
  landmark_frostmoon_sea_frozen_dragon_skull_isle: {
    id: 'landmark_frostmoon_sea_frozen_dragon_skull_isle',
    name: 'Pulau Tengkorak Naga Beku Laut Bulan Beku',
    px: { w: 512, h: 480 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['landmark', 'dragon', 'skull', 'ice', 'glacier', 'isle', 'frost', 'nature']
  },
  landmark_floating_wind_isles_floating_daoist_citadel: {
    id: 'landmark_floating_wind_isles_floating_daoist_citadel',
    name: 'Benteng Daois Melayang Kepulauan Angin',
    px: { w: 512, h: 512 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 15,
    fogFoot: true,
    tags: ['landmark', 'citadel', 'floating', 'isles', 'daoist', 'wind', 'pagoda', 'building']
  },
  landmark_immortal_ruins_valley_celestial_gateway_remnant: {
    id: 'landmark_immortal_ruins_valley_celestial_gateway_remnant',
    name: 'Reruntuhan Gerbang Surgawi Lembah Reruntuhan Abadi',
    px: { w: 480, h: 500 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 12,
    fogFoot: true,
    tags: ['landmark', 'gateway', 'ruins', 'immortal', 'portal', 'celestial', 'building']
  },
  landmark_void_rift_shattered_space_singularity: {
    id: 'landmark_void_rift_shattered_space_singularity',
    name: 'Singularitas Retakan Hampa Ruang Terbelah',
    px: { w: 480, h: 480 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 15,
    fogFoot: true,
    tags: ['landmark', 'singularity', 'void', 'rift', 'spatial', 'blackhole', 'abyss', 'nature']
  },
  monster_regional_primordial_azure_dragon: {
    id: 'monster_regional_primordial_azure_dragon',
    name: 'Naga Azure Purba Surgawi (World Boss)',
    px: { w: 512, h: 512 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 2.0,
    collision: 'soft',
    staminaMult: 1.5,
    sortBias: 20,
    fogFoot: false,
    tags: ['monster', 'boss', 'dragon', 'azure', 'primordial', 'world_boss']
  },
  monster_regional_nine_tailed_fox: {
    id: 'monster_regional_nine_tailed_fox',
    name: 'Rubah Roh Ekor Sembilan (Nine-Tailed Fox)',
    px: { w: 384, h: 384 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.5,
    collision: 'soft',
    staminaMult: 1.2,
    sortBias: 15,
    fogFoot: false,
    tags: ['monster', 'fox', 'spirit_beast', 'regional_monster', 'mirror_lake', 'nine_springs_delta']
  },
  monster_regional_crimson_nether_serpent: {
    id: 'monster_regional_crimson_nether_serpent',
    name: 'Ular Kematian Lembah Merah (Crimson Nether Serpent)',
    px: { w: 440, h: 440 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 15,
    fogFoot: false,
    tags: ['monster', 'serpent', 'snake', 'nether', 'venom_mire', 'southern_demon_domain']
  },
  monster_regional_glacial_frost_mastodon: {
    id: 'monster_regional_glacial_frost_mastodon',
    name: 'Gajah Purba Gletser Salju (Glacial Frost Mastodon)',
    px: { w: 480, h: 440 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 16,
    fogFoot: false,
    tags: ['monster', 'mastodon', 'mammoth', 'frost', 'glacial', 'northern_desolate']
  },
  monster_regional_magma_lava_tortoise: {
    id: 'monster_regional_magma_lava_tortoise',
    name: 'Kura-Kura Inti Magma Api (Magma Lava Tortoise)',
    px: { w: 480, h: 440 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 16,
    fogFoot: false,
    tags: ['monster', 'tortoise', 'lava', 'magma', 'lava_spine']
  },
  monster_regional_golden_feathered_garuda: {
    id: 'monster_regional_golden_feathered_garuda',
    name: 'Rajawali Emas Petir Ilahi (Golden Feathered Garuda)',
    px: { w: 440, h: 440 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'garuda', 'bird', 'golden', 'lightning', 'western_sacred_desert', 'godthunder_peaks']
  },
  monster_regional_abyssal_shadow_fiend: {
    id: 'monster_regional_abyssal_shadow_fiend',
    name: 'Siluman Bayangan Hampa Jurang (Abyssal Shadow Fiend)',
    px: { w: 384, h: 384 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'fiend', 'void', 'abyss', 'shadow', 'abyssal_scar']
  },
  monster_regional_primordial_jade_qilin: {
    id: 'monster_regional_primordial_jade_qilin',
    name: 'Qilin Giok Purba Surgawi (Primordial Jade Qilin)',
    px: { w: 384, h: 384 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'qilin', 'spirit_beast', 'jade', 'azure_mountain_range', 'hermit_highlands']
  },
  monster_regional_bone_armored_leviathan: {
    id: 'monster_regional_bone_armored_leviathan',
    name: 'Leviathan Zirah Tulang Lautan (Bone-Armored Leviathan)',
    px: { w: 440, h: 400 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'leviathan', 'sea_beast', 'bone', 'bone_sea_coast', 'eastern_sea']
  },
  monster_regional_myriad_toxic_centipede: {
    id: 'monster_regional_myriad_toxic_centipede',
    name: 'Kelabang Racun Miasma Purba (Myriad Toxic Centipede)',
    px: { w: 440, h: 400 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'centipede', 'insect', 'poison', 'gu', 'mist_insect_valley', 'southern_plague_woods']
  },
  monster_regional_ancient_blood_asura_general: {
    id: 'monster_regional_ancient_blood_asura_general',
    name: 'Panglima Asura Darah Kuno (Ancient Blood Asura General)',
    px: { w: 384, h: 400 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'asura', 'general', 'undead', 'blood', 'crimson_battlefield']
  },
  monster_regional_sword_gorge_ancient_blade_spirit: {
    id: 'monster_regional_sword_gorge_ancient_blade_spirit',
    name: 'Roh Pedang Kuno Ngarai Pedang (Ancient Blade Spirit)',
    px: { w: 384, h: 400 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'sword', 'spirit', 'golem', 'sword_gorge']
  },
  monster_regional_thundersteppe_lightning_horned_bison: {
    id: 'monster_regional_thundersteppe_lightning_horned_bison',
    name: 'Bison Tanduk Halilintar Sabana Guntur (Lightning-Horned Bison)',
    px: { w: 440, h: 384 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'bison', 'beast', 'lightning', 'thunder', 'thundersteppe']
  },
  monster_regional_formation_barrens_bagua_rune_golem: {
    id: 'monster_regional_formation_barrens_bagua_rune_golem',
    name: 'Golem Batu Bagua Tanah Formasi (Bagua Rune Golem)',
    px: { w: 384, h: 400 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'golem', 'bagua', 'formation', 'array', 'formation_barrens']
  },
  monster_regional_void_rift_dimensional_wyrm: {
    id: 'monster_regional_void_rift_dimensional_wyrm',
    name: 'Wyrm Dimensi Retakan Hampa (Dimensional Void Wyrm)',
    px: { w: 440, h: 400 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.5,
    sortBias: 20,
    fogFoot: false,
    tags: ['monster', 'wyrm', 'void', 'rift', 'dimensional', 'cosmic', 'void_rift']
  },
  monster_regional_western_labyrinth_sandstone_scorpion: {
    id: 'monster_regional_western_labyrinth_sandstone_scorpion',
    name: 'Kalajengking Batu Pasir Labirin Barat (Sandstone Scythe Scorpion)',
    px: { w: 440, h: 400 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'scorpion', 'beast', 'sandstone', 'western_gorge_labyrinth']
  },
  monster_regional_frostmoon_sea_ice_dragon_turtle: {
    id: 'monster_regional_frostmoon_sea_ice_dragon_turtle',
    name: 'Kura-Kura Naga Es Laut Bulan Beku (Ice Dragon Turtle)',
    px: { w: 340, h: 320 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'turtle', 'dragon', 'ice', 'frost', 'frostmoon_sea']
  },
  monster_regional_floating_wind_isles_celestial_wind_roc: {
    id: 'monster_regional_floating_wind_isles_celestial_wind_roc',
    name: 'Rajawali Angin Surgawi Kepulauan Angin (Celestial Wind Roc)',
    px: { w: 340, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'roc', 'bird', 'wind', 'celestial', 'floating_wind_isles']
  },
  monster_regional_immortal_ruins_celestial_war_puppet: {
    id: 'monster_regional_immortal_ruins_celestial_war_puppet',
    name: 'Boneka Perang Surgawi Lembah Reruntuhan Abadi (Celestial War Puppet)',
    px: { w: 320, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'puppet', 'automaton', 'daoist', 'immortal_ruins_valley']
  },
  monster_regional_southern_plague_woods_thousand_year_corpse_king: {
    id: 'monster_regional_southern_plague_woods_thousand_year_corpse_king',
    name: 'Raja Mayat Seribu Tahun Hutan Wabah Selatan (Thousand-Year Corpse King)',
    px: { w: 320, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'corpse', 'undead', 'jiangshi', 'plague', 'southern_plague_woods']
  },
  monster_regional_ore_teeth_range_ironback_crystal_bear: {
    id: 'monster_regional_ore_teeth_range_ironback_crystal_bear',
    name: 'Beruang Kristal Punggung Besi Gigi Bijih (Ironback Crystal Bear)',
    px: { w: 340, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'bear', 'crystal', 'iron', 'ore_teeth_range']
  },
  monster_regional_central_plains_sacred_white_tiger: {
    id: 'monster_regional_central_plains_sacred_white_tiger',
    name: 'Harimau Putih Suci Dataran Tengah (Sacred White Tiger)',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'tiger', 'sacred', 'white_tiger', 'central_plains']
  },
  monster_regional_beast_prairies_golden_sun_lion: {
    id: 'monster_regional_beast_prairies_golden_sun_lion',
    name: 'Singa Matahari Emas Padang Binatang (Golden Sun Lion)',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'lion', 'sun', 'golden', 'beast_prairies']
  },
  monster_regional_border_march_iron_plated_rhino: {
    id: 'monster_regional_border_march_iron_plated_rhino',
    name: 'Badak Perang Lapis Besi Tapal Batas (Iron-Plated War Rhino)',
    px: { w: 320, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'rhino', 'war', 'iron', 'border_march']
  },
  monster_regional_nine_springs_delta_dragon_carp: {
    id: 'monster_regional_nine_springs_delta_dragon_carp',
    name: 'Ikan Mas Naga Mutiara Roh Delta Sembilan Mata Air (Dragon Carp)',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.2,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'carp', 'dragon', 'water', 'nine_springs_delta']
  },
  monster_regional_hermit_highlands_cloud_silver_crane: {
    id: 'monster_regional_hermit_highlands_cloud_silver_crane',
    name: 'Bangau Perak Puncak Awan Dataran Pertapa (Cloud Silver Crane)',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.2,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'crane', 'silver', 'cloud', 'hermit_highlands']
  },
  monster_regional_mirror_lake_water_spirit_siren: {
    id: 'monster_regional_mirror_lake_water_spirit_siren',
    name: 'Roh Air Bulan Danau Cermin (Mirror Lake Water Siren)',
    px: { w: 300, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.2,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'siren', 'water_spirit', 'elemental', 'mirror_lake']
  },
  monster_regional_western_desert_dune_sand_wyrm: {
    id: 'monster_regional_western_desert_dune_sand_wyrm',
    name: 'Cacing Pasir Raksasa Gurun Suci Barat (Dune Sand Wyrm)',
    px: { w: 320, h: 300 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.4,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'wyrm', 'sand', 'desert', 'western_sacred_desert']
  },
  monster_regional_azure_mountain_horned_ape: {
    id: 'monster_regional_azure_mountain_horned_ape',
    name: 'Kera Bertanduk Pegunungan Azure (Azure Horned Ape)',
    px: { w: 300, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'ape', 'horned', 'mountain', 'azure_mountain_range']
  },
  monster_regional_crimson_battlefield_nether_warsteed: {
    id: 'monster_regional_crimson_battlefield_nether_warsteed',
    name: 'Kuda Perang Kematian Medan Pertempuran Merah (Nether Warsteed)',
    px: { w: 320, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 18,
    fogFoot: false,
    tags: ['monster', 'warsteed', 'horse', 'undead', 'phantom', 'crimson_battlefield']
  },
  monster_regional_abyssal_scar_chaos_eye_fiend: {
    id: 'monster_regional_abyssal_scar_chaos_eye_fiend',
    name: 'Iblis Mata Kekacauan Bekas Luka Jurang (Chaos Eye Fiend)',
    px: { w: 300, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.8,
    collision: 'soft',
    staminaMult: 1.5,
    sortBias: 20,
    fogFoot: false,
    tags: ['monster', 'eye', 'fiend', 'chaos', 'void', 'abyssal_scar']
  },
  ancient_relic_haotian_tower: {
    id: 'ancient_relic_haotian_tower',
    name: 'Pagoda Giok Haotian Penakluk Iblis (Haotian Pagoda Relic)',
    px: { w: 280, h: 384 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 15,
    fogFoot: true,
    tags: ['relic', 'pagoda', 'haotian', 'jade', 'ancient', 'structure']
  },
  ancient_relic_donghuang_bell: {
    id: 'ancient_relic_donghuang_bell',
    name: 'Lonceng Perunggu Purba Donghuang (Donghuang Primordial Bell)',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 12,
    fogFoot: true,
    tags: ['relic', 'bell', 'donghuang', 'bronze', 'ancient', 'structure']
  },
  ancient_relic_shennong_herbal_cauldron: {
    id: 'ancient_relic_shennong_herbal_cauldron',
    name: 'Kuali Alkimia Purba Shennong (Shennong Divine Cauldron)',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.05,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['relic', 'cauldron', 'shennong', 'alchemy', 'bronze', 'structure']
  },
  ancient_relic_kunlun_mirror: {
    id: 'ancient_relic_kunlun_mirror',
    name: 'Cermin Hampa Kosmik Kunlun (Kunlun Void Mirror)',
    px: { w: 300, h: 300 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['relic', 'mirror', 'kunlun', 'void', 'jade', 'structure']
  },
  ancient_relic_fuxi_guqin: {
    id: 'ancient_relic_fuxi_guqin',
    name: 'Kecapi Dawai Emas Fuxi (Fuxi Celestial Guqin)',
    px: { w: 320, h: 240 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['relic', 'guqin', 'zither', 'fuxi', 'music', 'structure']
  },
  ancient_relic_xuanyuan_sword: {
    id: 'ancient_relic_xuanyuan_sword',
    name: 'Pedang Emas Surgawi Xuanyuan (Xuanyuan Divine Sword)',
    px: { w: 256, h: 384 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 14,
    fogFoot: true,
    tags: ['relic', 'sword', 'xuanyuan', 'gold', 'divine', 'structure']
  },
  ancient_relic_pan_gu_axe: {
    id: 'ancient_relic_pan_gu_axe',
    name: 'Kapak Pembelah Langit Pan Gu (Pan Gu Great Axe)',
    px: { w: 320, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 12,
    fogFoot: true,
    tags: ['relic', 'axe', 'pangu', 'primordial', 'iron', 'structure']
  },
  ancient_relic_nuwa_stone: {
    id: 'ancient_relic_nuwa_stone',
    name: 'Batu Pelangi Penambal Langit Nuwa (Nuwa Prismatic Stone)',
    px: { w: 300, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['relic', 'stone', 'nuwa', 'rainbow', 'crystal', 'structure']
  },
  ancient_relic_lianyao_flask: {
    id: 'ancient_relic_lianyao_flask',
    name: 'Labu Giok Pelebur Siluman Lianyao (Lianyao Demon-Refining Gourd)',
    px: { w: 280, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['relic', 'gourd', 'lianyao', 'jade', 'alchemy', 'structure']
  },
  ancient_relic_kongtong_seal: {
    id: 'ancient_relic_kongtong_seal',
    name: 'Segel Sembilan Naga Kongtong (Kongtong Nine-Dragon Seal)',
    px: { w: 300, h: 300 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 12,
    fogFoot: true,
    tags: ['relic', 'seal', 'kongtong', 'dragon', 'jade', 'structure']
  },
  structure_interior_meditation_jade_cushion_dais: {
    id: 'structure_interior_meditation_jade_cushion_dais',
    name: 'Panggung Semedi Matras Teratai Giok (Jade Lotus Meditation Dais)',
    px: { w: 300, h: 300 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['furniture', 'lotus', 'dais', 'meditation', 'jade', 'structure']
  },
  structure_interior_ancient_sandalwood_incense_burner: {
    id: 'structure_interior_ancient_sandalwood_incense_burner',
    name: 'Pembakar Dupa Cendana Naga Perunggu (Dragon Bronze Incense Censer)',
    px: { w: 256, h: 256 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 6,
    fogFoot: true,
    tags: ['furniture', 'censer', 'incense', 'bronze', 'dragon', 'structure']
  },
  structure_dungeon_ancient_dragon_chest: {
    id: 'structure_dungeon_ancient_dragon_chest',
    name: 'Peti Harta Karun Perunggu Naga Kuno (Ancient Dragon Treasure Chest)',
    px: { w: 256, h: 256 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 6,
    fogFoot: true,
    tags: ['container', 'chest', 'treasure', 'dungeon', 'dragon', 'structure']
  },
  structure_interior_sect_esoteric_bookshelf: {
    id: 'structure_interior_sect_esoteric_bookshelf',
    name: 'Rak Kitab Bambu & Gulungan Esoteris Sekte (Sect Scripture Bookshelf)',
    px: { w: 320, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['furniture', 'bookshelf', 'library', 'scrolls', 'bamboo', 'structure']
  },
  structure_interior_sect_grand_patriarch_throne: {
    id: 'structure_interior_sect_grand_patriarch_throne',
    name: 'Singgasana Agung Naga Kayu Cendana (Grand Patriarch Dragon Throne)',
    px: { w: 320, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['furniture', 'throne', 'patriarch', 'sandalwood', 'dragon', 'structure']
  },
  structure_dungeon_ancient_soul_lantern_pillar: {
    id: 'structure_dungeon_ancient_soul_lantern_pillar',
    name: 'Pilar Lentera Api Jiwa Gua Kuno (Ancient Soul Lantern Pillar)',
    px: { w: 256, h: 400 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.45, y: 0.92 },
    overhangCells: 2.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['pillar', 'lantern', 'soul_fire', 'dungeon', 'stone', 'structure']
  },
  structure_interior_ancient_weapon_rack: {
    id: 'structure_interior_ancient_weapon_rack',
    name: 'Rak Senjata Pusaka Kuno (Ancient Sect Weapon Rack)',
    px: { w: 340, h: 320 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['furniture', 'weapon_rack', 'sword', 'spear', 'saber', 'structure']
  },
  structure_interior_nine_palaces_formation_pedestal: {
    id: 'structure_interior_nine_palaces_formation_pedestal',
    name: 'Altar Formasi Sembilan Istana Bagua (Nine Palaces Bagua Formation Altar)',
    px: { w: 340, h: 320 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['formation', 'bagua', 'taiji', 'altar', 'pedestal', 'structure']
  },
  structure_dungeon_celestial_herb_drying_table: {
    id: 'structure_dungeon_celestial_herb_drying_table',
    name: 'Meja Peracik Alkimia Kuno (Ancient Alchemist Workbench & Herb Table)',
    px: { w: 360, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['furniture', 'alchemy', 'workbench', 'herb', 'mortar', 'structure']
  },
  structure_interior_sect_bronze_bell_chime_stand: {
    id: 'structure_interior_sect_bronze_bell_chime_stand',
    name: 'Rak Genta Perunggu Kuno Sekte (Ancient Bronze Chime Bell Stand / Bianzhong)',
    px: { w: 360, h: 360 },
    footprint: { cw: 3, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['furniture', 'chime', 'bells', 'bianzhong', 'bronze', 'structure']
  },
  structure_dungeon_bone_pile_ancient_warrior_cairn: {
    id: 'structure_dungeon_bone_pile_ancient_warrior_cairn',
    name: 'Timbunan Tulang & Senjata Patah Kuno (Ancient Fallen Warrior Bone Pile)',
    px: { w: 320, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 4,
    fogFoot: true,
    tags: ['prop', 'bone', 'dungeon', 'skull', 'swords', 'structure']
  },
  structure_dungeon_ancient_stone_sarcophagus: {
    id: 'structure_dungeon_ancient_stone_sarcophagus',
    name: 'Sarkofagus Peti Mati Batu Kuno Tertutup Segel (Sealed Ancient Stone Sarcophagus)',
    px: { w: 340, h: 300 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['container', 'sarcophagus', 'tomb', 'chains', 'talisman', 'structure']
  },
  structure_interior_tea_table_bamboo_tatami: {
    id: 'structure_interior_tea_table_bamboo_tatami',
    name: 'Meja Teh Bambu Rendah & Matras Tatami (Low Bamboo Tea Table & Tatami Mats)',
    px: { w: 340, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 6,
    fogFoot: true,
    tags: ['furniture', 'tea', 'table', 'tatami', 'bamboo', 'structure']
  },
  structure_interior_sect_dragon_carved_folding_screen: {
    id: 'structure_interior_sect_dragon_carved_folding_screen',
    name: 'Penyekat Ruangan Lipat Naga Sutra Kuno (Ancient Dragon Silk Folding Screen)',
    px: { w: 360, h: 340 },
    footprint: { cw: 3, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['furniture', 'screen', 'folding_screen', 'silk', 'dragon', 'structure']
  },
  structure_interior_sect_spirit_pill_cauldron_hearth: {
    id: 'structure_interior_sect_spirit_pill_cauldron_hearth',
    name: 'Tungku Alkimia Pil Roh Kuno (Ancient Spirit Pill Alchemical Hearth)',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['furniture', 'cauldron', 'alchemy', 'furnace', 'hearth', 'structure']
  },
  structure_interior_sect_ancestral_tablet_shrine: {
    id: 'structure_interior_sect_ancestral_tablet_shrine',
    name: 'Altar Meja Abu Leluhur Sekte (Sect Ancestral Spirit Tablet Shrine)',
    px: { w: 340, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['furniture', 'altar', 'ancestral', 'shrine', 'spirit_tablets', 'structure']
  },
  structure_interior_meditation_rush_mat_partition: {
    id: 'structure_interior_meditation_rush_mat_partition',
    name: 'Sudut Semedi Bantal Jerami & Lentera Lantai (Meditation Nook & Floor Lantern)',
    px: { w: 320, h: 300 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 6,
    fogFoot: true,
    tags: ['furniture', 'meditation', 'cushion', 'lantern', 'tatami', 'structure']
  },
  structure_dungeon_ancient_trap_spike_floor: {
    id: 'structure_dungeon_ancient_trap_spike_floor',
    name: 'Petak Jebakan Duri Besi Gua Kuno (Ancient Dungeon Iron Spike Trap Tile)',
    px: { w: 320, h: 300 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 4,
    fogFoot: true,
    tags: ['hazard', 'trap', 'spikes', 'dungeon', 'flagstone', 'structure']
  },
  structure_dungeon_celestial_spirit_crystal_cluster: {
    id: 'structure_dungeon_celestial_spirit_crystal_cluster',
    name: 'Klaster Kristal Roh Murni Gua Kuno (Ancient Cave Spirit Crystal Geode Cluster)',
    px: { w: 360, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['resource_cluster', 'crystal', 'spirit_stone', 'dungeon', 'structure']
  },
  structure_dungeon_celestial_stalagmite_formation: {
    id: 'structure_dungeon_celestial_stalagmite_formation',
    name: 'Formasi Stalagmit Batu Gua Kuno (Ancient Cavern Stalagmite Formation)',
    px: { w: 340, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 6,
    fogFoot: true,
    tags: ['rock', 'stalagmite', 'cave', 'dungeon', 'mushrooms', 'structure']
  },
  structure_interior_sect_scripture_reading_desk: {
    id: 'structure_interior_sect_scripture_reading_desk',
    name: 'Meja Belajar Kitab Tetua Sekte (Sect Elder Scripture Reading Desk)',
    px: { w: 360, h: 300 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['furniture', 'desk', 'scripture', 'scholar', 'scrolls', 'structure']
  },
  structure_dungeon_ancient_brazier_altar: {
    id: 'structure_dungeon_ancient_brazier_altar',
    name: 'Anglo Perapian Batu Ritual Kuno (Ancient Dungeon Stone Ritual Brazier)',
    px: { w: 256, h: 340 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 6,
    fogFoot: true,
    tags: ['furniture', 'brazier', 'fire', 'ritual', 'dungeon', 'structure']
  },
  structure_dungeon_ancient_stone_door_dragon_gate: {
    id: 'structure_dungeon_ancient_stone_door_dragon_gate',
    name: 'Gerbang Pintu Batu Naga Kuno Tertutup Segel (Ancient Sealed Dragon Stone Gate)',
    px: { w: 360, h: 380 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 12,
    fogFoot: true,
    tags: ['building', 'door', 'gate', 'dragon', 'dungeon', 'structure']
  },
  structure_dungeon_poison_mist_vent_grate: {
    id: 'structure_dungeon_poison_mist_vent_grate',
    name: 'Lubang Ventilasi Gas Beracun Miasma (Ancient Poison Gas & Miasma Vent Tile)',
    px: { w: 320, h: 300 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 4,
    fogFoot: true,
    tags: ['hazard', 'poison', 'miasma', 'vent', 'dungeon', 'structure']
  },
  structure_dungeon_ancient_crumbled_dragon_statue: {
    id: 'structure_dungeon_ancient_crumbled_dragon_statue',
    name: 'Runtuhan Patung Naga Kuno Berlumut (Ancient Crumbled Dragon Stone Statue)',
    px: { w: 340, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['statue', 'dragon', 'ancient', 'relic', 'dungeon', 'structure']
  },
  structure_interior_sect_discipline_wooden_dummy: {
    id: 'structure_interior_sect_discipline_wooden_dummy',
    name: 'Boneka Kayu Latihan Beladiri Sekte (Muk Yan Jong Martial Wooden Dummy)',
    px: { w: 256, h: 360 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 6,
    fogFoot: true,
    tags: ['training', 'dummy', 'martial_arts', 'sect', 'interior', 'structure']
  },
  structure_interior_sect_heraldry_banner_pole: {
    id: 'structure_interior_sect_heraldry_banner_pole',
    name: 'Tiang Panji Kebesaran Sekte Sulam Naga (Sect Dragon Heraldry Banner Pole)',
    px: { w: 256, h: 420 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['banner', 'flag', 'heraldry', 'sect', 'interior', 'structure']
  },
  structure_dungeon_ancient_chain_suspended_cage: {
    id: 'structure_dungeon_ancient_chain_suspended_cage',
    name: 'Kandang Besi Gantung Tengkorak Berkarat (Ancient Chain-Suspended Iron Gibbet Cage)',
    px: { w: 300, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['cage', 'iron', 'chains', 'torture', 'bones', 'dungeon', 'structure']
  },
  structure_dungeon_ancient_secret_treasure_urn: {
    id: 'structure_dungeon_ancient_secret_treasure_urn',
    name: 'Guci Pusaka Giok Kubur Kuno Bertali Sutra (Ancient Secret Jade Burial Urn)',
    px: { w: 320, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 6,
    fogFoot: true,
    tags: ['urn', 'jar', 'treasure', 'jade', 'ancient', 'dungeon', 'structure']
  },
  structure_interior_sect_pill_cooling_water_trough: {
    id: 'structure_interior_sect_pill_cooling_water_trough',
    name: 'Bak Air Pendingin Pil Alkimia (Alchemy Pill Cooling Water Trough)',
    px: { w: 360, h: 260 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 6,
    fogFoot: true,
    tags: ['alchemy', 'pill', 'basin', 'water', 'trough', 'interior', 'structure']
  },
  structure_interior_sect_herb_grinding_mortar_bench: {
    id: 'structure_interior_sect_herb_grinding_mortar_bench',
    name: 'Meja Tumbuk & Racik Herba Roh (Sect Herb Grinding Mortar & Pestle Bench)',
    px: { w: 380, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['alchemy', 'herbs', 'workbench', 'mortar', 'interior', 'structure']
  },
  structure_interior_sect_alarm_bell_pavilion_stand: {
    id: 'structure_interior_sect_alarm_bell_pavilion_stand',
    name: 'Paviliun Dudukan Lonceng Alarm Sekte (Sect Bronze Alarm Bell Stand)',
    px: { w: 320, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['bell', 'alarm', 'bronze', 'pavilion', 'sect', 'interior', 'structure']
  },
  structure_interior_sect_coiled_dragon_incense_stand: {
    id: 'structure_interior_sect_coiled_dragon_incense_stand',
    name: 'Pedestal Dupa Naga Melingkar (Coiled Dragon Tall Incense Altar Stand)',
    px: { w: 256, h: 420 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 10,
    fogFoot: true,
    tags: ['incense', 'dragon', 'censer', 'altar', 'sect', 'interior', 'structure']
  },
  structure_interior_sect_astrological_armillary_sphere: {
    id: 'structure_interior_sect_astrological_armillary_sphere',
    name: 'Bola Armiler Perbintangan Langit Kuno (Celestial Astrological Armillary Sphere)',
    px: { w: 320, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 8,
    fogFoot: true,
    tags: ['astrology', 'armillary', 'celestial', 'sphere', 'sect', 'interior', 'structure']
  },
  structure_interior_sect_lotus_pond_qi_fountain: {
    id: 'structure_interior_sect_lotus_pond_qi_fountain',
    name: 'Kuali Kolam Teratai Penyejuk Qi (Sect Courtyard Lotus Fountain Basin)',
    px: { w: 340, h: 300 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 6,
    fogFoot: true,
    tags: ['lotus', 'fountain', 'basin', 'carp', 'water', 'interior', 'structure']
  },
  structure_interior_sect_weiqi_go_game_table: {
    id: 'structure_interior_sect_weiqi_go_game_table',
    name: 'Meja Papan Catur Formasi Qi Men Dun Jia (Sect Elder Weiqi Strategy Table)',
    px: { w: 360, h: 300 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 6,
    fogFoot: true,
    tags: ['weiqi', 'go', 'strategy', 'table', 'sect', 'interior', 'structure']
  },
  resource_spirit_spring: {
    id: 'resource_spirit_spring',
    name: 'Mata Air Roh Alami',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'spring', 'water']
  },
  resource_heavenly_iron_ore: {
    id: 'resource_heavenly_iron_ore',
    name: 'Bijih Besi Bintang Jatuh',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'mine', 'ore']
  },
  resource_spirit_koi_pool: {
    id: 'resource_spirit_koi_pool',
    name: 'Kolam Ikan Koi Spiritual',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'pool', 'fish']
  },
  resource_ancient_herb_garden: {
    id: 'resource_ancient_herb_garden',
    name: 'Petak Kebun Herbal Rohani',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'farm', 'herb']
  },
  resource_ancient_sword_tomb: {
    id: 'resource_ancient_sword_tomb',
    name: 'Makam Pedang Purba',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['resource', 'tomb', 'sword']
  },
  resource_ancient_lightning_bamboo: {
    id: 'resource_ancient_lightning_bamboo',
    name: 'Rumpun Bambu Petir Kuno',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 93 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
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
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.05,
    collision: 'none',
    staminaMult: 1.1,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'flower', 'camellia', 'shrub', 'mountain']
  },
  nature_bamboo_hanging_creeper: {
    id: 'nature_bamboo_hanging_creeper',
    name: 'Rumpun Bambu Rambat Menjuntai',
    px: { w: 140, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.05,
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
  },
  structure_interior_sect_secret_scroll_vault_cabinet: {
    id: 'structure_interior_sect_secret_scroll_vault_cabinet',
    name: 'Lemari Rahasia Kitab & Gulungan Sekte',
    px: { w: 340, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'cabinet', 'scroll', 'vault', 'furniture']
  },
  structure_interior_sect_ancestral_sword_pedestal: {
    id: 'structure_interior_sect_ancestral_sword_pedestal',
    name: 'Pedestal Meja Pedang Leluhur Sekte',
    px: { w: 340, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'sword', 'pedestal', 'ancestral', 'furniture']
  },
  structure_dungeon_ancient_chained_iron_chest: {
    id: 'structure_dungeon_ancient_chained_iron_chest',
    name: 'Peti Besi Terbelenggu Rantai Kuno',
    px: { w: 340, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'chest', 'iron', 'chain', 'treasure']
  },
  structure_dungeon_beast_bone_offering_altar: {
    id: 'structure_dungeon_beast_bone_offering_altar',
    name: 'Altar Sesembahan Tulang Siluman Kuno',
    px: { w: 360, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'altar', 'bone', 'beast', 'ritual', 'blood']
  },
  structure_interior_sect_eight_trigrams_mirror_array: {
    id: 'structure_interior_sect_eight_trigrams_mirror_array',
    name: 'Formasi Susunan Delapan Cermin Bagua Sekte',
    px: { w: 380, h: 380 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'bagua', 'array', 'formation', 'mirror']
  },
  structure_interior_sect_divine_weapon_smelting_forge: {
    id: 'structure_interior_sect_divine_weapon_smelting_forge',
    name: 'Tungku Peleburan Senjata Ilahi Sekte',
    px: { w: 380, h: 380 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'forge', 'furnace', 'blacksmith', 'fire']
  },
  structure_interior_sect_weapon_rack_spears_halberds: {
    id: 'structure_interior_sect_weapon_rack_spears_halberds',
    name: 'Rak Senjata Tombak & Halberd Sekte',
    px: { w: 360, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'weapon_rack', 'spear', 'halberd', 'furniture']
  },
  structure_dungeon_submerged_lotus_sacred_spring: {
    id: 'structure_dungeon_submerged_lotus_sacred_spring',
    name: 'Kolam Teratai Air Suci Bawah Tanah',
    px: { w: 360, h: 340 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'lotus', 'spring', 'water', 'sacred', 'pool']
  },
  structure_dungeon_ancient_skeleton_prisoner_shackles: {
    id: 'structure_dungeon_ancient_skeleton_prisoner_shackles',
    name: 'Kerangka Pendekar Terbelenggu Rantai Dinding',
    px: { w: 360, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'skeleton', 'prisoner', 'chains', 'shackles']
  },
  structure_interior_sect_pill_storage_apothecary_drawers: {
    id: 'structure_interior_sect_pill_storage_apothecary_drawers',
    name: 'Lemari Laci Ratusan Obat Herbal Balai Alkimia',
    px: { w: 340, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'apothecary', 'cabinet', 'herb', 'medicine', 'furniture']
  },
  structure_interior_sect_spirit_tea_ceremony_table: {
    id: 'structure_interior_sect_spirit_tea_ceremony_table',
    name: 'Meja Teh Spiritual Kayu Cendana Resepsi',
    px: { w: 380, h: 340 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'tea', 'table', 'ceremony', 'furniture']
  },
  structure_dungeon_ancient_bone_spike_pit_trap: {
    id: 'structure_dungeon_ancient_bone_spike_pit_trap',
    name: 'Jebakan Lubang Duri Tulang Bawah Tanah',
    px: { w: 360, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'trap', 'bone', 'spike', 'pit', 'hazard']
  },
  structure_interior_sect_acupuncture_copper_man: {
    id: 'structure_interior_sect_acupuncture_copper_man',
    name: 'Manekin Tembaga Titik Akupunktur Tongren',
    px: { w: 340, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'acupuncture', 'copper', 'statue', 'training']
  },
  structure_interior_sect_gravity_stone_weight_rack: {
    id: 'structure_interior_sect_gravity_stone_weight_rack',
    name: 'Rak Batu Pemberat Latihan Kuda-Kuda Fisik',
    px: { w: 380, h: 400 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'weights', 'stone', 'training', 'rack']
  },
  structure_dungeon_miasma_crystal_fissure: {
    id: 'structure_dungeon_miasma_crystal_fissure',
    name: 'Rekahan Kristal Ungu Beracun & Gas Miasma',
    px: { w: 380, h: 360 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'crystal', 'miasma', 'poison', 'fissure', 'hazard']
  },
  structure_interior_sect_qin_zither_music_alcove: {
    id: 'structure_interior_sect_qin_zither_music_alcove',
    name: 'Meja Kecapi Kuno Guqin Paviliun Melodi',
    px: { w: 380, h: 340 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'guqin', 'zither', 'music', 'furniture']
  },
  structure_interior_sect_disciples_wooden_bunk_bed: {
    id: 'structure_interior_sect_disciples_wooden_bunk_bed',
    name: 'Ranjang Kayu Bertingkat Asrama Murid',
    px: { w: 360, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'bed', 'dormitory', 'disciple', 'furniture']
  },
  structure_interior_sect_calligraphy_talisman_desk: {
    id: 'structure_interior_sect_calligraphy_talisman_desk',
    name: 'Meja Kaligrafi & Pembuatan Jimat Mantra',
    px: { w: 400, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'calligraphy', 'talisman', 'desk', 'furniture']
  },
  structure_dungeon_ghost_face_iron_portcullis: {
    id: 'structure_dungeon_ghost_face_iron_portcullis',
    name: 'Pintu Jeruji Besi Wajah Hantu Gua',
    px: { w: 380, h: 420 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'gate', 'portcullis', 'iron', 'ghost', 'door']
  },
  structure_dungeon_ancient_stone_coffin_pedestal: {
    id: 'structure_dungeon_ancient_stone_coffin_pedestal',
    name: 'Sarkofagus Batu Pusaka Tetua Kuno',
    px: { w: 400, h: 400 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'tomb', 'sarcophagus', 'coffin', 'elder', 'stone']
  },
  structure_interior_sect_spirit_pet_feeding_pen: {
    id: 'structure_interior_sect_spirit_pet_feeding_pen',
    name: 'Palung Kandang Pakan Hewan Roh Sekte',
    px: { w: 380, h: 360 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'pet', 'beast', 'feeding', 'pen']
  },
  structure_interior_sect_scripture_copying_lectern: {
    id: 'structure_interior_sect_scripture_copying_lectern',
    name: 'Meja Mimbar Penyalinan Kitab Suci',
    px: { w: 340, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'lectern', 'scripture', 'scroll', 'furniture']
  },
  structure_dungeon_ancient_stone_obelisk_seal: {
    id: 'structure_dungeon_ancient_stone_obelisk_seal',
    name: 'Obelisk Batu Kuno Pemeteraian Iblis',
    px: { w: 360, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'obelisk', 'seal', 'demon', 'monolith', 'rune']
  },
  structure_interior_sect_herbal_medicine_drying_screen: {
    id: 'structure_interior_sect_herbal_medicine_drying_screen',
    name: 'Rak Jaring Bambu Penjemuran Herba Obat',
    px: { w: 340, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'herb', 'medicine', 'drying', 'rack']
  },
  structure_dungeon_underground_poisonous_fungus_cluster: {
    id: 'structure_dungeon_underground_poisonous_fungus_cluster',
    name: 'Gugusan Jamur Spora Beracun Gua',
    px: { w: 380, h: 360 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'fungus', 'mushroom', 'spore', 'poison', 'hazard']
  },
  structure_interior_sect_meditation_stone_incense_cairn: {
    id: 'structure_interior_sect_meditation_stone_incense_cairn',
    name: 'Tumpukan Batu Meditasi & Pembakar Dupa Sekte',
    px: { w: 360, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'meditation', 'stone', 'cairn', 'incense']
  },
  structure_dungeon_ancient_bone_throne_boss_seat: {
    id: 'structure_dungeon_ancient_bone_throne_boss_seat',
    name: 'Singgasana Tulang Kuno Bos Gua',
    px: { w: 380, h: 400 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'bone', 'throne', 'boss', 'seat']
  },
  structure_interior_sect_bronze_mirror_dressing_screen: {
    id: 'structure_interior_sect_bronze_mirror_dressing_screen',
    name: 'Meja Rias Cermin Perunggu & Penyekat Sutra Bangau',
    px: { w: 380, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'mirror', 'dressing', 'screen', 'crane']
  },
  structure_dungeon_toxic_swamp_slime_bubbling_pool: {
    id: 'structure_dungeon_toxic_swamp_slime_bubbling_pool',
    name: 'Kolam Lumpur Beracun Mendidih Gua',
    px: { w: 420, h: 340 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'toxic', 'slime', 'bubbling', 'pool', 'hazard']
  },
  structure_interior_sect_formation_carved_stone_pillar: {
    id: 'structure_interior_sect_formation_carved_stone_pillar',
    name: 'Pilar Formasi Naga Terukir Api Roh Sekte',
    px: { w: 320, h: 520 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.90 },
    overhangCells: 1.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'formation', 'pillar', 'dragon', 'spirit_flame']
  },
  structure_dungeon_ancient_soul_suppression_stele: {
    id: 'structure_dungeon_ancient_soul_suppression_stele',
    name: 'Prasasti Segel Jiwa Rantai Besi Kuno',
    px: { w: 360, h: 440 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'stele', 'soul', 'suppression', 'chains', 'seal', 'talisman']
  },
  structure_interior_sect_spiritual_pill_furnace_triad: {
    id: 'structure_interior_sect_spiritual_pill_furnace_triad',
    name: 'Tungku Alkimia Perunggu Kaki Tiga Sekte',
    px: { w: 380, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'alchemy', 'pill', 'furnace', 'cauldron']
  },
  structure_dungeon_crystallized_blood_stalagmite: {
    id: 'structure_dungeon_crystallized_blood_stalagmite',
    name: 'Stalagmit Kristal Darah Iblis Gua',
    px: { w: 380, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'crystal', 'blood', 'stalagmite', 'mineral', 'hazard']
  },
  structure_interior_sect_bamboo_scroll_archive_rack: {
    id: 'structure_interior_sect_bamboo_scroll_archive_rack',
    name: 'Lemari Rak Arsip Gulungan Bambu Sekte',
    px: { w: 380, h: 440 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'library', 'bamboo', 'scroll', 'archive', 'rack', 'lantern']
  },
  structure_dungeon_ancient_gargoyle_poison_dart_trap: {
    id: 'structure_dungeon_ancient_gargoyle_poison_dart_trap',
    name: 'Patung Perangkap Sumpit Beracun Mulut Hewan Buas',
    px: { w: 380, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'trap', 'gargoyle', 'poison', 'dart', 'tiger', 'hazard']
  },
  structure_dungeon_ancient_soul_reaping_scythe_pillar: {
    id: 'structure_dungeon_ancient_soul_reaping_scythe_pillar',
    name: 'Pilar Sabit Berputar Pemanen Jiwa Gua',
    px: { w: 360, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'scythe', 'pillar', 'blade', 'spinning', 'hazard']
  },
  structure_interior_sect_spirit_array_core_compass: {
    id: 'structure_interior_sect_spirit_array_core_compass',
    name: 'Kompas Formasi Spiritual Giok Sekte',
    px: { w: 440, h: 320 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'formation', 'compass', 'jade', 'array']
  },
  structure_dungeon_underground_bone_bridge_segment: {
    id: 'structure_dungeon_underground_bone_bridge_segment',
    name: 'Jembatan Segmen Tulang Belulang Raksasa Gua',
    px: { w: 480, h: 340 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'bridge', 'bone', 'rib', 'walkway', 'chasm']
  },
  structure_interior_sect_bronze_bell_clock_tower: {
    id: 'structure_interior_sect_bronze_bell_clock_tower',
    name: 'Menara Gantung Lonceng Perunggu Doa Sekte',
    px: { w: 380, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'bell', 'clock', 'tower', 'bronze', 'prayer']
  },
  structure_dungeon_cursed_mirror_phantom_trap: {
    id: 'structure_dungeon_cursed_mirror_phantom_trap',
    name: 'Cermin Kuno Ilusi Hantu Berhantu',
    px: { w: 360, h: 460 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'mirror', 'cursed', 'phantom', 'ghost', 'trap', 'hazard']
  },
  structure_interior_sect_discipline_punishment_rack: {
    id: 'structure_interior_sect_discipline_punishment_rack',
    name: 'Tiang Hukuman Cambuk Aula Penegak Hukum Sekte',
    px: { w: 360, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'punishment', 'rack', 'whip', 'discipline', 'pillory']
  },
  structure_interior_sect_sword_flying_launch_platform: {
    id: 'structure_interior_sect_sword_flying_launch_platform',
    name: 'Landasan Luncur Pedang Terbang Sekte',
    px: { w: 520, h: 420 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'platform', 'flying_sword', 'terrace', 'mount']
  },
  structure_dungeon_ancient_soul_devouring_carnivorous_plant: {
    id: 'structure_dungeon_ancient_soul_devouring_carnivorous_plant',
    name: 'Tanaman Karnivora Pemakan Daging Bawah Tanah',
    px: { w: 420, h: 420 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'plant', 'carnivorous', 'venom', 'acid', 'hazard']
  },
  structure_interior_sect_meditation_mat_incense_burner_set: {
    id: 'structure_interior_sect_meditation_mat_incense_burner_set',
    name: 'Set Bantalan Meditasi & Pembakar Dupa Teratai',
    px: { w: 380, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'meditation', 'mat', 'cushion', 'incense', 'lotus']
  },
  structure_dungeon_sacred_dragon_vein_qi_geyser: {
    id: 'structure_dungeon_sacred_dragon_vein_qi_geyser',
    name: 'Semburan Geyser Urat Naga Qi Emas Gua',
    px: { w: 440, h: 360 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'geyser', 'dragon_vein', 'qi', 'golden', 'sacred', 'node']
  },
  structure_interior_sect_astronomy_star_chart_globe: {
    id: 'structure_interior_sect_astronomy_star_chart_globe',
    name: 'Bola Peta Bintang Xuanwu Astronomi Sekte',
    px: { w: 380, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'astronomy', 'star_chart', 'xuanwu', 'bronze']
  },
  structure_dungeon_ancient_flying_guillotine_blade_trap: {
    id: 'structure_dungeon_ancient_flying_guillotine_blade_trap',
    name: 'Jebakan Pisau Berputar Katrol Langit-Langit Gua',
    px: { w: 380, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'trap', 'guillotine', 'blade', 'hazard', 'ancient']
  },
  structure_interior_sect_sword_sharpening_whetstone_trough: {
    id: 'structure_interior_sect_sword_sharpening_whetstone_trough',
    name: 'Bak Asahan Pedang Air Gletser Aula Senjata',
    px: { w: 420, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.0,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'whetstone', 'trough', 'armory', 'sword']
  },
  structure_dungeon_ancient_soul_urn_columbarium_wall: {
    id: 'structure_dungeon_ancient_soul_urn_columbarium_wall',
    name: 'Dinding Guci Jiwa Bertuliskan Segel Makam Kuno',
    px: { w: 460, h: 340 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'crypt', 'soul_urn', 'wall', 'ancient', 'tomb']
  },
  structure_dungeon_corrosive_acid_slime_stalactite: {
    id: 'structure_dungeon_corrosive_acid_slime_stalactite',
    name: 'Stalaktit Tetesan Lendir Asam Korosif Langit Gua',
    px: { w: 340, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'stalactite', 'acid', 'slime', 'hazard', 'cave']
  },
  structure_interior_sect_patriarch_ancestral_portrait_shrine: {
    id: 'structure_interior_sect_patriarch_ancestral_portrait_shrine',
    name: 'Meja Altar Lukisan Leluhur Pendiri Sekte',
    px: { w: 420, h: 480 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'altar', 'shrine', 'ancestral', 'portrait']
  },
  structure_interior_sect_alchemy_herb_cabinet_apothecary_tower: {
    id: 'structure_interior_sect_alchemy_herb_cabinet_apothecary_tower',
    name: 'Lemari Menara Laci Obat Herbal Alkimia Sekte',
    px: { w: 380, h: 520 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'apothecary', 'cabinet', 'herb', 'alchemy']
  },
  structure_dungeon_ancient_thunder_attracting_copper_pillar: {
    id: 'structure_dungeon_ancient_thunder_attracting_copper_pillar',
    name: 'Pilar Tembaga Penarik Petir Formasi Kuno',
    px: { w: 380, h: 500 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'thunder', 'lightning', 'pillar', 'copper', 'ancient']
  },
  structure_interior_sect_daoist_bell_resonance_tuning_frame: {
    id: 'structure_interior_sect_daoist_bell_resonance_tuning_frame',
    name: 'Bingkai Lonceng Perunggu Resonansi Daois Bianzhong',
    px: { w: 440, h: 460 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'bell', 'bianzhong', 'music', 'bronze']
  },
  structure_dungeon_ancient_blood_pool_sacrifice_font: {
    id: 'structure_dungeon_ancient_blood_pool_sacrifice_font',
    name: 'Bejana Batu Altar Darah Pengorbanan Iblis',
    px: { w: 420, h: 440 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'altar', 'blood', 'sacrifice', 'font', 'demonic']
  },
  structure_interior_sect_dragon_carved_scripture_reading_throne: {
    id: 'structure_interior_sect_dragon_carved_scripture_reading_throne',
    name: 'Tahta Baca Kitab Ukiran Naga Guru Sekte',
    px: { w: 400, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'throne', 'dragon', 'chair', 'furniture']
  },
  structure_dungeon_ancient_soul_lock_iron_maiden_sarcophagus: {
    id: 'structure_dungeon_ancient_soul_lock_iron_maiden_sarcophagus',
    name: 'Sarkofagus Besi Belenggu Jiwa Topeng Iblis',
    px: { w: 380, h: 500 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'sarcophagus', 'iron_maiden', 'trap', 'hazard', 'ancient']
  },
  structure_interior_sect_spiritual_beast_mount_saddle_rack: {
    id: 'structure_interior_sect_spiritual_beast_mount_saddle_rack',
    name: 'Rak Pelana Zirah Hewan Tunggangan Spiritual',
    px: { w: 400, h: 460 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'mount', 'saddle', 'stable', 'beast']
  },
  structure_dungeon_ancient_floating_soul_crystal_monolith: {
    id: 'structure_dungeon_ancient_floating_soul_crystal_monolith',
    name: 'Monolit Kristal Jiwa Ungu Melayang Formasi Kuno',
    px: { w: 400, h: 480 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'crystal', 'floating', 'soul', 'monolith', 'ancient']
  },
  structure_interior_sect_medicinal_herb_fermentation_urn_bench: {
    id: 'structure_interior_sect_medicinal_herb_fermentation_urn_bench',
    name: 'Meja Bejana Guci Fermentasi Ramuan Alkimia',
    px: { w: 440, h: 420 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'alchemy', 'fermentation', 'urn', 'bench']
  },
  structure_interior_sect_sword_casting_water_quench_pool: {
    id: 'structure_interior_sect_sword_casting_water_quench_pool',
    name: 'Kolam Air Pendingin Tempa Pedang Sekte',
    px: { w: 420, h: 420 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'forge', 'smithing', 'quench', 'pool', 'sword']
  },
  structure_dungeon_ancient_soul_siphon_mirror_stele: {
    id: 'structure_dungeon_ancient_soul_siphon_mirror_stele',
    name: 'Prasasti Cermin Penyerap Jiwa Makam Kuno',
    px: { w: 380, h: 500 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'mirror', 'soul', 'stele', 'cursed', 'ancient']
  },
  structure_interior_sect_talisman_woodblock_printing_press: {
    id: 'structure_interior_sect_talisman_woodblock_printing_press',
    name: 'Mesin Cetak Kayu Jimat Daois Sekte',
    px: { w: 420, h: 460 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'talisman', 'printing', 'press', 'woodblock']
  },
  structure_dungeon_ancient_beast_skeleton_passage_arch: {
    id: 'structure_dungeon_ancient_beast_skeleton_passage_arch',
    name: 'Gerbang Lengkung Tulang Belulang Siluman Purba',
    px: { w: 440, h: 460 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'skeleton', 'arch', 'bones', 'beast', 'ancient']
  },
  structure_interior_sect_divine_divination_turtle_shell_table: {
    id: 'structure_interior_sect_divine_divination_turtle_shell_table',
    name: 'Meja Altar Ramalan Tempurung Kura-Kura Gaib',
    px: { w: 400, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'divination', 'turtle', 'iching', 'altar', 'table']
  },
  structure_interior_sect_dragon_carved_water_clock_clepsydra: {
    id: 'structure_interior_sect_dragon_carved_water_clock_clepsydra',
    name: 'Jam Air Clepsydra Perunggu Naga Bertingkat',
    px: { w: 440, h: 420 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'clepsydra', 'water_clock', 'bronze', 'dragon']
  },
  structure_dungeon_ancient_flame_spouting_terracotta_gargoyle: {
    id: 'structure_dungeon_ancient_flame_spouting_terracotta_gargoyle',
    name: 'Patung Gargoyle Terakota Semburan Api Penjaga',
    px: { w: 400, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'terracotta', 'gargoyle', 'flame', 'trap', 'hazard']
  },
  structure_interior_sect_five_elements_spirit_stone_censer_array: {
    id: 'structure_interior_sect_five_elements_spirit_stone_censer_array',
    name: 'Hio Formasi Lima Elemen Batu Roh Surgawi',
    px: { w: 420, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'censer', 'five_elements', 'brazier', 'spiritual']
  },
  structure_dungeon_ancient_poison_spider_cocoon_nest: {
    id: 'structure_dungeon_ancient_poison_spider_cocoon_nest',
    name: 'Sarang Kepompong Laba-Laba Beracun Kuno',
    px: { w: 440, h: 380 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'spider', 'nest', 'cocoon', 'poison', 'hazard']
  },
  structure_interior_sect_celestial_sword_grinding_wheel: {
    id: 'structure_interior_sect_celestial_sword_grinding_wheel',
    name: 'Batu Asah Roda Pedal Pedang Langit Sekte',
    px: { w: 420, h: 380 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'grinding_wheel', 'armory', 'forge', 'sword']
  },
  structure_interior_sect_five_phases_brewing_distillery: {
    id: 'structure_interior_sect_five_phases_brewing_distillery',
    name: 'Ketel Distilasi Arak Roh Alkimia Lima Fase',
    px: { w: 440, h: 440 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'wine', 'alchemy', 'distillery', 'brewing', 'copper']
  },
  structure_dungeon_ancient_soul_devouring_blood_coffin: {
    id: 'structure_dungeon_ancient_soul_devouring_blood_coffin',
    name: 'Peti Darah Giok Hitam Belenggu Jiwa Terkutuk',
    px: { w: 440, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'coffin', 'blood', 'cursed', 'sarcophagus', 'ancient']
  },
  structure_interior_sect_celestial_talisman_drying_rotunda: {
    id: 'structure_interior_sect_celestial_talisman_drying_rotunda',
    name: 'Payung Putar Penjemur Jimat Kertas Sekte',
    px: { w: 420, h: 440 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'talisman', 'drying', 'rotunda', 'bamboo']
  },
  structure_dungeon_ancient_chasm_broken_chain_bridge_anchor: {
    id: 'structure_dungeon_ancient_chasm_broken_chain_bridge_anchor',
    name: 'Katrol Rantai Jembatan Jurang Purba Putus',
    px: { w: 440, h: 440 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'chasm', 'chain', 'winch', 'bridge', 'ancient']
  },
  structure_interior_sect_dragon_carved_scroll_archive_chest: {
    id: 'structure_interior_sect_dragon_carved_scroll_archive_chest',
    name: 'Peti Arsip Kitab Sutra & Giok Ukiran Naga',
    px: { w: 440, h: 440 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'chest', 'scroll', 'archive', 'dragon', 'chest']
  },
  structure_interior_sect_spirit_herb_pill_pestle_mill: {
    id: 'structure_interior_sect_spirit_herb_pill_pestle_mill',
    name: 'Penggiling Lesung Herbal Alkimia Giok Sekte',
    px: { w: 440, h: 440 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'alchemy', 'pestle', 'mill', 'grinder', 'herb']
  },
  structure_dungeon_ancient_thunderbolt_spirit_mirror_trap: {
    id: 'structure_dungeon_ancient_thunderbolt_spirit_mirror_trap',
    name: 'Cermin Penangkal Petir Jebakan Labirin Kuno',
    px: { w: 420, h: 460 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'mirror', 'lightning', 'trap', 'thunder', 'hazard']
  },
  structure_interior_sect_celestial_music_guqin_carved_table: {
    id: 'structure_interior_sect_celestial_music_guqin_carved_table',
    name: 'Meja Zither Guqin Alunan Nada Surgawi Sekte',
    px: { w: 440, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'guqin', 'zither', 'music', 'table', 'furniture']
  },
  structure_dungeon_ancient_sealed_demon_suppression_pillar: {
    id: 'structure_dungeon_ancient_sealed_demon_suppression_pillar',
    name: 'Pilar Segel Penindas Iblis Rantai Jimat Kuno',
    px: { w: 380, h: 520 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'pillar', 'demon', 'seal', 'talisman', 'chain', 'hazard']
  },
  structure_interior_sect_disciples_tea_and_chess_gazebo: {
    id: 'structure_interior_sect_disciples_tea_and_chess_gazebo',
    name: 'Gazebo Paviliun Teh & Catur Murid Sekte',
    px: { w: 480, h: 480 },
    footprint: { cw: 4, ch: 4 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'gazebo', 'pavilion', 'tea', 'chess', 'weiqi']
  },
  structure_interior_sect_sword_refining_dragon_bellows: {
    id: 'structure_interior_sect_sword_refining_dragon_bellows',
    name: 'Hembusan Angin Fengxiang Naga Tempa Pedang',
    px: { w: 440, h: 400 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'forge', 'smithing', 'bellows', 'armory', 'dragon']
  },
  structure_dungeon_ancient_poison_miasma_fountain_basin: {
    id: 'structure_dungeon_ancient_poison_miasma_fountain_basin',
    name: 'Air Mancur Racun Miasma Ular Gua Kuno',
    px: { w: 440, h: 420 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'poison', 'miasma', 'fountain', 'basin', 'hazard']
  },
  structure_interior_sect_talisman_calligraphy_scroll_drying_rack: {
    id: 'structure_interior_sect_talisman_calligraphy_scroll_drying_rack',
    name: 'Rak Jemur Gulungan Kaligrafi Jimat Sekte',
    px: { w: 420, h: 480 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'talisman', 'scroll', 'rack', 'drying', 'calligraphy']
  },
  structure_dungeon_ancient_rotating_scythe_pendulum_trap: {
    id: 'structure_dungeon_ancient_rotating_scythe_pendulum_trap',
    name: 'Jebakan Sabit Berputar Katrol Langit Gua',
    px: { w: 420, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'trap', 'scythe', 'pendulum', 'blade', 'hazard']
  },
  structure_interior_sect_patriarch_cloud_meditation_couch: {
    id: 'structure_interior_sect_patriarch_cloud_meditation_couch',
    name: 'Ranjang Meditasi Luohan Kayu Ukiran Awan Sekte',
    px: { w: 480, h: 380 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'couch', 'bed', 'luohan', 'meditation', 'throne']
  },
  structure_interior_sect_beast_taming_spirit_whistle_pedestal: {
    id: 'structure_interior_sect_beast_taming_spirit_whistle_pedestal',
    name: 'Altar Peluit Penjinak Hewan Roh Sekte',
    px: { w: 400, h: 460 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'beast', 'taming', 'whistle', 'pedestal', 'altar']
  },
  structure_dungeon_ancient_soul_gathering_spirit_urn_cluster: {
    id: 'structure_dungeon_ancient_soul_gathering_spirit_urn_cluster',
    name: 'Gugusan Guci Jiwa Pengumpul Roh Kuno',
    px: { w: 440, h: 380 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'urn', 'soul', 'spirit', 'crypt', 'hazard']
  },
  structure_interior_sect_astronomy_star_compass_plinth: {
    id: 'structure_interior_sect_astronomy_star_compass_plinth',
    name: 'Kompas Bintang Astrolab Divinasi Langit Sekte',
    px: { w: 460, h: 420 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'astronomy', 'compass', 'astrolabe', 'divination', 'bronze']
  },
  structure_dungeon_ancient_collapsing_stalactite_tripwire_trap: {
    id: 'structure_dungeon_ancient_collapsing_stalactite_tripwire_trap',
    name: 'Jebakan Stalaktit Runtuh Kawat Picu Gua',
    px: { w: 420, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'trap', 'stalactite', 'tripwire', 'rockfall', 'hazard']
  },
  structure_interior_sect_discipline_elder_tribunal_desk: {
    id: 'structure_interior_sect_discipline_elder_tribunal_desk',
    name: 'Meja Sidang Tetua Penegak Hukum Aula Jielv',
    px: { w: 480, h: 400 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'desk', 'discipline', 'elder', 'tribunal', 'law']
  },
  structure_interior_sect_alchemy_cauldron_cooling_vat: {
    id: 'structure_interior_sect_alchemy_cauldron_cooling_vat',
    name: 'Bak Pendingin Tungku Kuali Alkimia Giok',
    px: { w: 440, h: 420 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'alchemy', 'vat', 'cooling', 'glacier', 'water']
  },
  structure_dungeon_ancient_soul_chain_suspended_cage_trap: {
    id: 'structure_dungeon_ancient_soul_chain_suspended_cage_trap',
    name: 'Jebakan Kerangkeng Besi Gantung Rantai Jiwa',
    px: { w: 400, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'cage', 'trap', 'chain', 'suspended', 'hazard']
  },
  structure_interior_sect_array_refining_sand_table: {
    id: 'structure_interior_sect_array_refining_sand_table',
    name: 'Meja Pasir Taktik Formasi Pertahanan Sekte',
    px: { w: 460, h: 420 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'sand_table', 'array', 'tactics', 'strategy', 'shapan']
  },
  structure_dungeon_ancient_flame_dragon_oil_basin_hazard: {
    id: 'structure_dungeon_ancient_flame_dragon_oil_basin_hazard',
    name: 'Bejana Minyak Semburan Api Naga Kuno',
    px: { w: 440, h: 420 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'flame', 'fire', 'dragon', 'oil', 'basin', 'hazard']
  },
  structure_interior_sect_ancestral_bell_stand_chime_set: {
    id: 'structure_interior_sect_ancestral_bell_stand_chime_set',
    name: 'Set Lonceng Bianzhong Perunggu Leluhur Sekte',
    px: { w: 480, h: 460 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'bianzhong', 'bell', 'chime', 'ceremony', 'music']
  },
  structure_interior_sect_sword_refining_water_bath_basin: {
    id: 'structure_interior_sect_sword_refining_water_bath_basin',
    name: 'Bak Pendingin Rendaman Bilah Pedang Sekte',
    px: { w: 460, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'sword', 'forge', 'quench', 'basin', 'armory']
  },
  structure_dungeon_ancient_bone_spike_ball_chain_trap: {
    id: 'structure_dungeon_ancient_bone_spike_ball_chain_trap',
    name: 'Jebakan Bola Berduri Rantai Katrol Gua',
    px: { w: 400, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'trap', 'spike_ball', 'chain', 'morningstar', 'hazard']
  },
  structure_interior_sect_scripture_printing_movable_type_cabinet: {
    id: 'structure_interior_sect_scripture_printing_movable_type_cabinet',
    name: 'Lemari Huruf Cetak Kayu Percetakan Kitab',
    px: { w: 440, h: 480 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'printing', 'movable_type', 'cabinet', 'scripture', 'library']
  },
  structure_dungeon_ancient_miasma_leech_flesh_pit_hazard: {
    id: 'structure_dungeon_ancient_miasma_leech_flesh_pit_hazard',
    name: 'Lubang Daging Lintah Miasma Beracun Gua',
    px: { w: 440, h: 420 },
    footprint: { cw: 3, ch: 3 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'pit', 'leech', 'miasma', 'poison', 'flesh', 'hazard']
  },
  structure_interior_sect_daoist_divination_yarrow_stalk_dais: {
    id: 'structure_interior_sect_daoist_divination_yarrow_stalk_dais',
    name: 'Meja Ramalan Batang Yarrow Shicao I Ching',
    px: { w: 420, h: 400 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'divination', 'yarrow', 'iching', 'shicao', 'altar']
  },
  structure_interior_sect_disciples_martial_training_stake_cluster: {
    id: 'structure_interior_sect_disciples_martial_training_stake_cluster',
    name: 'Tonggak Pelatihan Kuda-Kuda Meihuazhuang',
    px: { w: 420, h: 460 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'martial', 'training', 'stake', 'meihuazhuang', 'dojo']
  },
  structure_dungeon_ancient_soul_devouring_phantom_lantern_post: {
    id: 'structure_dungeon_ancient_soul_devouring_phantom_lantern_post',
    name: 'Lentera Tiang Api Hantu Penelan Sukma Gua',
    px: { w: 380, h: 520 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'lantern', 'soul', 'phantom', 'post', 'hazard']
  },
  structure_interior_sect_scripture_reading_stone_table_bench: {
    id: 'structure_interior_sect_scripture_reading_stone_table_bench',
    name: 'Meja & Bangku Batu Baca Kitab Taman Sekte',
    px: { w: 460, h: 400 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'table', 'bench', 'stone', 'scripture', 'garden']
  },
  structure_dungeon_ancient_corpse_poison_gas_vent_grate: {
    id: 'structure_dungeon_ancient_corpse_poison_gas_vent_grate',
    name: 'Kisi Besi Semburan Gas Racun Mayat Gua',
    px: { w: 420, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'vent', 'poison', 'gas', 'grate', 'corpse', 'hazard']
  },
  structure_interior_sect_medicine_tincture_fermentation_crock: {
    id: 'structure_interior_sect_medicine_tincture_fermentation_crock',
    name: 'Gugusan Tempayan Fermentasi Arak Obat Sekte',
    px: { w: 440, h: 400 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'crock', 'fermentation', 'wine', 'tincture', 'alchemy']
  },
  structure_interior_sect_sword_washing_pool_fountain: {
    id: 'structure_interior_sect_sword_washing_pool_fountain',
    name: 'Kolam Pembasuh Bilah Pedang Naga Giok',
    px: { w: 460, h: 420 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'pool', 'sword', 'washing', 'jade_dragon', 'fountain']
  },
  structure_dungeon_ancient_soul_suppression_bronze_pillar: {
    id: 'structure_dungeon_ancient_soul_suppression_bronze_pillar',
    name: 'Pilar Perunggu Penindih Sukma Berantai Jimat',
    px: { w: 380, h: 540 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'pillar', 'soul', 'suppression', 'bronze', 'chains', 'hazard']
  },
  structure_interior_sect_meridian_cleansing_aromatic_steam_vat: {
    id: 'structure_interior_sect_meridian_cleansing_aromatic_steam_vat',
    name: 'Tong Uap Obat Pembersih Meridian Tubuh',
    px: { w: 420, h: 440 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'steam', 'vat', 'meridian', 'bath', 'herbal', 'alchemy']
  },
  structure_dungeon_ancient_bone_needle_trap_wall_panel: {
    id: 'structure_dungeon_ancient_bone_needle_trap_wall_panel',
    name: 'Panel Dinding Jebakan Jarum Beracun Gua',
    px: { w: 440, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'trap', 'needle', 'wall', 'poison', 'hazard']
  },
  structure_interior_sect_ancestral_incense_cauldron_tripod: {
    id: 'structure_interior_sect_ancestral_incense_cauldron_tripod',
    name: 'Tungku Dupa Tripod Perunggu Kepala Qilin',
    px: { w: 440, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'incense', 'cauldron', 'tripod', 'qilin', 'ancestral']
  },
  structure_interior_sect_formation_carving_worktable: {
    id: 'structure_interior_sect_formation_carving_worktable',
    name: 'Meja Kerja Ukir Pelat Formasi Array Giok',
    px: { w: 460, h: 400 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'formation', 'array', 'carving', 'worktable', 'workshop']
  },
  structure_dungeon_ancient_blood_pool_sacrifice_pillar: {
    id: 'structure_dungeon_ancient_blood_pool_sacrifice_pillar',
    name: 'Pilar Pengorbanan Kolam Darah Kuno',
    px: { w: 400, h: 540 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'pillar', 'blood', 'sacrifice', 'demonic', 'chains', 'hazard']
  },
  structure_interior_sect_spirit_grain_storage_chest: {
    id: 'structure_interior_sect_spirit_grain_storage_chest',
    name: 'Peti Kayu Penyimpan Padi Roh Bertuah',
    px: { w: 420, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'grain', 'chest', 'storage', 'refectory', 'pantry']
  },
  structure_dungeon_ancient_swinging_scythe_pendulum_trap: {
    id: 'structure_dungeon_ancient_swinging_scythe_pendulum_trap',
    name: 'Jebakan Sabit Ayun Raksasa Baja Karat Gua',
    px: { w: 420, h: 520 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'trap', 'scythe', 'pendulum', 'blade', 'hazard']
  },
  structure_interior_sect_daoist_wind_chime_bell_stand: {
    id: 'structure_interior_sect_daoist_wind_chime_bell_stand',
    name: 'Tiang Genta Lonceng Angin Perunggu Delapan Arah',
    px: { w: 380, h: 520 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'bell', 'wind_chime', 'bronze', 'courtyard', 'garden']
  },
  structure_interior_sect_puppet_mechanic_assembly_bench: {
    id: 'structure_interior_sect_puppet_mechanic_assembly_bench',
    name: 'Meja Rakit Wayang Tempur Mekanikal Lingmu',
    px: { w: 460, h: 420 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'puppet', 'mechanic', 'assembly', 'bench', 'workshop']
  },
  structure_dungeon_ancient_bone_coffin_chain_suspension: {
    id: 'structure_dungeon_ancient_bone_coffin_chain_suspension',
    name: 'Peti Mati Tulang Kuno Gantung Rantai Besi',
    px: { w: 440, h: 540 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'coffin', 'bone', 'chain', 'suspension', 'crypt', 'hazard']
  },
  structure_interior_sect_talisman_cinnabar_inkstone_altar: {
    id: 'structure_interior_sect_talisman_cinnabar_inkstone_altar',
    name: 'Altar Meja Batu Tinta Cinnabar Penulisan Jimat',
    px: { w: 420, h: 400 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'talisman', 'cinnabar', 'inkstone', 'altar', 'daoist']
  },
  structure_dungeon_ancient_iron_maiden_spike_coffin: {
    id: 'structure_dungeon_ancient_iron_maiden_spike_coffin',
    name: 'Peti Besi Berduri Penyiksa Tawanan Gua',
    px: { w: 380, h: 520 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'iron_maiden', 'torture', 'spike', 'coffin', 'hazard']
  },
  structure_interior_sect_disciples_tea_drying_bamboo_trellis: {
    id: 'structure_interior_sect_disciples_tea_drying_bamboo_trellis',
    name: 'Rak Anyaman Bambu Penjemur Daun Teh Bertingkat Tiga',
    px: { w: 440, h: 460 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'tea', 'drying', 'bamboo', 'trellis', 'garden', 'farm']
  },
  structure_interior_sect_disciples_archery_target_straw_dummy: {
    id: 'structure_interior_sect_disciples_archery_target_straw_dummy',
    name: 'Boneka Jerami Bidikan Panah Latihan Murid',
    px: { w: 400, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'archery', 'target', 'straw', 'dummy', 'training', 'dojo']
  },
  structure_dungeon_ancient_crumbled_pillar_rubble_pile: {
    id: 'structure_dungeon_ancient_crumbled_pillar_rubble_pile',
    name: 'Tumpukan Puing Pilar Kuno Reruntuhan Gua',
    px: { w: 440, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'rubble', 'ruins', 'pillar', 'stone', 'hazard']
  },
  structure_interior_sect_scripture_bamboo_scroll_rack: {
    id: 'structure_interior_sect_scripture_bamboo_scroll_rack',
    name: 'Rak Bambu Melengkung Gulungan Kitab Bersegel',
    px: { w: 420, h: 460 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'scroll', 'rack', 'scripture', 'bamboo', 'library']
  },
  structure_dungeon_ancient_torture_rack_stretching_bench: {
    id: 'structure_dungeon_ancient_torture_rack_stretching_bench',
    name: 'Meja Rantai Penarik Sendi Tawanan Gua Kuno',
    px: { w: 460, h: 380 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'rack', 'torture', 'bench', 'chains', 'hazard']
  },
  structure_interior_sect_spirit_carp_basin_rockery: {
    id: 'structure_interior_sect_spirit_carp_basin_rockery',
    name: 'Bak Kolam Ikan Mas Roh Tebing Karang Miniatur',
    px: { w: 460, h: 420 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'basin', 'carp', 'rockery', 'pond', 'garden', 'courtyard']
  },
  structure_interior_sect_disciples_iron_palm_sand_basin: {
    id: 'structure_interior_sect_disciples_iron_palm_sand_basin',
    name: 'Bak Besi Pasir Panas Latihan Telapak Besi Murid',
    px: { w: 440, h: 400 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'sand', 'iron_palm', 'basin', 'training', 'dojo']
  },
  structure_dungeon_ancient_sacrificial_chalice_pedestal: {
    id: 'structure_dungeon_ancient_sacrificial_chalice_pedestal',
    name: 'Altar Cawan Pengorbanan Darah Roh Kuno',
    px: { w: 420, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'chalice', 'pedestal', 'altar', 'sacrificial', 'blood', 'hazard']
  },
  structure_interior_sect_disciples_dining_long_trestle_bench: {
    id: 'structure_interior_sect_disciples_dining_long_trestle_bench',
    name: 'Meja Panjang & Bangku Kayu Ruang Makan Murid',
    px: { w: 480, h: 360 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'table', 'bench', 'dining', 'refectory', 'wood']
  },
  structure_dungeon_ancient_spiked_wooden_barricade_gate: {
    id: 'structure_dungeon_ancient_spiked_wooden_barricade_gate',
    name: 'Pagar Barikade Kayu Berduri Besi Lorong Labirin',
    px: { w: 460, h: 440 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'barricade', 'spikes', 'gate', 'wood', 'hazard', 'defense']
  },
  structure_interior_sect_meditation_rush_mat_incense_cushion: {
    id: 'structure_interior_sect_meditation_rush_mat_incense_cushion',
    name: 'Alas Matras Semedi Mendong & Bantalan Meditasi Dantian',
    px: { w: 420, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.0,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'mat', 'cushion', 'meditation', 'incense', 'rush_mat']
  },
  structure_interior_sect_medicine_dispensing_granite_counter: {
    id: 'structure_interior_sect_medicine_dispensing_granite_counter',
    name: 'Meja Konter Granit Penyerahan Pil & Obat Sekte',
    px: { w: 460, h: 400 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'counter', 'medicine', 'granite', 'apothecary']
  },
  structure_dungeon_ancient_soul_siphon_crystal_crucible: {
    id: 'structure_dungeon_ancient_soul_siphon_crystal_crucible',
    name: 'Wadah Kristal Pengisap Jiwa Gua Terlarang',
    px: { w: 420, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'crystal', 'crucible', 'soul', 'siphon', 'hazard']
  },
  structure_interior_sect_disciples_uniform_wardrobe_cabinet: {
    id: 'structure_interior_sect_disciples_uniform_wardrobe_cabinet',
    name: 'Lemari Kayu Jubah Seragam Murid Sekte',
    px: { w: 440, h: 500 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'wardrobe', 'cabinet', 'uniform', 'robe', 'dormitory']
  },
  structure_dungeon_ancient_bone_brazier_skull_tripod: {
    id: 'structure_dungeon_ancient_bone_brazier_skull_tripod',
    name: 'Tungku Arang Tulang Belulang Kaki Tengkorak Tiga',
    px: { w: 400, h: 460 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'brazier', 'bone', 'skull', 'fire', 'hazard']
  },
  structure_interior_sect_celestial_map_bronze_compass_table: {
    id: 'structure_interior_sect_celestial_map_bronze_compass_table',
    name: 'Meja Kompas Perunggu Peta Bintang Navigasi Langit',
    px: { w: 460, h: 420 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'compass', 'table', 'celestial', 'astronomy', 'study']
  },
  structure_interior_sect_scripture_carved_stone_stele_tablet: {
    id: 'structure_interior_sect_scripture_carved_stone_stele_tablet',
    name: 'Prasasti Batu Ukir Aksara Ajaran Kitab Suci Sekte',
    px: { w: 420, h: 520 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'stele', 'tablet', 'scripture', 'stone', 'library']
  },
  structure_dungeon_ancient_bone_throne_demon_lord: {
    id: 'structure_dungeon_ancient_bone_throne_demon_lord',
    name: 'Singgasana Tulang Raja Siluman Reruntuhan Kuno',
    px: { w: 480, h: 540 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.5,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'throne', 'bone', 'demon', 'skull', 'boss']
  },
  structure_interior_sect_disciples_wooden_washbasin_stand: {
    id: 'structure_interior_sect_disciples_wooden_washbasin_stand',
    name: 'Tiang Gantungan & Waskom Cuci Muka Murid Sekte',
    px: { w: 380, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'washbasin', 'stand', 'towel', 'dormitory']
  },
  structure_dungeon_ancient_poison_dart_wall_gargoyle_nozzle: {
    id: 'structure_dungeon_ancient_poison_dart_wall_gargoyle_nozzle',
    name: 'Moncong Patung Kepala Monster Pelontar Panah Beracun',
    px: { w: 380, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'trap', 'dart', 'poison', 'gargoyle', 'hazard']
  },
  structure_interior_sect_spirit_orchid_potted_bonsai_pedestal: {
    id: 'structure_interior_sect_spirit_orchid_potted_bonsai_pedestal',
    name: 'Meja Kaki Kayu Bonsai Anggrek Roh Langit',
    px: { w: 400, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'bonsai', 'orchid', 'potted', 'plant', 'courtyard']
  },
  structure_interior_sect_grand_patriarch_cushioned_dais: {
    id: 'structure_interior_sect_grand_patriarch_cushioned_dais',
    name: 'Panggung Singgasana Tetua Agung Sekte',
    px: { w: 480, h: 440 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'throne', 'dais', 'patriarch', 'hall']
  },
  structure_dungeon_ancient_soul_ward_runic_iron_gate: {
    id: 'structure_dungeon_ancient_soul_ward_runic_iron_gate',
    name: 'Pintu Gerbang Besi Bersegel Mantra Penjaga Roh',
    px: { w: 460, h: 500 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'gate', 'iron', 'runes', 'ward', 'seal', 'hazard']
  },
  structure_interior_sect_disciples_weapon_cleaning_oil_bench: {
    id: 'structure_interior_sect_disciples_weapon_cleaning_oil_bench',
    name: 'Meja Minyak Perawatan & Pembersih Bilah Senjata',
    px: { w: 460, h: 380 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'interior', 'sect', 'bench', 'oil', 'sword', 'cleaning', 'armory']
  },
  structure_dungeon_ancient_spectral_will_o_wisp_urn: {
    id: 'structure_dungeon_ancient_spectral_will_o_wisp_urn',
    name: 'Guci Keramik Roh Api Biru Arwah Gentayangan',
    px: { w: 400, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'urn', 'wisp', 'spectral', 'spirit', 'fire', 'hazard']
  },
  structure_prof_alchemy_eight_trigrams_bronze_furnace: {
    id: 'structure_prof_alchemy_eight_trigrams_bronze_furnace',
    name: 'Tungku Alkimia Delapan Trigram Perunggu Kuno',
    px: { w: 460, h: 520 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'profession', 'alchemy', 'furnace', 'bronze', 'trigrams', 'crafting']
  },
  structure_prof_smithing_celestial_bellows_anvil: {
    id: 'structure_prof_smithing_celestial_bellows_anvil',
    name: 'Landasan Tempa Baja Meteorit Kuno & Tiupan Naga',
    px: { w: 480, h: 420 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'profession', 'smithing', 'anvil', 'forge', 'bellows', 'crafting']
  },
  structure_prof_farming_spirit_herb_nursery_trellis: {
    id: 'structure_prof_farming_spirit_herb_nursery_trellis',
    name: 'Petak Pembibitan Herba Roh & Teralis Bambu Giok',
    px: { w: 140, h: 128 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'profession', 'farming', 'herb', 'nursery', 'trellis', 'cultivation']
  },
  structure_prof_mining_spirit_ore_crushing_stamp_mill: {
    id: 'structure_prof_mining_spirit_ore_crushing_stamp_mill',
    name: 'Mesin Penumbuk Penghancur Bongkahan Bijih Roh Kuno',
    px: { w: 480, h: 480 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.86 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'profession', 'mining', 'ore', 'crusher', 'mill', 'crafting']
  },
  structure_prof_fishing_bamboo_raft_spirit_net_dock: {
    id: 'structure_prof_fishing_bamboo_raft_spirit_net_dock',
    name: 'Dermaga Rakit Bambu & Jemuran Jala Sutra Roh',
    px: { w: 480, h: 420 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'profession', 'fishing', 'dock', 'raft', 'net', 'water']
  },
  structure_prof_cooking_immortal_delicacy_hearth_oven: {
    id: 'structure_prof_cooking_immortal_delicacy_hearth_oven',
    name: 'Tungku Masak Dapur Kuliner Roh Abadi',
    px: { w: 460, h: 420 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'profession', 'cooking', 'hearth', 'oven', 'steamer', 'kitchen']
  },
  structure_dungeon_hazard_subterranean_magma_vent: {
    id: 'structure_dungeon_hazard_subterranean_magma_vent',
    name: 'Lubang Ventilasi Magma Belerang Bawah Tanah',
    px: { w: 440, h: 400 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'hazard', 'magma', 'lava', 'fire', 'vent']
  },
  structure_dungeon_hazard_elemental_ice_stalagmite_cluster: {
    id: 'structure_dungeon_hazard_elemental_ice_stalagmite_cluster',
    name: 'Gugusan Stalagmit Es Roh Elemen Kristal Biru',
    px: { w: 420, h: 460 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'hazard', 'ice', 'crystal', 'stalagmite', 'frost']
  },
  structure_dungeon_mechanism_ancient_stone_pressure_plate: {
    id: 'structure_dungeon_mechanism_ancient_stone_pressure_plate',
    name: 'Pelat Sakelar Tekanan Lantai Batu Kuno',
    px: { w: 380, h: 320 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.82 },
    overhangCells: 0.8,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'mechanism', 'plate', 'trigger', 'switch', 'stone']
  },
  structure_dungeon_hazard_concealed_floor_spike_grate: {
    id: 'structure_dungeon_hazard_concealed_floor_spike_grate',
    name: 'Kisi-kisi Jebakan Duri Baja Tersembunyi',
    px: { w: 400, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.82 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'dungeon', 'hazard', 'spikes', 'trap', 'iron', 'floor']
  },
  nature_scatter_desert_weathered_beast_skull_cairn: {
    id: 'nature_scatter_desert_weathered_beast_skull_cairn',
    name: 'Tengkorak Siluman Gurun Pasir Kuno',
    px: { w: 440, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'desert', 'skull', 'bone', 'beast', 'cairn', 'scatter']
  },
  nature_scatter_frost_crystal_pine_bonsai: {
    id: 'nature_scatter_frost_crystal_pine_bonsai',
    name: 'Pohon Cemara Kristal Salju Es Kuno',
    px: { w: 420, h: 460 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'frost', 'snow', 'pine', 'tree', 'crystal', 'scatter']
  },
  nature_scatter_volcanic_obsidian_basalt_pillar: {
    id: 'nature_scatter_volcanic_obsidian_basalt_pillar',
    name: 'Pilar Batu Basal Obsidian Vulkanik',
    px: { w: 400, h: 480 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 1.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'volcano', 'obsidian', 'basalt', 'rock', 'pillar', 'lava', 'scatter']
  },
  nature_scatter_misty_bamboo_sprout_cluster: {
    id: 'nature_scatter_misty_bamboo_sprout_cluster',
    name: 'Rumpun Rebung Bambu Roh Berselimut Kabut',
    px: { w: 380, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.0,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'bamboo', 'sprout', 'mist', 'cluster', 'plant', 'scatter']
  },
  nature_scatter_swamp_ancient_mangrove_root_hollow: {
    id: 'nature_scatter_swamp_ancient_mangrove_root_hollow',
    name: 'Bonggol Akar Mangrove Rawa Beracun',
    px: { w: 440, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.86 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'swamp', 'marsh', 'root', 'tree', 'poison', 'moss', 'scatter']
  },
  nature_scatter_autumn_scarlet_maple_cluster: {
    id: 'nature_scatter_autumn_scarlet_maple_cluster',
    name: 'Rumpun Pohon Maple Merah Menyala',
    px: { w: 440, h: 440 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'maple', 'autumn', 'tree', 'leaves', 'red', 'scatter']
  },
  nature_scatter_coastal_glowing_coral_rock: {
    id: 'nature_scatter_coastal_glowing_coral_rock',
    name: 'Batu Karang Pantai Beranemon Pirus',
    px: { w: 420, h: 380 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'coastal', 'coral', 'ocean', 'rock', 'reef', 'scatter']
  },
  nature_scatter_celestial_lotus_pond_rockery: {
    id: 'nature_scatter_celestial_lotus_pond_rockery',
    name: 'Ceruk Kolam Teratai Roh Alami',
    px: { w: 140, h: 127 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'lotus', 'pond', 'water', 'flower', 'rockery', 'scatter']
  },
  nature_scatter_thunder_struck_spirit_wood_stump: {
    id: 'nature_scatter_thunder_struck_spirit_wood_stump',
    name: 'Tunggul Kayu Roh Tersambar Petir Ungu',
    px: { w: 400, h: 420 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'thunder', 'lightning', 'wood', 'stump', 'electric', 'scatter']
  },
  nature_scatter_subterranean_luminescent_mushroom_patch: {
    id: 'nature_scatter_subterranean_luminescent_mushroom_patch',
    name: 'Rumpun Jamur Payung Bercahaya Bawah Tanah',
    px: { w: 140, h: 127 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 0.05,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'mushroom', 'fungus', 'glow', 'cave', 'subterranean', 'scatter']
  },
  structure_scatter_ruin_ancient_broken_halberd_sword_grave: {
    id: 'structure_scatter_ruin_ancient_broken_halberd_sword_grave',
    name: 'Gundukan Kuburan Pedang Medan Perang Kuno',
    px: { w: 440, h: 400 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'ruin', 'battlefield', 'sword', 'grave', 'halberd', 'scatter']
  },
  structure_scatter_roadside_tea_and_rest_pavilion_gazebo: {
    id: 'structure_scatter_roadside_tea_and_rest_pavilion_gazebo',
    name: 'Gazebo Teh Peristirahatan Tepi Jalan',
    px: { w: 460, h: 420 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'roadside', 'pavilion', 'tea', 'rest', 'gazebo', 'scatter']
  },
  structure_scatter_mountain_daoist_stone_lantern_beacon: {
    id: 'structure_scatter_mountain_daoist_stone_lantern_beacon',
    name: 'Lentera Batu Pagoda Kuno Berlumut',
    px: { w: 140, h: 187 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.88 },
    overhangCells: 0.3,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'lantern', 'stone', 'daoist', 'beacon', 'mountain', 'scatter']
  },
  structure_scatter_riverside_moored_wooden_sampan: {
    id: 'structure_scatter_riverside_moored_wooden_sampan',
    name: 'Perahu Sampan Kayu Tertambat di Tepi Sungai',
    px: { w: 460, h: 380 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['structure', 'boat', 'sampan', 'river', 'water', 'dock', 'scatter']
  },
  nature_scatter_wild_spirit_ginseng_flowering_patch: {
    id: 'nature_scatter_wild_spirit_ginseng_flowering_patch',
    name: 'Rumpun Ginseng Liar Seribu Tahun Berbunga',
    px: { w: 380, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.85 },
    overhangCells: 1.0,
    collision: 'soft',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['nature', 'herb', 'ginseng', 'flower', 'spirit', 'patch', 'scatter']
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
 * L3: Soft contact shadow at base of tall objects (H0 / HA / G5).
 * Soft dark ellipse replacing the old white foot mist.
 */
export function renderL3FootMist(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  footprintWidth: number,
  mistHeight: number
) {
  ctx.save();
  ctx.fillStyle = 'rgba(30, 25, 20, 0.22)';
  ctx.beginPath();
  ctx.ellipse(baseX, baseY, footprintWidth * 0.4, Math.max(2, mistHeight), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * L4: Tall procedural object renderer (Shuimo style).
 */
export function renderL4ProceduralObject(
  ctx: CanvasRenderingContext2D,
  defId: string,
  screenX: number,
  screenY: number,
  tileSizeOrDw: number,
  time: number,
  alpha: number = 1.0,
  flipX: boolean = false,
  explicitDh?: number
) {
  // Phase HA: Never render quarantined placeholder sprites
  if (isDefIdQuarantined(defId)) {
    return;
  }

  const canon = scaleCanon[defId];
  let dw: number;
  let dh: number;

  if (explicitDh !== undefined) {
    dw = tileSizeOrDw;
    dh = explicitDh;
  } else {
    const tileSize = tileSizeOrDw;
    const def = OBJECT_DEFINITIONS[defId];
    if (canon) {
      dw = canon.visualW * tileSize;
      dh = canon.visualH * tileSize;
    } else if (def) {
      dw = def.footprint.cw * tileSize;
      dh = (def.footprint.ch + def.overhangCells) * tileSize;
    } else {
      dw = tileSize;
      dh = tileSize * 2;
    }
  }

  // 1. Try rendering from WebP texture atlas first (Song Dynasty Shuimo asset)
  const atlasName = getAtlasNameForDefId(defId);
  if (atlasLoader.drawAtlasFrame(ctx, atlasName, defId, screenX, screenY, dw, dh, alpha, flipX)) {
    return;
  }

  // 2. Phase HA: All vector fallback branches (karst_pillar, mt_rock, bamboo_clump, pine_tree, village_house, sect_gate, etc.)
  // have been strictly removed to eliminate distorted geometries and placeholder silhouettes.
  if (!warnedMissingAtlasDefs.has(defId)) {
    warnedMissingAtlasDefs.add(defId);
    console.warn(`[renderL4ProceduralObject] Missing or unloaded atlas frame for '${defId}', vector fallback disabled.`);
  }

  // In dev mode only, draw a lightweight red outline and label to aid debugging without corrupting aesthetics
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && (window as any).__DEV_MAP_DEBUG__) {
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX, screenY, dw, dh);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.font = '9px monospace';
    ctx.fillText(defId, screenX + 2, screenY + 10);
    ctx.restore();
  }
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
 * Resolves species atlas frame or fallback frame for monsters based on name, key, or category.
 * Returns valid atlas frameId (100% deterministic, 0% emoji).
 */
export function resolveMonsterAtlasFrameWithFallback(name?: string, key?: string, tier: number = 1): string {
  const text = `${name || ''} ${key || ''}`.toLowerCase();
  if (key && atlasLoader.hasFrame(key)) return key;
  if (key && atlasLoader.hasFrame(`monster_${key}`)) return `monster_${key}`;
  if (key && atlasLoader.hasFrame(`monster_regional_${key}`)) return `monster_regional_${key}`;

  if (text.includes('naga') || text.includes('dragon') || text.includes('wyrm')) return 'monster_regional_primordial_azure_dragon';
  if (text.includes('harimau') || text.includes('macan') || text.includes('tiger')) return 'monster_white_tiger';
  if (text.includes('ular') || text.includes('snake') || text.includes('viper') || text.includes('piton') || text.includes('serpent')) return 'monster_blood_serpent';
  if (text.includes('elang') || text.includes('rajawali') || text.includes('bird') || text.includes('roc')) return 'monster_storm_roc';
  if (text.includes('beruang') || text.includes('bear')) return 'monster_iron_bear';
  if (text.includes('kalajengking') || text.includes('scorpion')) return 'monster_sand_scorpion';
  if (text.includes('golem') || text.includes('rock')) return 'monster_rock_golem';
  if (text.includes('kera') || text.includes('ape')) return 'monster_flame_ape';
  if (text.includes('rubah') || text.includes('fox')) return 'monster_regional_nine_tailed_fox';
  if (text.includes('serigala') || text.includes('wolf')) return 'monster_demon_wolf';
  if (text.includes('mastodon') || text.includes('gajah')) return 'monster_regional_glacial_frost_mastodon';
  if (text.includes('kura') || text.includes('tortoise')) return 'monster_regional_magma_lava_tortoise';
  if (text.includes('kelabang') || text.includes('centipede')) return 'monster_regional_myriad_toxic_centipede';
  if (text.includes('qilin')) return 'monster_regional_primordial_jade_qilin';

  // Fallback silhouette per tier (100% deterministic, 0% emoji)
  if (tier <= 1) return 'monster_demon_wolf';
  if (tier === 2) return 'monster_blood_serpent';
  if (tier === 3) return 'monster_iron_bear';
  if (tier === 4) return 'monster_flame_ape';
  return 'monster_rock_golem';
}

/**
 * Backward compatibility stub: returns empty string or frame id, NEVER an emoji.
 */
export function getMonsterIcon(name?: string, key?: string): string {
  return '';
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
  let hanziGlyph = '草';
  if (resourceType === 'ore') {
    primaryColor = '#F59E0B';
    sparkleColor = '#FDE68A';
    hanziGlyph = '矿';
  } else if (resourceType === 'wood') {
    primaryColor = '#059669';
    sparkleColor = '#A7F3D0';
    hanziGlyph = '木';
  } else if (resourceType === 'fish') {
    primaryColor = '#0284C7';
    sparkleColor = '#7DD3FC';
    hanziGlyph = '鱼';
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

  // Spiritual Runemark in center (Hanzi Calligraphy Glyph - Zero Emoji)
  ctx.fillStyle = primaryColor;
  ctx.font = `bold ${Math.max(8, Math.floor(radius * 0.55))}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hanziGlyph, cx, cy + 0.5);

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
