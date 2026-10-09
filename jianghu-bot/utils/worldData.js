/**
 * worldData.js
 * Single Source of Truth (SSOT) Loader untuk Data Dunia Tianyuan 5000x5000
 * Membaca konfigurasi kanonikal dari world-data/ (regions, barriers, passes, anchors, spawns).
 * Menjamin 100% cakupan dunia tanpa unknown_void (Zero-Void Guarantee).
 */

const fs = require('fs');
const path = require('path');

const WORLD_DATA_DIR = path.resolve(__dirname, '../world-data');
const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;
const RASTER_CELL_SIZE = 100;
const RASTER_GRID_SIZE = 50; // 50x50 sel, 1 sel = 100x100 tile

// Muat data kanonikal dari file JSON
function loadJsonFile(filename, fallback = []) {
  try {
    const filePath = path.join(WORLD_DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`[WORLD-DATA] Gagal memuat ${filename}:`, err.message);
  }
  return fallback;
}

const REGIONS_DATA = loadJsonFile('regions.json', []);
const BARRIERS_DATA = loadJsonFile('barriers.json', []);
const PASSES_DATA = loadJsonFile('passes.json', []);
const ANCHORS_DATA = loadJsonFile('anchors.json', []);
const SPAWNS_DATA = loadJsonFile('spawns.json', []);

// Peta indeks cepat
const REGION_MAP = new Map();
for (const reg of REGIONS_DATA) {
  REGION_MAP.set(reg.id, reg);
}

const ANCHOR_MAP = new Map();
for (const anc of ANCHORS_DATA) {
  ANCHOR_MAP.set(anc.id, anc);
}

// Kamus alias region kompatibilitas retroaktif
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
  const clean = String(slug).toLowerCase().trim();
  return REGION_ALIASES[clean] || (REGION_MAP.has(clean) ? clean : 'central_plains');
}

/**
 * 50x50 Raster Matrix Generator (Zero-Void Invariant)
 * Membangun matriks raster 50x50 sel yang memetakan seluruh koordinat 5000x5000.
 * Tidak ada piksel/sel yang tidak memiliki region.
 */
const rasterMatrix = new Array(RASTER_GRID_SIZE);

function buildRasterMatrix() {
  for (let cy = 0; cy < RASTER_GRID_SIZE; cy++) {
    rasterMatrix[cy] = new Array(RASTER_GRID_SIZE);
    for (let cx = 0; cx < RASTER_GRID_SIZE; cx++) {
      const centerX = cx * RASTER_CELL_SIZE + 50;
      const centerY = cy * RASTER_CELL_SIZE + 50;

      let matched = null;
      let highestTier = -1;

      // Prioritas 1: Cocokkan dengan batas persegi region (bounds) dengan mempertimbangkan priority & spesifisitas area
      let bestPriority = -1;
      let smallestArea = Infinity;

      for (const reg of REGIONS_DATA) {
        if (
          centerX >= reg.bounds.minX &&
          centerX <= reg.bounds.maxX &&
          centerY >= reg.bounds.minY &&
          centerY <= reg.bounds.maxY
        ) {
          const priority = reg.priority || reg.tier || 1;
          const area = (reg.bounds.maxX - reg.bounds.minX) * (reg.bounds.maxY - reg.bounds.minY);
          if (priority > bestPriority || (priority === bestPriority && area < smallestArea)) {
            matched = reg.id;
            bestPriority = priority;
            smallestArea = area;
          }
        }
      }

      // Prioritas 2: Jika berada di celah geografis, hubungkan ke region terdekat (Voronoi fallback)
      if (!matched) {
        let nearestDistSq = Infinity;
        let nearestRegionId = 'central_plains';

        for (const reg of REGIONS_DATA) {
          const regMidX = (reg.bounds.minX + reg.bounds.maxX) / 2;
          const regMidY = (reg.bounds.minY + reg.bounds.maxY) / 2;
          const distSq = (centerX - regMidX) ** 2 + (centerY - regMidY) ** 2;

          if (distSq < nearestDistSq) {
            nearestDistSq = distSq;
            nearestRegionId = reg.id;
          }
        }
        matched = nearestRegionId;
      }

      rasterMatrix[cy][cx] = matched;
    }
  }
}

