/**
 * proceduralWorldEngine.js
 * Engine Prosedural Deterministik O(1) untuk Dunia Jianghu 5000x5000 Tile
 * Menggunakan Pseudo-Random Seed Hash & Simplex-Style Noise Approximation
 * Terintegrasi penuh dengan Single Source of Truth (SSOT) worldData.
 * Menghilangkan bug B-14 (latitude override) dan menjamin continuous barriers (B-15, B-16).
 */

const worldData = require('./worldData');
const { getRegionAt, getTerritoryInfo, getTerrainStaminaCost } = require('./worldRegionEngine');

const WORLD_WIDTH = worldData.WORLD_WIDTH || 5000;
const WORLD_HEIGHT = worldData.WORLD_HEIGHT || 5000;
const WORLD_SEED = 20260916;

const BARRIERS = worldData.getBarriers();
const PASSES = worldData.getPasses();

// Pemukiman & Landmark Permanen Dunia dimuat secara otoritatif dari world-data/anchors.json
const ANCHOR_SETTLEMENTS = worldData.getAnchors().map(a => ({
  id: a.id,
  name: a.name,
  chineseName: a.chineseName || a.name,
  type: a.type,
  tileX: a.x,
  tileY: a.y,
  spanWidth: a.spanWidth || 2,
  spanHeight: a.spanHeight || 2,
  description: a.description || a.label || '',
  tier: a.tier || 1,
  activeEventCount: a.activeEventCount || 0
}));

/**
 * Fungsi Hash Integer Deterministik berkinerja tinggi
 */
function hash2D(x, y, seed = WORLD_SEED) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + seed * 0.001) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Noise 2D Terinterpolasi (Smooth Value Noise)
 */
function smoothNoise2D(x, y, scale = 1.0, seed = WORLD_SEED) {
  const scaledX = x * scale;
  const scaledY = y * scale;

  const x0 = Math.floor(scaledX);
  const x1 = x0 + 1;
  const y0 = Math.floor(scaledY);
  const y1 = y0 + 1;

  const sx = scaledX - x0;
  const sy = scaledY - y0;

  // Cubic Hermite Interpolation curve
  const u = sx * sx * (3 - 2 * sx);
  const v = sy * sy * (3 - 2 * sy);

  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x1, y0, seed);
  const n01 = hash2D(x0, y1, seed);
  const n11 = hash2D(x1, y1, seed);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;

  return nx0 * (1 - v) + nx1 * v;
}

/**
 * Fractal Brownian Motion (Multi-Octave Noise)
 */
