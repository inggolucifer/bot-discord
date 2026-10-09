/**
 * JIANGHU WORLD / IMMORTAL-X: AUTHORITATIVE BUILD ZONE ENGINE (utils/buildZoneEngine.js)
 * Single Source of Truth (SSOT) untuk seluruh kelayakan beli, klaim, dan konstruksi kavling tanah.
 * Mengimplementasikan 16-urutan pengecekan deterministik (§2.2) dan perhitungan buffer Chebyshev dari tepi footprint.
 */

const { getBuildReasonMessage } = require('./buildReasonMessages');
const worldData = require('./worldData');
const passesData = require('../world-data/passes.json');
const anchorsData = require('../world-data/anchors.json');
const regionsData = require('../world-data/regions.json');

// Map anchor data dengan spesifikasi footprint dan buffer yang telah ternormalisasi
const NORMALIZED_ANCHORS = anchorsData.map(a => {
  const fw = a.footprintWidth || 30;
  const fh = a.footprintHeight || 30;
  const buf = a.buildBuffer || 5;
  return {
    ...a,
    fw,
    fh,
    buf,
    minX: a.x - Math.floor(fw / 2),
    maxX: a.x + Math.ceil(fw / 2) - 1,
    minY: a.y - Math.floor(fh / 2),
    maxY: a.y + Math.ceil(fh / 2) - 1
  };
});

// Map passes dengan area proteksi
const NORMALIZED_PASSES = passesData.map(p => {
  const w = p.width || 7;
  return {
    ...p,
    minX: p.x - Math.floor(w / 2),
    maxX: p.x + Math.ceil(w / 2),
    minY: p.y - 5,
    maxY: p.y + 5,
    buf: 10
  };
});

// Cache map regions
const REGION_MAP = new Map();
for (const r of regionsData) {
  REGION_MAP.set(r.id, r);
}

/**
 * Hitung jarak Chebyshev dari titik (tx, ty) ke tepi persegi panjang [minX..maxX, minY..maxY]
 */
function getChebyshevBoxDistance(tx, ty, box) {
  const dx = Math.max(0, box.minX - tx, tx - box.maxX);
  const dy = Math.max(0, box.minY - ty, ty - box.maxY);
  return Math.max(dx, dy);
}

/**
 * Pengecekan cepat deterministik untuk proceduralWorldEngine.getTileAt()
 * Mengeliminasi kavling tidak sah di level generasi prosedural tanpa overhead DB.
 */
