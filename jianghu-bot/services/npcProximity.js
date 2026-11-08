/**
 * NPC Proximity & Spatial Validation Service (V28 / A4)
 * Authoritatively validates whether a player is within legal range to interact with an NPC.
 */

function checkNpcProximity(player, npc) {
  if (!player || !npc) {
    return { ok: false, reason: 'invalid_entity' };
  }

  // 1. Traveling state blocks direct NPC interactions
  if (player.travelState && player.travelState.isTraveling === true) {
    return { ok: false, reason: 'traveling' };
  }

  // 2. Interior settlement match: if both are in the same settlement, interaction is allowed
  const playerSettlement = player.currentLocation?.settlementName;
  const npcSettlement = npc.settlementName;
  if (npcSettlement && playerSettlement && npcSettlement === playerSettlement) {
    return { ok: true, reason: 'settlement_interior', distance: 0 };
  }

  // 3. Chebyshev distance calculation for wilderness / open world
  const px = player.gridPosition?.tileX ?? player.currentPosition?.x ?? 0;
  const py = player.gridPosition?.tileY ?? player.currentPosition?.y ?? 0;
  const nx = (npc.schedule && typeof npc.schedule.tileX === 'number' && npc.schedule.tileX !== 0)
    ? npc.schedule.tileX
    : (npc.tileX ?? 0);
  const ny = (npc.schedule && typeof npc.schedule.tileY === 'number' && npc.schedule.tileY !== 0)
    ? npc.schedule.tileY
    : (npc.tileY ?? 0);

  const distance = Math.max(Math.abs(px - nx), Math.abs(py - ny));

  if (distance <= 3) {
    return { ok: true, distance };
  }

  return { ok: false, reason: 'too_far', distance };
}

module.exports = {
  checkNpcProximity
};
