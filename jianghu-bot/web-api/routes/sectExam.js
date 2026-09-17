const express = require('express');
const router = express.Router();
const Sect = require('../../models/Sect');
const Player = require('../../models/Player');
const Location = require('../../models/Location');
const AdminLog = require('../../models/AdminLog');
const { authenticateToken } = require('../middlewares/auth');
const { getPlayerSect } = require('../../utils/sectUtils');
const { getRealmIndex } = require('../../utils/cultivation');
const { calculatePlayerStats } = require('../../utils/playerCombat');
const { simulateExamCombat } = require('../../utils/sectExamCombat');

// GET /api/sect/:sectId/examInfo
router.get('/:sectId/examInfo', authenticateToken, async (req, res) => {
  try {
    const sect = await Sect.findById(req.params.sectId);
    if (!sect || !sect.entranceTest || !sect.entranceTest.enabled) {
      return res.status(404).json({ message: 'Ujian masuk sekte tidak ditemukan atau tidak aktif.' });
    }

    const exam = sect.entranceTest;
    const player = await Player.findOne({ discordId: req.user.userId, guildId: req.user.guildId });
    if(!player) return res.status(404).json({ message: 'Player tidak ditemukan.' });

    // Check cooldown
    let isOnCooldown = false;
    let cooldownRemaining = 0;
    if (player.sectExamState && player.sectExamState.lastAttempts) {
      const attempt = player.sectExamState.lastAttempts.find(a => a.sectId && a.sectId.toString() === sect._id.toString());
      if (attempt) {
        const timeSince = Date.now() - attempt.at.getTime();
        const cdMs = (exam.cooldownHours || 24) * 60 * 60 * 1000;
        if (timeSince < cdMs) {
          isOnCooldown = true;
          cooldownRemaining = cdMs - timeSince;
        }
      }
    }

    res.json({
      sectName: sect.name,
      type: exam.type,
      minRealmIndex: exam.minRealmIndex,
      guardianName: exam.type === 'combat' ? exam.guardianStatBlock.name : null,
      isOnCooldown,
      cooldownRemainingMs: cooldownRemaining,
      trialObjective: exam.type === 'trial_task' ? exam.trialTask.objectiveType : null,
      trialDurationHours: exam.type === 'trial_task' ? exam.trialTask.durationHours : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sect/:sectId/exam/start
router.post('/:sectId/exam/start', authenticateToken, async (req, res) => {
  try {
    const sect = await Sect.findById(req.params.sectId);
    if (!sect || !sect.entranceTest || !sect.entranceTest.enabled) {
      return res.status(404).json({ message: 'Ujian masuk tidak tersedia untuk sekte ini.' });
    }

    const player = await Player.findOne({ discordId: req.user.userId, guildId: req.user.guildId });

    if(!player) return res.status(404).json({ message: 'Player tidak ditemukan.'});

    // 1. Validations
    if (player.status !== 'active') return res.status(400).json({ message: 'Status pemain tidak aktif.' });

    // Member check
    const existingSect = await getPlayerSect(player.guildId, player.discordId);
    if (existingSect) {
      return res.status(400).json({ message: 'Anda sudah menjadi anggota sekte.' });
    }

    // Realm check
    const realmIdx = getRealmIndex(player.systemCultivation.realm);
    if (realmIdx < sect.entranceTest.minRealmIndex) {
      return res.status(400).json({ message: `Realm Anda belum mencapai syarat minimal ujian (Index: ${sect.entranceTest.minRealmIndex}).` });
    }

    // Traveling check
    const Travel = require('../../models/Travel');
    const activeTravel = await Travel.findOne({ discordId: player.discordId, status: 'traveling' });
    if (activeTravel) {
      return res.status(400).json({ message: 'Anda sedang dalam perjalanan dan tidak bisa memulai ujian.' });
    }

    // Location check
    const loc = await Location.findOne({
      guildId: player.guildId,
      regionSlug: player.currentLocation.regionSlug,
      settlementName: player.currentLocation.settlementName,
      buildingName: player.currentLocation.buildingName
    });

    if (!loc || !['sect_hall', 'dojo'].includes(loc.buildingType) || !loc.linkedSectId || loc.linkedSectId.toString() !== sect._id.toString()) {
      return res.status(400).json({ message: 'Anda harus berada di Aula Sekte atau Dojo yang terafiliasi dengan sekte ini untuk memulai ujian.' });
    }

    // Active trial check
    if (player.sectExamState && player.sectExamState.activeType) {
      return res.status(400).json({ message: 'Anda sedang memiliki ujian aktif di sekte lain atau sekte ini. Selesaikan atau batalkan terlebih dahulu.' });
    }

    // Cooldown check
    if (player.sectExamState && player.sectExamState.lastAttempts) {
      const attempt = player.sectExamState.lastAttempts.find(a => a.sectId && a.sectId.toString() === sect._id.toString());
      if (attempt) {
        const cdMs = (sect.entranceTest.cooldownHours || 24) * 60 * 60 * 1000;
        if (Date.now() - attempt.at.getTime() < cdMs) {
          return res.status(400).json({ message: 'Anda masih dalam masa cooldown ujian sekte ini.' });
        }
      }
    }

    // 2. Cek Biaya Pendaftaran / Tiket Ujian Masuk
    const REGISTRATION_FEE_SILVER = 150;
    const Item = require('../../models/Item');
    const ticketItem = await Item.findOne({ name: { $in: ['Plakat Ujian Sekte', 'Surat Rekomendasi Tetua'] } });
    let usedTicket = false;

    if (ticketItem && Array.isArray(player.inventory)) {
      const invTicket = player.inventory.find(i => i.itemId && i.itemId.toString() === ticketItem._id.toString() && (i.quantity || 1) > 0);
      if (invTicket) {
        invTicket.quantity -= 1;
        if (invTicket.quantity <= 0) {
          player.inventory = player.inventory.filter(i => i._id.toString() !== invTicket._id.toString());
        }
        usedTicket = true;
      }
    }

    if (!usedTicket) {
      const playerSilver = player.currencies?.silver || 0;
      if (playerSilver < REGISTRATION_FEE_SILVER) {
        return res.status(400).json({
          message: `Biaya pendaftaran ujian sekte adalah ${REGISTRATION_FEE_SILVER} Perak atau memiliki 'Plakat Ujian Sekte'. Koin perakmu: ${playerSilver}.`
        });
      }
      player.currencies.silver -= REGISTRATION_FEE_SILVER;
    }

    const exam = sect.entranceTest;

    if (exam.type === 'combat') {
      // TAHAP 1 & 2: Validasi Jasmani & Sirkulasi Qi
      const stage1_physique = (player.bodyTemperingLevel || 0) >= 0; // Kuda-kuda terpenuhi
      const stage2_qi = realmIdx >= (exam.minRealmIndex || 0);

      if (!stage1_physique || !stage2_qi) {
        return res.status(400).json({ message: 'Fondasi jasmani atau kemurnian Qi Anda belum memenuhi standar minimal ujian.' });
      }

      // TAHAP 3: Duel Turnamen Melawan Calon Murid Penantang / Penguji
      await player.populate([{ path: 'laws' }, { path: 'manuals.manualId' }]);
      const playerStats = calculatePlayerStats(player, player.laws, player.manuals);

      // Stat penantang disesuaikan dengan ujian sekte
      const opponentStatBlock = {
        name: exam.guardianStatBlock?.name || 'Calon Murid Pendaftar Penantang',
        hp: exam.guardianStatBlock?.hp || 120,
        atk: exam.guardianStatBlock?.atk || 18,
        def: exam.guardianStatBlock?.def || 12,
        spd: exam.guardianStatBlock?.spd || 10
      };

      const combatResult = simulateExamCombat(playerStats, opponentStatBlock);

      if (!player.sectExamState) player.sectExamState = { lastAttempts: [] };
      const attempts = player.sectExamState.lastAttempts.filter(a => a.sectId && a.sectId.toString() !== sect._id.toString());
      attempts.push({ sectId: sect._id, at: new Date(), result: combatResult.won ? 'success' : 'fail' });
      player.sectExamState.lastAttempts = attempts;

      if (combatResult.won) {
        if (!sect.memberIds.includes(player.discordId)) {
          sect.memberIds.push(player.discordId);
        }
        player.sect = sect.name;
        player.sectRole = 'outer_disciple'; // Resmi diangkat sebagai Murid Luar

        await sect.save();
        await player.save();
        await AdminLog.create({
            guildId: player.guildId,
            adminId: player.discordId,
            action: 'SECT_EXAM_COMBAT_SUCCESS',
            details: `Lulus 3 babak seleksi dan resmi bergabung ke ${sect.name} sebagai Murid Luar.`
        });

        return res.json({
          success: true,
          message: `Selamat! Kamu berhasil mengalahkan ${opponentStatBlock.name} dan resmi diterima sebagai Murid Luar ${sect.name}!`,
          stages: [
            { stage: 1, name: 'Uji Kuda-Kuda Jasmani', passed: true },
            { stage: 2, name: 'Uji Kemurnian Qi', passed: true },
            { stage: 3, name: 'Duel Arena Turnamen', passed: true }
          ],
          log: combatResult.log
        });
      } else {
        await player.save();
        await AdminLog.create({
            guildId: player.guildId,
            adminId: player.discordId,
            action: 'SECT_EXAM_COMBAT_FAIL',
            details: `Gagal dalam duel ujian masuk ${sect.name}.`
        });

        return res.json({
          success: false,
          message: `Kamu dikalahkan oleh ${opponentStatBlock.name}. Berlatihlah lebih tekun sebelum mencoba kembali!`,
          stages: [
            { stage: 1, name: 'Uji Kuda-Kuda Jasmani', passed: true },
            { stage: 2, name: 'Uji Kemurnian Qi', passed: true },
            { stage: 3, name: 'Duel Arena Turnamen', passed: false }
          ],
          log: combatResult.log
        });
      }
    } else if (exam.type === 'trial_task') {
      if (!player.sectExamState) player.sectExamState = {};
      player.sectExamState.activeSectId = sect._id;
      player.sectExamState.activeType = 'trial_task';
      player.sectExamState.trialAssignedAt = new Date();
      player.sectExamState.trialDeadlineAt = new Date(Date.now() + ((exam.trialTask?.durationHours || 24) * 60 * 60 * 1000));
      await player.save();

      return res.json({
        success: true,
        message: 'Ujian dimulai. Harap selesaikan tugas sebelum batas waktu.',
        deadlineAt: player.sectExamState.trialDeadlineAt
      });
    } else {
      return res.status(400).json({ message: 'Tipe ujian sekte tidak dikenali.' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sect/exam/status
router.get('/exam/status', authenticateToken, async (req, res) => {
  try {
    const player = await Player.findOne({ discordId: req.user.userId, guildId: req.user.guildId });
    if(!player) return res.status(404).json({ message: 'Player tidak ditemukan.' });
    if (!player.sectExamState || !player.sectExamState.activeType) {
      return res.json({ active: false });
    }

    const sect = await Sect.findById(player.sectExamState.activeSectId);
    if (!sect) return res.json({ active: false }); // Should not happen, but safe fallback

    res.json({
      active: true,
      sectName: sect.name,
      sectId: sect._id,
      type: player.sectExamState.activeType,
      deadlineAt: player.sectExamState.trialDeadlineAt,
      objective: sect.entranceTest.trialTask.objectiveType
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sect/exam/complete
router.post('/exam/complete', authenticateToken, async (req, res) => {
  try {
    const player = await Player.findOne({ discordId: req.user.userId, guildId: req.user.guildId });
    if (!player) return res.status(404).json({ message: 'Player tidak ditemukan.' });
    if (!player.sectExamState || !player.sectExamState.activeType) {
      return res.status(400).json({ message: 'Tidak ada ujian aktif yang bisa diselesaikan.' });
    }

    const sect = await Sect.findById(player.sectExamState.activeSectId);
    if (!sect) return res.status(404).json({ message: 'Sekte tidak ditemukan.' });

    const exam = sect.entranceTest;
    const now = new Date();

    if (exam.trialTask.objectiveType === 'wait_time') {
      if (now < player.sectExamState.trialDeadlineAt) {
        return res.status(400).json({ message: 'Waktu ujian belum selesai, harap tunggu.' });
      }

      // Success
      sect.memberIds.push(player.discordId);
      player.sect = sect.name;

      // Clear state and log success
      player.sectExamState.activeSectId = null;
      player.sectExamState.activeType = null;
      const attempts = player.sectExamState.lastAttempts.filter(a => a.sectId && a.sectId.toString() !== sect._id.toString());
      attempts.push({ sectId: sect._id, at: new Date(), result: 'success' });
      player.sectExamState.lastAttempts = attempts;

      await sect.save();
      await player.save();
      await AdminLog.create({
            guildId: player.guildId,
            adminId: player.discordId,
            action: 'SECT_EXAM_TRIAL_SUCCESS',
            details: `Lulus ujian trial dan bergabung ke ${sect.name}.`
      });

      return res.json({ success: true, message: 'Anda telah menyelesaikan tugas dan bergabung dengan sekte!' });

    } else {
      return res.status(400).json({ message: 'Tipe tugas tidak didukung saat ini.' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
