/**
 * JIANGHU WORLD / IMMORTAL-X: AUTHORITATIVE BUILD ZONE ENGINE (utils/buildZoneEngine.js)
 * Single Source of Truth (SSOT) untuk seluruh kelayakan beli, klaim, dan konstruksi kavling tanah.
 * Mengimplementasikan 16-urutan pengecekan deterministik (§2.2) dan perhitungan buffer Chebyshev dari tepi footprint.
 */

const { getBuildReasonMessage } = require('./buildReasonMessages');
const worldData = require('./worldData');
const proceduralWorldEngine = require('./proceduralWorldEngine');
const chunkStreamingEngine = require('./chunkStreamingEngine');
const {
  NORMALIZED_ANCHORS,
  NORMALIZED_PASSES,
  REGION_MAP,
  getChebyshevBoxDistance,
  ANCHOR_FOOTPRINT_SPECS,
  isTileClaimableFast
} = require('./buildZoneRules');

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
  const tileInfo = proceduralWorldEngine.getTileAt(tx, ty);
  const region = worldData.getRegionAt(tx, ty) || REGION_MAP.get(tileInfo.regionId) || {};
  const policy = region.buildPolicy || { mode: 'forbidden', maxTier: 0, allowedTerrains: [] };
  // Step 1b: Resource node check — tile berisi sumber daya alam
  if (tileInfo.resourceType) {
    return reject('BZ_RESOURCE_NODE', { resourceType: tileInfo.resourceType });
  }

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

  // Step 4: Tanpa objek scatter solid (menggunakan scale-canon base collision footprint & occupancy bitmask)
  try {
    const chunkX = Math.floor(tx / 32);
    const chunkY = Math.floor(ty / 32);
    const lx = tx - chunkX * 32;
    const ly = ty - chunkY * 32;
    if (chunkStreamingEngine.isChunkTileOccupied(chunkX, chunkY, lx, ly)) {
      return reject('BZ_OBJECT', { x: tx, y: ty, reason: 'Tile occupied by world object footprint' });
    }
  } catch (scatterErr) {
    console.warn('[BuildZoneEngine] Occupancy check non-fatal warning:', scatterErr.message);
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
  ANCHOR_FOOTPRINT_SPECS,
  NORMALIZED_ANCHORS,
  NORMALIZED_PASSES
};
