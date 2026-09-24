/**
 * DAILY HUB API ROUTES (Tianji Hub / 天机令阁)
 * 
 * Server-Authoritative Endpoints:
 * - GET  /api/daily-hub/status       → Status 3 misi harian, login streak, pencerahan, peti mingguan
 * - POST /api/daily-hub/claim-streak  → Klaim hadiah login harian (Day 1-6 Copper, Day 7 max 1 Silver)
 * - POST /api/daily-hub/claim-epiphany→ Klaim pencerahan harian (+30 Copper, +Qi/Vitality)
 * - POST /api/daily-hub/claim-quest   → Klaim hadiah misi harian (20-30 Copper, +1 Poin Mingguan)
 * - POST /api/daily-hub/maintain-law  → Rawat Law aktif (-10 Copper, +Qi/Mood)
 * - POST /api/daily-hub/claim-weekly  → Klaim peti mingguan (3 Silver + Pil Langka)
 */

const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Item = require('../../models/Item');
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

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayString() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

function getCurrentWeekString() {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum}`;
}

function ensureDailyHubInitialized(player) {
  const todayStr = getTodayString();
  if (!player.dailyHub) {
    player.dailyHub = {
      streakDays: 0,
      lastClaimDate: null,
      epiphanyClaimedDate: null,
      missions: {
        meditateMinutes: 0,
        meditateClaimed: false,
        combatDefeats: 0,
        combatClaimed: false,
        craftCount: 0,
        craftClaimed: false,
        missionsDate: todayStr
      },
      weeklyChestClaimedWeek: null,
      weeklyPoints: 0
    };
  }

  if (!player.dailyHub.missions) {
    player.dailyHub.missions = {
      meditateMinutes: 0,
      meditateClaimed: false,
      combatDefeats: 0,
      combatClaimed: false,
      craftCount: 0,
      craftClaimed: false,
      missionsDate: todayStr
    };
  }

  // Daily reset check
  if (player.dailyHub.missions.missionsDate !== todayStr) {
    const channelMin = player.cultivationLaw?.dailyData?.channelMinutesToday || 0;
    player.dailyHub.missions = {
      meditateMinutes: channelMin,
      meditateClaimed: false,
      combatDefeats: 0,
      combatClaimed: false,
      craftCount: 0,
      craftClaimed: false,
      missionsDate: todayStr
    };
  } else {
    // Sinkronkan channelMinutesToday terkini ke meditateMinutes
    const channelMin = player.cultivationLaw?.dailyData?.channelMinutesToday || 0;
    if (channelMin > (player.dailyHub.missions.meditateMinutes || 0)) {
      player.dailyHub.missions.meditateMinutes = channelMin;
    }
  }

  if (!player.currency) {
    player.currency = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /api/daily-hub/status
// ═══════════════════════════════════════════════════════════════
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    ensureDailyHubInitialized(player);

    const todayStr = getTodayString();
    const weekStr = getCurrentWeekString();
    const hub = player.dailyHub;
    const missionsState = hub.missions;

    const streakDays = hub.streakDays || 0;
    const canClaimStreak = hub.lastClaimDate !== todayStr;
    const canClaimEpiphany = hub.epiphanyClaimedDate !== todayStr;

    const missions = [
      {
        id: 'quest_channel',
        title: 'Bertapa di Leylines',
        desc: 'Bermeditasi minimal 20 menit hari ini',
        progress: Math.min(20, missionsState.meditateMinutes || 0),
        target: 20,
        completed: (missionsState.meditateMinutes || 0) >= 20,
        claimed: !!missionsState.meditateClaimed,
        rewardCopper: 20,
        rewardItem: 'Herba Penguat Qi'
      },
      {
        id: 'quest_combat',
        title: 'Kalahkan Monster Ambush',
        desc: 'Kalahkan minimal 3 monster buas di peta dunia',
        progress: Math.min(3, missionsState.combatDefeats || 0),
        target: 3,
        completed: (missionsState.combatDefeats || 0) >= 3,
        claimed: !!missionsState.combatClaimed,
        rewardCopper: 25,
        rewardItem: 'Pakan Satwa Roh'
      },
      {
        id: 'quest_craft',
        title: 'Tempa Perkakas atau Ramu Pil',
        desc: 'Lakukan minimal 1 aktivitas crafting profesi',
        progress: Math.min(1, missionsState.craftCount || 0),
        target: 1,
        completed: (missionsState.craftCount || 0) >= 1,
        claimed: !!missionsState.craftClaimed,
        rewardCopper: 30,
        rewardItem: 'Bijih Besi Tempa'
      }
    ];

    const weeklyProgress = hub.weeklyPoints || 0;
    const weeklyTarget = 15;
    const canClaimWeekly = weeklyProgress >= weeklyTarget && hub.weeklyChestClaimedWeek !== weekStr;

    await player.save();

    res.json({
      success: true,
      data: {
        loginStreak: streakDays,
        canClaimStreak,
        lastStreakClaimDate: hub.lastClaimDate,
        canClaimEpiphany,
        missions,
        weeklyProgress,
        weeklyTarget,
        canClaimWeekly,
        weeklyChestClaimed: hub.weeklyChestClaimedWeek === weekStr
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[DAILY-HUB] Error fetching status:', error);
    res.status(500).json({ error: 'Gagal memuat status Daily Hub.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/daily-hub/claim-streak
// ═══════════════════════════════════════════════════════════════
router.post('/claim-streak', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    ensureDailyHubInitialized(player);

    const todayStr = getTodayString();
    const yesterdayStr = getYesterdayString();

    if (player.dailyHub.lastClaimDate === todayStr) {
      return res.status(400).json({ error: 'Hadiah login streak hari ini sudah kamu klaim.' });
    }

    let nextStreak = 1;
    if (player.dailyHub.lastClaimDate === yesterdayStr) {
      nextStreak = ((player.dailyHub.streakDays || 0) % 7) + 1;
    } else {
      nextStreak = 1;
    }

    player.dailyHub.streakDays = nextStreak;
    player.dailyHub.lastClaimDate = todayStr;

    let message = '';
    if (nextStreak === 7) {
      // Puncak Hari ke-7: Max 1 Silver
      player.currency.silver = (player.currency.silver || 0) + 1;
      message = `🔥 Puncak Login Streak Hari ke-7! Memperoleh +1 Tael Perak (Silver)!`;
    } else {
      // Hari 1-6: 20-80 Copper
      const rewardCopper = 15 + (nextStreak * 12);
      player.currency.copper = (player.currency.copper || 0) + rewardCopper;
      message = `🔥 Login Streak Hari ke-${nextStreak}! Memperoleh +${rewardCopper} Koin Tembaga.`;
    }

    player.markModified('dailyHub');
    player.markModified('currency');
    await player.save();

    res.json({
      success: true,
      message,
      data: {
        loginStreak: nextStreak,
        currency: player.currency
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal mengklaim login streak.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/daily-hub/claim-epiphany
// ═══════════════════════════════════════════════════════════════
router.post('/claim-epiphany', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    ensureDailyHubInitialized(player);

    const todayStr = getTodayString();
    if (player.dailyHub.epiphanyClaimedDate === todayStr) {
      return res.status(400).json({ error: 'Pencerahan harian sudah diklaim hari ini.' });
    }

    player.dailyHub.epiphanyClaimedDate = todayStr;

    // +30 Copper
    player.currency.copper = (player.currency.copper || 0) + 30;

    let qiMsg = '';
    if (player.cultivationLaw?.activeLawType) {
      player.cultivationLaw.qi = Math.min(
        player.cultivationLaw.maxQi || 9999,
        (player.cultivationLaw.qi || 0) + 120
      );
      if (player.cultivationLaw.dailyData) {
        player.cultivationLaw.dailyData.lastEpiphanyClaimAt = new Date();
      }
      player.markModified('cultivationLaw');
      qiMsg = ' dan +120 Qi Semesta';
    }

    player.markModified('dailyHub');
    player.markModified('currency');
    await player.save();

    res.json({
      success: true,
      message: `✨ Pencerahan Harian berhasil diserap! Memperoleh +30 Koin Tembaga${qiMsg}.`,
      data: { currency: player.currency }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal mengklaim pencerahan harian.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/daily-hub/claim-quest
// ═══════════════════════════════════════════════════════════════
router.post('/claim-quest', authenticateToken, async (req, res) => {
  const { questId } = req.body;
  try {
    const player = await resolvePlayer(req);
    ensureDailyHubInitialized(player);

    const missionsState = player.dailyHub.missions;
    let rewardCopper = 0;

    if (questId === 'quest_channel') {
      if ((missionsState.meditateMinutes || 0) < 20) {
        return res.status(400).json({ error: 'Misi bertapa belum selesai (Butuh minimal 20 menit meditasi).' });
      }
      if (missionsState.meditateClaimed) {
        return res.status(400).json({ error: 'Hadiah misi bertapa sudah kamu klaim hari ini.' });
      }
      missionsState.meditateClaimed = true;
      rewardCopper = 20;
    } else if (questId === 'quest_combat') {
      if ((missionsState.combatDefeats || 0) < 3) {
        return res.status(400).json({ error: 'Misi pertempuran belum selesai (Kalahkan minimal 3 monster).' });
      }
      if (missionsState.combatClaimed) {
        return res.status(400).json({ error: 'Hadiah misi pertempuran sudah kamu klaim hari ini.' });
      }
      missionsState.combatClaimed = true;
      rewardCopper = 25;
    } else if (questId === 'quest_craft') {
      if ((missionsState.craftCount || 0) < 1) {
        return res.status(400).json({ error: 'Misi kerajinan belum selesai (Lakukan minimal 1 crafting/minigame).' });
      }
      if (missionsState.craftClaimed) {
        return res.status(400).json({ error: 'Hadiah misi kerajinan sudah kamu klaim hari ini.' });
      }
      missionsState.craftClaimed = true;
      rewardCopper = 30;
    } else {
      return res.status(400).json({ error: 'ID Misi tidak valid.' });
    }

    player.currency.copper = (player.currency.copper || 0) + rewardCopper;
    player.dailyHub.weeklyPoints = (player.dailyHub.weeklyPoints || 0) + 1;

    player.markModified('dailyHub');
    player.markModified('currency');
    await player.save();

    res.json({
      success: true,
      message: `✨ Berhasil menyelesaikan misi! Memperoleh +${rewardCopper} Koin Tembaga dan +1 Poin Mingguan.`,
      data: {
        copper: player.currency.copper,
        weeklyProgress: player.dailyHub.weeklyPoints
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal mengklaim misi.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/daily-hub/maintain-law
// ═══════════════════════════════════════════════════════════════
router.post('/maintain-law', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    ensureDailyHubInitialized(player);

    const cost = 10;
    if ((player.currency?.copper || 0) < cost) {
      return res.status(400).json({ error: 'Koin Tembaga tidak cukup (Butuh 10 Copper untuk perawatan).' });
    }

    player.currency.copper -= cost;

    if (player.cultivationLaw?.activeLawType) {
      player.cultivationLaw.qi = Math.min(
        player.cultivationLaw.maxQi || 9999,
        (player.cultivationLaw.qi || 0) + 40
      );
      player.markModified('cultivationLaw');
    }

    player.mood = Math.min(100, (player.mood || 80) + 5);

    player.markModified('currency');
    await player.save();

    res.json({
      success: true,
      message: '✨ Perawatan fondasi berhasil! Raga dan pikiran terasa segar kembali (-10 Copper, +Mood, +Qi).',
      data: { currency: player.currency, mood: player.mood }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal melakukan perawatan.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/daily-hub/claim-weekly
// ═══════════════════════════════════════════════════════════════
router.post('/claim-weekly', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    ensureDailyHubInitialized(player);

    const weekStr = getCurrentWeekString();
    if (player.dailyHub.weeklyChestClaimedWeek === weekStr) {
      return res.status(400).json({ error: 'Peti harta karun minggu ini sudah diklaim.' });
    }

    if ((player.dailyHub.weeklyPoints || 0) < 15) {
      return res.status(400).json({ error: 'Belum memenuhi syarat 15 poin misi mingguan.' });
    }

    const rewardSilver = 3;
    player.currency.silver = (player.currency.silver || 0) + rewardSilver;
    player.dailyHub.weeklyChestClaimedWeek = weekStr;

    player.markModified('currency');
    player.markModified('dailyHub');
    await player.save();

    res.json({
      success: true,
      message: `🎁 Selamat! Membuka Peti Harta Karun Mingguan: +${rewardSilver} Tael Perak (Silver)!`,
      data: { silver: player.currency.silver }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal mengklaim peti mingguan.' });
  }
});

module.exports = router;
