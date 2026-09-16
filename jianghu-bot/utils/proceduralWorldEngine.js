/**
 * proceduralWorldEngine.js
 * Engine Prosedural Deterministik O(1) untuk Dunia Jianghu 5000x5000 Tile
 * Menggunakan Pseudo-Random Seed Hash & Simplex-Style Noise Approximation
 * Terintegrasi dengan worldRegionEngine untuk Core Lore Regions.
 */

const { getRegionAt, getTerritoryInfo, getTerrainStaminaCost } = require('./worldRegionEngine');

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;
const WORLD_SEED = 20260916;

// Definisi Pemukiman & Landmark Permanen Dunia (Sparse Anchors)
// Ditambahkan lokasi dari Core Lore
const ANCHOR_SETTLEMENTS = [
  {
    name: 'Tianjing',
    chineseName: '天京',
    type: 'capital_city',
    tileX: 2600,
    tileY: 2550,
    spanWidth: 4,
    spanHeight: 3,
    description: 'Ibukota kekaisaran Jianghu yang dikelilingi benteng batu granit kokoh dan paviliun kitab sekte luhur.',
    activeEventCount: 28
  },
  {
    name: 'XiTong City',
    chineseName: '析桐城',
    type: 'major_city',
    tileX: 2500,
    tileY: 2500,
    spanWidth: 4,
    spanHeight: 3,
    description: 'Kota metropolitan utama di tengah benua dengan pasar terlengkap, bengkel tempa, dan penginapan megah.',
    activeEventCount: 64
  },
  {
    name: 'Desa Xingcun',
    chineseName: '杏村',
    type: 'village',
    tileX: 2450,
    tileY: 2480,
    spanWidth: 2,
    spanHeight: 2,
    description: 'Desa bunga aprikot yang damai, tempat para pengembara muda memulai langkah kultivasi pertama.',
    activeEventCount: 4
  },
  {
    name: 'Desa Qingshui',
    chineseName: '青水村',
    type: 'village',
    tileX: 2420,
    tileY: 2470,
    spanWidth: 2,
    spanHeight: 2,
    description: 'Desa kecil di tepi sungai dengan aliran air yang jernih.',
    activeEventCount: 2
  },
  {
    name: 'Desa Tiedao',
    chineseName: '铁道村',
    type: 'village',
    tileX: 2530,
    tileY: 2460,
    spanWidth: 2,
    spanHeight: 2,
    description: 'Desa pandai besi dekat gunung bijih.',
    activeEventCount: 3
  },
  {
    name: 'Kota Fengyang',
    chineseName: '鳳陽城',
    type: 'major_city',
    tileX: 2680,
    tileY: 2520,
    spanWidth: 3,
    spanHeight: 3,
    description: 'Kota dagang besar penghubung wilayah timur laut.',
    activeEventCount: 15
  },
  {
    name: 'Lembah Kabut Merah',
    chineseName: '赤雾谷',
    type: 'danger_zone',
    tileX: 2350,
    tileY: 2420,
    spanWidth: 3,
    spanHeight: 3,
    description: 'Lembah lembab diselimuti kabut racun mematikan tempat bersembunyinya binatang buas.',
    activeEventCount: 8
  },
  {
    name: 'Kota Luoyang Kecil',
    chineseName: '小洛阳',
    type: 'major_city',
    tileX: 2620,
    tileY: 2500,
    spanWidth: 3,
    spanHeight: 3,
    description: 'Pusat budaya dan kesenian di dataran tengah.',
    activeEventCount: 10
  },
  {
    name: 'Desa Heiyan',
    chineseName: '黑岩村',
    type: 'village',
    tileX: 2200,
    tileY: 1800,
    spanWidth: 2,
    spanHeight: 2,
    description: 'Desa berbatu hitam keras di ujung batas Selatan.',
    activeEventCount: 2
  },
  {
    name: 'Kampung Xueyu',
    chineseName: '雪域村',
    type: 'village',
    tileX: 2150,
    tileY: 1750,
    spanWidth: 2,
    spanHeight: 2,
    description: 'Kampung di wilayah yang selalu tertutup salju tipis.',
    activeEventCount: 1
  },
  {
    name: 'Desa Duchong',
    chineseName: '毒虫村',
    type: 'village',
    tileX: 2300,
    tileY: 1700,
    spanWidth: 2,
    spanHeight: 2,
    description: 'Desa di pinggiran Rawa Iblis yang warganya kebal racun ringan.',
    activeEventCount: 3
  },
  {
    name: 'Kota Chishui',
    chineseName: '赤水镇',
    type: 'major_city',
    tileX: 2500,
    tileY: 1600,
    spanWidth: 3,
    spanHeight: 3,
    description: 'Kota di tepi perairan kemerahan, batas masuk ke Domain Iblis Selatan.',
    activeEventCount: 12
  },
  {
    name: 'Scar of Heaven',
    chineseName: '天痕',
    type: 'danger_zone',
    tileX: 2300,
    tileY: 1900,
    spanWidth: 4,
    spanHeight: 4,
    description: 'Luka robekan dimensi akibat perang dewa kuno.',
    activeEventCount: 20
  },
  {
    name: 'Tri-Sect Mountain',
    chineseName: '三派山',
    type: 'sect',
    tileX: 1800,
    tileY: 2300,
    spanWidth: 4,
    spanHeight: 4,
    description: 'Gunung tempat berkumpulnya tiga sekte besar.',
    activeEventCount: 15
  },
  {
    name: 'Sekte Puncak Kunlun',
    chineseName: '昆仑派',
    type: 'sect',
    tileX: 1200,
    tileY: 4200,
    spanWidth: 3,
    spanHeight: 3,
    description: 'Sekte pedang esoterik abadi yang bertengger di atas tebing salju tertinggi benua utara.',
    activeEventCount: 12
  },
  {
    name: 'Paviliun Gazebo Puncak Pinus',
    chineseName: '松风亭',
    type: 'scenic_courtyard',
    tileX: 2490,
    tileY: 2515,
    spanWidth: 1,
    spanHeight: 1,
    description: 'Gazebo batu berukir kuno di bawah pohon ginkgo emas tempat pendekar mengasingkan diri untuk bermeditasi.',
    activeEventCount: 1
  }
];

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
 * Ambil data deterministik tile pada koordinat (tileX, tileY)
 */
