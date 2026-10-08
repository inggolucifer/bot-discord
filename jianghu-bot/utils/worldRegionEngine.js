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

  // 3. Dataran Terbuka Biasa (Plains): Selalu AMAN (Zero Ambush) kecuali ada World Event
  if (terrainType === 'plains' && !isWorldEventActive) {
    // Pada zona maut tier 5 (Crimson Battlefield/Abyssal Scar), ada sedikit risiko
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
  // Terjadi ketika pemain melangkah KELUAR dari jalur aman menuju bioma liar:

  // A. Hutan Bambu Liar (Tempat berburu serigala roh & panen rebung spiritual)
  if (terrainType === 'bamboo_forest') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: 0.18,
      dangerTierBase: Math.max(2, region.dangerTier)
    };
  }

  // B. Rimba Belantara Purba (Tempat berburu satwa & tebang kayu bertuah)
  if (terrainType === 'forest') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: 0.22,
      dangerTierBase: Math.max(2, region.dangerTier)
    };
  }

  // C. Rawa Racun Miasma (Tempat berburu binatang berbisa & panen herba racun)
  if (terrainType === 'swamp' || terrainType === 'demonic_swamp' || terrainType === 'venom_mire') {
    return {
      type: 'danger_zone',
      ambushRiskRate: 0.32,
      dangerTierBase: Math.max(4, region.dangerTier)
    };
  }

  // D. Tebing Pegunungan Cadas (Tempat tambang urat bijih besi/emas & elang pemangsa)
  if (terrainType === 'mountain' || terrainType === 'azure_mountain') {
    return {
      type: 'danger_zone',
      ambushRiskRate: 0.28,
      dangerTierBase: Math.max(3, region.dangerTier)
    };
  }

  // E. Kawah Magma / Lembah Lava (Tempat tambang bara api & monster lahar)
  if (terrainType === 'volcanic' || terrainType === 'lava_spine') {
    return {
      type: 'death_zone',
      ambushRiskRate: 0.40,
      dangerTierBase: 5
    };
  }

  // F. Gurun Pasir Suci / Ngarai Batu (Tempat berburu kalajengking & kristal surya)
  if (terrainType === 'western_desert' || terrainType === 'desert' || terrainType === 'canyon') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: 0.25,
      dangerTierBase: Math.max(3, region.dangerTier)
    };
  }

  // G. Gletser Salju Beku (Tempat berburu binatang salju & herba teratai es)
  if (terrainType === 'glacial' || terrainType === 'northern_glacial' || terrainType === 'snow') {
    return {
      type: 'danger_zone',
      ambushRiskRate: 0.30,
      dangerTierBase: Math.max(4, region.dangerTier)
    };
  }

  // H. Perairan Ombak Bebas / Samudra (Tempat memancing ikan roh & monster laut)
  if (terrainType === 'ocean' || terrainType === 'eastern_sea') {
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
