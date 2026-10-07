/**
 * worldRegionEngine.js
 * Engine Otoritatif untuk mendefinisikan 22 Region (Wilayah) Kanonikal berdasarkan koordinat x, y (5000x5000)
 * Mengimplementasikan Zero-Ambush Policy di wilayah aman, gerbang terrain, dan sinkronisasi 20 Hukum Semesta.
 * Referensi: docs/WORLD_MAP_MASTER_PLAN.md §4.1 & §4.5
 */

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;

// Kamus Alias Retroaktif (Menyelesaikan Bug B2 & B6: Backward Compatibility)
const REGION_ALIASES = {
  azure_mountain: 'azure_mountain_range',
  azure_mountain_range: 'azure_mountain_range',
  eastern_sea_region: 'eastern_sea',
  eastern_sea: 'eastern_sea',
  southern_demon: 'southern_demon_domain',
  southern_demon_domain: 'southern_demon_domain',
  western_desert: 'western_sacred_desert',
  western_sacred_deserts: 'western_sacred_desert',
  western_sacred_desert: 'western_sacred_desert',
  northern_desolate_territory: 'northern_desolate',
  northern_desolate: 'northern_desolate',
  central_plains: 'central_plains'
};

function normalizeRegionSlug(slug) {
  if (!slug) return 'central_plains';
  return REGION_ALIASES[slug] || slug;
}

