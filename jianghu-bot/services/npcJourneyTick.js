/**
 * NPC Journey Tick Engine (V31)
 * Drives deterministic journey movements, walkable snapping, destination arrivals, and return trips.
 * Integrates directly with Npc model and spatial walkability.
 */

const { positionAt, buildJourney } = require('../utils/npcJourney');
const { chooseDestination, planReturnHome } = require('./npcWanderPlanner');

const DAILY_HOME_STATES = new Set(['idle', 'socializing', 'working', 'sleeping', 'training', 'meditating']);

function defaultIsWalkable(x, y) {
  try {
    const { isTileWalkable } = require('../scripts/v28/lib/invariants');
    return isTileWalkable(x, y);
  } catch (e) {
    return true;
  }
}

/**
 * Finds the nearest walkable tile around (x, y) within Chebyshev radius 40.
 * Uses perimeter-only concentric ring traversal (8*r checks per ring).
 */
function snapWalkable(x, y, isWalkableFn) {
  const isWalkable = typeof isWalkableFn === 'function' ? isWalkableFn : defaultIsWalkable;
  const ix = Math.round(Number(x) || 0);
  const iy = Math.round(Number(y) || 0);

  if (isWalkable(ix, iy)) return { x: ix, y: iy, ok: true };

  for (let r = 1; r <= 40; r++) {
    for (let dx = -r; dx <= r; dx++) {
      if (isWalkable(ix + dx, iy - r)) return { x: ix + dx, y: iy - r, ok: true };
      if (isWalkable(ix + dx, iy + r)) return { x: ix + dx, y: iy + r, ok: true };
    }
    for (let dy = -r + 1; dy <= r - 1; dy++) {
      if (isWalkable(ix - r, iy + dy)) return { x: ix - r, y: iy + dy, ok: true };
      if (isWalkable(ix + r, iy + dy)) return { x: ix + r, y: iy + dy, ok: true };
    }
  }

  return { x: ix, y: iy, ok: false };
}

function getTravelSpeed(npc) {
  return Math.max(6, Math.min(30, npc?.attributes?.travelSpeed ?? 10));
}

function applySnapCoords(fields, snap) {
  if (snap && snap.ok !== false) {
    fields['schedule.tileX'] = snap.x;
    fields['schedule.tileY'] = snap.y;
    fields.tileX = snap.x;
    fields.tileY = snap.y;
  }
  return fields;
}

function pushFieldSet(bulkOps, npcId, fields) {
  bulkOps.push({
    updateOne: {
      filter: { _id: npcId },
      update: { $set: fields }
    }
  });
}

function pushJourneyStart(bulkOps, npcId, journey, extra = {}) {
  pushFieldSet(bulkOps, npcId, {
    'schedule.targetDestination': journey,
    'schedule.activityState': 'traveling',
    'schedule.currentFacility': '',
    ...extra
  });
}

/**
 * Resolves final landing coordinates on arrival, preferring the destination anchor's walkable tile.
 */
function resolveLandingCoordinates({ snapped, destination, anchorMap, isWalkableFn }) {
  const destAnchor = anchorMap ? anchorMap[destination.toId] : null;
  if (!destAnchor) return snapped;

  const ax = destAnchor.tileX ?? destAnchor.x;
  const ay = destAnchor.tileY ?? destAnchor.y;
  if (!Number.isFinite(ax) || !Number.isFinite(ay)) return snapped;

  const anchorSnap = snapWalkable(ax, ay, isWalkableFn);
  return (anchorSnap.ok !== false || snapped.ok === false) ? anchorSnap : snapped;
}

/**
 * Builds a direct 1-leg return journey from the NPC's current coordinates to its home anchor.
 */
