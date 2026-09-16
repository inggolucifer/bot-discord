/**
 * worldRegionEngine.js
 * Engine untuk mendefinisikan region (wilayah) berdasarkan koordinat x, y di dunia Jianghu (5000x5000).
 * Berbasis data dari repositori Core (inggo-alvn/Core).
 */

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;

// Definisi Wilayah (Regions)
const REGIONS = [
  {
    id: 'central_plains',
    name: 'Central Plains',
    chineseName: '中原',
    dangerTier: 1,
    qiDensityModifier: 1.0,
    bounds: { minX: 2000, maxX: 3500, minY: 2000, maxY: 3200 },
    priority: 1 // Default
  },
  {
    id: 'azure_mountain',
    name: 'Azure Mountain Range',
    chineseName: '碧山',
    dangerTier: 2,
    qiDensityModifier: 1.5,
    bounds: { minX: 1000, maxX: 2200, minY: 2000, maxY: 3500 },
    priority: 2 // Overrides default if overlapping
  },
  {
    id: 'southern_demon',
    name: 'Southern Demon Domain',
    chineseName: '南魔域',
    dangerTier: 4,
    qiDensityModifier: 1.2,
    bounds: { minX: 1800, maxX: 3200, minY: 1000, maxY: 2000 },
    priority: 3
  },
  {
    id: 'eastern_sea',
    name: 'Eastern Sea Region',
    chineseName: '东海',
    dangerTier: 3,
    qiDensityModifier: 1.1,
    bounds: { minX: 3500, maxX: 5000, minY: 1500, maxY: 3500 },
    priority: 4
  },
  {
    id: 'northern_desolate',
    name: 'Northern Desolate Territory',
    chineseName: '北荒',
    dangerTier: 4,
    qiDensityModifier: 0.8,
    bounds: { minX: 1000, maxX: 4000, minY: 3200, maxY: 5000 },
    priority: 5
  },
  {
    id: 'western_desert',
    name: 'Western Sacred Deserts',
    chineseName: '西圣漠',
    dangerTier: 3,
    qiDensityModifier: 0.9,
    bounds: { minX: 0, maxX: 1500, minY: 1500, maxY: 4000 },
    priority: 6
  }
];

// Fallback Region jika di luar batas
const UNKNOWN_REGION = {
  id: 'unknown_void',
  name: 'Void Beyond',
  chineseName: '虚无',
  dangerTier: 5,
  qiDensityModifier: 0.1
};

/**
 * Mendapatkan region berdasarkan koordinat
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
 * Mendapatkan tipe teritori dan status ambush berdasarkan terrain dan lokasi.
 * Mengembalikan { type, ambushRiskRate, dangerTierBase }
 */
function getTerritoryInfo(x, y, terrainType, isSettlement) {
  if (isSettlement) {
    return {
      type: 'settlement',
      ambushRiskRate: 0,
      dangerTierBase: 1
    };
  }

  const region = getRegionAt(x, y);

  if (terrainType === 'ocean') {
    return { type: 'locked_zone', ambushRiskRate: 0.1, dangerTierBase: 3 };
  }

  // Zona Bahaya khusus berdasarkan bioma di region
  if (region.id === 'southern_demon' && (terrainType === 'swamp' || terrainType === 'demonic_swamp')) {
    return { type: 'danger_zone', ambushRiskRate: 0.3, dangerTierBase: 4 };
  }
  
  if (region.id === 'northern_desolate' && (terrainType === 'glacial' || terrainType === 'northern_glacial')) {
    return { type: 'danger_zone', ambushRiskRate: 0.25, dangerTierBase: 4 };
  }

  // Monster Zone
  if (terrainType === 'forest' || terrainType === 'bamboo_forest' || terrainType === 'mountain' || terrainType === 'azure_mountain') {
    return { type: 'monster_zone', ambushRiskRate: 0.15, dangerTierBase: region.dangerTier };
  }

  // Wilderness (Plains, Desert)
  return { type: 'wilderness', ambushRiskRate: 0.05, dangerTierBase: region.dangerTier };
}

/**
 * Mendapatkan biaya stamina dasar berdasarkan terrain
 */
function getTerrainStaminaCost(terrainType) {
  switch (terrainType) {
    case 'plains': return 1;
    case 'settlement': return 0.5;
    case 'forest':
    case 'bamboo_forest': return 1.5;
    case 'swamp':
    case 'demonic_swamp':
    case 'western_desert': return 2;
    case 'mountain':
    case 'azure_mountain': return 2.5;
    case 'glacial':
    case 'northern_glacial': return 3;
    case 'ocean':
    case 'river': return 1; // Jika pakai perahu
    default: return 1;
  }
}

module.exports = {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getRegionAt,
  getTerritoryInfo,
  getTerrainStaminaCost
};
