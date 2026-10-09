/**
 * worldRegionEngine.js
 * Engine Otoritatif untuk mendefinisikan 22 Region (Wilayah) Kanonikal berdasarkan koordinat x, y (5000x5000)
 * Mengimplementasikan Zero-Ambush Policy di wilayah aman, gerbang terrain, dan sinkronisasi 20 Hukum Semesta.
 * Referensi: docs/WORLD_MAP_MASTER_PLAN.md §4.1 & §4.5
 */

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;

const worldData = require('./worldData');

// Delegasi SSOT ke worldData (29 Region Kanonikal, 0% Void Guarantee)
const REGIONS = worldData.getAllRegions();
const REGION_ALIASES = worldData.REGION_ALIASES;

function normalizeRegionSlug(slug) {
  return worldData.normalizeRegionSlug(slug);
}

/**
 * Mendapatkan region berdasarkan koordinat spasial makro (tileX, tileY)
 * Menggunakan raster matrix 50x50 dan domain warping dari worldData (0% unknown_void).
 */
function getRegionAt(x, y) {
  return worldData.getRegionAt(x, y);
}

/**
 * Mendapatkan tipe teritori dan status ambush.
 * MENJALANKAN ZERO-AMBUSH POLICY: Wilayah aman / biasa (Tier 1 & pemukiman) = 0% ambush mutlak!
 * Ambush HANYA aktif di wilayah Danger (Tier >= 3) atau saat ada world event aktif.
 */
function getTerritoryInfo(x, y, terrainType, isSettlement, isWorldEventActive = false) {
  // 1. Pemukiman & Kota di seluruh benua: 100% AMAN MUTLAK (Zero Ambush)
  if (isSettlement || terrainType === 'settlement') {
    return {
      type: 'settlement',
      ambushRiskRate: 0,
      dangerTierBase: 1
    };
  }

  // 2. Jalan Raya Kerajaan / Jalur Transit: 100% AMAN MUTLAK (Zero Ambush)
  if (terrainType === 'road') {
    return {
      type: 'safe_zone',
      ambushRiskRate: 0,
      dangerTierBase: 1
    };
  }

  const region = getRegionAt(x, y);

  // 3. Dataran Terbuka Biasa (Plains/Meadow/Farmland): Selalu AMAN (Zero Ambush) kecuali ada World Event
  if ((terrainType === 'plains' || terrainType === 'meadow' || terrainType === 'farmland' || terrainType === 'herb_field') && !isWorldEventActive) {
    if (region.dangerTier === 5) {
      return { type: 'death_zone', ambushRiskRate: 0.25, dangerTierBase: 5 };
    }
    return {
      type: 'safe_zone',
      ambushRiskRate: 0,
      dangerTierBase: Math.min(region.dangerTier, 2)
    };
  }

  // 4. ZONA BAHAYA ALAM LIAR (HUNTING, FARMING & AMBUSH SUB-ZONES)
  // A. Hutan Bambu & Pohon Roh
  if (terrainType === 'bamboo_forest' || terrainType === 'bamboo_grove' || terrainType === 'bamboo_dense') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: 0.18,
      dangerTierBase: Math.max(2, region.dangerTier)
    };
  }

  // B. Rimba Belantara Purba
  if (terrainType === 'forest' || terrainType === 'spirit_wood' || terrainType === 'dead_wood' || terrainType === 'mist_forest') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: 0.22,
      dangerTierBase: Math.max(2, region.dangerTier)
    };
  }

  // C. Rawa Racun Miasma & Lembah Terlarang
  if (terrainType === 'swamp' || terrainType === 'demonic_swamp' || terrainType === 'venom_mire' || terrainType === 'miasma_waste' || terrainType === 'poison_pool') {
    return {
      type: 'danger_zone',
      ambushRiskRate: 0.32,
      dangerTierBase: Math.max(4, region.dangerTier)
    };
  }

  // D. Tebing Pegunungan Cadas & Bukit
  if (terrainType === 'mountain' || terrainType === 'azure_mountain' || terrainType === 'mountain_rock' || terrainType === 'mountain_peak' || terrainType === 'cliff' || terrainType === 'hill' || terrainType === 'ridge_low') {
    return {
      type: 'danger_zone',
      ambushRiskRate: 0.28,
      dangerTierBase: Math.max(3, region.dangerTier)
    };
  }

  // E. Kawah Magma & Medan Abu Tempur
  if (terrainType === 'volcanic' || terrainType === 'lava_spine' || terrainType === 'lava_flow' || terrainType === 'basalt' || terrainType === 'battlefield_ash' || terrainType === 'abyss_edge' || terrainType === 'crater') {
    return {
      type: 'death_zone',
      ambushRiskRate: 0.40,
      dangerTierBase: 5
    };
  }

  // F. Gurun Pasir Suci & Ngarai
  if (terrainType === 'western_desert' || terrainType === 'desert' || terrainType === 'desert_sand' || terrainType === 'dune' || terrainType === 'canyon' || terrainType === 'canyon_floor') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: 0.25,
      dangerTierBase: Math.max(3, region.dangerTier)
    };
  }

  // G. Gletser Salju Beku
  if (terrainType === 'glacial' || terrainType === 'northern_glacial' || terrainType === 'snow' || terrainType === 'glacier' || terrainType === 'ice_crack') {
    return {
      type: 'danger_zone',
      ambushRiskRate: 0.30,
      dangerTierBase: Math.max(4, region.dangerTier)
    };
  }

  // H. Perairan Ombak Bebas, Danau & Samudra
  if (terrainType === 'ocean' || terrainType === 'sea' || terrainType === 'sea_reef' || terrainType === 'lake' || terrainType === 'lake_deep' || terrainType === 'ice_sea' || terrainType === 'eastern_sea') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: 0.18,
      dangerTierBase: Math.max(3, region.dangerTier)
    };
  }

  // I. Jalur Celah Gerbang Lintasan Gunung (Pass)
  if (terrainType === 'mountain_pass' || terrainType === 'sword_gorge_pass') {
    return {
      type: 'calm_zone',
      ambushRiskRate: 0.05,
      dangerTierBase: 2
    };
  }

  // Default Fallback
  return { type: 'safe_zone', ambushRiskRate: 0, dangerTierBase: 1 };
}

