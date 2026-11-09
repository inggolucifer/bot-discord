/**
 * Server-Authoritative Living NPC Interaction Route (V27)
 * Implements 15 actions, daily caps, currency validation, and relation tracking.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Npc = require('../../models/Npc');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const NpcPlayerRelation = require('../../models/NpcPlayerRelation');
const NpcFamily = require('../../models/NpcFamily');
const NpcEvent = require('../../models/NpcEvent');
const { authenticateToken } = require('../middlewares/auth');
const { hasEnoughCurrency, payCurrency, addCopper } = require('../../utils/currency');
const { makeRng } = require('../../utils/npcRng');
const { loadPlayer } = require('../utils/playerLookup');
const LockManager = require('../utils/lockManager');
const { checkNpcProximity } = require('../../services/npcProximity');
const { evaluateAction } = require('../../services/npcActions');
const { buildVisibleProfile } = require('../../services/npcVisibility');
const { generateDialogueLine } = require('../../services/npcDialogueEngine');

function getAffinityStage(affinity) {
  if (affinity <= -60) return 'nemesis';
  if (affinity <= -20) return 'hateful';
  if (affinity < 0) return 'wary';
  if (affinity < 20) return 'neutral';
  if (affinity < 50) return 'friendly';
  if (affinity < 80) return 'close_friend';
  return 'soulmate';
}

async function getOrCreateRelation(playerId, npcId) {
  let relation = await NpcPlayerRelation.findOne({ playerId, npcId });
  const today = new Date().toISOString().slice(0, 10);

  if (!relation) {
    relation = new NpcPlayerRelation({
      playerId,
      npcId,
      affinity: 0,
      interactionCountDaily: { chat: 0, gift: 0, spar: 0, date: today },
      history: []
    });
  } else if (relation.interactionCountDaily.date !== today) {
    relation.interactionCountDaily.chat = 0;
    relation.interactionCountDaily.gift = 0;
    relation.interactionCountDaily.spar = 0;
    relation.interactionCountDaily.date = today;
  }

  return relation;
}

// GET /api/npc/profile/:npcId
router.get('/profile/:npcId', authenticateToken, async (req, res) => {
  try {
    const { npcId } = req.params;
    const player = await loadPlayer(req.user);
    if (!player) {
      return res.status(401).json({ success: false, message: 'Pemain tidak sah.' });
    }

    const npc = await Npc.findById(npcId);
    if (!npc) {
      return res.status(404).json({ success: false, message: 'NPC tidak ditemukan di Jianghu.' });
    }

    const activePlayerId = player._id;
    const relation = await getOrCreateRelation(activePlayerId, npc._id);
    const affinityStage = getAffinityStage(relation.affinity);

    const visibleProfile = buildVisibleProfile(npc, player, relation);
    const greetingDialogue = generateDialogueLine({
      npc,
      player,
      relation,
      actionContext: 'greeting'
    });

    return res.json({
      success: true,
      npc: visibleProfile,
      greetingDialogue,
      relation: {
        affinity: relation.affinity,
        affinityStage,
        interactionCountDaily: relation.interactionCountDaily,
        specialStatus: relation.specialStatus,
        history: (relation.history || []).slice(-10)
      }
    });
  } catch (error) {
    console.error('[NPC Profile API Error]', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat profil NPC.' });
  }
});

// GET /api/npc/relations/:npcId
router.get('/relations/:npcId', authenticateToken, async (req, res) => {
  try {
    const { npcId } = req.params;
    const npc = await Npc.findById(npcId);
    if (!npc) return res.status(404).json({ success: false, message: 'NPC tidak ditemukan.' });

    let family = null;
    if (npc.social && npc.social.familyId) {
      family = await NpcFamily.findById(npc.social.familyId).populate('members.npcId', 'name title realmIndex vitalStatus');
    }

    return res.json({
      success: true,
      social: npc.social,
      family
    });
  } catch (error) {
    console.error('[NPC Relations API Error]', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat relasi NPC.' });
  }
});

// GET /api/npc/history/:npcId
router.get('/history/:npcId', authenticateToken, async (req, res) => {
  try {
    const { npcId } = req.params;
    const events = await NpcEvent.find({ npcId })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();

    const history = (events || []).map(e => ({
      at: e.createdAt,
      text: e.description || e.eventType || 'Peristiwa Jianghu'
    }));

    return res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('[NPC History API Error]', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat riwayat hidup NPC.' });
  }
});

// POST /api/npc/action/:npcId
router.post('/action/:npcId', authenticateToken, async (req, res) => {
  const { npcId } = req.params;
  const { action, payload = {} } = req.body;

  const player = await loadPlayer(req.user);
  if (!player) return res.status(401).json({ success: false, message: 'Pemain tidak sah.' });

  const lockKey = `player_${player._id}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) {
    return res.status(429).json({ success: false, message: 'Aksi sedang diproses, harap tunggu sejenak.' });
  }

  try {
    const npc = await Npc.findById(npcId);
    if (!npc) return res.status(404).json({ success: false, message: 'NPC tidak ditemukan.' });
    if (!npc.vitalStatus || !npc.vitalStatus.isAlive) {
      return res.status(400).json({ success: false, message: 'Karakter ini telah wafat dan tidak dapat diajak berinteraksi.' });
    }

    // 1. Proximity check
    const proximity = checkNpcProximity(player, npc);
    if (!proximity.ok) {
      if (proximity.reason === 'traveling') {
        return res.status(400).json({ success: false, message: 'Anda tidak dapat berinteraksi saat sedang dalam perjalanan.' });
      }
      return res.status(400).json({
        success: false,
        message: `Jarak terlalu jauh dengan ${npc.name} (${proximity.distance} petak). Mendekatlah terlebih dahulu.`
      });
    }

    // 2. Relation and RNG
    const relation = await getOrCreateRelation(player._id, npc._id);
    const rng = makeRng(`${player._id}_${npcId}_${Date.now()}`);

    // 3. Authoritative Action Evaluation
    const actionResult = await evaluateAction(action, {
      player,
      npc,
      relation,
      payload,
      rng
    });

    if (!actionResult.success && actionResult.status && actionResult.status !== 200) {
      return res.status(actionResult.status).json(actionResult);
    }

    // 4. Save state
    await relation.save();
    await player.save();
    if (typeof npc.save === 'function' && npc.constructor?.db && npc.constructor.db.readyState === 1) {
      try {
        await npc.save();
      } catch (e) {}
    }

    let actionContext = action;
    if (action === 'steal' && (!actionResult.resultData?.isSuccess || !actionResult.success)) actionContext = 'steal_caught';
    if (action === 'threaten') actionContext = actionResult.success ? 'threaten_submit' : 'threaten_resist';

    const dialogue = generateDialogueLine({
      npc,
      player,
      relation,
      actionContext,
      rng,
      payload
    });

    return res.status(actionResult.status || 200).json({
      ...actionResult,
      dialogue,
      affinityStage: getAffinityStage(relation.affinity)
    });
  } catch (error) {
    console.error('[NPC Action API Error]', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses aksi interaksi NPC.' });
  } finally {
    if (releaseLock) releaseLock();
  }
});

// GET /api/npc/ambush/pending
router.get('/ambush/pending', authenticateToken, async (req, res) => {
  try {
    const player = await loadPlayer(req.user);
    if (!player) {
      return res.status(404).json({ success: false, error: 'Pemain tidak ditemukan.' });
    }

    const NpcAmbush = require('../../models/NpcAmbush');
    const NpcVendetta = require('../../models/NpcVendetta');

    const ambush = await NpcAmbush.findOne({
      targetPlayerId: player._id,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('hunterNpcId');

    if (!ambush) {
      return res.json({ success: true, ambush: null });
    }

    const hunter = ambush.hunterNpcId;
    const vendetta = await NpcVendetta.findOne({
      hunterNpcId: hunter?._id,
      targetId: player._id,
      resolved: false
    });

    const grudgeLevel = vendetta?.grudgeLevel ?? 5;
    const hunterRealm = hunter?.cultivation?.realmIndex ?? 0;
    const payCost = 50 * grudgeLevel * (hunterRealm + 1);
    const remainingSeconds = Math.max(0, Math.floor((new Date(ambush.expiresAt).getTime() - Date.now()) / 1000));

    return res.json({
      success: true,
      ambush: {
        id: ambush._id,
        hunterId: hunter?._id,
        hunterName: hunter?.name || 'Pemburu Misterius',
        reason: vendetta?.reason || 'Dendam darah masa lalu',
        grudgeLevel,
        payCost,
        remainingSeconds
      }
    });
  } catch (err) {
    console.error('[Ambush Pending Error]', err);
    return res.status(500).json({ success: false, error: 'Gagal memuat status ambush.' });
  }
});

// POST /api/npc/ambush/:id/resolve
router.post('/ambush/:id/resolve', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { choice = 'fight' } = req.body;
  let releaseLock = null;

  try {
    const player = await loadPlayer(req.user);
    if (!player) {
      return res.status(404).json({ success: false, error: 'Pemain tidak ditemukan.' });
    }

    const lockKey = `player_${player._id}`;
    releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
      return res.status(429).json({ success: false, message: 'Aksi ambush sedang diproses.' });
    }

    const NpcAmbush = require('../../models/NpcAmbush');
    const NpcVendetta = require('../../models/NpcVendetta');
    const Npc = require('../../models/Npc');
    const { resolveAmbushAction } = require('../../services/npcVendettaEngine');

    const ambush = await NpcAmbush.findById(id);
    if (!ambush) {
      return res.status(404).json({ success: false, error: 'Penyergapan tidak ditemukan.' });
    }

    if (ambush.targetPlayerId && ambush.targetPlayerId.toString() !== player._id.toString()) {
      return res.status(403).json({ success: false, error: 'Penyergapan ini bukan milikmu.' });
    }

    const hunter = await Npc.findById(ambush.hunterNpcId);
    const vendetta = await NpcVendetta.findOne({
      hunterNpcId: ambush.hunterNpcId,
      targetId: player._id,
      resolved: false
    });

    const result = await resolveAmbushAction({
      ambush,
      player,
      hunter,
      vendetta,
      choice
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err) {
    console.error('[Ambush Resolve Error]', err);
    return res.status(500).json({ success: false, error: 'Gagal menyelesaikan penyergapan.' });
  } finally {
    if (releaseLock) releaseLock();
  }
});

module.exports = router;
