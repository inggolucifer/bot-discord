/**
 * NPC Wander Planner Service (V30)
 * Deterministically chooses destination, purpose, and stay duration for wandering NPCs.
 * Follows strict Tale of Immortal style ecosystem movement.
 */

const { makeRng, hash32, pickOne, pickWeighted } = require('../utils/npcRng');
const { toAnchorPath, buildJourney, resolveTravelSpeed } = require('../utils/npcJourney');
const { defaultRouteFn } = require('../utils/npcRoute');

/**
 * Evaluates whether an NPC should start a journey on gameDay, and selects a valid destination.
 * Returns { toAnchorId, purpose, pathAnchors, stayMs, journey } or null.
 */
function chooseDestination(npc, { anchors, anchorMap, graph, ladder, gameDay, now = Date.now(), routeFn = defaultRouteFn }) {
  if (!npc || !npc.vitalStatus) return null;

  // 1. Hard filters
  if (!npc.vitalStatus.isAlive) return null;
  if (npc.vitalStatus.isEssential) return null;
  if (npc.vitalStatus.isInjured) return null;
  if (npc.vitalStatus.downedUntil && new Date(npc.vitalStatus.downedUntil).getTime() > now) return null;

  const wanderLevel = npc.schedule?.wanderLevel || 0;
  if (wanderLevel === 0) return null;
  if (npc.schedule?.lastJourneyDay === gameDay) return null;

  const currentActivity = npc.schedule?.activityState || 'idle';
  if (currentActivity === 'hunting' || currentActivity === 'traveling') return null;

  // 2. Deterministic RNG seeded by npc ID + gameDay
  const npcIdStr = String(npc._id || npc.id || '');
  const rng = makeRng(hash32(npcIdStr + ':' + gameDay));

  // 3. Probability roll: level 1 = 0.35, level 2 = 0.75
  const chance = wanderLevel === 2 ? 0.75 : 0.35;
  if (rng() > chance) {
    return null;
  }

  // 4. Candidate Anchor Collection
  const currentAnchorId = npc.schedule?.currentAnchorId || npc.schedule?.homeAnchorId || '';
  const currentAnchor = anchorMap ? anchorMap[currentAnchorId] : null;
  const currentRegion = currentAnchor?.regionSlug || '';
  const realmIndex = npc.cultivation?.realmIndex || 0;

  const candidates = [];
  const anchorList = Array.isArray(anchors) ? anchors : Object.values(anchorMap || {});

  for (const cand of anchorList) {
    if (!cand || cand.id === currentAnchorId) continue;

    // Forever ban island destinations (regardless of realmIndex)
    if (cand.type === 'island') continue;

    // Filter tier: skip danger_zone, secret_realm unless realmIndex >= 3
    if (realmIndex < 3) {
      if (cand.type === 'danger_zone' || cand.type === 'secret_realm') {
        continue;
      }
    }

    // Determine graph lookup keys
    let fromKey = currentAnchorId;
    let toKey = cand.id;
    if (graph && graph.adj) {
      if (currentAnchor && currentAnchor.name && graph.adj[currentAnchor.name]) {
        fromKey = currentAnchor.name;
      }
      if (cand.name && graph.adj[cand.name]) {
        toKey = cand.name;
      }
    }

    if (!graph || typeof graph.shortestPath !== 'function') continue;

    const rawPath = graph.shortestPath(fromKey, toKey);
    const pathAnchors = toAnchorPath(rawPath, anchorMap);

    if (!pathAnchors || pathAnchors.length < 2) continue;

    // Ban any route that transits through an island node
    if (pathAnchors.some((aid) => anchorMap?.[aid]?.type === 'island')) continue;

    // Max 2 hops: path length <= 3 (e.g. A -> B -> C is 2 hops)
    const hops = pathAnchors.length - 1;
    if (hops > 2) continue;

    // Validate full pass-routed journey upfront so candidates are never selected if blocked or > 900 tiles
    const speed = resolveTravelSpeed(npc);
    const journey = buildJourney({
      pathAnchors,
      anchorMap,
      now,
      tilesPerMinute: speed,
      purpose: 'berkelana',
      routeFn
    });
    if (!journey) continue;

    // Weight: 60 for same region, 40 for different region
    const weight = cand.regionSlug === currentRegion ? 60 : 40;
    candidates.push({ anchor: cand, pathAnchors, journey, weight });
  }

  if (candidates.length === 0) {
    return null;
  }

  // 5. Weighted candidate selection
  const selected = pickWeighted(rng, candidates, (c) => c.weight);
  if (!selected) return null;

  // Purpose selection
  const purposes = ['berdagang', 'mengunjungi_kerabat', 'berkelana'];
  if (npc.social && npc.social.sectId) {
    purposes.push('urusan_sekte');
  }
  const purpose = pickOne(rng, purposes) || 'berkelana';

  // 6. Stay duration: 20 to 60 minutes
  const stayMinutes = 20 + Math.floor(rng() * 41);
  const stayMs = stayMinutes * 60000;
  const testedJourney = { ...selected.journey, purpose, stayMs };

  return {
    toAnchorId: selected.anchor.id,
    purpose,
    pathAnchors: selected.pathAnchors,
    stayMs,
    journey: testedJourney
  };
}

/**
 * Plans a return trip to homeAnchorId (purpose: 'pulang', without RNG).
 * Uses routeFn to validate reachability; flags teleport: true if route is blocked.
 */
function planReturnHome(npc, { anchorMap, graph, now = Date.now(), routeFn = defaultRouteFn }) {
  const currentAnchorId = npc.schedule?.currentAnchorId || '';
  const homeAnchorId = npc.schedule?.homeAnchorId || '';

  if (!currentAnchorId || !homeAnchorId || currentAnchorId === homeAnchorId) {
    return null;
  }

  const currentAnchor = anchorMap ? anchorMap[currentAnchorId] : null;
  const homeAnchor = anchorMap ? anchorMap[homeAnchorId] : null;

  let pathAnchors = null;
  if (graph && typeof graph.shortestPath === 'function') {
    let fromKey = currentAnchorId;
    let toKey = homeAnchorId;
    if (graph.adj) {
      if (currentAnchor && currentAnchor.name && graph.adj[currentAnchor.name]) {
        fromKey = currentAnchor.name;
      }
      if (homeAnchor && homeAnchor.name && graph.adj[homeAnchor.name]) {
        toKey = homeAnchor.name;
      }
    }
    const rawPath = graph.shortestPath(fromKey, toKey);
    pathAnchors = toAnchorPath(rawPath, anchorMap);
  }

  if (!pathAnchors || pathAnchors.length < 2) {
    pathAnchors = [currentAnchorId, homeAnchorId];
  }

  const speed = resolveTravelSpeed(npc);
  const hasIslandTransit = pathAnchors.slice(1, -1).some((aid) => anchorMap?.[aid]?.type === 'island');
  const journey = hasIslandTransit
    ? null
    : buildJourney({
        pathAnchors,
        anchorMap,
        now,
        tilesPerMinute: speed,
        purpose: 'pulang',
        maxTiles: 10000,
        routeFn
      });

  if (!journey) {
    return {
      toAnchorId: homeAnchorId,
      purpose: 'pulang',
      pathAnchors: null,
      stayMs: 0,
      teleport: true,
      journey: null
    };
  }

  return {
    toAnchorId: homeAnchorId,
    purpose: 'pulang',
    pathAnchors,
    stayMs: 0,
    teleport: false,
    journey
  };
}

module.exports = {
  chooseDestination,
  planReturnHome
};