function buildDirectWalkBackJourney({ npc, homeAnchorId, homeAnchorObj, now }) {
  if (!homeAnchorId || !homeAnchorObj) return null;

  const hx = npc.schedule?.tileX ?? npc.tileX;
  const hy = npc.schedule?.tileY ?? npc.tileY;
  const homeX = homeAnchorObj.tileX ?? homeAnchorObj.x;
  const homeY = homeAnchorObj.tileY ?? homeAnchorObj.y;
  if (!Number.isFinite(hx) || !Number.isFinite(hy) || !Number.isFinite(homeX) || !Number.isFinite(homeY)) {
    return null;
  }

  const dist = Math.max(Math.abs(hx - homeX), Math.abs(hy - homeY));
  if (dist === 0) return null;

  const speed = getTravelSpeed(npc);
  const durationMs = Math.ceil((dist / speed) * 60000);
  return {
    type: 'journey',
    purpose: 'pulang',
    fromId: homeAnchorId,
    toId: homeAnchorId,
    pathAnchors: [homeAnchorId],
    startedAt: now,
    etaAt: now + durationMs,
    totalTiles: dist,
    legs: [{ ax: hx, ay: hy, bx: homeX, by: homeY, len: dist }]
  };
}

/**
 * Processes an NPC currently executing a journey step (moving or arriving).
 */
function processTravelingNpc(npc, { now, anchorMap, isWalkableFn, bulkOps }) {
  const destination = npc.schedule?.targetDestination;
  const pos = positionAt(destination, now);
  if (!pos) return null;

  const snapped = snapWalkable(pos.x, pos.y, isWalkableFn);

  if (pos.arrived) {
    const landing = resolveLandingCoordinates({ snapped, destination, anchorMap, isWalkableFn });
    const isHome = destination.purpose === 'pulang';
    const arrivalFields = applySnapCoords({
      'schedule.currentAnchorId': destination.toId,
      'schedule.activityState': isHome ? 'idle' : 'visiting',
      'schedule.targetDestination': null,
      'schedule.currentFacility': '',
      'schedule.stayUntil': isHome ? null : new Date(now + (destination.stayMs || 1800000))
    }, landing);

    pushFieldSet(bulkOps, npc._id, arrivalFields);
    return 'arrived';
  }

  const moveFields = applySnapCoords({
    'schedule.activityState': 'traveling',
    'schedule.currentFacility': ''
  }, snapped);
  pushFieldSet(bulkOps, npc._id, moveFields);
  return 'moved';
}

/**
 * Processes an idle/visiting NPC: handles return home, legacy recovery, displacement walk-back, or outward trip.
 */
