/**
 * Vendetta & Ambush Engine for Jianghu Bot Living NPCs (V27)
 * Tracks grudges, vendetta hunters, and wilderness ambushes.
 */

const NpcVendetta = require('../models/NpcVendetta');
const NpcAmbush = require('../models/NpcAmbush');

async function createVendetta({
  hunterNpcId,
  targetId,
  targetType = 'player',
  grudgeLevel = 5,
  reason = 'Pembunuhan anggota keluarga',
  victimNpcName = '',
  victimRelation = ''
}) {
  const vendetta = new NpcVendetta({
    hunterNpcId,
    targetId,
    targetType,
    grudgeLevel: Math.max(1, Math.min(5, Math.floor(grudgeLevel))),
    reason,
    victimNpcName,
    victimRelation,
    resolved: false
  });

  if (vendetta.save && vendetta.constructor.db && vendetta.constructor.db.readyState === 1) {
    try {
      await vendetta.save();
    } catch (err) {
      // If db error, still return object
    }
  }

  return vendetta;
}

async function resolveVendetta(vendettaId, resolutionType = 'killed_target') {
  const vendetta = await NpcVendetta.findById(vendettaId);
  if (!vendetta) return null;

  vendetta.resolved = true;
  vendetta.resolvedAt = new Date();
  vendetta.resolutionType = resolutionType;
  await vendetta.save();
  return vendetta;
}

async function getActiveVendettasForTarget(targetId, targetType = 'player') {
  return await NpcVendetta.find({
    targetId,
    targetType,
    resolved: false
  }).populate('hunterNpcId');
}

const { makeRng } = require('../utils/npcRng');
const DEFAULT_RNG = makeRng(0xC0FFEE);

function evaluateAmbushTrigger({
  hunterNpc,
  player,
  tileInfo = {},
  grudgeLevel = 5,
  rng = DEFAULT_RNG
}) {
  // Ambush Invariant: DILARANG ambush di dalam pemukiman atau safe zone
  if (tileInfo.isSettlement || tileInfo.isSafeZone) {
    return { canAmbush: false, reason: 'safe_zone' };
  }

  // Hunter must be alive
  if (!hunterNpc || !hunterNpc.vitalStatus || !hunterNpc.vitalStatus.isAlive) {
    return { canAmbush: false, reason: 'hunter_dead' };
  }

  // Must have severe grudge
  if (grudgeLevel < 4) {
    return { canAmbush: false, reason: 'grudge_too_low' };
  }

  // Base ambush chance: 35% in wilderness
  const roll = rng();
  const threshold = grudgeLevel === 5 ? 0.35 : 0.20;

  if (roll < threshold) {
    return {
      canAmbush: true,
      hunterNpcId: hunterNpc._id,
      hunterName: hunterNpc.name,
      tileX: player.tileX || 0,
      tileY: player.tileY || 0
    };
  }

  return { canAmbush: false, reason: 'dice_failed' };
}

module.exports = {
  createVendetta,
  resolveVendetta,
  getActiveVendettasForTarget,
  evaluateAmbushTrigger
};