buildRasterMatrix();

/**
 * Evaluasi Region Deterministik dengan Domain Warping
 * Menghasilkan batas region organik melengkung tanpa kotak-kotak kaku
 */
function getRegionAt(x, y) {
  const clampX = Math.min(WORLD_WIDTH - 1, Math.max(0, Number(x) || 0));
  const clampY = Math.min(WORLD_HEIGHT - 1, Math.max(0, Number(y) || 0));

  // Domain warp shift (amplitudo ±14 tile)
  const warpDx = Math.floor(14 * Math.sin(clampX / 160 + clampY / 210));
  const warpDy = Math.floor(14 * Math.cos(clampX / 190 - clampY / 170));

  const warpedX = Math.min(WORLD_WIDTH - 1, Math.max(0, clampX + warpDx));
  const warpedY = Math.min(WORLD_HEIGHT - 1, Math.max(0, clampY + warpDy));

  const cellX = Math.min(RASTER_GRID_SIZE - 1, Math.max(0, Math.floor(warpedX / RASTER_CELL_SIZE)));
  const cellY = Math.min(RASTER_GRID_SIZE - 1, Math.max(0, Math.floor(warpedY / RASTER_CELL_SIZE)));

  const regionId = rasterMatrix[cellY][cellX] || 'central_plains';
  return REGION_MAP.get(regionId) || REGIONS_DATA[0];
}

function getRegionDef(regionId) {
  const normalized = normalizeRegionSlug(regionId);
  return REGION_MAP.get(normalized) || REGION_MAP.get('central_plains');
}

function getAllRegions() {
  return REGIONS_DATA;
}

function getBarriers() {
  return BARRIERS_DATA;
}

function getPasses() {
  return PASSES_DATA;
}

function getAnchors() {
  return ANCHORS_DATA;
}

function getAnchorById(id) {
  return ANCHOR_MAP.get(id) || null;
}

function getOriginSpawns() {
  return SPAWNS_DATA;
}

/**
 * Payload resmi untuk GET /api/world/macro-map
 * Menghilangkan hardcoded landmark di routes/world.js
 */
function getMacroMapPayload() {
  const landmarks = ANCHORS_DATA.map(anc => ({
    x: anc.x,
    y: anc.y,
    name: anc.name,
    type: anc.type,
    region: anc.region,
    label: anc.label || anc.name
  }));

  // Tambahkan passes ke landmarks peta makro
  for (const pass of PASSES_DATA) {
    landmarks.push({
      x: pass.x,
      y: pass.y,
      name: pass.name,
      type: 'pass',
      region: 'azure_mountain_range',
      label: pass.label || pass.name
    });
  }

  const primaryBarrier = BARRIERS_DATA.find(b => b.id === 'azure_wall') || {
    name: 'Azure Mountain Range Barrier',
    bounds: { minX: 0, maxX: 3900, minY: 3100, maxY: 3600 },
    isSolid: true
  };

  return {
    success: true,
    worldSize: WORLD_WIDTH,
    landmarks,
    barrierRange: primaryBarrier,
    regions: REGIONS_DATA.map(r => ({
      id: r.id,
      name: r.name,
      chineseName: r.chineseName,
      dangerTier: r.dangerTier || r.tier,
      bounds: r.bounds,
      qiDensityModifier: r.qiDensityModifier,
      lawAffinities: r.lawAffinities,
      palette: r.palette
    }))
  };
}

module.exports = {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  RASTER_GRID_SIZE,
  REGION_ALIASES,
  normalizeRegionSlug,
  getRegionAt,
  getRegionDef,
  getAllRegions,
  getBarriers,
  getPasses,
  getAnchors,
  getAnchorById,
  getOriginSpawns,
  getMacroMapPayload
};