function processIdleOrVisitingNpc(npc, { now, gameDay, anchorMap, graph, ladder, bulkOps }) {
  const activityState = npc.schedule?.activityState || 'idle';
  const currentAnchorId = npc.schedule?.currentAnchorId || npc.schedule?.homeAnchorId;
  const homeAnchorId = npc.schedule?.homeAnchorId;
  const away = Boolean(homeAnchorId && currentAnchorId && currentAnchorId !== homeAnchorId);
  const stayUntil = npc.schedule?.stayUntil;
  const homeAnchorObj = anchorMap && homeAnchorId ? anchorMap[homeAnchorId] : null;

  if (away && stayUntil && new Date(stayUntil).getTime() <= now) {
    const returnPlan = planReturnHome(npc, { anchorMap, graph, now });
    let journey = null;
    if (returnPlan && Array.isArray(returnPlan.pathAnchors) && returnPlan.pathAnchors.length >= 2) {
      journey = buildJourney({
        pathAnchors: returnPlan.pathAnchors,
        anchorMap,
        now,
        tilesPerMinute: getTravelSpeed(npc),
        purpose: 'pulang',
        maxTiles: 10000
      });
    }
    if (!journey) {
      journey = buildDirectWalkBackJourney({ npc, homeAnchorId, homeAnchorObj, now });
    }
    if (journey) {
      pushJourneyStart(bulkOps, npc._id, journey);
      return true;
    }
    return false;
  }

  if (away && !stayUntil) {
    pushFieldSet(bulkOps, npc._id, { 'schedule.stayUntil': new Date(now + 30 * 60000) });
    return false;
  }

  if (away) return false;

  const hx = npc.schedule?.tileX ?? npc.tileX;
  const hy = npc.schedule?.tileY ?? npc.tileY;
  const homeX = homeAnchorObj?.tileX ?? homeAnchorObj?.x;
  const homeY = homeAnchorObj?.tileY ?? homeAnchorObj?.y;
  const disp = (
    homeAnchorObj &&
    Number.isFinite(hx) &&
    Number.isFinite(hy) &&
    Number.isFinite(homeX) &&
    Number.isFinite(homeY)
  )
    ? Math.max(Math.abs(hx - homeX), Math.abs(hy - homeY))
    : 0;

  if (disp > 30 && (!stayUntil || new Date(stayUntil).getTime() <= now) && activityState !== 'visiting') {
    const walkBack = buildDirectWalkBackJourney({ npc, homeAnchorId, homeAnchorObj, now });
    if (walkBack) {
      pushJourneyStart(bulkOps, npc._id, walkBack);
      return true;
    }
  }

  if (activityState === 'visiting') {
    pushFieldSet(bulkOps, npc._id, { 'schedule.activityState': 'idle', 'schedule.stayUntil': null });
    return false;
  }

  if ((npc.schedule?.wanderLevel || 0) > 0 && DAILY_HOME_STATES.has(activityState)) {
    const destPlan = chooseDestination(npc, {
      anchors: Object.values(anchorMap || {}),
      anchorMap,
      graph,
      ladder,
      gameDay,
      now
    });

    if (destPlan && Array.isArray(destPlan.pathAnchors) && destPlan.pathAnchors.length >= 2) {
      const journey = buildJourney({
        pathAnchors: destPlan.pathAnchors,
        anchorMap,
        now,
        tilesPerMinute: getTravelSpeed(npc),
        purpose: destPlan.purpose
      });
      if (journey) {
        journey.stayMs = destPlan.stayMs;
        pushJourneyStart(bulkOps, npc._id, journey, { 'schedule.lastJourneyDay': gameDay });
        return true;
      }
    }
  }

  if (disp <= 30 && stayUntil) {
    pushFieldSet(bulkOps, npc._id, { 'schedule.stayUntil': null });
  }

  return false;
}

/**
 * Executes one tick of NPC journeys (typically every 60s).
 */
async function runJourneyTick({ Npc, now = Date.now(), anchorMap, graph, ladder = null, isWalkableFn = null }) {
  if (!Npc || typeof Npc.find !== 'function') {
    return { moved: 0, started: 0, arrived: 0 };
  }

  const npcs = await Npc.find({
    'vitalStatus.isAlive': true,
    'vitalStatus.isEssential': { $ne: true },
    'schedule.activityState': { $ne: 'hunting' },
    $or: [
      { 'schedule.wanderLevel': { $gt: 0 } },
      { 'schedule.targetDestination.type': 'journey' },
      { 'schedule.stayUntil': { $ne: null } }
    ]
  });

  const gameDay = Math.floor(now / 3600000);
  let moved = 0;
  let started = 0;
  let arrived = 0;
  const bulkOps = [];

  for (const npc of npcs) {
    if (npc.vitalStatus?.isEssential || npc.schedule?.activityState === 'hunting') continue;

    if (npc.schedule?.targetDestination?.type === 'journey') {
      const outcome = processTravelingNpc(npc, { now, anchorMap, isWalkableFn, bulkOps });
      if (outcome === 'arrived') arrived++;
      else if (outcome === 'moved') moved++;
    } else if (processIdleOrVisitingNpc(npc, { now, gameDay, anchorMap, graph, ladder, bulkOps })) {
      started++;
    }
  }

  if (bulkOps.length > 0 && typeof Npc.bulkWrite === 'function') {
    await Npc.bulkWrite(bulkOps);
  }

  return { moved, started, arrived };
}

module.exports = {
  runJourneyTick,
  snapWalkable
};
