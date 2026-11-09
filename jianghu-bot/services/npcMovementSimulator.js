/**
 * Dual-Tier Spatial Movement Simulator for Living NPCs (V27)
 * Near-Tick (5s step-by-step for active chunks) & Abstract-Tick (5m batch off-screen).
 */

const { makeRng } = require('../utils/npcRng');
const DEFAULT_RNG = makeRng(0xC0FFEE);

function simulateNearTick(npc, targetCoords = {}, deltaSeconds = 5, rng = DEFAULT_RNG) {
  if (!npc || !npc.vitalStatus || !npc.vitalStatus.isAlive) {
    return { moved: false };
  }

  const currentX = npc.schedule && npc.schedule.tileX !== undefined ? npc.schedule.tileX : (npc.tileX || 0);
  const currentY = npc.schedule && npc.schedule.tileY !== undefined ? npc.schedule.tileY : (npc.tileY || 0);

  const targetX = targetCoords.x !== undefined ? targetCoords.x : currentX;
  const targetY = targetCoords.y !== undefined ? targetCoords.y : currentY;

  const dx = targetX - currentX;
  const dy = targetY - currentY;

  // Already at target destination
  if (dx === 0 && dy === 0) {
    // Ambient 1-tile jitter while idle/patrolling (20% chance)
    if (rng() < 0.2) {
      const stepX = rng() < 0.5 ? (rng() < 0.5 ? 1 : -1) : 0;
      const stepY = stepX === 0 ? (rng() < 0.5 ? 1 : -1) : 0;
      const newX = currentX + stepX;
      const newY = currentY + stepY;

      npc.schedule.tileX = newX;
      npc.schedule.tileY = newY;
      npc.tileX = newX;
      npc.tileY = newY;

      return {
        moved: true,
        isAmbientJitter: true,
        oldCoords: { x: currentX, y: currentY },
        newCoords: { x: newX, y: newY }
      };
    }
    return { moved: false, coords: { x: currentX, y: currentY } };
  }

  // Step 1 tile towards target
  let stepX = 0;
  let stepY = 0;

  if (Math.abs(dx) >= Math.abs(dy)) {
    stepX = Math.sign(dx);
  } else {
    stepY = Math.sign(dy);
  }

  const newX = currentX + stepX;
  const newY = currentY + stepY;

  npc.schedule = npc.schedule || {};
  npc.schedule.tileX = newX;
  npc.schedule.tileY = newY;
  npc.tileX = newX;
  npc.tileY = newY;

  return {
    moved: true,
    isAmbientJitter: false,
    oldCoords: { x: currentX, y: currentY },
    newCoords: { x: newX, y: newY }
  };
}

function simulateAbstractTick(npc, targetCoords = {}, deltaMinutes = 5, rng = DEFAULT_RNG) {
  if (!npc || !npc.vitalStatus || !npc.vitalStatus.isAlive) {
    return { updated: false };
  }

  const targetX = targetCoords.x !== undefined ? targetCoords.x : (npc.schedule ? npc.schedule.tileX : npc.tileX);
  const targetY = targetCoords.y !== undefined ? targetCoords.y : (npc.schedule ? npc.schedule.tileY : npc.tileY);

  npc.schedule = npc.schedule || {};
  npc.schedule.tileX = targetX;
  npc.schedule.tileY = targetY;
  npc.tileX = targetX;
  npc.tileY = targetY;

  // Passive HP / Qi Recovery
  if (npc.attributes) {
    npc.attributes.hp = npc.attributes.maxHp || 100;
  }

  return {
    updated: true,
    teleported: true,
    newCoords: { x: targetX, y: targetY }
  };
}

module.exports = {
  simulateNearTick,
  simulateAbstractTick
};