/**
 * Mendapatkan biaya stamina dasar berdasarkan terrain
 */
function getTerrainStaminaCost(terrainType) {
  switch (terrainType) {
    case 'road':
    case 'road_stone':
    case 'road_dirt':
    case 'settlement': return 0.5; // Diskon jalan raya resmi
    case 'plains':
    case 'meadow':
    case 'farmland':
    case 'herb_field':
    case 'ruin_floor':
    case 'formation_tile':
    case 'floating_stone': return 1.0;
    case 'forest':
    case 'bamboo_forest':
    case 'bamboo_grove':
    case 'bamboo_dense':
    case 'spirit_wood':
    case 'dead_wood':
    case 'mist_forest': return 1.5;
    case 'hill':
    case 'ridge_low':
    case 'canyon_floor':
    case 'lightning_scar': return 1.8;
    case 'swamp':
    case 'demonic_swamp':
    case 'venom_mire':
    case 'miasma_waste':
    case 'poison_pool':
    case 'western_desert':
    case 'desert':
    case 'desert_sand':
    case 'dune': return 2.0;
    case 'mountain':
    case 'azure_mountain':
    case 'mountain_rock':
    case 'mountain_peak':
    case 'cliff': return 2.5;
    case 'glacial':
    case 'northern_glacial':
    case 'snow':
    case 'glacier':
    case 'ice_crack':
    case 'volcanic':
    case 'lava_spine':
    case 'lava_flow':
    case 'basalt':
    case 'battlefield_ash':
    case 'abyss_edge':
    case 'crater': return 3.0;
    case 'ocean':
    case 'sea':
    case 'sea_reef':
    case 'lake':
    case 'lake_deep':
    case 'ice_sea':
    case 'river':
    case 'river_shallow':
    case 'pond_lotus':
    case 'waterfall_pool':
    case 'mountain_pass':
    case 'sword_gorge_pass': return 1.0;
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
