/**
 * Vendetta & Ambush Engine for Jianghu Bot Living NPCs (V28 / B4)
 * Tracks grudges, vendetta hunters, and wilderness ambushes.
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const NpcVendetta = require('../models/NpcVendetta');
const NpcAmbush = require('../models/NpcAmbush');
const NpcPlayerRelation = require('../models/NpcPlayerRelation');
const { makeRng, hash32 } = require('../utils/npcRng');
const { hasEnoughCurrency, payCurrency } = require('../utils/currency');
const {
  huntStep,
  isPlayerInsideSettlementExclusion,
  EXCLUSION_RADIUS_BY_TYPE
} = require('./npcHuntEngine');

const DEFAULT_RNG = makeRng(0xC0FFEE);

function calculateFleeChance(playerAgility, hunterAgility) {
  const pAgi = Number(playerAgility) || 10;
  const hAgi = Number(hunterAgility) || 15;
  const raw = 0.4 + (pAgi - hAgi) / 400;
  return Math.max(0.1, Math.min(0.9, raw));
}

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
    } catch (_) {}
  }

  return vendetta;
}

async function resolveVendetta(vendettaId, resolutionType = 'killed_target') {
  const vendetta = await NpcVendetta.findById(vendettaId);
  if (!vendetta) return null;

  vendetta.resolved = true;
  vendetta.resolvedAt = new Date();
  vendetta.resolutionType = resolutionType;
  if (typeof vendetta.save === 'function' && vendetta.constructor.db?.readyState === 1) {
    await vendetta.save();
  }
  return vendetta;
}

async function getActiveVendettasForTarget(targetId, targetType = 'player') {
  return await NpcVendetta.find({
    targetId,
    targetType,
    resolved: false
  }).populate('hunterNpcId');
}

function evaluateAmbushTrigger({
  hunterNpc,
  player,
  tileInfo = {},
  grudgeLevel = 5,
  rng = DEFAULT_RNG
}) {
  if (tileInfo.isSettlement || tileInfo.isSafeZone) {
    return { canAmbush: false, reason: 'safe_zone' };
  }

  if (!hunterNpc || !hunterNpc.vitalStatus || !hunterNpc.vitalStatus.isAlive) {
    return { canAmbush: false, reason: 'hunter_dead' };
  }

  if (grudgeLevel < 4) {
    return { canAmbush: false, reason: 'grudge_too_low' };
  }

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

async function resolveAmbushAction({
  ambush,
  player = null,
  hunter = null,
  vendetta = null,
  choice = 'fight',
  rng = DEFAULT_RNG
}) {
  if (!ambush) {
    return { success: false, error: 'Penyergapan tidak ditemukan.' };
  }

  if (new Date(ambush.expiresAt) <= new Date()) {
    return { success: false, error: 'Penyergapan telah kedaluwarsa.' };
  }

  if (player && ambush.targetPlayerId && ambush.targetPlayerId.toString() !== player._id.toString()) {
    return { success: false, error: 'Penyergapan ini bukan milikmu.' };
  }

  if (ambush.status !== 'pending') {
    return { success: false, error: 'Penyergapan sudah diselesaikan.' };
  }

  if (choice === 'fight') {
    ambush.status = 'triggered';
    if (typeof ambush.save === 'function' && ambush.constructor.db?.readyState === 1) {
      await ambush.save();
    }
    return {
      success: true,
      action: 'fight',
      startBattle: {
        targetType: 'npc_ambush',
        targetId: (ambush.hunterNpcId?._id || ambush.hunterNpcId).toString(),
        ambushId: ambush._id
      }
    };
  }

  if (choice === 'pay') {
    const grudgeLevel = vendetta?.grudgeLevel ?? 5;
    const hunterRealm = hunter?.cultivation?.realmIndex ?? 0;
    const cost = 50 * grudgeLevel * (hunterRealm + 1);

    const hasFunds = player?.currency
      ? hasEnoughCurrency(player.currency, cost, 'copper')
      : (player?.copperCoins != null ? player.copperCoins >= cost : false);

    if (!hasFunds) {
      return { success: false, error: `Tembaga tidak mencukupi untuk membayar uang damai (${cost} tembaga dibutuhkan).` };
    }

    if (player?.currency) {
      payCurrency(player.currency, cost, 'copper');
    } else if (player?.copperCoins != null) {
      player.copperCoins -= cost;
    }

    if (typeof player?.save === 'function' && player.constructor.db?.readyState === 1) {
      await player.save();
    }

    ambush.status = 'paid';
    if (typeof ambush.save === 'function' && ambush.constructor.db?.readyState === 1) {
      await ambush.save();
    }

    if (vendetta) {
      vendetta.grudgeLevel = Math.max(0, vendetta.grudgeLevel - 2);
      if (vendetta.grudgeLevel <= 1) {
        vendetta.resolved = true;
        vendetta.resolutionType = 'reconciled';
        vendetta.resolvedAt = new Date();
      }
      if (typeof vendetta.save === 'function' && vendetta.constructor.db?.readyState === 1) {
        await vendetta.save();
      }
    }

    return {
      success: true,
      action: 'pay',
      cost,
      newGrudgeLevel: vendetta?.grudgeLevel ?? 0,
      message: 'Kamu membayar ganti rugi. Pemburu mundur dengan dendam mereda.'
    };
  }

  if (choice === 'flee') {
    const playerAgility = player?.extendedStats?.agility ?? player?.attributes?.agility ?? 10;
    const hunterAgility = hunter?.attributes?.agility ?? 15;
    const fleeChance = calculateFleeChance(playerAgility, hunterAgility);
    const roll = rng();

    if (roll < fleeChance) {
      ambush.status = 'escaped';
      if (typeof ambush.save === 'function' && ambush.constructor.db?.readyState === 1) {
        await ambush.save();
      }
      return {
        success: true,
        action: 'flee',
        escaped: true,
        message: 'Kamu berhasil meloloskan diri dari kepungan pemburu!'
      };
    } else {
      ambush.status = 'triggered';
      if (typeof ambush.save === 'function' && ambush.constructor.db?.readyState === 1) {
        await ambush.save();
      }
      return {
        success: true,
        action: 'flee',
        escaped: false,
        message: 'Gagal kabur! Pemburu menghadang langkahmu.',
        startBattle: {
          targetType: 'npc_ambush',
          targetId: (ambush.hunterNpcId?._id || ambush.hunterNpcId).toString(),
          ambushId: ambush._id
        }
      };
    }
  }

  return { success: false, error: 'Pilihan aksi tidak valid.' };
}

async function saveDocIfConnected(doc) {
  if (doc && typeof doc.save === 'function' && doc.constructor?.db?.readyState === 1) {
    await doc.save();
  }
}

/**
 * Transitions a hunter back to idle and sets stayUntil so F1 schedules return home when away/displaced.
 */
