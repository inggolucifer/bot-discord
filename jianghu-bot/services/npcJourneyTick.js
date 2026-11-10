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
  const ix = Math.round(Number(x) || 0);
  const iy = Math.round(Number(y) || 0);

  if (isWalkable(ix, iy)) return { x: ix, y: iy, ok: true };

  // Iterate only the perimeter of concentric Chebyshev rings (8*r checks per ring vs (2r+1)^2)
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

function applySnapCoords(fields, snap) {
  if (snap && snap.ok !== false) {
    fields['schedule.tileX'] = snap.x;
    fields['schedule.tileY'] = snap.y;
    fields.tileX = snap.x;
    fields.tileY = snap.y;
  }
  return fields;
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
    'schedule.wanderLevel': { $gt: 0 },
    'schedule.activityState': { $ne: 'hunting' }
  });

  const gameDay = Math.floor(now / 3600000);
  let moved = 0;
  let started = 0;
  let arrived = 0;
  const bulkOps = [];

  for (const npc of npcs) {
    if (npc.schedule?.activityState === 'hunting') continue;
    const destination = npc.schedule?.targetDestination;

    // Case 1: NPC is currently traveling along a journey
    if (destination && destination.type === 'journey') {
      const pos = positionAt(destination, now);
      if (!pos) continue;

      const snapped = snapWalkable(pos.x, pos.y, isWalkableFn);

      if (pos.arrived) {
        let landing = snapped;
        const destAnchor = anchorMap ? anchorMap[destination.toId] : null;
        if (destAnchor) {
          const ax = destAnchor.tileX ?? destAnchor.x;
          const ay = destAnchor.tileY ?? destAnchor.y;
          if (Number.isFinite(ax) && Number.isFinite(ay)) {
            const anchorSnap = snapWalkable(ax, ay, isWalkableFn);
            if (anchorSnap.ok !== false || landing.ok === false) {
              landing = anchorSnap;
            }
          }
        }

        const isHome = destination.purpose === 'pulang';
        const arrivalFields = applySnapCoords({
          'schedule.currentAnchorId': destination.toId,
          'schedule.activityState': isHome ? 'idle' : 'visiting',
          'schedule.targetDestination': null,
          'schedule.currentFacility': '',
          'schedule.stayUntil': isHome ? null : new Date(now + (destination.stayMs || 1800000))
        }, landing);

        bulkOps.push({
          updateOne: {
            filter: { _id: npc._id },
            update: { $set: arrivalFields }
          }
        });
        arrived++;
      } else {
        const updateFields = applySnapCoords({
          'schedule.activityState': 'traveling',
          'schedule.currentFacility': ''
        }, snapped);
        bulkOps.push({
          updateOne: {
            filter: { _id: npc._id },
            update: { $set: updateFields }
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
            purpose: 'pulang',
            maxTiles: 10000
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
      } else if (!away && activityState === 'visiting') {
        // Self-heal: NPC already at homeAnchorId should return to idle and clear stayUntil
        bulkOps.push({
          updateOne: {
            filter: { _id: npc._id },
            update: {
              $set: {
                'schedule.activityState': 'idle',
                'schedule.stayUntil': null
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
