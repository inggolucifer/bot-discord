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
    const player = await Player.findOne({ discordId: req.user.discordId, guildId: req.user.guildId });

    // Check cooldown
    let isOnCooldown = false;
    let cooldownRemaining = 0;
    if (player.sectExamState && player.sectExamState.lastAttempts) {
      const attempt = player.sectExamState.lastAttempts.find(a => a.sectId.toString() === sect._id.toString());
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

    const player = await Player.findOne({ discordId: req.user.discordId, guildId: req.user.guildId });

    // 1. Validations
    if (player.status !== 'active') return res.status(400).json({ message: 'Status pemain tidak aktif.' });

    // Member check
    const currentSectRole = await sect.getRoleOf(req.user.discordId);
    if (currentSectRole) {
      return res.status(400).json({ message: 'Anda sudah menjadi anggota sekte ini.' });
    }

    // Realm check
    const realmIdx = getRealmIndex(player.systemCultivation.realm);
    if (realmIdx < sect.entranceTest.minRealmIndex) {
      return res.status(400).json({ message: `Realm Anda belum mencapai syarat minimal ujian (Index: ${sect.entranceTest.minRealmIndex}).` });
    }

    // Traveling check
    if (player.currentLocation.isTraveling) {
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
      const attempt = player.sectExamState.lastAttempts.find(a => a.sectId.toString() === sect._id.toString());
      if (attempt) {
        const cdMs = (sect.entranceTest.cooldownHours || 24) * 60 * 60 * 1000;
        if (Date.now() - attempt.at.getTime() < cdMs) {
          return res.status(400).json({ message: 'Anda masih dalam masa cooldown ujian sekte ini.' });
        }
      }
    }

    const exam = sect.entranceTest;

    if (exam.type === 'combat') {
      // Resolve combat
      await player.populate([{ path: 'laws' }, { path: 'manuals.manualId' }]);
      const playerStats = calculatePlayerStats(player, player.laws, player.manuals);
      const combatResult = simulateExamCombat(playerStats, exam.guardianStatBlock);

      if (!player.sectExamState) player.sectExamState = { lastAttempts: [] };
      const attempts = player.sectExamState.lastAttempts.filter(a => a.sectId.toString() !== sect._id.toString());
      attempts.push({ sectId: sect._id, at: new Date(), result: combatResult.won ? 'success' : 'fail' });
      player.sectExamState.lastAttempts = attempts;

      if (combatResult.won) {
        sect.memberIds.push(player.discordId);
        player.sect = sect.name;
        await sect.save();
        await player.save();
        await AdminLog.create({
            guildId: player.guildId,
            adminId: player.discordId,
            action: 'SECT_EXAM_COMBAT_SUCCESS',
            details: `Lulus ujian combat dan bergabung ke ${sect.name}.`
        });
        return res.json({ success: true, message: 'Anda lulus ujian!', log: combatResult.log });
      } else {
        await player.save();
        await AdminLog.create({
            guildId: player.guildId,
            adminId: player.discordId,
            action: 'SECT_EXAM_COMBAT_FAIL',
            details: `Gagal ujian combat ke ${sect.name}.`
        });
        return res.json({ success: false, message: 'Anda gagal dalam ujian combat.', log: combatResult.log });
      }

    } else if (exam.type === 'trial_task') {
      // Assign trial
      if (!player.sectExamState) player.sectExamState = {};
      player.sectExamState.activeSectId = sect._id;
      player.sectExamState.activeType = 'trial_task';
      player.sectExamState.trialAssignedAt = new Date();
      player.sectExamState.trialDeadlineAt = new Date(Date.now() + (exam.trialTask.durationHours * 60 * 60 * 1000));
      await player.save();

      return res.json({
        success: true,
        message: 'Ujian dimulai. Harap selesaikan tugas sebelum batas waktu.',
        deadlineAt: player.sectExamState.trialDeadlineAt
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sect/exam/status
router.get('/exam/status', authenticateToken, async (req, res) => {
  try {
    const player = await Player.findOne({ discordId: req.user.discordId, guildId: req.user.guildId });
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
    const player = await Player.findOne({ discordId: req.user.discordId, guildId: req.user.guildId });
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
      const attempts = player.sectExamState.lastAttempts.filter(a => a.sectId.toString() !== sect._id.toString());
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
