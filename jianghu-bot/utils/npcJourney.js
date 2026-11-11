/**
 * Pure Mathematical Journey Engine for NPCs (V30)
 * Calculates Chebyshev legs, deterministic interpolation, and ETA.
 * Zero database access, pure and testable.
 */

const anchorNameMapCache = new WeakMap();

/**
 * Returns a cached lowercase name/id -> canonical id Map for the given anchorMap object.
 */
function getAnchorLookupMap(anchorMap) {
  const keys = Object.keys(anchorMap);
  const cached = anchorNameMapCache.get(anchorMap);
  if (cached && cached.keyCount === keys.length) {
    return cached.map;
  }
  const nameToId = new Map();
  for (const id of keys) {
    const a = anchorMap[id];
    if (a && a.name) {
      nameToId.set(a.name.toLowerCase(), a.id || id);
    }
    nameToId.set(id.toLowerCase(), (a && a.id) || id);
  }
  anchorNameMapCache.set(anchorMap, { keyCount: keys.length, map: nameToId });
  return nameToId;
}

/**
 * Adaptor: Converts travelGraph.shortestPath result into an array of anchor IDs.
 * Returns null if path is unreachable, empty, or invalid.
 */
function toAnchorPath(rawPath, anchorMap = null) {
  if (!rawPath) return null;

  let pathArr = null;
  if (Array.isArray(rawPath)) {
    pathArr = rawPath;
  } else if (rawPath && Array.isArray(rawPath.path)) {
    if (rawPath.totalLi === Infinity || rawPath.path.length === 0) {
      return null;
    }
    pathArr = rawPath.path;
  }

  if (!pathArr || pathArr.length === 0) return null;

  if (anchorMap) {
    const nameToId = getAnchorLookupMap(anchorMap);
    const resolved = [];
    for (const p of pathArr) {
      const match = nameToId.get(String(p).toLowerCase()) || p;
      resolved.push(match);
    }
    return resolved;
  }

  return pathArr;
}

/**
 * Resolves clamped NPC travel speed in tiles per minute [6, 30].
 */
function resolveTravelSpeed(npc) {
  return Math.max(6, Math.min(30, npc?.attributes?.travelSpeed ?? 10));
}

/**
 * Converts an ordered array of coordinate points [{x, y}, ...] into Chebyshev legs.
 * Skips zero-length consecutive segments. Returns null if any waypoint has non-finite coordinates.
 */
function buildLegsFromPoints(points) {
  const legs = [];
  let totalTiles = 0;
  if (!Array.isArray(points) || points.length < 2) {
    return { legs, totalTiles };
  }

  for (let k = 0; k < points.length - 1; k++) {
    const p1 = points[k];
    const p2 = points[k + 1];
    if (
      !p1 || !p2 ||
      !Number.isFinite(p1.x) || !Number.isFinite(p1.y) ||
      !Number.isFinite(p2.x) || !Number.isFinite(p2.y)
    ) {
      return null;
    }
    const len = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
    if (len > 0) {
      legs.push({ ax: p1.x, ay: p1.y, bx: p2.x, by: p2.y, len });
      totalTiles += len;
    }
  }

  return { legs, totalTiles };
}

/**
 * Builds a deterministic journey object between anchors.
 * Returns null if path is invalid, < 2 anchors, blocked by routeFn, totalTiles > maxTiles, or totalTiles === 0.
 */
function buildJourney({ pathAnchors, anchorMap, now = Date.now(), tilesPerMinute = 10, purpose = 'berkelana', maxTiles = 900, routeFn = null }) {
  if (!Array.isArray(pathAnchors) || pathAnchors.length < 2) {
    return null;
  }

  const legs = [];
  let totalTiles = 0;

  for (let i = 0; i < pathAnchors.length - 1; i++) {
    const fromAnchor = anchorMap ? anchorMap[pathAnchors[i]] : null;
    const toAnchor = anchorMap ? anchorMap[pathAnchors[i + 1]] : null;

    if (!fromAnchor || !toAnchor) {
      return null;
    }

    const ax = Number.isFinite(fromAnchor.tileX) ? fromAnchor.tileX : fromAnchor.x;
    const ay = Number.isFinite(fromAnchor.tileY) ? fromAnchor.tileY : fromAnchor.y;
    const bx = Number.isFinite(toAnchor.tileX) ? toAnchor.tileX : toAnchor.x;
    const by = Number.isFinite(toAnchor.tileY) ? toAnchor.tileY : toAnchor.y;

    if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(bx) || !Number.isFinite(by)) {
      return null;
    }

    if (typeof routeFn === 'function') {
      const pts = routeFn(ax, ay, bx, by);
      if (!Array.isArray(pts)) {
        return null;
      }
      const built = buildLegsFromPoints(pts);
      if (!built) {
        return null;
      }
      for (const leg of built.legs) {
        legs.push(leg);
      }
      totalTiles += built.totalTiles;
    } else {
      // Chebyshev distance: max(|dx|, |dy|)
      const len = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      legs.push({ ax, ay, bx, by, len });
      totalTiles += len;
    }
  }

  if (totalTiles === 0 || totalTiles > maxTiles) {
    return null;
  }

  const speed = Math.max(1, Number(tilesPerMinute) || 10);
  const durationMs = Math.ceil((totalTiles / speed) * 60000);
  const startedAt = now;
  const etaAt = startedAt + durationMs;

  return {
    type: 'journey',
    purpose,
    fromId: pathAnchors[0],
    toId: pathAnchors[pathAnchors.length - 1],
    pathAnchors,
    startedAt,
    etaAt,
    totalTiles,
    legs
  };
}

/**
 * Calculates deterministic (x, y) coordinates along a journey at a given timestamp.
 */
function positionAt(journey, now = Date.now()) {
  if (!journey || !Array.isArray(journey.legs) || journey.legs.length === 0) {
    return null;
  }

  const lastLeg = journey.legs[journey.legs.length - 1];
  const firstLeg = journey.legs[0];

  if (now >= journey.etaAt) {
    return {
      x: Math.round(lastLeg.bx),
      y: Math.round(lastLeg.by),
      arrived: true
    };
  }

  if (now <= journey.startedAt) {
    return {
      x: Math.round(firstLeg.ax),
      y: Math.round(firstLeg.ay),
      arrived: false
    };
  }

  const totalDuration = journey.etaAt - journey.startedAt;
  const elapsed = Math.max(0, Math.min(now - journey.startedAt, totalDuration));
  const t = totalDuration > 0 ? elapsed / totalDuration : 1;
  let targetDistance = t * journey.totalTiles;

  for (let i = 0; i < journey.legs.length; i++) {
    const leg = journey.legs[i];
    if (targetDistance <= leg.len || i === journey.legs.length - 1) {
      const frac = leg.len > 0 ? Math.max(0, Math.min(1, targetDistance / leg.len)) : 1;
      const x = Math.round(leg.ax + (leg.bx - leg.ax) * frac);
      const y = Math.round(leg.ay + (leg.by - leg.ay) * frac);
      return { x, y, arrived: false };
    }
    targetDistance -= leg.len;
  }

  return {
    x: Math.round(lastLeg.bx),
    y: Math.round(lastLeg.by),
    arrived: false
  };
}

module.exports = {
  toAnchorPath,
  buildJourney,
  positionAt,
  buildLegsFromPoints,
  resolveTravelSpeed
};
