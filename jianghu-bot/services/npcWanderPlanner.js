/**
 * NPC Wander Planner Service (V30)
 * Deterministically chooses destination, purpose, and stay duration for wandering NPCs.
 * Follows strict Tale of Immortal style ecosystem movement.
 */

const { makeRng, hash32, pickOne, pickWeighted } = require('../utils/npcRng');
const { toAnchorPath } = require('../utils/npcJourney');

/**
 * Evaluates whether an NPC should start a journey on gameDay, and selects a valid destination.
 * Returns { toAnchorId, purpose, pathAnchors, stayMs } or null.
 */
function chooseDestination(npc, { anchors, anchorMap, graph, ladder, gameDay, now = Date.now() }) {
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

    // Filter tier: skip danger_zone, secret_realm, island unless realmIndex >= 3
    if (realmIndex < 3) {
      if (cand.type === 'danger_zone' || cand.type === 'secret_realm' || cand.type === 'island') {
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

    // Max 2 hops: path length <= 3 (e.g. A -> B -> C is 2 hops)
    const hops = pathAnchors.length - 1;
    if (hops > 2) continue;

    // Weight: 60 for same region, 40 for different region
    const weight = cand.regionSlug === currentRegion ? 60 : 40;
    candidates.push({ anchor: cand, pathAnchors, weight });
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

  return {
    toAnchorId: selected.anchor.id,
    purpose,
    pathAnchors: selected.pathAnchors,
    stayMs
  };
}

/**
 * Plans a return trip to homeAnchorId (purpose: 'pulang', without RNG).
 */
function planReturnHome(npc, { anchorMap, graph, now = Date.now() }) {
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

  return {
    toAnchorId: homeAnchorId,
    purpose: 'pulang',
    pathAnchors,
    stayMs: 0
  };
}

module.exports = {
  chooseDestination,
  planReturnHome
};
