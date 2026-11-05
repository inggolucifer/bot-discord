#!/usr/bin/env node
/**
 * scripts/v23/relocateChallengePoints.js
 * Relokasi Deterministik Titik Tantangan Jianghu V23 (Seed: 1618)
 *
 * Memindahkan titik lair, eliteCamps, dan hazardZone yang melanggar aturan ke petak valid terdekat:
 * - Berada di region yang benar (bukan di wilayah lain).
 * - Bukan tile solid, bukan tile air, bukan di dalam pemukiman.
 * - Untuk wilayah tier >= 2: medan non-terbuka (bukan plains/meadow/farmland/herb_field/safe_zone).
 * - Jarak >= exclusionRadius + 40 dari seluruh 52 pemukiman.
 * - Jarak >= 20 dari seluruh jalan kerajaan.
 * - Jarak >= 60 antar-titik tantangan dalam wilayah yang sama.
 */

const fs = require('fs');
const path = require('path');

const BOT_ROOT = path.resolve(__dirname, '../..');
const WORLD_DATA = path.join(BOT_ROOT, 'world-data');
const REVIEW_RAW = path.join(BOT_ROOT, 'review/v23_raw');

const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const worldRegionEngine = require('../../utils/worldRegionEngine');
const anchors = require('../../world-data/anchors.json');
const regions = require('../../world-data/regions.json');
const challengePath = path.join(WORLD_DATA, 'region_challenge_v9.json');
const { execSync } = require('child_process');
let challenges;
try {
  const gitRaw = execSync('git show HEAD:jianghu-bot/world-data/region_challenge_v9.json', { cwd: BOT_ROOT, encoding: 'utf8' });
  challenges = JSON.parse(gitRaw);
} catch (e) {
  challenges = JSON.parse(fs.readFileSync(challengePath, 'utf8'));
}
const authoredProps = require('../../world-data/authored-props.json');

// PRNG Deterministik Mulberry32
function createPrng(seed = 1618) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createPrng(1618);

const IMPASSABLE_WATER = new Set([
  'ocean', 'sea', 'lake_deep', 'river', 'ice_sea'
]);

function isImpassableWater(terrain, regId) {
  if (!terrain) return false;
  // Di wilayah perairan/kepulauan, island_reef dan river_shallow adalah teritori sah monster
  if (['eastern_sea', 'frostmoon_sea', 'floating_wind_isles', 'mirror_lake'].includes(regId)) {
    return terrain === 'ocean' || terrain === 'lake_deep' || terrain === 'sea';
  }
  return IMPASSABLE_WATER.has(terrain);
}

const OPEN_TERRAINS = new Set([
  'plains', 'meadow', 'farmland', 'herb_field'
]);

// Koleksi seluruh garis jalan untuk perhitungan jarak cepat
const roadSegments = [];
if (Array.isArray(authoredProps.roads)) {
  for (const r of authoredProps.roads) {
    if (r.from && r.to) {
      roadSegments.push({
        x1: Math.min(r.from.x, r.to.x),
        x2: Math.max(r.from.x, r.to.x),
        y1: Math.min(r.from.y, r.to.y),
        y2: Math.max(r.from.y, r.to.y)
      });
    }
  }
}

function getMinDistToRoad(x, y) {
  let minDist = Infinity;
  for (const seg of roadSegments) {
    const dx = Math.max(0, seg.x1 - x, x - seg.x2);
    const dy = Math.max(0, seg.y1 - y, y - seg.y2);
    const d = Math.max(dx, dy); // Chebyshev
    if (d < minDist) minDist = d;
    if (minDist < 20) return minDist;
  }
  return minDist;
}

function getMinDistToAnchors(x, y) {
  let minDist = Infinity;
  for (const anc of anchors) {
    const excl = anc.v20?.exclusionRadius || 10;
    const dCheb = Math.max(Math.abs(x - anc.x), Math.abs(y - anc.y));
    const margin = dCheb - excl;
    if (margin < minDist) minDist = margin;
  }
  return minDist;
}

function isValidPoint(x, y, regId, regDef, existingPoints = []) {
  // 1. Region harus tepat
  const actReg = worldRegionEngine.getRegionAt(x, y).id;
  if (actReg !== regId) return { valid: false, reason: `wrong_reg:${actReg}` };

  // 2. Tile tidak boleh solid / air terlarang
  const tile = proceduralWorldEngine.getTileAt(x, y);
  if (tile.isSolid) return { valid: false, reason: 'solid' };
  if (isImpassableWater(tile.terrainType, regId)) return { valid: false, reason: 'water' };

  // 3. Pada tier >= 2: medan non-terbuka dan bukan safe_zone
  const info = worldRegionEngine.getTerritoryInfo(x, y, tile.terrainType, false);
  if (regDef.dangerTier >= 2) {
    if (OPEN_TERRAINS.has(tile.terrainType) || info.type === 'safe_zone' || info.ambushRiskRate === 0) {
      return { valid: false, reason: `safe_zone_or_open:${tile.terrainType}` };
    }
  }

  // 4. Jarak ke pemukiman >= excl + 40
  for (const anc of anchors) {
    const excl = anc.v20?.exclusionRadius || 10;
    const dCheb = Math.max(Math.abs(x - anc.x), Math.abs(y - anc.y));
    if (dCheb < excl + 40) {
      return { valid: false, reason: `near_anchor:${anc.id}` };
    }
  }

  // 5. Jarak ke jalan >= 20
  if (getMinDistToRoad(x, y) < 20) {
    return { valid: false, reason: 'near_road' };
  }

  // 6. Jarak ke titik lain sewilayah >= 60
  for (const p of existingPoints) {
    const dist = Math.hypot(x - p.x, y - p.y);
    if (dist < 60) {
      return { valid: false, reason: 'near_peer_point' };
    }
  }

  return { valid: true, tile, info };
}

