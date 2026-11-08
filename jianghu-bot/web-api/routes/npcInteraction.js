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

    // Fog of Inspection: Mask hidden inventory unless affinity >= 20 or player insight >= 25
    const playerInsight = (player.extendedStats && player.extendedStats.insight) || 10;
    const canInspectAll = relation.affinity >= 20 || playerInsight >= 25;

    const visibleInventory = (npc.inventory || []).filter(item => {
      if (canInspectAll) return true;
      return item.equippedSlot !== null; // only show equipped gear
    });

    return res.json({
      success: true,
      npc: {
        _id: npc._id,
        name: npc.name,
        title: npc.title,
        gender: npc.gender || 'male',
        description: npc.description,
        regionSlug: npc.regionSlug,
        settlementName: npc.settlementName,
        buildingName: npc.buildingName,
        portraitUrl: npc.portraitUrl,
        imageUrl: npc.imageUrl,
        greeting: npc.greeting,
        personality: npc.personality,
        dao: npc.dao,
        destiny: npc.destiny,
        lifespan: npc.lifespan,
        attributes: npc.attributes,
        cultivation: npc.cultivation,
        schedule: npc.schedule,
        vitalStatus: npc.vitalStatus,
        inventory: visibleInventory,
        social: npc.social
      },
      relation: {
        affinity: relation.affinity,
        affinityStage,
        interactionCountDaily: relation.interactionCountDaily,
        specialStatus: relation.specialStatus,
        history: relation.history.slice(-10) // last 10 entries
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

// POST /api/npc/action/:npcId
router.post('/action/:npcId', authenticateToken, async (req, res) => {
  try {
    const { npcId } = req.params;
    const { action, payload = {} } = req.body;
    const player = await loadPlayer(req.user);
    if (!player) return res.status(401).json({ success: false, message: 'Pemain tidak sah.' });

    const npc = await Npc.findById(npcId);
    if (!npc) return res.status(404).json({ success: false, message: 'NPC tidak ditemukan.' });
    if (!npc.vitalStatus || !npc.vitalStatus.isAlive) {
      return res.status(400).json({ success: false, message: 'Karakter ini telah wafat dan tidak dapat diajak berinteraksi.' });
    }

    const relation = await getOrCreateRelation(player._id, npc._id);
    const rng = makeRng(`${player._id}_${npcId}_${Date.now()}`);

    let deltaAffinity = 0;
    let message = '';
    let resultData = {};

    switch (action) {
      case 'chat': {
        if (relation.interactionCountDaily.chat >= 3) {
          return res.status(400).json({
            success: false,
            message: 'Batas obrolan harian tercapai (Maks 3 kali per hari). NPC butuh waktu bermeditasi.'
          });
        }
        relation.interactionCountDaily.chat += 1;
        deltaAffinity = rng() < 0.8 ? 2 : 3;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        message = `Anda berbincang hangat mengenai kabar Jianghu dengan ${npc.name}. (Afinitas +${deltaAffinity})`;
        break;
      }

      case 'inquire': {
        message = `${npc.name} mencondongkan badan dan berbisik: "Kudengar di pegunungan timur ada aura spiritual kuno yang baru saja bangkit..."`;
        resultData.clue = 'Kabut spiritual di pegunungan timur.';
        break;
      }

      case 'spar': {
        if ((player.stamina || 0) < 5) {
          return res.status(400).json({ success: false, message: 'Stamina tidak mencukupi untuk sparring (Butuh min 5 Stamina).' });
        }
        player.stamina -= 5;
        deltaAffinity = 2;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        message = `Anda bertukar beberapa jurus persahabatan dengan ${npc.name}. Keduanya saling mengagumi kemahiran beladiri! (Stamina -5, Afinitas +2)`;
        break;
      }

      case 'duel': {
        message = `Anda menyatakan duel hidup-mati kepada ${npc.name}! Niat membunuh menyelimuti medan pertempuran!`;
        resultData.duelReady = true;
        break;
      }

      case 'gift': {
        if (relation.interactionCountDaily.gift >= 2) {
          return res.status(400).json({ success: false, message: 'Batas pemberian hadiah harian tercapai (Maks 2 hadiah per hari).' });
        }
        const { itemId } = payload;
        let invIdx = -1;

        if (itemId) {
          invIdx = player.inventory.findIndex(i => (i.itemId?.toString() === itemId.toString() || i.id?.toString() === itemId.toString()) && i.quantity > 0);
        } else {
          invIdx = player.inventory.findIndex(i => i.quantity > 0);
        }

        if (invIdx !== -1) {
          const playerItem = player.inventory[invIdx];
          if (playerItem.quantity > 1) {
            playerItem.quantity -= 1;
          } else {
            player.inventory.splice(invIdx, 1);
          }
          relation.interactionCountDaily.gift += 1;
          deltaAffinity = 8;
          relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
          message = `${npc.name} tersenyum lebar menerima pemberian Anda: "Terima kasih banyak atas hadiah ini, budi baikmu akan selalu kuingat!" (Afinitas +${deltaAffinity})`;
        } else {
          if (hasEnoughCurrency(player.currency, 50, 'copper')) {
            payCurrency(player.currency, 50, 'copper');
            relation.interactionCountDaily.gift += 1;
            deltaAffinity = 6;
            relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
            message = `Anda membelikan teh harum khas Jianghu (50 Tembaga) untuk ${npc.name}. ${npc.name} tersenyum ramah: "Teh yang sedap! Terima kasih atas keramahanmu!" (Afinitas +6)`;
          } else {
            return res.status(400).json({ success: false, message: 'Anda tidak memiliki barang atau koin tembaga untuk dihadiahkan.' });
          }
        }
        break;
      }

      case 'bribe': {
        const amount = Math.max(50, Math.floor(payload.amount || 100)); // minimum 50 copper
        if (!hasEnoughCurrency(player.currency, amount, 'copper')) {
          return res.status(400).json({ success: false, message: 'Koin tembaga Anda tidak mencukupi untuk menyuap.' });
        }

        payCurrency(player.currency, amount, 'copper');
        const pId = npc.personality ? npc.personality.primary : 'pragmatic';

        if (['righteous', 'honest'].includes(pId)) {
          deltaAffinity = -10;
          relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
          message = `${npc.name} menepis koin Anda dengan geram: "Simpan logam kotormu! Aku bukan orang rendahan!" (Afinitas -10)`;
        } else {
          deltaAffinity = 6;
          relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
          message = `${npc.name} menyelipkan koin ke dalam lengan bajunya dengan senyum puas. (Afinitas +6)`;
        }
        break;
      }

      case 'recruit': {
        if (relation.affinity < 60) {
          return res.status(400).json({ success: false, message: `Afinitas belum mencukupi untuk merekrut (Butuh min 60, saat ini: ${relation.affinity}).` });
        }
        relation.specialStatus.isSwornSibling = true;
        message = `${npc.name} mengangguk mantap: "Bersamamu melintasi bahaya Jianghu adalah kehormatan bagiku!"`;
        break;
      }

      case 'confess': {
        if (relation.affinity < 70) {
          return res.status(400).json({ success: false, message: `Afinitas belum mencukupi untuk menyatakan asmara (Butuh min 70, saat ini: ${relation.affinity}).` });
        }
        deltaAffinity = 5;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        message = `${npc.name} tersipu malu: "Sejak pertama kali bertemu di rimba bambu, hatiku pun tak pernah tenang..." (Afinitas +5)`;
        break;
      }

      case 'propose': {
        if (relation.affinity < 85) {
          return res.status(400).json({ success: false, message: `Afinitas belum mencukupi untuk ikatan Pasangan Dao (Butuh min 85, saat ini: ${relation.affinity}).` });
        }
        relation.specialStatus.isDaoCompanion = true;
        deltaAffinity = 10;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        message = `Di bawah saksi langit dan bumi, Anda dan ${npc.name} resmi mengikat sumpah sebagai Pasangan Dao! (Afinitas +10)`;
        break;
      }

      case 'divorce': {
        if (!relation.specialStatus.isDaoCompanion) {
          return res.status(400).json({ success: false, message: 'Anda tidak memiliki ikatan Pasangan Dao dengan karakter ini.' });
        }
        relation.specialStatus.isDaoCompanion = false;
        deltaAffinity = -50;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        message = `Ikatan Pasangan Dao diputuskan. ${npc.name} memalingkan muka dengan tatapan pedih dan dingin. (Afinitas -50)`;
        break;
      }

      case 'adopt': {
        relation.specialStatus.isApprentice = true;
        deltaAffinity = 5;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        message = `${npc.name} membungkuk hormat dan menyambut hubungan perguruan. (Afinitas +5)`;
        break;
      }

      case 'steal': {
        const playerAgility = (player.attributes && player.attributes.agility) || 15;
        const npcInsight = (npc.attributes && npc.attributes.insight) || 15;
        const stealSuccess = rng() < (playerAgility / (playerAgility + npcInsight));

        if (stealSuccess) {
          const stolenCopper = 25;
          addCopper(player.currency, stolenCopper);
          message = `Anda dengan lincah menyambar kantong kecil berisi ${stolenCopper} Koin Tembaga tanpa disadari ${npc.name}!`;
          resultData.stolenCopper = stolenCopper;
        } else {
          deltaAffinity = -30;
          relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
          player.wantedLevel = Math.min(5, (player.wantedLevel || 0) + 1);
          message = `Tertangkap basah! ${npc.name} mencengkeram tangan Anda dengan amarah: "Pencuri keparat!" (Afinitas -30, Buronan +1)`;
        }
        break;
      }

      case 'threaten': {
        const playerAtk = (player.attack || 20);
        const npcDef = (npc.attributes && npc.attributes.defense) || 15;

        if (playerAtk > npcDef) {
          const extortedCopper = 50;
          addCopper(player.currency, extortedCopper);
          deltaAffinity = -15;
          relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
          message = `${npc.name} gemetar ketakutan dan menyerahkan ${extortedCopper} Koin Tembaga: "Jangan bunuh aku!" (Afinitas -15)`;
          resultData.extortedCopper = extortedCopper;
        } else {
          deltaAffinity = -25;
          relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
          message = `${npc.name} tertawa meremehkan: "Kekuatanmu seujung kuku tapi berani mengancamku?!" (Afinitas -25)`;
        }
        break;
      }

      case 'request_favor': {
        if (relation.affinity < 50) {
          return res.status(400).json({ success: false, message: `Afinitas belum mencukupi untuk meminta bantuan (Butuh min 50, saat ini: ${relation.affinity}).` });
        }
        message = `${npc.name} memberikan Anda sebuah ramuan herba pemulih luka: "Pergunakanlah ini di saat genting, Rekan Dao."`;
        break;
      }

      case 'break_relations': {
        relation.affinity = 0;
        relation.specialStatus.isDaoCompanion = false;
        relation.specialStatus.isSwornSibling = false;
        relation.specialStatus.isMaster = false;
        relation.specialStatus.isApprentice = false;
        message = `Hubungan khusus dengan ${npc.name} telah diputus. Kini kalian hanyalah orang asing.`;
        break;
      }

      default:
        return res.status(400).json({ success: false, message: `Aksi interaksi '${action}' tidak dikenali.` });
    }

    // Record history
    relation.history.push({
      timestamp: new Date(),
      action,
      delta: deltaAffinity,
      note: message
    });

    await relation.save();
    await player.save();

    return res.json({
      success: true,
      action,
      message,
      deltaAffinity,
      newAffinity: relation.affinity,
      affinityStage: getAffinityStage(relation.affinity),
      resultData
    });
  } catch (error) {
    console.error('[NPC Action API Error]', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses aksi interaksi NPC.' });
  }
});

module.exports = router;
