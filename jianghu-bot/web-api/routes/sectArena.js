/**
 * SECT ARENA API ROUTES
 * 
 * - GET  /api/sect-arena/tournament → Status bracket turnamen 32-besar
 * - POST /api/sect-arena/spar       → Sparring bebas tanpa kematian, dapat poin jasa sekte
 * - POST /api/sect-arena/register   → Pendaftaran turnamen divisi ranah
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

// GET /api/sect-arena/tournament
router.get('/tournament', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: {
      currentRound: 'Babak 8 Besar',
      upcomingMatch: {
        opponentName: 'Pendekar Pedang Li',
        opponentSect: 'Sekte Huashan',
        scheduledTime: '16:30 Server Time'
      },
      stats: {
        wins: 24,
        losses: 3,
        winRate: 88,
        sectMeritTokens: 850,
        rankTitle: 'Murid Utama'
      }
    }
  });
});

// POST /api/sect-arena/spar
router.post('/spar', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    // Sparring aman tanpa kehilangan HP permanen atau sanksi luka batin 4 jam
    const tokenReward = 50;
    if (!player.reputation) player.reputation = 0;
    player.reputation += 15;

    player.markModified('reputation');
    await player.save();

    res.json({
      success: true,
      message: `⚔️ Sparring persahabatan sukses! Anda menaklukkan sparring partner (+${tokenReward} Token Jasa Sekte, +15 Reputasi). Tanpa luka dalam!`,
      data: { reputation: player.reputation }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal melakukan sparring.' });
  }
});

// POST /api/sect-arena/register
router.post('/register', authenticateToken, async (req, res) => {
  const { division } = req.body;
  res.json({
    success: true,
    message: `🥋 Berhasil mendaftar Turnamen Gelanggang Sekte untuk Divisi: ${division || 'Mortal'}!`
  });
});

module.exports = router;
