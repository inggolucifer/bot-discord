/**
 * JIANGHU WORLD / IMMORTAL-X: BUILD ZONE RULES & FAST PREDICATES (utils/buildZoneRules.js)
 * Isolates static geometric buffers, normalized anchor footprints, and fast claimability checks.
 * Completely free of circular dependencies (does NOT import proceduralWorldEngine or chunkStreamingEngine).
 */

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

module.exports = {
  NORMALIZED_ANCHORS,
  NORMALIZED_PASSES,
  REGION_MAP,
  getChebyshevBoxDistance,
  ANCHOR_FOOTPRINT_SPECS: ANCHOR_FOOTPRINT_SPECS_MAP(),
  isTileClaimableFast
};
