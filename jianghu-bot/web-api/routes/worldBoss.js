/**
 * WORLD BOSS API ROUTES
 * 
 * Server-Authoritative Mongoose Persistence (WorldBossSeason):
 * - GET  /api/world-boss/status      → Status bos global (darah, fase, leaderboard)
 * - POST /api/world-boss/attack      → Serangan berkala (-10 Stamina), hitung ATK & catat damage
 * - GET  /api/world-boss/leaderboard → Top 10 kontributor damage server
 */

const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const WorldBossSeason = require('../../models/WorldBossSeason');
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

async function getOrCreateActiveSeason() {
  let season = await WorldBossSeason.findOne({ status: 'active' }).sort({ seasonNumber: -1 });
  if (!season) {
    const lastSeason = await WorldBossSeason.findOne().sort({ seasonNumber: -1 });
    const nextSeasonNum = (lastSeason?.seasonNumber || 0) + 1;
    season = new WorldBossSeason({
      seasonNumber: nextSeasonNum,
      bossId: 'boss_flame_kirin',
      bossName: 'Raja Qilin Api Purba (Ancient Flame Kirin / 远古炎麒麟)',
      maxHp: 400000000,
      currentHp: 400000000,
      phase: 1,
      status: 'active',
      windowStart: new Date(),
      windowEnd: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      contributions: []
    });
    await season.save();
  }
  return season;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/world-boss/status
// ═══════════════════════════════════════════════════════════════
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const season = await getOrCreateActiveSeason();

    const leaderboard = (season.contributions || [])
      .slice()
      .sort((a, b) => b.damage - a.damage)
      .slice(0, 10)
      .map((c, idx) => ({
        rank: idx + 1,
        name: c.characterName,
        sect: c.sect,
        damage: c.damage
      }));

    res.json({
      success: true,
      data: {
        seasonNumber: season.seasonNumber,
        bossId: season.bossId,
        bossName: season.bossName,
        maxHp: season.maxHp,
        currentHp: season.currentHp,
        phase: season.phase,
        status: season.status,
        leaderboard
      }
    });
  } catch (error) {
    console.error('[WORLD-BOSS] Error fetching status:', error);
    res.status(500).json({ error: 'Gagal memuat status Bos Dunia.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/world-boss/attack
// ═══════════════════════════════════════════════════════════════
router.post('/attack', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const season = await getOrCreateActiveSeason();

    if (season.status === 'defeated') {
      return res.status(400).json({ error: 'Bos Dunia minggu ini telah berhasil ditumbangkan!' });
    }

    const staminaCost = 10;
    if ((player.currentStamina || 100) < staminaCost) {
      return res.status(400).json({ error: 'Stamina tidak mencukupi (Butuh 10 Stamina).' });
    }

    player.currentStamina = Math.max(0, (player.currentStamina || 100) - staminaCost);

    // Hitung damage berbasis ATK authoritative
    const computed = getComputedStats(player);
    const baseDmg = (computed.atk || 25) * 160;
    const randomVariation = Math.floor(Math.random() * 30000) + 15000;
    const totalDmg = Math.max(50000, baseDmg + randomVariation);

    // Kurangi darah bos
    season.currentHp = Math.max(0, season.currentHp - totalDmg);
    if (season.currentHp === 0) {
      season.status = 'defeated';
    }

    // Update phase
    const hpRatio = season.currentHp / season.maxHp;
    if (hpRatio <= 0.25) season.phase = 3;
    else if (hpRatio <= 0.60) season.phase = 2;
    else season.phase = 1;

    // Catat kontribusi
    let contrib = season.contributions.find(c => c.discordId === player.discordId);
    if (contrib) {
      contrib.damage += totalDmg;
      contrib.attackCount += 1;
      contrib.lastAttackedAt = new Date();
    } else {
      season.contributions.push({
        discordId: player.discordId,
        characterName: player.name || player.characterName || 'Pendekar Fana',
        sect: player.sect || 'Pengelana Bebas',
        damage: totalDmg,
        attackCount: 1,
        lastAttackedAt: new Date()
      });
    }

    player.markModified('currentStamina');
    await player.save();

    season.markModified('contributions');
    await season.save();

    res.json({
      success: true,
      message: `⚔️ Berhasil melancarkan hantaman ke Bos Dunia sebesar ${totalDmg.toLocaleString()} Damage!`,
      data: {
        damageDealt: totalDmg,
        bossCurrentHp: season.currentHp,
        bossPhase: season.phase,
        remainingStamina: player.currentStamina
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[WORLD-BOSS] Error during attack:', error);
    res.status(500).json({ error: 'Gagal menyerang Bos Dunia.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/world-boss/leaderboard
// ═══════════════════════════════════════════════════════════════
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const season = await getOrCreateActiveSeason();
    const leaderboard = (season.contributions || [])
      .slice()
      .sort((a, b) => b.damage - a.damage)
      .slice(0, 10)
      .map((c, idx) => ({
        rank: idx + 1,
        name: c.characterName,
        sect: c.sect,
        damage: c.damage
      }));

    res.json({
      success: true,
      data: { leaderboard }
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat leaderboard Bos Dunia.' });
  }
});

module.exports = router;