function fbmNoise(x, y, baseScale = 0.02, octaves = 3, seed = WORLD_SEED) {
  let total = 0;
  let frequency = baseScale;
  let amplitude = 1.0;
  let maxVal = 0;

  for (let i = 0; i < octaves; i++) {
    total += smoothNoise2D(x, y, frequency, seed + i * 31) * amplitude;
    maxVal += amplitude;
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return total / maxVal;
}

/**
 * Mendeteksi apakah koordinat (tileX, tileY) berada di celah resmi (Pass)
 */
function getPassAt(tileX, tileY) {
  for (const pass of PASSES) {
    const halfWidth = Math.max(1, Math.floor((pass.width || 6) / 2));
    const barrier = BARRIERS.find(b => b.id === pass.barrierId);

    if (barrier) {
      // Barrier horizontal (minX..maxX lebar, minY..maxY tebal)
      if (barrier.bounds.maxX - barrier.bounds.minX >= barrier.bounds.maxY - barrier.bounds.minY) {
        if (
          tileX >= pass.x - halfWidth &&
          tileX <= pass.x + halfWidth &&
          tileY >= barrier.bounds.minY &&
          tileY <= barrier.bounds.maxY
        ) {
          return pass;
        }
      } else {
        // Barrier vertikal
        if (
          tileY >= pass.y - halfWidth &&
          tileY <= pass.y + halfWidth &&
          tileX >= barrier.bounds.minX &&
          tileX <= barrier.bounds.maxX
        ) {
          return pass;
        }
      }
    } else {
      if (Math.abs(tileX - pass.x) <= halfWidth && Math.abs(tileY - pass.y) <= halfWidth) {
        return pass;
      }
    }
  }
  return null;
}

/**
 * Mendeteksi apakah koordinat (tileX, tileY) berada di dalam rintangan kontinu (Barrier)
 */
function getBarrierAt(tileX, tileY) {
  for (const barrier of BARRIERS) {
    if (
      tileX >= barrier.bounds.minX &&
      tileX <= barrier.bounds.maxX &&
      tileY >= barrier.bounds.minY &&
      tileY <= barrier.bounds.maxY
    ) {
      return barrier;
    }
  }
  return null;
}

/**
 * Ambil data deterministik tile pada koordinat (tileX, tileY)
 */
function getTileAt(tileX, tileY, candidateSettlements = ANCHOR_SETTLEMENTS) {
  // 1. Batas Dunia 5000x5000
  if (tileX < 0 || tileX >= WORLD_WIDTH || tileY < 0 || tileY >= WORLD_HEIGHT) {
    return {
      tileX,
      tileY,
      terrainType: 'mountain',
      isSolid: true,
      tileType: 'hazard',
      label: 'Batas Benua',
      baseTemperature: -50,
      spiritualQiDensity: 0,
      regionId: 'unknown_void',
      territoryType: 'locked_zone',
      dangerTier: 5,
      ambushRiskRate: 0,
      factionName: null,
      staminaCost: 99
    };
  }

  const region = getRegionAt(tileX, tileY);
  let isSettlementTile = false;
  let settlementInfo = null;

  // 2. Cek apakah masuk dalam zona Landmark / Pemukiman Permanen
  if (candidateSettlements && candidateSettlements.length > 0) {
    for (const settlement of candidateSettlements) {
      const sX = settlement.tileX !== undefined ? settlement.tileX : settlement.x;
      const sY = settlement.tileY !== undefined ? settlement.tileY : settlement.y;
      if (
        tileX >= sX &&
        tileX < sX + settlement.spanWidth &&
        tileY >= sY &&
        tileY < sY + settlement.spanHeight
      ) {
        isSettlementTile = true;
        settlementInfo = settlement;
        break;
      }
    }
  }

  if (isSettlementTile) {
    const sX = settlementInfo.tileX !== undefined ? settlementInfo.tileX : settlementInfo.x;
    const sY = settlementInfo.tileY !== undefined ? settlementInfo.tileY : settlementInfo.y;
    const isOrigin = tileX === sX && tileY === sY;
    const isDanger = settlementInfo.type === 'danger_zone';

    return {
      tileX,
      tileY,
      terrainType: isDanger ? 'swamp' : 'settlement',
      tileType: settlementInfo.type === 'scenic_courtyard' ? 'poi' : 'settlement',
      isSolid: false,
      settlementName: settlementInfo.name,
      chineseName: settlementInfo.chineseName,
      isSettlementOrigin: isOrigin,
      settlementData: isOrigin ? settlementInfo : null,
      label: isOrigin ? settlementInfo.name : null,
      baseTemperature: 22,
      spiritualQiDensity: (settlementInfo.type === 'sect' ? 50 : 25) * (region.qiDensityModifier || 1.0),
      ambientDangerTier: isDanger ? 4 : (settlementInfo.tier || 1),
      regionId: region.id,
      regionName: region.name,
      territoryType: isDanger ? 'danger_zone' : (settlementInfo.type === 'sect' ? 'sect_territory' : 'settlement'),
      dangerTier: isDanger ? 4 : (settlementInfo.tier || 1),
      ambushRiskRate: isDanger ? 0.3 : 0,
      factionName: settlementInfo.type === 'sect' ? settlementInfo.name : null,
      staminaCost: getTerrainStaminaCost('settlement')
    };
  }

  // 3. Evaluasi Pass & Barrier Kontinu (B-15 & B-16)
  const activePass = getPassAt(tileX, tileY);
  if (activePass) {
    const isSword = activePass.id === 'sword_gorge';
    const passTerrain = isSword ? 'sword_gorge_pass' : 'mountain_pass';
    return {
      tileX,
      tileY,
      terrainType: passTerrain,
      tileType: 'walkable',
      isSolid: false,
      label: activePass.name,
      resourceType: null,
      isClaimable: false,
      plotPriceSilver: 0,
      baseTemperature: 16,
      spiritualQiDensity: (isSword ? 40 : 28) * (region.qiDensityModifier || 1.0),
      regionId: region.id,
      regionName: region.name,
      territoryType: 'calm_zone',
      dangerTier: activePass.tier || 2,
      ambushRiskRate: 0.05,
      factionName: null,
      staminaCost: getTerrainStaminaCost(passTerrain)
    };
  }

  const activeBarrier = getBarrierAt(tileX, tileY);
  if (activeBarrier) {
    let barrierTerrain = 'azure_mountain';
    if (activeBarrier.type === 'ocean') barrierTerrain = 'ocean';
    else if (activeBarrier.type === 'water') barrierTerrain = 'lake_deep';
    else if (activeBarrier.type === 'lava_hazard') barrierTerrain = 'volcanic';
    else if (activeBarrier.type === 'chasm') barrierTerrain = 'abyss_edge';
    else if (activeBarrier.type === 'cliff') barrierTerrain = 'cliff';
    else if (activeBarrier.type === 'lightning_hazard') barrierTerrain = 'mountain_peak';

    const isWaterBarrier = barrierTerrain === 'ocean' || barrierTerrain === 'lake_deep';

    return {
      tileX,
      tileY,
      terrainType: barrierTerrain,
      tileType: isWaterBarrier ? 'water' : 'mountain',
      isSolid: true,
      label: activeBarrier.name,
      resourceType: isWaterBarrier ? 'fish' : 'ore',
      isClaimable: false,
      plotPriceSilver: 0,
      baseTemperature: activeBarrier.type === 'lava_hazard' ? 55 : (
        region.tempRangeC ? Math.round((region.tempRangeC.min + region.tempRangeC.max) / 2) : 15
      ),
      spiritualQiDensity: 32 * (region.qiDensityModifier || 1.0),
      regionId: region.id,
      regionName: region.name,
      territoryType: 'danger_zone',
      dangerTier: Math.max(3, region.dangerTier),
      ambushRiskRate: 0,
      factionName: null,
      staminaCost: getTerrainStaminaCost(barrierTerrain)
    };
  }

  // 4. Evaluasi Bioma Berbasis Noise Fractal & Profil Regional (§2.3)
  const elevation = fbmNoise(tileX, tileY, 0.012, 3, WORLD_SEED);
  const moisture = fbmNoise(tileX, tileY, 0.008, 2, WORLD_SEED + 999);

  let terrainType = 'plains';
  let isSolid = false;
  let tileType = 'walkable';
  let label = null;

  switch (region.id) {
    case 'mirror_lake': {
      if (elevation < 0.60) {
        terrainType = 'lake';
        isSolid = true;
        label = 'Perairan Danau Cermin';
      } else if (elevation < 0.70) {
        terrainType = 'river_shallow';
        isSolid = false;
        label = 'Tepian Dangkal Danau Cermin';
      } else if (elevation < 0.90) {
        terrainType = 'meadow';
        isSolid = false;
        label = 'Pesisir Bunga Cermin';
      } else {
        terrainType = 'island_reef';
        isSolid = false;
        label = 'Pulau Karang Danau Cermin';
      }
      break;
    }
    case 'bone_sea_coast': {
      if (elevation < 0.40) {
        terrainType = 'sea';
        isSolid = true;
        label = 'Perairan Pesisir Laut Tulang';
      } else if (elevation < 0.55) {
        terrainType = 'sea_reef';
        isSolid = false;
        label = 'Batu Karang Tepi Pantai';
      } else if (elevation < 0.75) {
        terrainType = 'desert_sand';
        isSolid = false;
        label = 'Pantai Pasir Abu';
      } else {
        terrainType = 'meadow';
        isSolid = false;
        label = 'Padang Rumput Pesisir';
      }
      break;
    }
    case 'godthunder_peaks': {
      if (elevation > 0.60) {
        terrainType = 'mountain_peak';
        isSolid = true;
        label = 'Puncak Halilintar Abadi';
      } else if (elevation > 0.35) {
        terrainType = 'mountain_rock';
        isSolid = true;
        label = 'Tebing Cadas Bermuatan Petir';
      } else {
        terrainType = 'crater';
        isSolid = false;
        label = 'Kawah Sambaran Petir';
      }
      break;
    }
    case 'ore_teeth_range': {
      if (elevation > 0.65) {
        terrainType = 'mountain_rock';
        isSolid = true;
        label = 'Punggung Gigi Bijih Cadas';
      } else if (elevation > 0.25) {
        terrainType = 'hill';
        isSolid = false;
        label = 'Perbukitan Tambang Besi';
      } else {
        terrainType = 'plains';
        isSolid = false;
        label = 'Lembah Tempa Bijih';
      }
      break;
    }
    case 'thundersteppe': {
      if (elevation > 0.68 && moisture < 0.40) {
        terrainType = 'lightning_scar';
        isSolid = false;
        label = 'Tanah Retakan Petir';
      } else {
        terrainType = 'meadow';
        isSolid = false;
        label = 'Sabana Badai Petir';
      }
      break;
    }
    case 'hermit_highlands': {
      if (elevation > 0.78) {
        terrainType = 'mountain_rock';
        isSolid = true;
        label = 'Batu Puncak Awan';
      } else if (elevation > 0.45) {
        terrainType = 'hill';
        isSolid = false;
        label = 'Perbukitan Kabut Pertapaan';
      } else if (moisture > 0.60) {
        terrainType = 'bamboo_grove';
        isSolid = false;
        label = 'Rumpun Bambu Sejuk';
      } else {
        terrainType = 'meadow';
        isSolid = false;
        label = 'Padang Herba Pertapa';
      }
      break;
    }
    case 'immortal_ruins_valley': {
      if (elevation > 0.60) {
        terrainType = 'ruin_floor';
        isSolid = false;
        label = 'Lantai Reruntuhan Abadi';
      } else if (moisture > 0.50) {
        terrainType = 'formation_tile';
        isSolid = false;
        label = 'Petak Formasi Kuno';
      } else {
        terrainType = 'hill';
        isSolid = false;
        label = 'Puing Perbukitan Leluhur';
      }
      break;
    }
    case 'void_rift': {
      if (elevation > 0.55) {
        terrainType = 'miasma_waste';
        isSolid = false;
        label = 'Tanah Rusak Retakan Hampa';
      } else {
        terrainType = 'abyss_edge';
        isSolid = true;
        label = 'Tepian Jurang Hampa Mutlak';
      }
      break;
    }
    case 'border_march': {
      if (elevation > 0.88) {
        terrainType = 'mountain_rock';
        isSolid = true;
        label = 'Benteng Tebing Batu';
      } else if (elevation < 0.28) {
        terrainType = 'road_stone';
        isSolid = false;
        label = 'Jalan Garnisun Militer';
      } else {
        terrainType = 'plains';
        isSolid = false;
        label = 'Dataran Pos Perbatasan';
      }
      break;
    }
    case 'nine_springs_delta': {
      if (elevation < 0.25) {
        terrainType = 'river';
        isSolid = false;
        label = 'Sungai Delta Sembilan Mata Air';
      } else if (elevation < 0.38) {
        terrainType = 'pond_lotus';
        isSolid = false;
        label = 'Kolam Teratai Delta';
      } else if (moisture > 0.55) {
        terrainType = 'herb_field';
        isSolid = false;
        label = 'Ladang Herba Delta';
      } else if (moisture > 0.35) {
        terrainType = 'farmland';
        isSolid = false;
        label = 'Sawah Petani Tepi Sungai';
      } else {
        terrainType = 'meadow';
        isSolid = false;
        label = 'Bantaran Rumput Hijau';
      }
      break;
    }
    case 'eastern_sea':
    case 'frostmoon_sea':
    case 'floating_wind_isles': {
      if (elevation > 0.70) {
        terrainType = 'island_reef';
        isSolid = false;
        label = 'Gugusan Karang Roh Melayang';
      } else {
        terrainType = 'ocean';
        isSolid = true;
        label = 'Samudra Luas';
      }
      break;
    }
    case 'northern_desolate': {
      if (elevation > 0.80) {
        terrainType = 'glacier';
        isSolid = true;
        label = 'Gletser Es Abadi';
      } else if (elevation > 0.70) {
        terrainType = 'ice_crack';
        isSolid = false;
        label = 'Retakan Es Membeku';
      } else {
        terrainType = 'snow';
        isSolid = false;
        label = 'Padang Salju Tundra';
      }
      break;
    }
    case 'lava_spine': {
      if (elevation > 0.75) {
        terrainType = 'lava_flow';
        isSolid = true;
        label = 'Aliran Lahar Mendidih';
      } else if (elevation > 0.50) {
        terrainType = 'basalt';
        isSolid = false;
        label = 'Batuan Basal Pijar';
      } else {
        terrainType = 'crater';
        isSolid = false;
        label = 'Kawah Magma Padat';
      }
      break;
    }
    case 'venom_mire':
    case 'southern_plague_woods': {
      if (elevation > 0.75) {
        terrainType = 'poison_pool';
        isSolid = false;
        label = 'Kubangan Racun Berbisa';
      } else if (moisture > 0.55) {
        terrainType = 'dead_wood';
        isSolid = false;
        label = 'Hutan Kayu Mati Beracun';
      } else {
        terrainType = 'swamp';
        isSolid = false;
        label = 'Rawa Miasma Mematikan';
      }
      break;
    }
    case 'southern_demon_domain': {
      if (elevation > 0.80) {
        terrainType = 'mountain_rock';
        isSolid = true;
        label = 'Puncak Karang Hitam Iblis';
      } else if (elevation > 0.55) {
        terrainType = 'hill';
        isSolid = false;
        label = 'Bukit Batu Hitam';
      } else if (moisture > 0.50) {
        terrainType = 'dead_wood';
        isSolid = false;
        label = 'Belukar Hitam Purba';
      } else {
        terrainType = 'demonic_swamp';
        isSolid = false;
        label = 'Tanah Lembab Domain Iblis';
      }
      break;
    }
    case 'crimson_battlefield': {
      if (elevation > 0.60) {
        terrainType = 'battlefield_ash';
        isSolid = false;
        label = 'Hamparan Abu Medan Perang';
      } else if (moisture > 0.50) {
        terrainType = 'miasma_waste';
        isSolid = false;
        label = 'Limbah Darah Kering';
      } else {
        terrainType = 'dead_wood';
        isSolid = false;
        label = 'Pilar Kayu Sisa Pembantaian';
      }
      break;
    }
    case 'abyssal_scar': {
      if (elevation > 0.65) {
        terrainType = 'abyss_edge';
        isSolid = true;
        label = 'Tebing Jurang Neraka Tianyuan';
      } else {
        terrainType = 'miasma_waste';
        isSolid = false;
        label = 'Tanah Hangus Retakan Neraka';
      }
      break;
    }
    case 'western_sacred_desert': {
      if (elevation > 0.78) {
        terrainType = 'dune';
        isSolid = false;
        label = 'Bukit Pasir Emas Tinggi';
      } else if (elevation < 0.20 && moisture > 0.60) {
        terrainType = 'oasis';
        isSolid = false;
        label = 'Mata Air Oase Gurun';
      } else {
        terrainType = 'desert_sand';
        isSolid = false;
        label = 'Hamparan Pasir Suci';
      }
      break;
    }
    case 'western_gorge_labyrinth':
    case 'sword_gorge': {
      if (elevation > 0.75) {
        terrainType = 'cliff';
        isSolid = true;
        label = 'Dinding Tebing Ngarai Terjal';
      } else {
        terrainType = 'canyon_floor';
        isSolid = false;
        label = 'Dasar Ngarai Berbatu';
      }
      break;
    }
    case 'spirit_wood_sea': {
      if (elevation > 0.55) {
        terrainType = 'spirit_wood';
        isSolid = false;
        label = 'Pohon Roh Bertuah Rimbun';
      } else {
        terrainType = 'forest';
        isSolid = false;
        label = 'Lautan Rimba Roh';
      }
      break;
    }
    case 'formation_barrens': {
      if (elevation > 0.60) {
        terrainType = 'formation_tile';
        isSolid = false;
        label = 'Urat Formasi Simbol Kuno';
      } else {
        terrainType = 'plains';
        isSolid = false;
        label = 'Padang Tandus Formasi Terbengkalai';
      }
      break;
    }
    default: {
      // central_plains & bioma daratan standar
      if (elevation > 0.78) {
        terrainType = 'mountain';
        isSolid = elevation > 0.84;
        label = isSolid ? 'Tebing Batu Curam' : 'Perbukitan Hijau';
      } else if (elevation < 0.20) {
        terrainType = 'river';
        isSolid = false;
        label = 'Aliran Sungai Jernih';
      } else if (moisture > 0.60) {
        terrainType = (elevation > 0.45) ? 'forest' : 'bamboo_forest';
        isSolid = false;
        label = terrainType === 'forest' ? 'Hutan Rimbun Kuno' : 'Hutan Bambu Hijau';
      } else if (moisture > 0.40) {
        terrainType = 'meadow';
        isSolid = false;
        label = 'Padang Bunga Aprikot';
      } else {
        terrainType = 'plains';
        isSolid = false;
        label = 'Padang Rumput Asri';
      }
      break;
    }
  }

  // Suhu Otoritatif berdasarkan rentang suhu region
  let baseTemperature = 20;
  if (region.tempRangeC && typeof region.tempRangeC.min === 'number') {
    baseTemperature = Math.round(region.tempRangeC.min + (region.tempRangeC.max - region.tempRangeC.min) * (1 - elevation));
  } else {
    baseTemperature = Math.round(35 - (tileY / WORLD_HEIGHT) * 50);
  }

  // Kepadatan Spiritual Qi
  let spiritualQiDensity = Math.round((14 + elevation * 18) * (region.qiDensityModifier || 1.0));

  // Integrasi dengan World Region Engine
  const territoryInfo = getTerritoryInfo(tileX, tileY, terrainType, false);

  // Penentuan Resource Node Spasial
  let resourceType = null;
  if (terrainType === 'river' || terrainType === 'ocean' || terrainType === 'lake' || terrainType === 'lake_deep' || terrainType === 'sea' || terrainType === 'river_shallow' || terrainType === 'pond_lotus') {
    resourceType = 'fish';
  } else if (terrainType === 'forest' || terrainType === 'bamboo_forest' || terrainType === 'bamboo_grove' || terrainType === 'spirit_wood' || terrainType === 'herb_field' || terrainType === 'farmland') {
    resourceType = ((tileX * 31 + tileY * 17) % 2 === 0) ? 'herb' : 'wood';
  } else if (terrainType === 'mountain' || terrainType === 'azure_mountain' || terrainType === 'mountain_rock' || terrainType === 'mountain_peak' || terrainType === 'hill') {
    if (elevation > 0.50) resourceType = 'ore';
  }

  // Penentuan Kavling Tanah Siap Bangun (Buildable Plot / Claimable via SSOT buildZoneEngine)
  const { isTileClaimableFast } = require('./buildZoneEngine');
  const isClaimable = isTileClaimableFast(tileX, tileY, terrainType, isSolid, region);
  if (isClaimable) {
    tileType = 'buildable_plot';
    if (!label) label = 'Kavling Tanah Siap Bangun';
  }

  return {
    tileX,
    tileY,
    terrainType,
    tileType,
    isSolid,
    label,
    resourceType,
    isClaimable,
    plotPriceSilver: isClaimable ? 100 : 0,
    baseTemperature,
    spiritualQiDensity,
    regionId: region.id,
    regionName: region.name,
    territoryType: territoryInfo.type,
    dangerTier: Math.max(region.dangerTier, territoryInfo.dangerTierBase),
    ambushRiskRate: territoryInfo.ambushRiskRate,
    factionName: null,
    staminaCost: getTerrainStaminaCost(terrainType)
  };
}

/**
 * Mengambil matriks tile dalam jendela pandang (Viewport Window)
 */
function getViewportTiles(centerX, centerY, radius = 16) {
  const minX = Math.max(0, centerX - radius);
  const maxX = Math.min(WORLD_WIDTH - 1, centerX + radius);
  const minY = Math.max(0, centerY - radius);
  const maxY = Math.min(WORLD_HEIGHT - 1, centerY + radius);

  // Pre-filter pemukiman yang beririsan dengan bounding box viewport saja
  const candidateSettlements = ANCHOR_SETTLEMENTS.filter(s =>
    s.tileX + s.spanWidth > minX && s.tileX <= maxX &&
    s.tileY + s.spanHeight > minY && s.tileY <= maxY
  );

  const tiles = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      tiles.push(getTileAt(x, y, candidateSettlements));
    }
  }

  return {
    bounds: { minX, maxX, minY, maxY },
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    tiles
  };
}

module.exports = {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WORLD_SEED,
  ANCHOR_SETTLEMENTS,
  getTileAt,
  getViewportTiles
};
