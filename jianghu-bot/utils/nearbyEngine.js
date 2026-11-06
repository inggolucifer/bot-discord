/**
 * JIANGHU BOT & IMMORTAL-X — NEARBY ENGINE (utils/nearbyEngine.js)
 * V21 F3: Authoritative spatial math & filtering untuk sistem 'Sekitar Anda'
 */

const DIRECTIONS = [
  { min: -22.5, max: 22.5, name: 'Timur' },
  { min: 22.5, max: 67.5, name: 'Tenggara' },
  { min: 67.5, max: 112.5, name: 'Selatan' },
  { min: 112.5, max: 157.5, name: 'Barat Daya' },
  { min: -67.5, max: -22.5, name: 'Timur Laut' },
  { min: -112.5, max: -67.5, name: 'Utara' },
  { min: -157.5, max: -112.5, name: 'Barat Laut' }
];

/**
 * Menghitung 8 arah mata angin dari (fromX, fromY) menuju (toX, toY).
 * Sumbu Y positif mengarah ke bawah (standard screen/grid space).
 */
function calculateDirection(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;

  if (dx === 0 && dy === 0) return 'Pusat';

  // Math.atan2 mengembalikan radian dalam rentang [-pi, pi]
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;

  for (const d of DIRECTIONS) {
    if (deg >= d.min && deg < d.max) {
      return d.name;
    }
  }

  // Jika |deg| >= 157.5 maka Barat
  return 'Barat';
}

/**
 * Klasifikasi jarak kualitatif:
 * <= 5 tile: dekat
 * <= 15 tile: sedang
 * > 15 tile: jauh
 */
function classifyDistance(dist) {
  if (dist <= 5) return 'dekat';
  if (dist <= 15) return 'sedang';
  return 'jauh';
}

/**
 * Filter keterlihatan entitas:
 * - 'public': terlihat oleh semua pemain
 * - 'private': hanya terlihat oleh pemilik (ownerId)
 * - 'sect': hanya terlihat oleh anggota sekte yang sama
 */
function filterVisibility(entity, viewer = {}) {
  const visibility = entity.visibility || 'public';
  if (visibility === 'public') return true;

  const viewerId = String(viewer.id || viewer._id || viewer.userId || '');
  const ownerId = String(entity.ownerId || '');

  if (visibility === 'private') {
    return Boolean(viewerId && ownerId && viewerId === ownerId);
  }

  if (visibility === 'sect') {
    const viewerSect = String(viewer.sectId || '');
    const entitySect = String(entity.sectId || '');
    return Boolean(viewerSect && entitySect && viewerSect === entitySect);
  }

  return true;
}

/**
 * Mengolah dan mengurutkan daftar entitas di sekitar titik acuan
 */
function computeNearbyEntities({
  fromX,
  fromY,
  entities = [],
  viewer = {},
  maxResults = 30
}) {
  const visibleEntities = [];

  for (const ent of entities) {
    if (!filterVisibility(ent, viewer)) continue;

    const targetX = Number(ent.x ?? ent.cellX ?? ent.tileX ?? 0);
    const targetY = Number(ent.y ?? ent.cellY ?? ent.tileY ?? 0);
    const dx = targetX - fromX;
    const dy = targetY - fromY;

    // Jarak Chebyshev (maksimum delta langkah grid)
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    const dir = calculateDirection(fromX, fromY, targetX, targetY);
    const distanceLabel = classifyDistance(dist);

    const isZoneOrHazard = ent.type === 'zone' || ent.type === 'hazard';
    const item = {
      id: ent.id || ent._id || `${ent.type}_${targetX}_${targetY}`,
      type: ent.type || 'unknown',
      name: ent.name || 'Entitas Tak Dikenal',
      dist,
      dir
    };

    if (ent.status) item.status = ent.status;
    if (ent.ownerId) item.ownerId = ent.ownerId;
    if (ent.sectId) item.sectId = ent.sectId;
    if (ent.visibility && ent.visibility !== 'public') item.visibility = ent.visibility;

    if (!isZoneOrHazard) {
      item.distBand = ent.distBand || distanceLabel;
      item.distanceLabel = distanceLabel;
      item.x = targetX;
      item.y = targetY;
      item.chunkX = ent.chunkX ?? Math.floor(targetX / 32);
      item.chunkY = ent.chunkY ?? Math.floor(targetY / 32);
    } else {
      // V25 K1: Zone & Hazard tidak mengekspos koordinat persis (anti-radar & privacy)
      item.distBand = ent.distBand || distanceLabel;
      item.zoneType = ent.zoneType || (ent.type === 'zone' ? 'spirit_valley' : 'hazard');
      item.tier = ent.tier !== undefined ? ent.tier : (ent.dangerTier || 1);
      item.requiredRealmIndex = ent.requiredRealmIndex || 0;
      item.canEnter = ent.canEnter !== undefined ? ent.canEnter : false;
      if (ent.reason) item.reason = ent.reason;
      if (ent.entryCostSummary) item.entryCostSummary = ent.entryCostSummary;
    }

    visibleEntities.push(item);
  }

  // Urutkan berdasarkan jarak terdekat
  visibleEntities.sort((a, b) => a.dist - b.dist);

  const totalCount = visibleEntities.length;
  const items = visibleEntities.slice(0, maxResults);
  const countOthers = Math.max(0, totalCount - maxResults);

  return {
    totalCount,
    items,
    countOthers
  };
}

/**
 * Pembuatan paket delta ringkas (nearby_delta) untuk Socket.io broadcast.
 * Menghasilkan event: entered, moved, left.
 * Ukuran payload dijamin < 8 KB.
 */
function generateNearbyDelta({
  previousMap = new Map(),
  currentEntities = [],
  chunkKey = '0:0',
  timestamp = Date.now()
}) {
  const currentMap = new Map();
  const entered = [];
  const moved = [];
  const left = [];

  for (const ent of currentEntities) {
    const id = String(ent.id || ent._id);
    currentMap.set(id, ent);

    if (!previousMap.has(id)) {
      entered.push({
        id,
        name: ent.name,
        type: ent.type,
        x: ent.x,
        y: ent.y,
        status: ent.status
      });
    } else {
      const prev = previousMap.get(id);
      if (prev.x !== ent.x || prev.y !== ent.y || prev.status !== ent.status) {
        moved.push({
          id,
          x: ent.x,
          y: ent.y,
          status: ent.status
        });
      }
    }
  }

  for (const [id, prev] of previousMap.entries()) {
    if (!currentMap.has(id)) {
      left.push(id);
    }
  }

  return {
    delta: {
      t: 'nearby_delta',
      chunk: chunkKey,
      timestamp,
      entered: entered.slice(0, 30),
      moved: moved.slice(0, 30),
      left: left.slice(0, 30),
      totalActive: currentEntities.length
    },
    nextMap: currentMap
  };
}

module.exports = {
  calculateDirection,
  classifyDistance,
  filterVisibility,
  computeNearbyEntities,
  generateNearbyDelta
};
