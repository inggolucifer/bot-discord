/**
 * proceduralWorldEngine.js
 * Engine Prosedural Deterministik O(1) untuk Dunia Jianghu 5000x5000 Tile
 * Menggunakan Pseudo-Random Seed Hash & Simplex-Style Noise Approximation
 * Tanpa membebani Database untuk 25.000.000 tile medan!
 */

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;
const WORLD_SEED = 20260916;

// Definisi Pemukiman & Landmark Permanen Dunia (Sparse Anchors)
const ANCHOR_SETTLEMENTS = [
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
    name: 'Tianjing',
    chineseName: '天京',
    type: 'capital_city',
    tileX: 2620,
    tileY: 2560,
    spanWidth: 4,
    spanHeight: 3,
    description: 'Ibukota kekaisaran Jianghu yang dikelilingi benteng batu granit kokoh dan paviliun kitab sekte luhur.',
    activeEventCount: 28
  },
  {
    name: 'Sekte Puncak Kunlun',
    chineseName: '昆仑派',
    type: 'sect',
    tileX: 1200,
    tileY: 4200,
    spanWidth: 3,
    spanHeight: 3,
    description: 'Sekte pedang esortik abadi yang bertengger di atas tebing salju tertinggi benua utara.',
    activeEventCount: 12
  },
  {
    name: 'Lembah Rawa Miasma',
    chineseName: '瘴气沼泽',
    type: 'danger_zone',
    tileX: 2100,
    tileY: 1100,
    spanWidth: 3,
    spanHeight: 3,
    description: 'Lembah lembab diselimuti kabut racun mematikan tempat tumbuhnya herba spiritual langka.',
    activeEventCount: 8
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
      spiritualQiDensity: 0
    };
  }

  // 1. Cek apakah masuk dalam zona Landmark / Pemukiman Permanen
  for (const settlement of ANCHOR_SETTLEMENTS) {
    if (
      tileX >= settlement.tileX &&
      tileX < settlement.tileX + settlement.spanWidth &&
      tileY >= settlement.tileY &&
      tileY < settlement.tileY + settlement.spanHeight
    ) {
      const isOrigin = tileX === settlement.tileX && tileY === settlement.tileY;
      return {
        tileX,
        tileY,
        terrainType: settlement.type === 'danger_zone' ? 'swamp' : 'settlement',
        tileType: settlement.type === 'scenic_courtyard' ? 'poi' : 'settlement',
        isSolid: false,
        settlementName: settlement.name,
        chineseName: settlement.chineseName,
        isSettlementOrigin: isOrigin,
        settlementData: isOrigin ? settlement : null,
        label: isOrigin ? settlement.name : null,
        baseTemperature: 22,
        spiritualQiDensity: settlement.type === 'sect' ? 50 : 25,
        ambientDangerTier: settlement.type === 'danger_zone' ? 3 : 1
      };
    }
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
  let resourceType = null;
  let label = null;

  // Pegunungan Es Salju Kunlun (Utara & Elevasi Tinggi)
  if (elevation > 0.68) {
    if (latitude > 0.6) {
      terrainType = 'glacial';
      isSolid = elevation > 0.78; // Puncak terjal batu es menjadi solid blocker
      baseTemperature = Math.min(-10, baseTemperature - 15);
      spiritualQiDensity = 30;
      label = isSolid ? 'Puncak Es Abadi' : 'Lereng Salju';
    } else {
      terrainType = 'mountain';
      isSolid = elevation > 0.75;
      baseTemperature = Math.max(5, baseTemperature - 10);
      spiritualQiDensity = 25;
      label = isSolid ? 'Tebing Batu Curam' : 'Perbukitan Batu';
    }
  }
  // Air / Danau / Aliran Sungai
  else if (elevation < 0.28) {
    terrainType = 'river';
    isSolid = false; // Bisa dilalui jika jembatan / perahu / pedang terbang
    spiritualQiDensity = 18;
    label = 'Aliran Sungai Jianghu';
  }
  // Rawa Miasma Beracun (Elevasi rendah & kelembapan tinggi di selatan)
  else if (elevation < 0.42 && moisture > 0.65 && latitude < 0.45) {
    terrainType = 'swamp';
    isSolid = false;
    baseTemperature += 6;
    spiritualQiDensity = 15;
    label = 'Rawa Miasma';
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

  // 3. Penempatan Sumber Daya Seimbang (Herba / Tambang Biasa, Anti-Item OP!)
  // Hash unik untuk spawn sumber daya alam secara tersebar
  const resHash = hash2D(tileX * 7, tileY * 13, WORLD_SEED + 42);
  if (!isSolid && resHash > 0.94) {
    tileType = 'resource_node';
    if (terrainType === 'bamboo_forest') {
      resourceType = 'wood'; // Kayu Bambu Biasa
      label = 'Rumpun Bambu (Bisa Ditebang)';
    } else if (terrainType === 'mountain' || terrainType === 'glacial') {
      resourceType = 'ore'; // Biji Besi / Batu Mineral Kasar
      label = 'Urat Besi Mentah';
    } else if (terrainType === 'forest' || terrainType === 'swamp' || terrainType === 'plains') {
      resourceType = 'herb'; // Ginseng Fana / Rumput Roh Rendah
      label = 'Herba Liar (Ginseng Fana)';
    }
  }

  return {
    tileX,
    tileY,
    terrainType,
    tileType,
    isSolid,
    resourceType,
    label,
    baseTemperature,
    spiritualQiDensity,
    ambushRiskRate: terrainType === 'swamp' ? 0.25 : terrainType === 'forest' ? 0.15 : 0.05
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