// Registri 22 Wilayah Kanonikal Benua Tianyuan
const REGIONS = [
  // 1. Pusat Peradaban (Paling Aman / Zero Ambush)
  {
    id: 'central_plains',
    name: 'Central Plains',
    dangerTier: 1,
    qiDensityModifier: 1.0,
    bounds: { minX: 1800, maxX: 3200, minY: 2000, maxY: 3100 },
    priority: 1,
    walkDefault: 'open',
    tempRangeC: { min: 18, max: 26 },
    lawAffinities: ['righteous_heavenly_merit', 'righteous_pure_yang'],
    resourceTags: ['basic_wood', 'plain_herb', 'iron_ore', 'merit_crystal']
  },
  // 2. Rantai Pegunungan Azure (Barrier Pemisah)
  {
    id: 'azure_mountain_range',
    name: 'Azure Mountain Range',
    dangerTier: 3,
    qiDensityModifier: 1.5,
    bounds: { minX: 1500, maxX: 3600, minY: 3100, maxY: 3600 },
    priority: 10,
    walkDefault: 'restricted',
    tempRangeC: { min: 2, max: 14 },
    lawAffinities: ['righteous_sword_heart', 'element_roc_wind'],
    resourceTags: ['spirit_bamboo', 'azure_iron', 'sword_shard', 'frost_herb']
  },
  // 3. Tundra Beku Utara
  {
    id: 'northern_desolate',
    name: 'Northern Desolate',
    dangerTier: 4,
    qiDensityModifier: 0.9,
    bounds: { minX: 1000, maxX: 3200, minY: 3600, maxY: 5000 },
    priority: 4,
    walkDefault: 'restricted',
    tempRangeC: { min: -25, max: -5 },
    lawAffinities: ['element_azure_water', 'body_tempering'],
    resourceTags: ['glacial_ice', 'frost_lotus', 'beast_fur', 'pure_water_essence']
  },
  // 4. Sabana Halilintar
  {
    id: 'thundersteppe',
    name: 'Thundersteppe',
    dangerTier: 4,
    qiDensityModifier: 1.4,
    bounds: { minX: 1800, maxX: 2800, minY: 3800, maxY: 4600 },
    priority: 6,
    walkDefault: 'open',
    tempRangeC: { min: -5, max: 12 },
    lawAffinities: ['element_godthunder_light'],
    resourceTags: ['thunder_stone', 'storm_grass', 'lightning_core']
  },
  // 5. Puncak Petir Surgawi
  {
    id: 'godthunder_peaks',
    name: 'Godthunder Peaks',
    dangerTier: 5,
    qiDensityModifier: 1.8,
    bounds: { minX: 3200, maxX: 4200, minY: 4000, maxY: 5000 },
    priority: 7,
    walkDefault: 'restricted',
    tempRangeC: { min: -15, max: 5 },
    lawAffinities: ['element_godthunder_light'],
    resourceTags: ['divine_thunder_crystal', 'celestial_essence']
  },
  // 6. Danau Cermin Spiritual
  {
    id: 'mirror_lake',
    name: 'Mirror Lake',
    dangerTier: 2,
    qiDensityModifier: 1.6,
    bounds: { minX: 3000, maxX: 3800, minY: 3400, maxY: 4200 },
    priority: 8,
    walkDefault: 'restricted',
    tempRangeC: { min: 8, max: 16 },
    lawAffinities: ['righteous_karmic_mirror', 'element_azure_water'],
    resourceTags: ['mirror_water', 'lotus_seed', 'karma_sand']
  },
  // 7. Padang Satwa Roh
  {
    id: 'beast_prairies',
    name: 'Beast Prairies',
    dangerTier: 3,
    qiDensityModifier: 1.1,
    bounds: { minX: 1000, maxX: 1800, minY: 3400, maxY: 4200 },
    priority: 5,
    walkDefault: 'open',
    tempRangeC: { min: 5, max: 18 },
    lawAffinities: ['natal_beast'],
    resourceTags: ['beast_bone', 'wild_tendon', 'beast_essence_herb']
  },
  // 8. Gurun Pasir Suci Barat
  {
    id: 'western_sacred_desert',
    name: 'Western Sacred Desert',
    dangerTier: 3,
    qiDensityModifier: 0.9,
    bounds: { minX: 0, maxX: 1600, minY: 2000, maxY: 4000 },
    priority: 3,
    walkDefault: 'open',
    tempRangeC: { min: 35, max: 48 },
    lawAffinities: ['righteous_pure_yang', 'element_phoenix_fire'],
    resourceTags: ['solar_sand', 'fire_cactus', 'sun_crystal', 'camel_bone']
  },
  // 9. Ngarai Labirin Barat
  {
    id: 'western_canyon_labyrinth',
    name: 'Western Canyon Labyrinth',
    dangerTier: 4,
    qiDensityModifier: 1.2,
    bounds: { minX: 0, maxX: 1200, minY: 1200, maxY: 2200 },
    priority: 5,
    walkDefault: 'restricted',
    tempRangeC: { min: 30, max: 42 },
    lawAffinities: ['body_tempering', 'element_xuanwu_earth'],
    resourceTags: ['earth_marrow', 'granite_core', 'sand_essence']
  },
  // 10. Rantai Gunung Berapi Magma
  {
    id: 'lava_spine',
    name: 'Lava Spine',
    dangerTier: 5,
    qiDensityModifier: 1.7,
    bounds: { minX: 800, maxX: 1800, minY: 600, maxY: 1800 },
    priority: 9,
    walkDefault: 'restricted',
    tempRangeC: { min: 45, max: 70 },
    lawAffinities: ['element_phoenix_fire', 'body_tempering'],
    resourceTags: ['phoenix_ember', 'molten_slag', 'sulfur_crystal', 'fire_essence']
  },
  // 11. Rawa Miasma Racun
  {
    id: 'venom_mire',
    name: 'Venom Mire',
    dangerTier: 4,
    qiDensityModifier: 1.1,
    bounds: { minX: 0, maxX: 1000, minY: 400, maxY: 1600 },
    priority: 6,
    walkDefault: 'restricted',
    tempRangeC: { min: 28, max: 38 },
    lawAffinities: ['demonic_myriad_venom', 'gu_master'],
    resourceTags: ['venom_sac', 'toxic_spore', 'mire_mud', 'poison_herb']
  },
  // 12. Domain Iblis Selatan
  {
    id: 'southern_demon_domain',
    name: 'Southern Demon Domain',
    dangerTier: 4,
    qiDensityModifier: 1.3,
    bounds: { minX: 1600, maxX: 3200, minY: 600, maxY: 1800 },
    priority: 4,
    walkDefault: 'open',
    tempRangeC: { min: 26, max: 36 },
    lawAffinities: ['demonic_turbid_core', 'demonic_nether_darkness'],
    resourceTags: ['turbid_core', 'dark_stone', 'demonic_tendon', 'shadow_grass']
  },
  // 13. Bekas Medan Perang Arwah Merah
  {
    id: 'crimson_battlefield',
    name: 'Crimson Battlefield',
    dangerTier: 5,
    qiDensityModifier: 1.5,
    bounds: { minX: 2400, maxX: 3400, minY: 400, maxY: 1200 },
    priority: 7,
    walkDefault: 'open',
    tempRangeC: { min: 24, max: 34 },
    lawAffinities: ['demonic_blood_soul'],
    resourceTags: ['blood_vial', 'soul_dust', 'rusted_weapon_shard']
  },
  // 14. Jurang Retakan Dimensi Abyss
  {
    id: 'abyssal_scar',
    name: 'Abyssal Scar',
    dangerTier: 5,
    qiDensityModifier: 2.0,
    bounds: { minX: 1600, maxX: 2200, minY: 200, maxY: 1000 },
    priority: 8,
    walkDefault: 'restricted',
    tempRangeC: { min: 15, max: 25 },
    lawAffinities: ['demonic_abyssal_pact'],
    resourceTags: ['abyssal_scroll', 'nether_shard', 'fiend_blood']
  },
  // 15. Hutan Belantara Purba Lebat
  {
    id: 'spirit_wood_sea',
    name: 'Spirit Wood Sea',
    dangerTier: 3,
    qiDensityModifier: 1.4,
    bounds: { minX: 3200, maxX: 4200, minY: 800, maxY: 1800 },
    priority: 4,
    walkDefault: 'restricted',
    tempRangeC: { min: 20, max: 28 },
    lawAffinities: ['element_qingdi_wood', 'natal_beast'],
    resourceTags: ['thousand_year_wood', 'qingdi_sprout', 'vitality_sap']
  },
  // 16. Lembah Kabut Serangga Gu
  {
    id: 'mist_insect_valley',
    name: 'Mist Insect Valley',
    dangerTier: 4,
    qiDensityModifier: 1.2,
    bounds: { minX: 4000, maxX: 4800, minY: 600, maxY: 1600 },
    priority: 6,
    walkDefault: 'restricted',
    tempRangeC: { min: 25, max: 35 },
    lawAffinities: ['gu_master', 'demonic_myriad_venom'],
    resourceTags: ['gu_larva', 'insect_shell', 'gu_food_herb', 'myriad_toxin']
  },
  // 17. Hutan Jamur Hawa Busuk
  {
    id: 'southern_plague_woods',
    name: 'Southern Plague Woods',
    dangerTier: 4,
    qiDensityModifier: 1.0,
    bounds: { minX: 3000, maxX: 3800, minY: 200, maxY: 900 },
    priority: 5,
    walkDefault: 'restricted',
    tempRangeC: { min: 24, max: 34 },
    lawAffinities: ['gu_master', 'demonic_myriad_venom'],
    resourceTags: ['plague_spore', 'festering_root', 'black_fungus']
  },
  // 18. Dataran Batu Formasi Kuno
  {
    id: 'formation_barrens',
    name: 'Formation Barrens',
    dangerTier: 3,
    qiDensityModifier: 1.6,
    bounds: { minX: 3200, maxX: 4000, minY: 2200, maxY: 3000 },
    priority: 5,
    walkDefault: 'open',
    tempRangeC: { min: 16, max: 26 },
    lawAffinities: ['righteous_formation_array', 'element_xuanwu_earth'],
    resourceTags: ['formation_flag_pole', 'array_jade', 'spirit_magnet']
  },
  // 19. Jurang Sempit Hawa Pedang
  {
    id: 'sword_gorge',
    name: 'Sword Gorge',
    dangerTier: 4,
    qiDensityModifier: 1.8,
    bounds: { minX: 3200, maxX: 3600, minY: 2800, maxY: 3400 },
    priority: 9,
    walkDefault: 'restricted',
    tempRangeC: { min: 6, max: 16 },
    lawAffinities: ['righteous_sword_heart', 'natal_artifact'],
    resourceTags: ['sword_intent_stone', 'tempered_steel', 'blade_ore']
  },
  // 20. Pegunungan Gerigi Tambang Bijih
  {
    id: 'ore_teeth_range',
    name: 'Ore Teeth Range',
    dangerTier: 3,
    qiDensityModifier: 1.2,
    bounds: { minX: 3600, maxX: 4400, minY: 1800, maxY: 2600 },
    priority: 6,
    walkDefault: 'restricted',
    tempRangeC: { min: 14, max: 24 },
    lawAffinities: ['natal_artifact', 'element_xuanwu_earth'],
    resourceTags: ['heavy_iron_ore', 'black_gold_grain', 'spirit_copper']
  },
  // 21. Samudra Lepas Ombak Pasang
  {
    id: 'eastern_sea',
    name: 'Eastern Sea',
    dangerTier: 3,
    qiDensityModifier: 1.2,
    bounds: { minX: 3800, maxX: 5000, minY: 1200, maxY: 4000 },
    priority: 4,
    walkDefault: 'restricted',
    tempRangeC: { min: 18, max: 28 },
    lawAffinities: ['element_azure_water'],
    resourceTags: ['ocean_pearl', 'deep_sea_coral', 'azure_essence', 'spirit_fish']
  },
  // 22. Kepulauan Karang Melayang Angin
  {
    id: 'floating_wind_isles',
    name: 'Floating Wind Isles',
    dangerTier: 5,
    qiDensityModifier: 1.9,
    bounds: { minX: 4200, maxX: 5000, minY: 2200, maxY: 3200 },
    priority: 8,
    walkDefault: 'restricted',
    tempRangeC: { min: 10, max: 20 },
    lawAffinities: ['element_roc_wind'],
    resourceTags: ['wind_feather', 'sky_jade', 'cyclone_core', 'flying_stone']
  }
];

