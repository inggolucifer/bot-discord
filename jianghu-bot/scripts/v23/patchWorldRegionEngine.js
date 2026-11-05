// scripts/v23/patchWorldRegionEngine.js
const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../../utils/worldRegionEngine.js');
let code = fs.readFileSync(targetFile, 'utf8');

// Normalize line endings to CRLF
code = code.replace(/\r?\n/g, '\r\n');

// Reset to clean git version if needed
const git = require('child_process').execSync('git checkout jianghu-bot/utils/worldRegionEngine.js');
code = fs.readFileSync(targetFile, 'utf8').replace(/\r?\n/g, '\r\n');

// 1. Rename getTerritoryInfo to getRawTerritoryInfo
code = code.replace(
  'function getTerritoryInfo(x, y, terrainType, isSettlement, isWorldEventActive = false) {',
  'function getRawTerritoryInfo(x, y, terrainType, isSettlement, isWorldEventActive = false) {'
);

// 2. Add anchor proximity, smoothstep, getEffectiveDanger, and new getTerritoryInfo wrapper
const newCode = `
const anchors = require('../world-data/anchors.json');

// Bucket spasial anchor untuk buffer zone
const BUCKET_SIZE = 250;
const anchorBuckets = new Map();

for (const anc of anchors) {
  const excl = (anc.v20 && typeof anc.v20.exclusionRadius === 'number') ? anc.v20.exclusionRadius : 10;
  const maxReach = excl + 14;
  const minBx = Math.max(0, Math.floor((anc.x - maxReach) / BUCKET_SIZE));
  const maxBx = Math.min(19, Math.floor((anc.x + maxReach) / BUCKET_SIZE));
  const minBy = Math.max(0, Math.floor((anc.y - maxReach) / BUCKET_SIZE));
  const maxBy = Math.min(19, Math.floor((anc.y + maxReach) / BUCKET_SIZE));

  for (let bx = minBx; bx <= maxBx; bx++) {
    for (let by = minBy; by <= maxBy; by++) {
      const key = \`\${bx}_\${by}\`;
      if (!anchorBuckets.has(key)) anchorBuckets.set(key, []);
      anchorBuckets.get(key).push({
        id: anc.id,
        x: anc.x,
        y: anc.y,
        tier: anc.tier || 1,
        R: excl
      });
    }
  }
}

function getSettlementProximity(x, y) {
  const bx = Math.floor(x / BUCKET_SIZE);
  const by = Math.floor(y / BUCKET_SIZE);
  const list = anchorBuckets.get(\`\${bx}_\${by}\`);
  if (!list || list.length === 0) return null;

  let minFactor = 2.0;
  let nearestAnchor = null;

  for (const anc of list) {
    const dCheb = Math.max(Math.abs(x - anc.x), Math.abs(y - anc.y));
    if (dCheb <= anc.R) {
      return { insideExclusion: true, factor: 0, anchor: anc };
    }
    if (dCheb <= anc.R + 12) {
      const factor = (dCheb - anc.R) / 12;
      if (factor <= minFactor) {
        minFactor = factor;
        nearestAnchor = anc;
      }
    }
  }

  if (nearestAnchor) {
    return { insideExclusion: false, factor: minFactor, anchor: nearestAnchor };
  }
  return null;
}

function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

const PROBE_DIRS = [];
for (let i = 0; i < 16; i++) {
  const angle = (i * Math.PI * 2) / 16;
  PROBE_DIRS.push({ dx: Math.cos(angle), dy: Math.sin(angle) });
}

const DANGER_CACHE_MAX = 50000;
const dangerCache = new Map();

function getEffectiveDanger(x, y) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const cacheKey = (ix << 16) | (iy & 0xffff);
  if (dangerCache.has(cacheKey)) {
    return dangerCache.get(cacheKey);
  }

  const reg = worldData.getRegionAt(ix, iy);
  const baseTier = reg.dangerTier;
  let maxEffectiveTier = baseTier;

  for (const dir of PROBE_DIRS) {
    for (let r = 6; r <= 72; r += 6) {
      const px = Math.max(0, Math.min(4999, Math.round(ix + dir.dx * r)));
      const py = Math.max(0, Math.min(4999, Math.round(iy + dir.dy * r)));
      const nReg = worldData.getRegionAt(px, py);
      if (nReg.dangerTier > baseTier) {
        const diff = nReg.dangerTier - baseTier;
        const W = Math.max(24, Math.ceil(18 * diff));
        let lo = 0, hi = r;
        while (hi - lo > 1) {
          const mid = Math.floor((lo + hi) / 2);
          const bx = Math.max(0, Math.min(4999, Math.round(ix + dir.dx * mid)));
          const by = Math.max(0, Math.min(4999, Math.round(iy + dir.dy * mid)));
          if (worldData.getRegionAt(bx, by).id === reg.id) lo = mid;
          else hi = mid;
        }
        const d = hi;
        if (d < W) {
          const t = (W - d) / W;
          const eff = baseTier + diff * smoothstep(t);
          if (eff > maxEffectiveTier) maxEffectiveTier = eff;
        }
        break;
      }
    }
  }

  if (dangerCache.size >= DANGER_CACHE_MAX) {
    const firstKey = dangerCache.keys().next().value;
    dangerCache.delete(firstKey);
  }
  dangerCache.set(cacheKey, maxEffectiveTier);

  return maxEffectiveTier;
}

/**
 * Mendapatkan tipe teritori dan status ambush dengan memperhitungkan zona penyangga pemukiman (buffer zone).
 */
function getTerritoryInfo(x, y, terrainType, isSettlement, isWorldEventActive = false) {
  // 1. Pemukiman & Kota di seluruh benua: 100% AMAN MUTLAK (Zero Ambush)
  if (isSettlement || terrainType === 'settlement') {
    return {
      type: 'settlement',
      ambushRiskRate: 0,
      dangerTierBase: 1,
      bufferFactor: 0
    };
  }

  // 2. Jalan Raya Kerajaan / Jalur Transit: 100% AMAN MUTLAK (Zero Ambush)
  if (terrainType && (terrainType === 'road' || terrainType.startsWith('road_') || terrainType === 'transit_route')) {
    return {
      type: 'safe_zone',
      ambushRiskRate: 0,
      dangerTierBase: 1,
      bufferFactor: 0
    };
  }

  // 2b. Buffer Zone Pemukiman (Eksklusi R = 0% ambush mutlak)
  const prox = getSettlementProximity(x, y);
  if (prox && prox.insideExclusion) {
    return {
      type: 'safe_zone',
      ambushRiskRate: 0,
      dangerTierBase: 1,
      bufferFactor: 0
    };
  }

  const raw = getRawTerritoryInfo(x, y, terrainType, isSettlement, isWorldEventActive);

  // 2c. Cincin Penyangga R..R+12 (Gradasi Ambush & Batas Tier)
  if (prox && !prox.insideExclusion) {
    const factor = prox.factor;
    const dampedAmbush = Math.round(raw.ambushRiskRate * factor * 10000) / 10000;
    const maxTier = (prox.anchor.tier || 1) + 1;
    return {
      type: dampedAmbush === 0 ? 'safe_zone' : raw.type,
      ambushRiskRate: dampedAmbush,
      dangerTierBase: Math.min(raw.dangerTierBase, maxTier),
      bufferFactor: factor
    };
  }

  return {
    ...raw,
    bufferFactor: 1.0
  };
}
`.replace(/\r?\n/g, '\r\n');

code = code.replace(
  'function getRawTerritoryInfo(x, y, terrainType, isSettlement, isWorldEventActive = false) {',
  newCode + '\r\nfunction getRawTerritoryInfo(x, y, terrainType, isSettlement, isWorldEventActive = false) {'
);

// Export getEffectiveDanger & getSettlementProximity
code = code.replace(
  '  getTerrainStaminaCost\r\n};',
  '  getTerrainStaminaCost,\r\n  getEffectiveDanger,\r\n  getSettlementProximity\r\n};'
);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully patched worldRegionEngine.js');
