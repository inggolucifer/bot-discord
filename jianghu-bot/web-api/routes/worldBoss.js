/**
 * WORLD BOSS API ROUTES
 * 
 * - GET  /api/world-boss/status      → Darah global 400M, fase aktif, status bos
 * - POST /api/world-boss/attack      → Serangan berkala (-10 Stamina), catat damage
 * - GET  /api/world-boss/leaderboard → Top 10 damage kontributor server
 */

const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const { authenticateToken } = require('../middlewares/auth');
const CustomError = require('../utils/CustomError');

// In-Memory Global State untuk Sesi World Boss Sabtu (Persisted in Server Runtime)
let globalWorldBossState = {
  bossId: 'boss_flame_kirin',
  bossName: 'Raja Qilin Api Purba (Ancient Flame Kirin)',
  maxHp: 400000000,
  currentHp: 284500000,
  phase: 2,
  leaderboard: [
    { rank: 1, name: 'Pendekar Pedang Li', sect: 'Kunlun', damage: 4820000 },
    { rank: 2, name: 'Raja Iblis Nether', sect: 'Yin Ghost', damage: 3450000 },
    { rank: 3, name: 'Murid Master Gu', sect: 'Poison Valley', damage: 2110000 }
  ]
};

async function resolvePlayer(req) {
  const userId = req.user.userId;
  const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
  const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
  const player = await Player.findOne({ discordId: userId, guildId });
  if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
  return player;
}

// GET /api/world-boss/status
router.get('/status', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: globalWorldBossState
  });
});

// POST /api/world-boss/attack
router.post('/attack', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);

    const staminaCost = 10;
    if ((player.currentStamina || 100) < staminaCost) {
      return res.status(400).json({ error: 'Stamina tidak mencukupi (Butuh 10 Stamina).' });
    }

    player.currentStamina = Math.max(0, (player.currentStamina || 100) - staminaCost);

    // Hitung damage berbasis ATK player
    const { getComputedStats } = require('../../utils/statCalculator');
    const computed = getComputedStats(player);
    const baseDmg = (computed.atk || 20) * 150;
    const randomVariation = Math.floor(Math.random() * 25000) + 15000;
    const totalDmg = Math.max(50000, baseDmg + randomVariation);

    // Kurangi darah bos
    globalWorldBossState.currentHp = Math.max(0, globalWorldBossState.currentHp - totalDmg);

    // Update phase
    const hpRatio = globalWorldBossState.currentHp / globalWorldBossState.maxHp;
    if (hpRatio <= 0.25) globalWorldBossState.phase = 3;
    else if (hpRatio <= 0.60) globalWorldBossState.phase = 2;
    else globalWorldBossState.phase = 1;

    // Catat ke leaderboard
    const existing = globalWorldBossState.leaderboard.find(l => l.name === player.characterName);
    if (existing) {
      existing.damage += totalDmg;
    } else {
      globalWorldBossState.leaderboard.push({
        rank: globalWorldBossState.leaderboard.length + 1,
        name: player.characterName || 'Pendekar Fana',
        sect: player.sect || 'Pengelana Bebas',
        damage: totalDmg
      });
    }

    globalWorldBossState.leaderboard.sort((a, b) => b.damage - a.damage);
    globalWorldBossState.leaderboard.forEach((item, idx) => { item.rank = idx + 1; });

    player.markModified('currentStamina');
    await player.save();

    res.json({
      success: true,
      message: `⚔️ Berhasil melancarkan hantaman ke Bos Dunia sebesar ${totalDmg.toLocaleString()} Damage!`,
      data: {
        damageDealt: totalDmg,
        bossCurrentHp: globalWorldBossState.currentHp,
        bossPhase: globalWorldBossState.phase,
        remainingStamina: player.currentStamina
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[WORLD-BOSS] Error during attack:', error);
    res.status(500).json({ error: 'Gagal menyerang Bos Dunia.' });
  }
});

// GET /api/world-boss/leaderboard
router.get('/leaderboard', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: {
      leaderboard: globalWorldBossState.leaderboard.slice(0, 10)
    }
  });
});

module.exports = router;