function findValidTile(startX, startY, regId, regDef, existingPoints = []) {
  const regObj = regions.find(r => r.id === regId) || { bounds: { minX: 0, maxX: 5000, minY: 0, maxY: 5000 } };
  const bounds = regObj.bounds || { minX: 0, maxX: 5000, minY: 0, maxY: 5000 };

  let originX = startX;
  let originY = startY;

  // Jika titik awal berada di luar wilayahnya, geser origin ke pusat bounds wilayah
  if (worldRegionEngine.getRegionAt(originX, originY).id !== regId) {
    originX = Math.round((bounds.minX + bounds.maxX) / 2);
    originY = Math.round((bounds.minY + bounds.maxY) / 2);
  }

  // Spiral search dengan deterministik jitter
  for (let r = 5; r <= 800; r += 5) {
    const anglesCount = Math.min(64, Math.max(16, Math.floor(r * 0.4)));
    const angleOffset = rng() * Math.PI * 2;
    for (let i = 0; i < anglesCount; i++) {
      const angle = angleOffset + (i / anglesCount) * Math.PI * 2;
      const jitterR = r + (rng() * 4 - 2);
      const candX = Math.round(originX + Math.cos(angle) * jitterR);
      const candY = Math.round(originY + Math.sin(angle) * jitterR);

      if (candX < 0 || candX >= 5000 || candY < 0 || candY >= 5000) continue;

      const check = isValidPoint(candX, candY, regId, regDef, existingPoints);
      if (check.valid) {
        return { x: candX, y: candY, terrain: check.tile.terrainType };
      }
    }
  }

  // Fallback: pindai grid bounds
  for (let y = bounds.minY + 20; y < bounds.maxY - 20; y += 10) {
    for (let x = bounds.minX + 20; x < bounds.maxX - 20; x += 10) {
      const check = isValidPoint(x, y, regId, regDef, existingPoints);
      if (check.valid) {
        return { x, y, terrain: check.tile.terrainType };
      }
    }
  }

  return null;
}

function relocateAll() {
  console.log('='.repeat(70));
  console.log(' RELOKASI TITIK TANTANGAN DUNIA (SEED: 1618)');
  console.log('='.repeat(70));

  const relocatedLog = [];
  let totalRelocated = 0;

  for (const [regId, data] of Object.entries(challenges)) {
    const regDef = regions.find(r => r.id === regId) || { dangerTier: 1 };
    const validPointsInRegion = [];

    // Helper untuk memproses sebuah titik
    const processPoint = (pt, key) => {
      const check = isValidPoint(pt.x, pt.y, regId, regDef, validPointsInRegion);
      if (check.valid) {
        // Titik sudah valid, pertahankan
        const tile = proceduralWorldEngine.getTileAt(pt.x, pt.y);
        pt.terrain = tile.terrainType;
        validPointsInRegion.push({ x: pt.x, y: pt.y });
        return;
      }

      // Titik melanggar aturan -> relokasi ke petak valid terdekat
      const replacement = findValidTile(pt.x, pt.y, regId, regDef, validPointsInRegion);
      if (!replacement) {
        console.error(`[BLOCKER] Gagal menemukan tile valid untuk ${regId} ${key}`);
        return;
      }

      // Hitung fromNearestAnchorTiles
      let minAnchorDist = Infinity;
      for (const anc of anchors) {
        const dCheb = Math.max(Math.abs(replacement.x - anc.x), Math.abs(replacement.y - anc.y));
        if (dCheb < minAnchorDist) minAnchorDist = dCheb;
      }

      relocatedLog.push({
        regionId: regId,
        key,
        oldPoint: { x: pt.x, y: pt.y, terrain: pt.terrain },
        newPoint: { x: replacement.x, y: replacement.y, terrain: replacement.terrain },
        reasons: check.reason,
        fromNearestAnchorTiles: minAnchorDist
      });

      pt.x = replacement.x;
      pt.y = replacement.y;
      pt.terrain = replacement.terrain;
      pt.fromNearestAnchorTiles = minAnchorDist;
      validPointsInRegion.push({ x: pt.x, y: pt.y });
      totalRelocated++;
    };

    if (data.lair) processPoint(data.lair, 'lair');
    if (Array.isArray(data.eliteCamps)) {
      data.eliteCamps.forEach((c, i) => processPoint(c, `elite_${i}`));
    }
    if (data.hazardZone) processPoint(data.hazardZone, 'hazardZone');
  }

  // Tulis kembali ke region_challenge_v9.json
  fs.writeFileSync(challengePath, JSON.stringify(challenges, null, 2), 'utf8');
  console.log(`[SUKSES] Berkas region_challenge_v9.json berhasil diperbarui.`);

  // Simpan log relokasi ke review/v23_raw/relocated.json
  if (!fs.existsSync(REVIEW_RAW)) fs.mkdirSync(REVIEW_RAW, { recursive: true });
  const outLog = path.join(REVIEW_RAW, 'relocated.json');
  fs.writeFileSync(outLog, JSON.stringify(relocatedLog, null, 2), 'utf8');
  console.log(`[SUKSES] Log relokasi (${totalRelocated} titik) disimpan ke: ${outLog}`);

  return { totalRelocated, relocatedLog };
}

if (require.main === module) {
  relocateAll();
}

module.exports = { relocateAll };
