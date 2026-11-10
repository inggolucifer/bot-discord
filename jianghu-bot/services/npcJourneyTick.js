/**
 * NPC Journey Tick Engine (V30)
 * Drives deterministic journey movements, destination arrivals, and return trips.
 * Integrates directly with Npc model and spatial walkability.
 */

const { positionAt, buildJourney } = require('../utils/npcJourney');
const { chooseDestination, planReturnHome } = require('./npcWanderPlanner');

function defaultIsWalkable(x, y) {
  try {
    const { isTileWalkable } = require('../scripts/v28/lib/invariants');
    return isTileWalkable(x, y);
  } catch (e) {
    return true;
  }
}

function snapWalkable(x, y, isWalkableFn) {
  const isWalkable = typeof isWalkableFn === 'function' ? isWalkableFn : defaultIsWalkable;
  if (isWalkable(x, y)) return { x, y };

  for (let r = 1; r <= 10; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r) {
          if (isWalkable(x + dx, y + dy)) {
            return { x: x + dx, y: y + dy };
          }
        }
      }
    }
  }

  return { x, y };
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
    'schedule.wanderLevel': { $gt: 0 }
  });

  const gameDay = Math.floor(now / 3600000);
  let moved = 0;
  let started = 0;
  let arrived = 0;
  const bulkOps = [];

  for (const npc of npcs) {
    const destination = npc.schedule?.targetDestination;

    // Case 1: NPC is currently traveling along a journey
    if (destination && destination.type === 'journey') {
      const pos = positionAt(destination, now);
      if (!pos) continue;

      const snapped = snapWalkable(pos.x, pos.y, isWalkableFn);

      if (pos.arrived) {
        const destAnchor = anchorMap ? anchorMap[destination.toId] : null;
        let finalX = snapped.x;
        let finalY = snapped.y;
        if (destAnchor) {
          const ax = destAnchor.tileX ?? destAnchor.x;
          const ay = destAnchor.tileY ?? destAnchor.y;
          if (Number.isFinite(ax) && Number.isFinite(ay)) {
            const anchorSnap = snapWalkable(ax, ay, isWalkableFn);
            finalX = anchorSnap.x;
            finalY = anchorSnap.y;
          }
        }

        const isHome = destination.purpose === 'pulang';
        const nextState = isHome ? 'idle' : 'visiting';
        const stayDuration = destination.stayMs || 1800000;
        const stayUntil = isHome ? null : new Date(now + stayDuration);

        bulkOps.push({
          updateOne: {
            filter: { _id: npc._id },
            update: {
              $set: {
                'schedule.tileX': finalX,
                'schedule.tileY': finalY,
                tileX: finalX,
                tileY: finalY,
                'schedule.currentAnchorId': destination.toId,
                'schedule.activityState': nextState,
                'schedule.targetDestination': null,
                'schedule.currentFacility': '',
                'schedule.stayUntil': stayUntil
              }
            }
          }
        });
        arrived++;
      } else {
        bulkOps.push({
          updateOne: {
            filter: { _id: npc._id },
            update: {
              $set: {
                'schedule.tileX': snapped.x,
                'schedule.tileY': snapped.y,
                tileX: snapped.x,
                tileY: snapped.y,
                'schedule.activityState': 'traveling',
                'schedule.currentFacility': ''
              }
            }
          }
        });
        moved++;
      }
    } else {
      // Case 2: NPC is idle / visiting / etc and may return or start a journey
      const activityState = npc.schedule?.activityState || 'idle';
      const currentAnchorId = npc.schedule?.currentAnchorId || npc.schedule?.homeAnchorId;
      const homeAnchorId = npc.schedule?.homeAnchorId;
      const away = homeAnchorId && currentAnchorId && currentAnchorId !== homeAnchorId;
      const stayUntil = npc.schedule?.stayUntil;

      if (away && stayUntil && new Date(stayUntil).getTime() <= now && activityState !== 'hunting') {
        // Return journey home
        const returnPlan = planReturnHome(npc, { anchorMap, graph, now });
        if (returnPlan && Array.isArray(returnPlan.pathAnchors) && returnPlan.pathAnchors.length >= 2) {
          const speed = Math.max(6, Math.min(30, npc.attributes?.travelSpeed ?? 10));
          const journey = buildJourney({
            pathAnchors: returnPlan.pathAnchors,
            anchorMap,
            now,
            tilesPerMinute: speed,
            purpose: 'pulang'
          });
          if (journey) {
            bulkOps.push({
              updateOne: {
                filter: { _id: npc._id },
                update: {
                  $set: {
                    'schedule.targetDestination': journey,
                    'schedule.activityState': 'traveling',
                    'schedule.currentFacility': ''
                  }
                }
              }
            });
            started++;
          }
        }
      } else if (away && !stayUntil) {
        // NPC stuck without stay limit (legacy data): set stayUntil = now + 30 minutes
        bulkOps.push({
          updateOne: {
            filter: { _id: npc._id },
            update: {
              $set: {
                'schedule.stayUntil': new Date(now + 30 * 60000)
              }
            }
          }
        });
      } else if (!away && ['idle', 'socializing', 'working', 'sleeping', 'training', 'meditating'].includes(activityState)) {
        // Only start outward journeys if currently at home
        const destPlan = chooseDestination(npc, {
          anchors: Object.values(anchorMap || {}),
          anchorMap,
          graph,
          ladder,
          gameDay,
          now
        });

          if (destPlan && Array.isArray(destPlan.pathAnchors) && destPlan.pathAnchors.length >= 2) {
            const speed = Math.max(6, Math.min(30, npc.attributes?.travelSpeed ?? 10));
            const journey = buildJourney({
              pathAnchors: destPlan.pathAnchors,
              anchorMap,
              now,
              tilesPerMinute: speed,
              purpose: destPlan.purpose
            });
            if (journey) {
              journey.stayMs = destPlan.stayMs;
              bulkOps.push({
                updateOne: {
                  filter: { _id: npc._id },
                  update: {
                    $set: {
                      'schedule.targetDestination': journey,
                      'schedule.lastJourneyDay': gameDay,
                      'schedule.activityState': 'traveling',
                      'schedule.currentFacility': ''
                    }
                  }
                }
              });
              started++;
            }
          }
        }
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