async function resetHunterToIdle(hunter, now) {
  if (!hunter) return;
  hunter.schedule = hunter.schedule || {};
  hunter.schedule.activityState = 'idle';
  const curAnchor = hunter.schedule.currentAnchorId || hunter.schedule.homeAnchorId;
  const homeAnchor = hunter.schedule.homeAnchorId;
  const away = curAnchor && homeAnchor && curAnchor !== homeAnchor;
  if ((away || homeAnchor) && !hunter.schedule.stayUntil) {
    hunter.schedule.stayUntil = new Date(now);
  }
  if (typeof hunter.markModified === 'function') {
    hunter.markModified('schedule');
  }
  if (typeof hunter.save === 'function') {
    await hunter.save();
  }
}

/**
 * Resets hunting NPCs whose vendetta resolved, entered cooldown, or target went offline (>10m).
 */
async function cleanupStaleHunters({ Vendetta, PlayerMod, NpcMod, now, tenMinutesAgo, cooldownMs }) {
  if (!NpcMod) return;
  const huntingNpcs = await NpcMod.find({ 'schedule.activityState': 'hunting' });

  for (const h of huntingNpcs) {
    const activeVendetta = await Vendetta.findOne({ hunterNpcId: h._id, resolved: false });
    if (!activeVendetta) {
      await resetHunterToIdle(h, now);
      continue;
    }

    const onCooldown = activeVendetta.lastAmbushAt && (now - new Date(activeVendetta.lastAmbushAt).getTime() < cooldownMs);
    if (onCooldown) {
      await resetHunterToIdle(h, now);
      continue;
    }

    const targetPlayer = await PlayerMod.findById(activeVendetta.targetId);
    const offline = !targetPlayer || !targetPlayer.updatedAt || new Date(targetPlayer.updatedAt).getTime() < tenMinutesAgo.getTime();
    if (offline) {
      await resetHunterToIdle(h, now);
    }
  }
}

