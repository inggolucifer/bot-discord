/**
 * SECT ARENA API ROUTES
 * 
 * Server-Authoritative Mongoose Persistence (Player.sectArena):
 * - GET  /api/sect-arena/tournament → Status statistik, division leaderboard, match history
 * - POST /api/sect-arena/spar       → Sparring aman tanpa kematian (-5 Stamina, +Token Jasa Sekte, Rating)
 * - POST /api/sect-arena/register   → Pendaftaran turnamen divisi ranah
 */

const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const { authenticateToken } = require('../middlewares/auth');
const CustomError = require('../utils/CustomError');
const { getComputedStats } = require('../../utils/statCalculator');

async function resolvePlayer(req) {
  const userId = req.user.userId;
  const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
  const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
  const player = await Player.findOne({ discordId: userId, guildId });
  if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
  return player;
}

function ensureSectArenaInitialized(player) {
  if (!player.sectArena) {
    player.sectArena = {
      division: 'Mortal',
      rating: 1000,
      meritTokens: 0,
      wins: 0,
      losses: 0,
      matchHistory: []
    };
  }
  if (!Array.isArray(player.sectArena.matchHistory)) {
    player.sectArena.matchHistory = [];
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /api/sect-arena/tournament
// ═══════════════════════════════════════════════════════════════
router.get('/tournament', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    ensureSectArenaInitialized(player);

    const arena = player.sectArena;
    const division = arena.division || 'Mortal';
    const totalMatches = (arena.wins || 0) + (arena.losses || 0);
    const winRate = totalMatches > 0 ? Math.round(((arena.wins || 0) / totalMatches) * 100) : 0;

    // Fetch top 10 competitors in this division
    const topCompetitors = await Player.find({ 'sectArena.division': division })
      .select('name characterName sect sectArena systemCultivation')
      .sort({ 'sectArena.rating': -1 })
      .limit(10)
      .lean();

    const leaderboard = topCompetitors.map((c, idx) => ({
      rank: idx + 1,
      name: c.name || c.characterName || 'Pendekar Sekte',
      sect: c.sect || 'Pengelana Bebas',
      rating: c.sectArena?.rating || 1000,
      wins: c.sectArena?.wins || 0
    }));

    res.json({
      success: true,
      data: {
        division,
        currentRound: 'Gelanggang Terbuka Sparring',
        stats: {
          rating: arena.rating || 1000,
          wins: arena.wins || 0,
          losses: arena.losses || 0,
          winRate,
          sectMeritTokens: arena.meritTokens || 0,
          rankTitle: (arena.rating || 1000) >= 1400 ? 'Pendekar Legendaris' : (arena.rating >= 1200 ? 'Murid Elit Sekte' : 'Murid Biasa')
        },
        leaderboard,
        matchHistory: (arena.matchHistory || []).slice(0, 8)
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[SECT-ARENA] Error fetching status:', error);
    res.status(500).json({ error: 'Gagal memuat data gelanggang sekte.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/sect-arena/spar
// ═══════════════════════════════════════════════════════════════
router.post('/spar', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    ensureSectArenaInitialized(player);

    const staminaCost = 5;
    if ((player.currentStamina || 100) < staminaCost) {
      return res.status(400).json({ error: 'Stamina tidak mencukupi (Butuh 5 Stamina untuk bertarung di gelanggang).' });
    }

    player.currentStamina = Math.max(0, (player.currentStamina || 100) - staminaCost);

    const division = player.sectArena.division || 'Mortal';
    const OPPONENTS = {
      Mortal: [
        { name: 'Murid Pedang Huashan', sect: 'Huashan', hp: 180, atk: 24, def: 10 },
        { name: 'Pendekar Tongkat Shaolin', sect: 'Shaolin', hp: 220, atk: 20, def: 15 },
        { name: 'Pesilat Tinju Wudang', sect: 'Wudang', hp: 200, atk: 25, def: 12 }
      ],
      QiRefining: [
        { name: 'Murid Sejati Pedang Es', sect: 'Kunlun', hp: 550, atk: 60, def: 30 },
        { name: 'Ahli Jarum Racun', sect: 'Tangmen', hp: 480, atk: 70, def: 25 },
        { name: 'Biksu Emei', sect: 'Emei', hp: 600, atk: 55, def: 38 }
      ],
      Foundation: [
        { name: 'Tetua Pendekar Giok', sect: 'Wudang', hp: 1500, atk: 140, def: 85 },
        { name: 'Pendekar Golok Neraka', sect: 'Demonic Hall', hp: 1400, atk: 165, def: 70 }
      ]
    };

    const oppPool = OPPONENTS[division] || OPPONENTS.Mortal;
    const opp = oppPool[Math.floor(Math.random() * oppPool.length)];

    // Kalkulasi pertempuran deterministik
    const computed = getComputedStats(player);
    const playerCombatPower = ((computed.atk || 25) * 2.5) + ((computed.def || 10) * 2.0) + ((player.currentHp || 100) * 0.4);
    const oppCombatPower = (opp.atk * 2.5) + (opp.def * 2.0) + (opp.hp * 0.4);

    const randomFactor = (Math.random() * 0.3) + 0.85;
    const isWin = (playerCombatPower * randomFactor) >= oppCombatPower;

    let ratingChange = 0;
    let meritEarned = 0;
    let outcome = 'loss';

    if (isWin) {
      outcome = 'win';
      ratingChange = 15;
      meritEarned = 30;
      player.sectArena.wins = (player.sectArena.wins || 0) + 1;
      player.sectArena.rating = (player.sectArena.rating || 1000) + ratingChange;
    } else {
      outcome = 'loss';
      ratingChange = -5;
      meritEarned = 8; // Hadiah hiburan
      player.sectArena.losses = (player.sectArena.losses || 0) + 1;
      player.sectArena.rating = Math.max(800, (player.sectArena.rating || 1000) + ratingChange);
    }

    player.sectArena.meritTokens = (player.sectArena.meritTokens || 0) + meritEarned;

    player.sectArena.matchHistory.unshift({
      opponentName: opp.name,
      opponentRealm: division,
      outcome,
      ratingChange,
      meritEarned,
      timestamp: new Date()
    });

    if (player.sectArena.matchHistory.length > 10) {
      player.sectArena.matchHistory = player.sectArena.matchHistory.slice(0, 10);
    }

    player.markModified('currentStamina');
    player.markModified('sectArena');
    await player.save();

    const resultMessage = isWin
      ? `⚔️ Kemenangan Gemilang! Kamu menaklukkan ${opp.name} (+${ratingChange} Rating, +${meritEarned} Token Jasa Sekte). Pertarungan sparring aman tanpa cedera dantian!`
      : `🛡️ Pertarungan Sengit! Kamu diimbangi oleh ${opp.name} (${ratingChange} Rating, +${meritEarned} Token Hiburan).`;

    res.json({
      success: true,
      message: resultMessage,
      data: {
        outcome,
        opponentName: opp.name,
        ratingChange,
        meritEarned,
        newRating: player.sectArena.rating,
        totalMeritTokens: player.sectArena.meritTokens,
        remainingStamina: player.currentStamina
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[SECT-ARENA] Error during spar:', error);
    res.status(500).json({ error: 'Gagal melakukan sparring gelanggang.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/sect-arena/register
// ═══════════════════════════════════════════════════════════════
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    ensureSectArenaInitialized(player);

    const { division = 'Mortal' } = req.body;
    player.sectArena.division = division;

    player.markModified('sectArena');
    await player.save();

    res.json({
      success: true,
      message: `🥋 Berhasil mendaftar ke Gelanggang Turnamen Sekte Divisi: ${division}!`,
      data: { division }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal mendaftar turnamen.' });
  }
});

module.exports = router;