function getTileAt(tileX, tileY) {
  // Batas Dunia 5000x5000
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

  // 1. Cek apakah masuk dalam zona Landmark / Pemukiman Permanen
  for (const settlement of ANCHOR_SETTLEMENTS) {
    if (
      tileX >= settlement.tileX &&
      tileX < settlement.tileX + settlement.spanWidth &&
      tileY >= settlement.tileY &&
      tileY < settlement.tileY + settlement.spanHeight
    ) {
      isSettlementTile = true;
      settlementInfo = settlement;
      break;
    }
  }

  if (isSettlementTile) {
    const isOrigin = tileX === settlementInfo.tileX && tileY === settlementInfo.tileY;
    return {
      tileX,
      tileY,
      terrainType: settlementInfo.type === 'danger_zone' ? 'swamp' : 'settlement',
      tileType: settlementInfo.type === 'scenic_courtyard' ? 'poi' : 'settlement',
      isSolid: false,
      settlementName: settlementInfo.name,
      chineseName: settlementInfo.chineseName,
      isSettlementOrigin: isOrigin,
      settlementData: isOrigin ? settlementInfo : null,
      label: isOrigin ? settlementInfo.name : null,
      baseTemperature: 22,
      spiritualQiDensity: (settlementInfo.type === 'sect' ? 50 : 25) * region.qiDensityModifier,
      ambientDangerTier: settlementInfo.type === 'danger_zone' ? 4 : 1,
      regionId: region.id,
      regionName: region.name,
      territoryType: settlementInfo.type === 'danger_zone' ? 'danger_zone' : (settlementInfo.type === 'sect' ? 'sect_territory' : 'settlement'),
      dangerTier: settlementInfo.type === 'danger_zone' ? 4 : 1,
      ambushRiskRate: settlementInfo.type === 'danger_zone' ? 0.3 : 0,
      factionName: settlementInfo.type === 'sect' ? settlementInfo.name : null,
      staminaCost: getTerrainStaminaCost('settlement')
    };
  }

  // 2. Evaluasi Bioma Berbasis Noise Fractal
  const elevation = fbmNoise(tileX, tileY, 0.012, 3, WORLD_SEED);
  const moisture = fbmNoise(tileX, tileY, 0.008, 2, WORLD_SEED + 999);
  const latitude = tileY / WORLD_HEIGHT; // 0 = Selatan (Hangat), 1 = Utara (Dingin Salju)

  let terrainType = 'plains';
  let isSolid = false;
  let tileType = 'walkable';
  let baseTemperature = Math.round(35 - latitude * 50); // -15C di utara s/d 35C di selatan
  let spiritualQiDensity = 10;
  let label = null;

  // Force Lautan untuk Eastern Sea
  if (region.id === 'eastern_sea' && elevation < 0.65) {
    terrainType = 'ocean';
    isSolid = true; // Default solid tanpa kapal
    spiritualQiDensity = 20;
    label = 'Lautan Timur';
  }
  // Pegunungan Es Salju Kunlun (Utara & Elevasi Tinggi)
  else if (elevation > 0.68) {
    if (latitude > 0.6 || region.id === 'northern_desolate') {
      terrainType = 'northern_glacial';
      isSolid = elevation > 0.78; // Puncak terjal batu es menjadi solid blocker
      baseTemperature = Math.min(-10, baseTemperature - 15);
      spiritualQiDensity = 30;
      label = isSolid ? 'Puncak Es Abadi' : 'Lereng Salju';
    } else {
      terrainType = region.id === 'azure_mountain' ? 'azure_mountain' : 'mountain';
      isSolid = elevation > 0.75;
      baseTemperature = Math.max(5, baseTemperature - 10);
      spiritualQiDensity = 25;
      label = isSolid ? 'Tebing Batu Curam' : 'Perbukitan Batu';
    }
  }
  // Air / Sungai (Wilayah darat)
  else if (elevation < 0.28) {
    if (elevation < 0.15) {
      terrainType = 'ocean';
      isSolid = true;
      spiritualQiDensity = 20;
      label = 'Danau Dalam';
    } else {
      terrainType = 'river';
      isSolid = false; 
      spiritualQiDensity = 18;
      label = 'Aliran Air';
    }
  }
  // Rawa Miasma Beracun / Gurun
  else if (elevation < 0.42 && moisture > 0.65 && latitude < 0.45) {
    terrainType = (region.id === 'southern_demon') ? 'demonic_swamp' : 'swamp';
    isSolid = false;
    baseTemperature += 6;
    spiritualQiDensity = 15;
    label = (terrainType === 'demonic_swamp') ? 'Rawa Iblis Beracun' : 'Rawa Berlumpur';
  }
  else if (moisture < 0.3 && (region.id === 'western_desert' || latitude < 0.3)) {
    terrainType = 'western_desert';
    isSolid = false;
    baseTemperature += 10;
    spiritualQiDensity = 8;
    label = 'Gurun Pasir Panas';
  }
  // Hutan Bambu & Hutan Pinus
  else if (moisture > 0.52) {
    if (elevation > 0.45 && latitude > 0.3) {
      terrainType = 'forest';
      spiritualQiDensity = 22;
      label = 'Hutan Pinus Kuno';
    } else {
      terrainType = 'bamboo_forest';
      spiritualQiDensity = 16;
      label = 'Hutan Bambu Hijau';
    }
  }
  // Dataran Rumput / Tanah Lapang
  else {
    terrainType = 'plains';
    spiritualQiDensity = 12;
    label = 'Padang Rumput';
  }

  // Integrasi dengan World Region Engine
  const territoryInfo = getTerritoryInfo(tileX, tileY, terrainType, false);
  spiritualQiDensity = Math.round(spiritualQiDensity * region.qiDensityModifier);

  // Penentuan Resource Node Spasial
  let resourceType = null;
  if (terrainType === 'river' || terrainType === 'ocean') {
    resourceType = 'fish';
  } else if (terrainType === 'forest' || terrainType === 'bamboo_forest') {
    resourceType = ((tileX * 31 + tileY * 17) % 2 === 0) ? 'herb' : 'wood';
  } else if (terrainType === 'mountain' || terrainType === 'azure_mountain') {
    if (elevation > 0.65) resourceType = 'ore';
  }

  // Penentuan Kavling Tanah Siap Bangun (Buildable Plot / Claimable)
  // Dataran rumput (plains) terbuka di luar pemukiman yang tidak solid dapat dibeli dan dibangun oleh pemain
  const isClaimable = terrainType === 'plains' && !isSolid && !isSettlementTile;
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
    factionName: null, // Diimplementasikan nanti dengan sect territority logic dinamis
    staminaCost: getTerrainStaminaCost(terrainType)
  };
}

/**
 * Mengambil matriks tile dalam jendela pandang (Viewport Window)
 * Ringan dan cepat (misal radius 15 = area 31x31 = ~961 tile)
 */
function getViewportTiles(centerX, centerY, radius = 16) {
  const minX = Math.max(0, centerX - radius);
  const maxX = Math.min(WORLD_WIDTH - 1, centerX + radius);
  const minY = Math.max(0, centerY - radius);
  const maxY = Math.min(WORLD_HEIGHT - 1, centerY + radius);

  const tiles = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      tiles.push(getTileAt(x, y));
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