async function createAndSaveAmbush(Ambush, fields) {
  const ambush = new Ambush(fields);
  await saveDocIfConnected(ambush);
  return ambush;
}

/**
 * Moves vendetta hunters toward an online player and evaluates vendetta ambushes.
 */
async function evaluateVendettasForPlayer({ player, px, py, Vendetta, Ambush, NpcMod, anchors, isWalkableFn, now, cooldownMs, rng }) {
  const vendettas = await Vendetta.find({ targetId: player._id, resolved: false }).limit(3);

  for (const v of vendettas) {
    if (v.lastAmbushAt && (now - new Date(v.lastAmbushAt).getTime() < cooldownMs)) {
      continue;
    }

    const hunter = NpcMod ? await NpcMod.findById(v.hunterNpcId) : null;
    if (!hunter || !hunter.vitalStatus?.isAlive) continue;

    const step = huntStep({ hunter, player, anchors, isWalkableFn, now });
    const enteringOrSteppingHunt = step.moved || (
      step.state === 'hunting' &&
      (hunter.schedule?.activityState !== 'hunting' || hunter.schedule?.targetDestination)
    );

    if (enteringOrSteppingHunt) {
      hunter.schedule = hunter.schedule || {};
      if (step.moved) {
        hunter.schedule.tileX = step.newX;
        hunter.schedule.tileY = step.newY;
        hunter.tileX = step.newX;
        hunter.tileY = step.newY;
      }
      hunter.schedule.activityState = 'hunting';
      hunter.schedule.targetDestination = null;
      hunter.schedule.stayUntil = null;
      if (typeof hunter.markModified === 'function') hunter.markModified('schedule');
      if (typeof hunter.save === 'function') await hunter.save();
    } else if (step.state === 'idle' && hunter.schedule?.activityState === 'hunting') {
      await resetHunterToIdle(hunter, now);
    }

    const hx = hunter.schedule?.tileX ?? hunter.tileX ?? px;
    const hy = hunter.schedule?.tileY ?? hunter.tileY ?? py;
    const dist = Math.max(Math.abs(px - hx), Math.abs(py - hy));
    if (dist > 24) continue;

    const playerRng = rng || makeRng(hash32(String(player._id) + ':' + Math.floor(now / 60000)));
    const trig = evaluateAmbushTrigger({
      hunterNpc: hunter,
      player: { tileX: px, tileY: py },
      tileInfo: { isSettlement: false },
      grudgeLevel: v.grudgeLevel,
      rng: playerRng
    });

    if (trig.canAmbush) {
      await createAndSaveAmbush(Ambush, {
        hunterNpcId: hunter._id,
        targetPlayerId: player._id,
        kind: 'vendetta',
        reason: v.reason || 'dendam',
        status: 'pending',
        tileX: px,
        tileY: py,
        expiresAt: new Date(now + 10 * 60 * 1000)
      });
      v.lastAmbushAt = new Date(now);
      await saveDocIfConnected(v);
      return true;
    }
  }

  return false;
}

/**
 * Evaluates hostile ambushes from deeply resentful NPCs (affinity <= -60) near the player.
 */
