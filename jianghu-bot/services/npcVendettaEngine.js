/**
 * Vendetta & Ambush Engine for Jianghu Bot Living NPCs (V28 / B4)
 * Tracks grudges, vendetta hunters, and wilderness ambushes.
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const NpcVendetta = require('../models/NpcVendetta');
const NpcAmbush = require('../models/NpcAmbush');
const { makeRng } = require('../utils/npcRng');
const { hasEnoughCurrency, payCurrency } = require('../utils/currency');

const DEFAULT_RNG = makeRng(0xC0FFEE);

const EXCLUSION_RADIUS_BY_TYPE = {
  hamlet: 6,
  village: 10,
  town: 14,
  major_city: 24,
  capital_city: 36,
  capital: 36,
  sect: 16,
  outpost: 8,
  port: 10,
  island: 10
};

function isPlayerInsideSettlementExclusion(px, py, anchorsList = null) {
  let anchors = anchorsList;
  if (!anchors) {
    try {
      const rootDir = path.resolve(__dirname, '../');
      anchors = JSON.parse(fs.readFileSync(path.join(rootDir, 'world-data/anchors.json'), 'utf8'));
    } catch (_) {
      anchors = [];
    }
  }

  for (const a of anchors) {
    const ax = a.x ?? a.tileX ?? 0;
    const ay = a.y ?? a.tileY ?? 0;
    const r = EXCLUSION_RADIUS_BY_TYPE[a.type] ?? a.v20?.exclusionRadius ?? 10;
    const dist = Math.max(Math.abs(px - ax), Math.abs(py - ay));
    if (dist <= r) return true;
  }

  return false;
}

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

async function runVendettaTick({
  NpcVendetta: NpcVendettaModel = null,
  NpcAmbush: NpcAmbushModel = null,
  Player: PlayerModel = null,
  Npc: NpcModel = null,
  anchors = null,
  now = Date.now(),
  rng = DEFAULT_RNG
} = {}) {
  const Vendetta = NpcVendettaModel || NpcVendetta;
  const Ambush = NpcAmbushModel || NpcAmbush;
  const PlayerMod = PlayerModel || (mongoose.models?.Player ? mongoose.models.Player : null);
  const NpcMod = NpcModel || (mongoose.models?.Npc ? mongoose.models.Npc : null);

  if (!PlayerMod || !Vendetta || !Ambush) return 0;

  // 1. Find online players (updatedAt <= 2 minutes ago)
  const twoMinutesAgo = new Date(now - 2 * 60 * 1000);
  const onlinePlayers = await PlayerMod.find({ updatedAt: { $gte: twoMinutesAgo } });

  let triggeredCount = 0;
  const cooldownMs = 3 * 3600 * 1000;

  for (const player of onlinePlayers) {
    const px = player.gridPosition?.tileX ?? player.tileX ?? 0;
    const py = player.gridPosition?.tileY ?? player.tileY ?? 0;

    // Check settlement exclusion zone
    if (isPlayerInsideSettlementExclusion(px, py, anchors)) continue;

    // Check if player already has an active pending ambush
    const existingPending = await Ambush.findOne({
      targetPlayerId: player._id,
      status: 'pending',
      expiresAt: { $gt: new Date(now) }
    });
    if (existingPending) continue;

    // Find up to 3 active vendettas against player
    const vendettas = await Vendetta.find({
      targetId: player._id,
      resolved: false
    }).limit(3);

    for (const v of vendettas) {
      if (v.lastAmbushAt && (now - new Date(v.lastAmbushAt).getTime() < cooldownMs)) {
        continue;
      }

      let hunter = null;
      if (NpcMod) {
        hunter = await NpcMod.findById(v.hunterNpcId);
      }
      if (!hunter || !hunter.vitalStatus?.isAlive) continue;

      const hx = hunter.schedule?.tileX ?? hunter.tileX ?? px;
      const hy = hunter.schedule?.tileY ?? hunter.tileY ?? py;
      const dist = Math.max(Math.abs(px - hx), Math.abs(py - hy));

      if (dist > 24) continue;

      const trig = evaluateAmbushTrigger({
        hunterNpc: hunter,
        player: { tileX: px, tileY: py },
        tileInfo: { isSettlement: false },
        grudgeLevel: v.grudgeLevel,
        rng
      });

      if (trig.canAmbush) {
        const ambush = new Ambush({
          hunterNpcId: hunter._id,
          targetPlayerId: player._id,
          status: 'pending',
          tileX: px,
          tileY: py,
          expiresAt: new Date(now + 10 * 60 * 1000)
        });
        if (typeof ambush.save === 'function' && ambush.constructor.db?.readyState === 1) {
          await ambush.save();
        }
        v.lastAmbushAt = new Date(now);
        if (typeof v.save === 'function' && v.constructor.db?.readyState === 1) {
          await v.save();
        }
        triggeredCount++;
        break; // Max 1 ambush per player
      }
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