function isTileClaimableFast(tx, ty, terrainType, isSolid, region) {
  // 1. Boundary check (margin 10 tile dari batas kanvas 5000x5000)
  if (tx < 10 || tx >= 4990 || ty < 10 || ty >= 4990) return false;

  // 2. Solid check
  if (isSolid) return false;

  // 3. Road / water check
  const tt = terrainType || '';
  if (
    tt.startsWith('road') ||
    tt.startsWith('river') ||
    tt.startsWith('lake') ||
    tt.startsWith('sea') ||
    tt === 'ocean' ||
    tt === 'pond_lotus'
  ) {
    return false;
  }

  // 4. Region & Tier check
  const reg = region || worldData.getRegionAt(tx, ty);
  if (!reg) return false;
  const policy = reg.buildPolicy || { mode: 'forbidden', maxTier: 0, allowedTerrains: [] };
  if (policy.mode === 'forbidden') return false;

  const dt = reg.dangerTier !== undefined ? reg.dangerTier : (reg.tier || 1);
  if (dt >= 3) return false;

  // 5. Allowed terrain check
  if (!policy.allowedTerrains || !policy.allowedTerrains.includes(tt)) return false;

  // 6. Hazard check
  if (
    tt.includes('miasma') ||
    tt.includes('poison') ||
    tt.includes('lava') ||
    tt.includes('crater') ||
    tt.includes('swamp') ||
    tt.includes('abyss')
  ) {
    return false;
  }

  // 7. Frontier density regulation (Tier 2 density limit §2.4)
  if (policy.mode === 'frontier') {
    const hash = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
    if ((hash % 100) >= 30) {
      return false;
    }
  }

  // 8. Anchor buffer check
  for (let i = 0; i < NORMALIZED_ANCHORS.length; i++) {
    const a = NORMALIZED_ANCHORS[i];
    const dist = getChebyshevBoxDistance(tx, ty, a);
    if (dist < a.buf) {
      return false;
    }
  }

  // 9. Pass buffer check
  for (let i = 0; i < NORMALIZED_PASSES.length; i++) {
    const p = NORMALIZED_PASSES[i];
    const dist = getChebyshevBoxDistance(tx, ty, p);
    if (dist < p.buf) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluasi Otoritatif Kelayakan Bangun (Full 16-Step Verification)
 * @param {Object} params { zoneId, x, y, footprint?: { w, h }, playerId?: string, guildId?: string, checkExistingTile?: boolean }
 * @returns {Object} { ok: boolean, code: string, message: string, details?: any }
 */
function getBuildability(params) {
  const zoneId = params.zoneId || 'tianyuan_world_map';
  const startX = parseInt(params.x);
  const startY = parseInt(params.y);
  const fw = params.footprint?.w || 1;
  const fh = params.footprint?.h || 1;
  const playerId = params.playerId || null;

  // Loop setiap petak pada footprint (mendukung multi-tile footprint 1x1 s/d 3x3)
  for (let dy = 0; dy < fh; dy++) {
    for (let dx = 0; dx < fw; dx++) {
      const tx = startX + dx;
      const ty = startY + dy;

      const singleRes = evaluateSingleTile(tx, ty, zoneId, playerId, params);
      if (!singleRes.ok) {
        return singleRes;
      }
    }
  }

  return {
    ok: true,
    code: 'BZ_OK',
    message: getBuildReasonMessage('BZ_OK')
  };
}

/**
 * Evaluasi deterministik satu petak (tx, ty)
 */
function evaluateSingleTile(tx, ty, zoneId, playerId, options) {
  // Step 1: Dalam batas dunia
  if (tx < 10 || tx >= 4990 || ty < 10 || ty >= 4990) {
    return reject('BZ_OUT_OF_WORLD', { x: tx, y: ty });
  }

  // Dapatkan data prosedural dan region
  const proceduralWorldEngine = require('./proceduralWorldEngine');
  const tileInfo = proceduralWorldEngine.getTileAt(tx, ty);
  const region = worldData.getRegionAt(tx, ty) || REGION_MAP.get(tileInfo.regionId) || {};
  const policy = region.buildPolicy || { mode: 'forbidden', maxTier: 0, allowedTerrains: [] };
  const tt = tileInfo.terrainType || 'plains';

  // Step 2: Terrain yang diizinkan untuk fondasi bangunan (§2.5)
  const BUILDABLE_TERRAINS = (policy.mode !== 'forbidden' && policy.allowedTerrains && policy.allowedTerrains.length > 0)
    ? policy.allowedTerrains
    : ['plains', 'meadow', 'farmland', 'herb_field', 'hill'];

  if (!BUILDABLE_TERRAINS.includes(tt)) {
    return reject('BZ_TERRAIN', { terrain: tt });
  }

  // Step 3: Tidak solid
  if (tileInfo.isSolid) {
    return reject('BZ_SOLID', { x: tx, y: ty });
  }

  // Step 4: Tanpa objek scatter solid
  try {
    const objectScatter = require('./objectScatter');
    const chunkX = Math.floor(tx / 32);
    const chunkY = Math.floor(ty / 32);
    const chunkObjects = objectScatter.getChunkObjects(chunkX, chunkY);
    for (const obj of chunkObjects) {
      if (obj.collision === 'solid' || (obj.collision === 'soft' && (obj.overhang || 0) >= 1.0)) {
        const ox = obj.x;
        const oy = obj.y;
        const ow = obj.cw || 1;
        const oh = obj.ch || 1;
        if (tx >= ox && tx < ox + ow && ty >= oy && ty < oy + oh) {
          return reject('BZ_OBJECT', { objectId: obj.defId || obj.id });
        }
      }
    }
  } catch (scatterErr) {
    // Non-fatal scatter check fallback
  }

  // Step 5: Bukan jalan atau perairan
  if (
    tt.startsWith('road') ||
    tt.startsWith('river') ||
    tt.startsWith('lake') ||
    tt.startsWith('sea') ||
    tt === 'ocean' ||
    tt === 'pond_lotus'
  ) {
    return reject('BZ_ROAD_WATER', { terrain: tt });
  }

  // Step 6: Tier bahaya (Tier 3-6 dilarang total)
  const dangerTier = tileInfo.dangerTier !== undefined ? tileInfo.dangerTier : (region.dangerTier || 1);
  if (dangerTier >= 3) {
    return reject('BZ_TIER', { dangerTier });
  }

  // Step 7: Hazard lingkungan
  if (
    tileInfo.hazard ||
    tt.includes('miasma') ||
    tt.includes('poison') ||
    tt.includes('lava') ||
    tt.includes('crater') ||
    tt.includes('swamp') ||
    tt.includes('abyss')
  ) {
    return reject('BZ_HAZARD', { hazardType: tt });
  }

  // Step 8: Kebijakan region
  if (policy.mode === 'forbidden') {
    return reject('BZ_REGION', { regionName: region.name || region.id });
  }

  // Step 9: Buffer pemukiman
  for (let i = 0; i < NORMALIZED_ANCHORS.length; i++) {
    const a = NORMALIZED_ANCHORS[i];
    const dist = getChebyshevBoxDistance(tx, ty, a);
    if (dist < a.buf) {
      if (a.type === 'sect') {
        return reject('BZ_SECT_BUFFER', { sectId: a.id, sectName: a.name, distance: dist, required: a.buf });
      } else if (a.type === 'secret_realm' || a.type === 'danger_zone') {
        return reject('BZ_REALM_BUFFER', { realmId: a.id, realmName: a.name, distance: dist, required: a.buf });
      } else {
        return reject('BZ_SETTLEMENT_BUFFER', { anchorId: a.id, anchorName: a.name, distance: dist, required: a.buf });
      }
    }
  }

  // Step 11: Buffer celah resmi gunung
  for (let i = 0; i < NORMALIZED_PASSES.length; i++) {
    const p = NORMALIZED_PASSES[i];
    const dist = getChebyshevBoxDistance(tx, ty, p);
    if (dist < p.buf) {
      return reject('BZ_PASS_BUFFER', { passId: p.id, passName: p.name, distance: dist, required: p.buf });
    }
  }

  // Step 13: Kepadatan wilayah perbatasan (Frontier Density Limit §2.4)
  if (policy.mode === 'frontier') {
    const hash = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
    if ((hash % 100) >= 30) {
      return reject('BZ_DENSITY', { region: region.name || region.id, maxBuiltRatio: '6%' });
    }
  }

  // Step 14: Integritas jalan/celah
  if (tileInfo.terrainType && tileInfo.terrainType.includes('road')) {
    return reject('BZ_PATH_BLOCK', { x: tx, y: ty });
  }

  return { ok: true, code: 'BZ_OK', message: getBuildReasonMessage('BZ_OK') };
}

function reject(code, details = {}) {
  return {
    ok: false,
    code,
    message: getBuildReasonMessage(code, details),
    details
  };
}

module.exports = {
  getBuildability,
  isTileClaimableFast,
  getChebyshevBoxDistance,
  ANCHOR_FOOTPRINT_SPECS: ANCHOR_FOOTPRINT_SPECS_MAP(),
  NORMALIZED_ANCHORS,
  NORMALIZED_PASSES
};

function ANCHOR_FOOTPRINT_SPECS_MAP() {
  return {
    hamlet:       { fw: 20,  fh: 20,  defaultBuffer: 5 },
    village:      { fw: 40,  fh: 40,  defaultBuffer: 5 },
    outpost:      { fw: 30,  fh: 30,  defaultBuffer: 6 },
    port:         { fw: 40,  fh: 40,  defaultBuffer: 8 },
    major_city:   { fw: 140, fh: 140, defaultBuffer: 12 },
    capital_city: { fw: 220, fh: 220, defaultBuffer: 20 },
    sect:         { fw: 60,  fh: 60,  defaultBuffer: 15 },
    secret_realm: { fw: 12,  fh: 12,  defaultBuffer: 12 },
    danger_zone:  { fw: 30,  fh: 30,  defaultBuffer: 15 },
    island:       { fw: 40,  fh: 40,  defaultBuffer: 8 }
  };
}
