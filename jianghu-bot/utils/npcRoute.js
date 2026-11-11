/**
 * Pure Geometric Pass-Routing Module for NPC Journeys (V32 F1)
 * Routes segments through official mountain passes and blocks impassable barriers.
 * Zero database access, deterministic, and pure.
 */

let routeDataCache = null;

/**
 * Loads and caches barriers and passes from world-data JSON files once per process.
 * @returns {{ barriers: Array, passes: Array }}
 */
function loadRouteData() {
  if (!routeDataCache) {
    const barriers = require('../world-data/barriers.json');
    const passes = require('../world-data/passes.json');
    routeDataCache = { barriers, passes };
  }
  return routeDataCache;
}

/**
 * Computes Chebyshev tile distance between two coordinates.
 */
function chebyshev(ax, ay, bx, by) {
  return Math.max(Math.abs(bx - ax), Math.abs(by - ay));
}

/**
 * Checks whether (x, y) lies strictly inside bounds (min < coord < max).
 */
function isStrictlyInside(x, y, bounds) {
  return (
    x > bounds.minX &&
    x < bounds.maxX &&
    y > bounds.minY &&
    y < bounds.maxY
  );
}

/**
 * Returns the first sample fraction t in [0, 1] strictly inside barrier.bounds,
 * or -1 if ignored (endpoint inside bounds) or never crossing.
 */
function firstCrossSampleFraction(ax, ay, bx, by, barrier) {
  if (!barrier || !barrier.bounds) return -1;
  if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(bx) || !Number.isFinite(by)) {
    return -1;
  }
  const { bounds } = barrier;

  // Fast O(1) AABB reject when segment lies completely outside barrier bounds.
  if (
    Math.max(ax, bx) <= bounds.minX ||
    Math.min(ax, bx) >= bounds.maxX ||
    Math.max(ay, by) <= bounds.minY ||
    Math.min(ay, by) >= bounds.maxY
  ) {
    return -1;
  }

  // Rule 1: If endpoint A or B itself is strictly inside bounds, ignore this barrier.
  if (isStrictlyInside(ax, ay, bounds) || isStrictlyInside(bx, by, bounds)) {
    return -1;
  }

  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(dist / 4));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (isStrictlyInside(x, y, bounds)) {
      return t;
    }
  }

  return -1;
}

/**
 * Determines whether straight segment A -> B crosses the given barrier's bounds.
 * @returns {boolean}
 */
function segmentCrossesBarrier(ax, ay, bx, by, barrier) {
  return firstCrossSampleFraction(ax, ay, bx, by, barrier) >= 0;
}

/**
 * Selects the pass with minimum Chebyshev detour A -> pass -> B (tie-breaker: id ascending).
 */
function selectBestPass(ax, ay, bx, by, candidatePasses) {
  let best = null;
  let bestDetour = Infinity;

  for (const pass of candidatePasses) {
    const detour = chebyshev(ax, ay, pass.x, pass.y) + chebyshev(pass.x, pass.y, bx, by);
    if (detour < bestDetour || (detour === bestDetour && pass.id < best.id)) {
      bestDetour = detour;
      best = pass;
    }
  }

  return best;
}

/**
 * Builds the 5-point pass traversal [A, masuk, tengah, keluar, B] for a barrier.
 */
function buildCrossWaypoints(ax, ay, bx, by, barrier, pass) {
  const { minX, maxX, minY, maxY } = barrier.bounds;
  const horizontal = (maxX - minX) >= (maxY - minY);

  if (horizontal) {
    const sisiA = ay <= minY ? minY - 2 : maxY + 2;
    const sisiB = by <= minY ? minY - 2 : (by >= maxY ? maxY + 2 : (sisiA === minY - 2 ? maxY + 2 : minY - 2));
    return [
      { x: ax, y: ay },
      { x: pass.x, y: sisiA },
      { x: pass.x, y: pass.y },
      { x: pass.x, y: sisiB },
      { x: bx, y: by }
    ];
  }

  const sisiA = ax <= minX ? minX - 2 : maxX + 2;
  const sisiB = bx <= minX ? minX - 2 : (bx >= maxX ? maxX + 2 : (sisiA === minX - 2 ? maxX + 2 : minX - 2));
  return [
    { x: ax, y: ay },
    { x: sisiA, y: pass.y },
    { x: pass.x, y: pass.y },
    { x: sisiB, y: pass.y },
    { x: bx, y: by }
  ];
}

/**
 * Rounds coordinates to integers and removes consecutive duplicate points.
 */
function dedupIntegerPoints(points) {
  const out = [];
  for (const p of points) {
    const rx = Math.round(p.x);
    const ry = Math.round(p.y);
    const prev = out[out.length - 1];
    if (!prev || prev.x !== rx || prev.y !== ry) {
      out.push({ x: rx, y: ry });
    }
  }
  return out;
}

/**
 * Routes segment A -> B around barriers through official passes up to recursion depth 3.
 * Returns array of integer waypoints [{x, y}, ...], or null if blocked.
 */
function routeLeg(ax, ay, bx, by, data, depth = 0) {
  if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(bx) || !Number.isFinite(by)) {
    return null;
  }
  const routeData = data || loadRouteData();
  const barriers = routeData.barriers || [];
  const passes = routeData.passes || [];

  const crossed = [];
  for (const barrier of barriers) {
    const t = firstCrossSampleFraction(ax, ay, bx, by, barrier);
    if (t >= 0) {
      crossed.push({ barrier, t });
    }
  }

  if (crossed.length === 0) {
    return dedupIntegerPoints([{ x: ax, y: ay }, { x: bx, y: by }]);
  }

  if (depth >= 3) {
    return null;
  }

  // Rule 3: If any crossed barrier has no official pass, the route is blocked.
  for (const item of crossed) {
    const hasPass = passes.some((p) => p.barrierId === item.barrier.id);
    if (!hasPass) {
      return null;
    }
  }

  // Pick earliest encountered crossed barrier deterministically.
  crossed.sort((a, b) => (a.t !== b.t ? a.t - b.t : a.barrier.id.localeCompare(b.barrier.id)));
  const primaryBarrier = crossed[0].barrier;
  const barrierPasses = passes.filter((p) => p.barrierId === primaryBarrier.id);
  const bestPass = selectBestPass(ax, ay, bx, by, barrierPasses);
  if (!bestPass) {
    return null;
  }

  const waypoints = buildCrossWaypoints(ax, ay, bx, by, primaryBarrier, bestPass);
  const resolved = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    if (Math.round(p1.x) === Math.round(p2.x) && Math.round(p1.y) === Math.round(p2.y)) {
      if (resolved.length === 0) {
        resolved.push({ x: Math.round(p1.x), y: Math.round(p1.y) });
      }
      continue;
    }
    const sub = routeLeg(p1.x, p1.y, p2.x, p2.y, routeData, depth + 1);
    if (!sub) {
      return null;
    }
    for (const pt of sub) {
      resolved.push(pt);
    }
  }

  return dedupIntegerPoints(resolved);
}

/**
 * Default routeFn using cached barriers and passes from world-data.
 */
function defaultRouteFn(ax, ay, bx, by) {
  return routeLeg(ax, ay, bx, by, loadRouteData());
}

module.exports = {
  loadRouteData,
  segmentCrossesBarrier,
  routeLeg,
  defaultRouteFn
};
