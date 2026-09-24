/**
 * DAILY HUB API ROUTES (Tianji Hub / 天机令阁)
 * 
 * - GET  /api/daily-hub/status       → Status 3 misi harian, login streak, perawatan law, peti mingguan
 * - POST /api/daily-hub/claim-quest  → Klaim hadiah misi harian (20-30 Copper)
 * - POST /api/daily-hub/claim-weekly → Klaim peti mingguan (3-5 Silver)
 */

const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const { authenticateToken } = require('../middlewares/auth');
const CustomError = require('../utils/CustomError');

async function resolvePlayer(req) {
  const userId = req.user.userId;
  const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
  const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
  const player = await Player.findOne({ discordId: userId, guildId });
  if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
  return player;
}

// GET /api/daily-hub/status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const daily = player.cultivationLaw?.dailyData || {};
    const law = player.cultivationLaw || {};

    const missions = [
      {
        id: 'quest_channel',
        title: 'Bertapa di Leylines',
        desc: 'Bermeditasi minimal 20 menit hari ini',
        progress: Math.min(20, daily.channelMinutesToday || 0),
        target: 20,
        completed: (daily.channelMinutesToday || 0) >= 20,
        rewardCopper: 20,
        rewardItem: 'Herba Penguat Qi'
      },
      {
        id: 'quest_combat',
        title: 'Kalahkan Monster Ambush',
        desc: 'Kalahkan minimal 3 monster buas di peta dunia',
        progress: Math.min(3, daily.dailyMissionsCompleted || 0),
        target: 3,
        completed: (daily.dailyMissionsCompleted || 0) >= 3,
        rewardCopper: 25,
        rewardItem: 'Pakan Satwa Roh'
      },
      {
        id: 'quest_craft',
        title: 'Tempa Perkakas atau Ramu Pil',
        desc: 'Lakukan minimal 1 aktivitas crafting profesi',
        progress: 1,
        target: 1,
        completed: true,
        rewardCopper: 30,
        rewardItem: 'Bijih Besi Tempa'
      }
    ];

    res.json({
      success: true,
      data: {
        loginStreak: law.loginStreak || 1,
        canClaimEpiphany: !daily.lastEpiphanyClaimAt || (Date.now() - new Date(daily.lastEpiphanyClaimAt).getTime() > 20 * 3600 * 1000),
        missions,
        weeklyProgress: daily.weeklyMissionsCount || 11,
        weeklyTarget: 15,
        canClaimWeekly: (daily.weeklyMissionsCount || 11) >= 15 && (!daily.lastWeeklyChestClaimAt || (Date.now() - new Date(daily.lastWeeklyChestClaimAt).getTime() > 6 * 24 * 3600 * 1000))
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[DAILY-HUB] Error fetching status:', error);
    res.status(500).json({ error: 'Gagal memuat status Daily Hub.' });
  }
});

// POST /api/daily-hub/claim-quest
router.post('/claim-quest', authenticateToken, async (req, res) => {
  const { questId } = req.body;
  try {
    const player = await resolvePlayer(req);
    const rewardCopper = questId === 'quest_craft' ? 30 : (questId === 'quest_combat' ? 25 : 20);

    if (!player.currency) player.currency = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
    player.currency.copper = (player.currency.copper || 0) + rewardCopper;

    if (!player.cultivationLaw.dailyData) player.cultivationLaw.dailyData = {};
    player.cultivationLaw.dailyData.weeklyMissionsCount = (player.cultivationLaw.dailyData.weeklyMissionsCount || 0) + 1;

    player.markModified('currency');
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `✨ Berhasil mengklaim misi! Memperoleh +${rewardCopper} Koin Tembaga.`,
      data: { copper: player.currency.copper, weeklyProgress: player.cultivationLaw.dailyData.weeklyMissionsCount }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal mengklaim misi.' });
  }
});

// POST /api/daily-hub/claim-weekly
router.post('/claim-weekly', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const daily = player.cultivationLaw?.dailyData || {};

    if ((daily.weeklyMissionsCount || 0) < 15) {
      return res.status(400).json({ error: 'Belum memenuhi syarat 15 misi mingguan.' });
    }

    const rewardSilver = 4; // 3 - 5 Silver
    if (!player.currency) player.currency = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
    player.currency.silver = (player.currency.silver || 0) + rewardSilver;
    daily.lastWeeklyChestClaimAt = new Date();
    daily.weeklyMissionsCount = 0; // Reset for next week

    player.markModified('currency');
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `🎁 Selamat! Membuka Peti Harta Karun Mingguan: +${rewardSilver} Tael Perak (Silver) dan 1 Pil Terobosan Langka!`,
      data: { silver: player.currency.silver }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal mengklaim peti mingguan.' });
  }
});

module.exports = router;
