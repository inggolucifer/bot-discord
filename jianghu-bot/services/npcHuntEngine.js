/**
 * NPC Vendetta & Hostile Hunting Engine (V30)
 * Drives tactical movement of hunters tracking players across Jianghu.
 * Adheres to Chebyshev distance metrics and settlement exclusion boundaries.
 */

const { resolveNpcTile } = require('../utils/npcPosition');
const { isPlayerInsideSettlementExclusion } = require('./npcVendettaEngine');
const { snapWalkable } = require('./npcJourneyTick');

/**
 * Executes a single hunting step towards the player.
 *
 * @param {Object} params
 * @param {Object} params.hunter - NPC hunter document
 * @param {Object} params.player - Target player document or object with gridPosition
 * @param {Array} params.anchors - Cached world anchors array
 * @param {Function} params.isWalkableFn - Tile walkability validator
 * @param {number} params.now - Current timestamp ms
 * @returns {Object} { moved: boolean, dist: number, newX: number, newY: number, state: 'hunting'|'idle' }
 */
function huntStep({ hunter, player, anchors = null, isWalkableFn = null, now = Date.now() }) {
  if (!hunter || !player) {
    return { moved: false, dist: 0, newX: 0, newY: 0, state: 'idle' };
  }

  // 1. Resolve Hunter and Player coordinates
  let hx = 0;
  let hy = 0;
  try {
    const hPos = resolveNpcTile(hunter);
    hx = hPos.tileX;
    hy = hPos.tileY;
  } catch (err) {
    hx = hunter.schedule?.tileX ?? hunter.tileX ?? 2455;
    hy = hunter.schedule?.tileY ?? hunter.tileY ?? 2485;
  }

  const px = Math.floor(player.gridPosition?.tileX ?? player.tileX ?? 2455);
  const py = Math.floor(player.gridPosition?.tileY ?? player.tileY ?? 2485);

  const dist = Math.max(Math.abs(px - hx), Math.abs(py - hy));

  // 4. Immunity / Non-combatant checks
  if (hunter.vitalStatus?.isEssential || hunter.vitalStatus?.isInjured) {
    return { moved: false, dist, newX: hx, newY: hy, state: 'idle' };
  }
  if (hunter.vitalStatus?.isAlive === false) {
    return { moved: false, dist, newX: hx, newY: hy, state: 'idle' };
  }
  if (hunter.vitalStatus?.downedUntil && new Date(hunter.vitalStatus.downedUntil).getTime() > now) {
    return { moved: false, dist, newX: hx, newY: hy, state: 'idle' };
  }

  // 2. Distance thresholds
  if (dist > 200) {
    // Player is out of detection range (>200 tiles)
    return { moved: false, dist, newX: hx, newY: hy, state: 'idle' };
  }

  if (dist <= 24) {
    // Within ambush strike radius (<=24 tiles); holding position ready to ambush
    return { moved: false, dist, newX: hx, newY: hy, state: 'hunting' };
  }

  // 3. Stalking step: advance step = min(40, dist - 24)
  const step = Math.min(40, dist - 24);
  const frac = dist > 0 ? step / dist : 0;
  const dx = px - hx;
  const dy = py - hy;

  const targetX = Math.round(hx + dx * frac);
  const targetY = Math.round(hy + dy * frac);

  // Snap to walkable tile
  const snapped = snapWalkable(targetX, targetY, isWalkableFn);

  // Settlement exclusion check: hunter cannot enter safe settlements
  if (isPlayerInsideSettlementExclusion(snapped.x, snapped.y, anchors)) {
    return { moved: false, dist, newX: hx, newY: hy, state: 'hunting' };
  }

  const newDist = Math.max(Math.abs(px - snapped.x), Math.abs(py - snapped.y));

  return {
    moved: true,
    dist: newDist,
    newX: snapped.x,
    newY: snapped.y,
    state: 'hunting'
  };
}

module.exports = {
  huntStep
};
