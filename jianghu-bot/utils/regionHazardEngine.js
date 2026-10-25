/**
 * utils/regionHazardEngine.js
 * SERVER-AUTHORITATIVE REGION HAZARD ENGINE (PROMPT E5 & E7)
 * Implements environmental hazards, counter-item mitigation, and sealed region access.
 */

const fs = require('fs');
const path = require('path');
const regionChallenge = require('../world-data/region_challenge_v9.json');

/**
 * Check if player inventory contains counter item
 */
function hasCounterItem(player, counterItemKey) {
  if (!player || !player.inventory || !counterItemKey) return false;
  return player.inventory.some(inv => {
    if (!inv) return false;
    if (typeof inv === 'string') return inv === counterItemKey;
    const it = inv.itemId || inv;
    if (typeof it === 'string') return it === counterItemKey;
    return (
      it.itemKey === counterItemKey ||
      it.key === counterItemKey ||
      it.id === counterItemKey ||
      it.name === counterItemKey ||
      (Array.isArray(it.tags) && it.tags.includes(counterItemKey)) ||
      (it.mountType === 'flying_sword' && counterItemKey === 'item_flying_sword')
    );
  });
}

/**
 * Pure function to apply regional hazards based on steps taken
 * @param {Object} playerStub - { maxHp, currentHp, inventory, hazardStepCounter, x, y }
 * @param {string|Object} regionOrId - region slug (e.g. 'northern_desolate') or challenge object
 * @param {number} steps - number of steps moved
 * @param {Object} [options] - additional position/context
 */
function applyHazard(playerStub, regionOrId, steps, options = {}) {
  const regId = typeof regionOrId === 'string' ? regionOrId : regionOrId?.region;
  const rData = typeof regionOrId === 'string' ? (regionChallenge[regId] || {}) : regionOrId;
  const hazard = rData.hazard || { kind: 'none', label: 'Aman — wilayah pemula', pctMaxHpPer10Steps: 0, counterItem: null };

  if (!hazard.kind || hazard.kind === 'none') {
    return {
      kind: 'none',
      label: hazard.label || 'Aman',
      damage: 0,
      mitigated: false,
      ticks: 0,
      playerHp: playerStub?.currentHp
    };
  }

  // Accumulate steps
  playerStub.hazardStepCounter = (playerStub.hazardStepCounter || 0) + steps;
  const ticks = Math.floor(playerStub.hazardStepCounter / 10);
  playerStub.hazardStepCounter = playerStub.hazardStepCounter % 10;

  if (ticks <= 0) {
    return {
      kind: hazard.kind,
      label: hazard.label,
      damage: 0,
      mitigated: false,
      ticks: 0,
      playerHp: playerStub?.currentHp
    };
  }

  // Check counter item in inventory
  if (hazard.counterItem && hasCounterItem(playerStub, hazard.counterItem)) {
    return {
      kind: hazard.kind,
      label: hazard.label,
      damage: 0,
      mitigated: true,
      ticks,
      playerHp: playerStub?.currentHp
    };
  }

  // Calculate damage
  let pct = hazard.pctMaxHpPer10Steps || 0;

  // Check if inside hazardZone radius 15 (doubled percentage)
  const px = options.x !== undefined ? options.x : playerStub.x;
  const py = options.y !== undefined ? options.y : playerStub.y;
  if (rData.hazardZone && px !== undefined && py !== undefined) {
    const distToHz = Math.max(Math.abs(px - rData.hazardZone.x), Math.abs(py - rData.hazardZone.y));
    if (distToHz <= 15) {
      pct *= 2;
    }
  }

  const maxHp = playerStub.maxHp || 1000;
  const dmgPerTick = Math.max(1, Math.floor(maxHp * (pct / 100)));
  const totalDamage = dmgPerTick * ticks;

  // Apply damage without killing outright (min HP = 1)
  const currentHp = playerStub.currentHp !== undefined ? playerStub.currentHp : maxHp;
  playerStub.currentHp = Math.max(1, currentHp - totalDamage);

  // Additional type effects (E5b)
  let ambush = false;
  let teleport = null;
  let visionRadiusMultiplier = 1.0;

  if (['stampede', 'war', 'wraith'].includes(hazard.kind)) {
    ambush = true;
  } else if (hazard.kind === 'array') {
    teleport = { radius: 30 };
  } else if (hazard.kind === 'mist') {
    visionRadiusMultiplier = 0.5;
  }

  return {
    kind: hazard.kind,
    label: hazard.label,
    damage: totalDamage,
    mitigated: false,
    ticks,
    ambush,
    teleport,
    visionRadiusMultiplier,
    playerHp: playerStub.currentHp
  };
}

/**
 * Validate sealed region entry requirements (Prompt E7)
 */
function checkSealedRegionAccess(player, originRegionId, targetRegionId) {
  // If moving within the same region, allowed
  if (originRegionId === targetRegionId) {
    return { allowed: true };
  }

  const rData = regionChallenge[targetRegionId];
  if (!rData || !rData.sealed) {
    return { allowed: true };
  }

  // 1. Frostmoon Sea: only via ferry
  if (targetRegionId === 'frostmoon_sea') {
    return {
      allowed: false,
      note: rData.access?.note || 'Wilayah Laut Bulan Beku tersegel. Hanya dapat dicapai melalui kapal penyeberangan Dermaga Donghai.'
    };
  }

  // 2. Floating Wind Isles: requires flying sword mount/item
  if (targetRegionId === 'floating_wind_isles') {
    const hasSword = hasCounterItem(player, 'item_flying_sword') || player.equippedMount === 'flying_sword';
    if (!hasSword) {
      return {
        allowed: false,
        note: rData.access?.note || 'Gugusan Pulau Angin Melayang berada di atas langit. Dibutuhkan Pedang Terbang Spiritual untuk melintas.'
      };
    }
  }

  // 3. Void Rift: requires void key
  if (targetRegionId === 'void_rift') {
    const hasKey = hasCounterItem(player, 'item_void_key');
    if (!hasKey) {
      return {
        allowed: false,
        note: rData.access?.note || 'Celah Hampa tersegel oleh distorsi ruang purba. Dibutuhkan Kunci Hampa dari penguasa Abyssal Scar.'
      };
    }
  }

  return { allowed: true };
}

module.exports = {
  applyHazard,
  checkSealedRegionAccess,
  hasCounterItem
};