async function evaluateHostileRelationsForPlayer({ player, px, py, RelationMod, Ambush, NpcMod, now, rng }) {
  if (!RelationMod || !NpcMod) return false;

  const hostileRelations = await RelationMod.find({
    playerId: player._id,
    affinity: { $lte: -60 }
  }).sort({ affinity: 1 }).limit(5);

  for (const rel of hostileRelations) {
    if (rel.lastAmbushAt && (now - new Date(rel.lastAmbushAt).getTime() < 6 * 3600 * 1000)) {
      continue;
    }

    const npc = await NpcMod.findById(rel.npcId);
    if (!npc || !npc.vitalStatus?.isAlive || npc.vitalStatus?.isEssential || npc.vitalStatus?.isInjured) continue;
    if (npc.vitalStatus?.downedUntil && new Date(npc.vitalStatus.downedUntil).getTime() > now) continue;

    const nx = npc.schedule?.tileX ?? npc.tileX ?? 0;
    const ny = npc.schedule?.tileY ?? npc.tileY ?? 0;
    const dist = Math.max(Math.abs(px - nx), Math.abs(py - ny));
    if (dist > 12) continue;

    const roll = rng ? rng() : makeRng(hash32(String(npc._id) + ':' + String(player._id) + ':' + Math.floor(now / 60000)))();
    if (roll < 0.10) {
      await createAndSaveAmbush(Ambush, {
        hunterNpcId: npc._id,
        targetPlayerId: player._id,
        kind: 'hostile',
        reason: 'benci',
        status: 'pending',
        tileX: px,
        tileY: py,
        expiresAt: new Date(now + 10 * 60 * 1000)
      });
      rel.lastAmbushAt = new Date(now);
      await saveDocIfConnected(rel);
      return true;
    }
  }

  return false;
}

async function runVendettaTick({
  NpcVendetta: NpcVendettaModel = null,
  NpcAmbush: NpcAmbushModel = null,
  Player: PlayerModel = null,
  Npc: NpcModel = null,
  NpcPlayerRelation: NpcPlayerRelationModel = null,
  anchors = null,
  isWalkableFn = null,
  now = Date.now(),
  rng = null
} = {}) {
  const Vendetta = NpcVendettaModel || NpcVendetta;
  const Ambush = NpcAmbushModel || NpcAmbush;
  const PlayerMod = PlayerModel || (mongoose.models?.Player ? mongoose.models.Player : null);
  const NpcMod = NpcModel || (mongoose.models?.Npc ? mongoose.models.Npc : null);
  const RelationMod = NpcPlayerRelationModel || NpcPlayerRelation || (mongoose.models?.NpcPlayerRelation ? mongoose.models.NpcPlayerRelation : null);

  if (!PlayerMod || !Vendetta || !Ambush) return 0;

  const tenMinutesAgo = new Date(now - 10 * 60 * 1000);
  const cooldownMs = 3 * 3600 * 1000;
  const onlinePlayers = await PlayerMod.find({ updatedAt: { $gte: tenMinutesAgo } });

  await cleanupStaleHunters({ Vendetta, PlayerMod, NpcMod, now, tenMinutesAgo, cooldownMs });

  let triggeredCount = 0;

  for (const player of onlinePlayers) {
    const px = Math.floor(player.gridPosition?.tileX ?? player.tileX ?? 0);
    const py = Math.floor(player.gridPosition?.tileY ?? player.tileY ?? 0);

    if (isPlayerInsideSettlementExclusion(px, py, anchors)) continue;

    const existingPending = await Ambush.findOne({
      targetPlayerId: player._id,
      status: 'pending',
      expiresAt: { $gt: new Date(now) }
    });
    if (existingPending) continue;

    const vendettaTriggered = await evaluateVendettasForPlayer({
      player, px, py, Vendetta, Ambush, NpcMod, anchors, isWalkableFn, now, cooldownMs, rng
    });
    if (vendettaTriggered) {
      triggeredCount++;
      continue;
    }

    const hostileTriggered = await evaluateHostileRelationsForPlayer({
      player, px, py, RelationMod, Ambush, NpcMod, now, rng
    });
    if (hostileTriggered) {
      triggeredCount++;
    }
  }

  return triggeredCount;
}

module.exports = {
  createVendetta,
  resolveVendetta,
  getActiveVendettasForTarget,
  evaluateAmbushTrigger,
  isPlayerInsideSettlementExclusion,
  calculateFleeChance,
  resolveAmbushAction,
  runVendettaTick
};