// Fallback Region jika di luar batas
const UNKNOWN_REGION = {
  id: 'unknown_void',
  name: 'Void Beyond',
  dangerTier: 5,
  qiDensityModifier: 0.1,
  walkDefault: 'blocked',
  tempRangeC: { min: -50, max: -50 }
};

/**
 * Mendapatkan region berdasarkan koordinat spasial makro (tileX, tileY)
 */
function getRegionAt(x, y) {
  let matchedRegion = UNKNOWN_REGION;
  let highestPriority = -1;

  for (const region of REGIONS) {
    if (
      x >= region.bounds.minX &&
      x <= region.bounds.maxX &&
      y >= region.bounds.minY &&
      y <= region.bounds.maxY
    ) {
      if (region.priority > highestPriority) {
        matchedRegion = region;
        highestPriority = region.priority;
      }
    }
  }

  return matchedRegion;
}

/**
 * Mendapatkan tipe teritori dan status ambush.
 * MENJALANKAN ZERO-AMBUSH POLICY: Wilayah aman / biasa (Tier 1 & pemukiman) = 0% ambush mutlak!
 * Ambush HANYA aktif di wilayah Danger (Tier >= 3) atau saat ada world event aktif.
 */
function getTerritoryInfo(x, y, terrainType, isSettlement, isWorldEventActive = false) {
  // Pemukiman / Kota: 100% Bebas Ambush
  if (isSettlement) {
    return {
      type: 'settlement',
      ambushRiskRate: 0,
      dangerTierBase: 1
    };
  }

  const region = getRegionAt(x, y);

  // WILAYAH BIASA / AMAN (Tier 1: Central Plains): 0% Ambush Mutlak
  if (region.dangerTier === 1 && !isWorldEventActive) {
    return {
      type: 'safe_zone',
      ambushRiskRate: 0,
      dangerTierBase: 1
    };
  }

  // Wilayah Tenang Tier 2 (Mirror Lake): 0% di jalanan/air
  if (region.dangerTier === 2 && !isWorldEventActive) {
    return {
      type: 'calm_zone',
      ambushRiskRate: terrainType === 'mountain' ? 0.03 : 0,
      dangerTierBase: 2
    };
  }

  // Wilayah Perairan Dalam / Lautan
  if (terrainType === 'ocean') {
    return { type: 'locked_zone', ambushRiskRate: 0.08, dangerTierBase: 3 };
  }

  // WILAYAH BAHAYA EKSTREM (Tier 5: Lava Spine, Crimson Battlefield, Abyssal Scar)
  if (region.dangerTier === 5) {
    const isRoad = terrainType === 'road';
    return {
      type: 'death_zone',
      ambushRiskRate: isRoad ? 0.12 : 0.45,
      dangerTierBase: 5
    };
  }

  // WILAYAH BAHAYA TINGGI (Tier 4: Northern Tundra, Demon Domain, Venom Mire, Gu Valley)
  if (region.dangerTier === 4) {
    const isRoad = terrainType === 'road';
    return {
      type: 'danger_zone',
      ambushRiskRate: isRoad ? 0.05 : 0.28,
      dangerTierBase: 4
    };
  }

  // WILAYAH BAHAYA SEDANG (Tier 3: Azure Mountain, Western Desert, Ore Teeth)
  if (region.dangerTier === 3) {
    const isRoad = terrainType === 'road';
    return {
      type: 'monster_zone',
      ambushRiskRate: isRoad ? 0.02 : 0.15,
      dangerTierBase: 3
    };
  }

  // Default Fallback
  return { type: 'wilderness', ambushRiskRate: 0, dangerTierBase: 1 };
}

/**
 * Mendapatkan biaya stamina dasar berdasarkan terrain
 */
function getTerrainStaminaCost(terrainType) {
  switch (terrainType) {
    case 'road':
    case 'settlement': return 0.5; // Diskon jalan raya resmi
    case 'plains': return 1.0;
    case 'forest':
    case 'bamboo_forest': return 1.5;
    case 'swamp':
    case 'demonic_swamp':
    case 'western_desert': return 2.0;
    case 'mountain':
    case 'azure_mountain': return 2.5;
    case 'glacial':
    case 'northern_glacial':
    case 'volcanic':
    case 'lava_spine': return 3.0;
    case 'ocean':
    case 'river': return 1.0; // Jika memakai kapal/perahu
    default: return 1.0;
  }
}

module.exports = {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  REGIONS,
  REGION_ALIASES,
  normalizeRegionSlug,
  getRegionAt,
  getTerritoryInfo,
  getTerrainStaminaCost
};
