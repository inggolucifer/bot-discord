/**
 * WORLD BOSS API ROUTES V2 (AUTHORITATIVE)
 * 
 * Fitur Utama:
 * 1. Jadwal Khusus: Hanya aktif setiap hari Sabtu (00:00 - 23:59 WIB)
 * 2. Real Turn-Based Combat: Integrasi BattleArena, akumulasi damage ke bos
 * 3. Batas Serangan: 3 jatah serangan harian per akun
 * 4. Hadiah 8-Tier Dinamis: Top 1, Top 2, Top 3, Top 4-10, Top 11-50, Top 50-200, Top 200-500, Top 500-1000
 * 5. Admin Config: Kemudahan mengganti monster bos dan mengubah item hadiah 8-Tier
 */

const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const WorldBossSeason = require('../../models/WorldBossSeason');
const Monster = require('../../models/Monster');
const Item = require('../../models/Item');
const InteractiveBattleService = require('../../services/InteractiveBattleService');
const { authenticateToken } = require('../middlewares/auth');
const CustomError = require('../utils/CustomError');
const { getComputedStats } = require('../../utils/statCalculator');

function isUserAdmin(req) {
  const ownerIds = (process.env.OWNER_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  if (ownerIds.length === 0) return true; // dev fallback
  return ownerIds.includes(req.user.userId);
}

async function resolvePlayer(req) {
  const userId = req.user.userId;
  const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
  const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
  const player = await Player.findOne({ discordId: userId, guildId })
    .populate('laws')
    .populate('manuals.manualId')
    .populate('inventory.itemId');
  if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
  return player;
}

const DEFAULT_WORLD_BOSS_TIERS = [
  { tierId: 'top1', label: '👑 Juara 1 (Kampiun Pembantai Qilin)', minRank: 1, maxRank: 1, silver: 50, gold: 2, spiritStones: 1000, exp: 50000, items: [{ itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 5 }] },
  { tierId: 'top2', label: '🥈 Peringkat 2 (Pendekar Utama)', minRank: 2, maxRank: 2, silver: 30, gold: 1, spiritStones: 700, exp: 35000, items: [{ itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 3 }] },
  { tierId: 'top3', label: '🥉 Peringkat 3 (Pendekar Tangguh)', minRank: 3, maxRank: 3, silver: 20, gold: 0, spiritStones: 500, exp: 25000, items: [{ itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 2 }] },
  { tierId: 'top4_10', label: '🔥 Peringkat 4 - 10 (Elit Sembilan Benua)', minRank: 4, maxRank: 10, silver: 12, gold: 0, spiritStones: 300, exp: 15000, items: [{ itemId: 'pill_breakthrough_great', name: 'Pil Terobosan Unggul', quantity: 3 }] },
  { tierId: 'top11_50', label: '🌟 Peringkat 11 - 50 (Pendekar Tersohor)', minRank: 11, maxRank: 50, silver: 6, gold: 0, spiritStones: 150, exp: 8000, items: [{ itemId: 'pill_breakthrough_great', name: 'Pil Terobosan Unggul', quantity: 1 }] },
  { tierId: 'top51_200', label: '⚔️ Peringkat 51 - 200 (Praktisi Berbakat)', minRank: 51, maxRank: 200, silver: 3, gold: 0, spiritStones: 80, exp: 4000, items: [{ itemId: 'pill_qi_condensation', name: 'Pil Pengumpul Qi', quantity: 3 }] },
  { tierId: 'top201_500', label: '📜 Peringkat 201 - 500 (Murid Sekte Tangguh)', minRank: 201, maxRank: 500, silver: 1, gold: 0, spiritStones: 40, exp: 2000, items: [{ itemId: 'pill_qi_condensation', name: 'Pil Pengumpul Qi', quantity: 1 }] },
  { tierId: 'top501_1000', label: '🎒 Peringkat 501 - 1000+ (Partisipan Jianghu)', minRank: 501, maxRank: 1000, silver: 0, gold: 0, spiritStones: 20, exp: 1000, items: [] }
];

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
      dailyAttemptsLimit: 3,
      dailyAttempts: [],
      bossStats: { hp: 400000000, atk: 140, def: 70, spd: 25 },
      rewardTiers: DEFAULT_WORLD_BOSS_TIERS,
      contributions: []
    });
    await season.save();
  } else {
    let modified = false;
    if (!season.rewardTiers || season.rewardTiers.length === 0) {
      season.rewardTiers = DEFAULT_WORLD_BOSS_TIERS;
      modified = true;
    }
    if (!season.dailyAttemptsLimit) {
      season.dailyAttemptsLimit = 3;
      modified = true;
    }
    if (!season.bossStats || !season.bossStats.hp) {
      season.bossStats = { hp: season.maxHp || 400000000, atk: 140, def: 70, spd: 25 };
      modified = true;
    }
    if (modified) await season.save();
  }
  return season;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/world-boss/status
// ═══════════════════════════════════════════════════════════════
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const season = await getOrCreateActiveSeason();
    const userId = req.user.userId;

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Minggu, 6 = Sabtu
    const isSaturday = dayOfWeek === 6;

    // Hitung waktu menuju Sabtu berikutnya (pukul 00:00:00)
    let daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    if (daysUntilSaturday === 0 && !isSaturday) daysUntilSaturday = 7;
    const nextSaturday = new Date(now);
    if (!isSaturday) {
      nextSaturday.setDate(now.getDate() + daysUntilSaturday);
      nextSaturday.setHours(0, 0, 0, 0);
    } else {
      // Jika sekarang hari Sabtu, sisa waktu hingga Sabtu berakhir
      nextSaturday.setHours(23, 59, 59, 999);
    }
    const msUntilNextSaturday = Math.max(0, nextSaturday.getTime() - now.getTime());

    // Cek jatah serangan hari ini
    const todayStr = now.toISOString().slice(0, 10);
    const userAttempt = (season.dailyAttempts || []).find(a => a.discordId === userId && a.dateStr === todayStr);
    const attemptsUsed = userAttempt ? userAttempt.attemptsUsed : 0;
    const attemptsLimit = season.dailyAttemptsLimit || 3;
    const attemptsRemaining = Math.max(0, attemptsLimit - attemptsUsed);

    // Cek kontribusi & peringkat pemain saat ini
    const sortedContributions = (season.contributions || []).slice().sort((a, b) => b.damage - a.damage);
    const myRankIdx = sortedContributions.findIndex(c => c.discordId === userId);
    const myContribution = myRankIdx >= 0 ? {
      rank: myRankIdx + 1,
      damage: sortedContributions[myRankIdx].damage,
      attackCount: sortedContributions[myRankIdx].attackCount,
      rewardsClaimed: sortedContributions[myRankIdx].rewardsClaimed
    } : null;

    const leaderboard = sortedContributions.slice(0, 10).map((c, idx) => ({
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
        bossImageUrl: season.bossImageUrl || null,
        maxHp: season.maxHp,
        currentHp: season.currentHp,
        phase: season.phase,
        status: season.status,
        bossStats: season.bossStats,
        isSaturday,
        msUntilNextSaturday,
        attemptsUsed,
        attemptsLimit,
        attemptsRemaining,
        myContribution,
        rewardTiers: season.rewardTiers || DEFAULT_WORLD_BOSS_TIERS,
        leaderboard,
        isAdmin: isUserAdmin(req)
      }
    });
  } catch (error) {
    console.error('[WORLD-BOSS] Error fetching status:', error);
    res.status(500).json({ error: 'Gagal memuat status Bos Dunia.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/world-boss/battle/start (Mulai Turn-Based RPG Battle)
// ═══════════════════════════════════════════════════════════════
router.post('/battle/start', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const season = await getOrCreateActiveSeason();

    const now = new Date();
    const isSaturday = now.getDay() === 6;
    if (!isSaturday && !req.body.adminOverride) {
      return res.status(403).json({ error: 'Raja Siluman Dunia hanya bangkit pada hari Sabtu (00:00 - 23:59 WIB)!' });
    }

    if (season.status === 'defeated') {
      return res.status(400).json({ error: 'Bos Dunia minggu ini telah berhasil ditumbangkan!' });
    }

    const todayStr = now.toISOString().slice(0, 10);
    const userAttempt = (season.dailyAttempts || []).find(a => a.discordId === player.discordId && a.dateStr === todayStr);
    const attemptsUsed = userAttempt ? userAttempt.attemptsUsed : 0;
    if (attemptsUsed >= (season.dailyAttemptsLimit || 3)) {
      return res.status(400).json({ error: 'Kamu telah menggunakan seluruh jatah 3 kesempatan menyerang Bos Dunia hari ini.' });
    }

    const computed = getComputedStats(player, player.laws || [], player.manuals || []);
    const maxHp = computed.maxHp || player.stats?.baseHp || 100;
    const currentHp = player.currentHp || maxHp;

    const bHp = Math.max(1000000, season.currentHp);
    const bMaxHp = season.maxHp || 400000000;
    const bStats = season.bossStats || { atk: 140, def: 70, spd: 25 };

    const enemies = [{
      id: season.bossId || 'boss_flame_kirin',
      entityId: season.bossId || 'boss_flame_kirin',
      name: season.bossName || 'Raja Qilin Api Purba',
      level: 10,
      imageUrl: season.bossImageUrl || null,
      element: 'fire',
      tierSize: 'boss',
      hp: bHp,
      maxHp: bMaxHp,
      attack: bStats.atk || 140,
      defense: bStats.def || 70,
      speed: bStats.spd || 25,
      skills: [
        { skillId: 'flame_breath', name: 'Semburan Api Purba', type: 'attack', power: 25, element: 'fire', qiCost: 0, cooldown: 2, currentCooldown: 0 },
        { skillId: 'lava_burst', name: 'Letusan Lahar Samadhi', type: 'attack', power: 40, element: 'fire', qiCost: 0, cooldown: 4, currentCooldown: 0 },
        { skillId: 'kirin_roar', name: 'Auman Menggetarkan Langit', type: 'attack', power: 20, element: 'neutral', qiCost: 0, cooldown: 3, currentCooldown: 0 }
      ]
    }];

    // Bawa sekutu jika ada
    let allies = [];
    if (Array.isArray(player.pets) && player.pets.length > 0) {
      allies = player.pets.slice(0, 1).map(p => ({
        entityId: p.instanceId,
        entityType: 'npc',
        name: p.nickname || 'Pet Pendamping',
        level: p.level || 1,
        hp: p.hp || 80,
        maxHp: p.maxHp || 80,
        attack: p.atk || 15,
        defense: p.def || 8,
        speed: p.spd || 10,
        allyType: 'pet'
      }));
    }

    const battleSession = await InteractiveBattleService.startBattle(
      player,
      enemies,
      'boss',
      'world_boss_domain',
      allies,
      {
        maxActiveEnemies: 1,
        isBossMode: true,
        eventContext: 'world_boss',
        isProjection: true,
        initialPlayerHp: player.currentHp !== undefined && player.currentHp !== null ? player.currentHp : maxHp,
        initialPlayerVitality: player.extendedStats?.vitality ?? player.vitality ?? 100
      }
    );

    res.json({
      success: true,
      message: '⚔️ Berhasil memasuki kawah purba pertempuran Bos Dunia!',
      battleId: battleSession.battleId,
      session: battleSession
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[WORLD-BOSS] Battle start error:', error);
    res.status(500).json({ error: 'Gagal memulai pertempuran Bos Dunia.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/world-boss/leaderboard (Paginasi Penuh Kontributor)
// ═══════════════════════════════════════════════════════════════
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const season = await getOrCreateActiveSeason();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(5, Math.min(50, parseInt(req.query.limit) || 10));

    const sortedContributions = (season.contributions || []).slice().sort((a, b) => b.damage - a.damage);
    const totalItems = sortedContributions.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const offset = (page - 1) * limit;

    const paginated = sortedContributions.slice(offset, offset + limit).map((c, idx) => ({
      rank: offset + idx + 1,
      name: c.characterName,
      sect: c.sect,
      damage: c.damage,
      attackCount: c.attackCount
    }));

    res.json({
      success: true,
      data: {
        leaderboard: paginated,
        pagination: { currentPage: page, totalPages, totalItems, limit }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat leaderboard Bos Dunia.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS: GET /api/world-boss/admin/config
// ═══════════════════════════════════════════════════════════════
router.get('/admin/config', authenticateToken, async (req, res) => {
  try {
    if (!isUserAdmin(req)) {
      return res.status(403).json({ error: 'Akses Ditolak: Fitur ini hanya untuk Admin.' });
    }

    const season = await getOrCreateActiveSeason();
    // Ambil daftar monster dari katalog untuk mempermudah admin memilih bos baru
    const monsterCatalog = await Monster.find({ isActive: true })
      .select('key name tier tierSize element statBlock regionSlug')
      .limit(60)
      .lean();

    // Ambil daftar item untuk dropdown hadiah
    const itemsCatalog = await Item.find()
      .select('key name category rarity')
      .limit(100)
      .lean();

    res.json({
      success: true,
      data: {
        bossId: season.bossId,
        bossName: season.bossName,
        bossImageUrl: season.bossImageUrl || '',
        maxHp: season.maxHp,
        currentHp: season.currentHp,
        bossStats: season.bossStats,
        dailyAttemptsLimit: season.dailyAttemptsLimit || 3,
        rewardTiers: season.rewardTiers || DEFAULT_WORLD_BOSS_TIERS,
        monsterCatalog,
        itemsCatalog
      }
    });
  } catch (error) {
    console.error('[WORLD-BOSS] Admin config error:', error);
    res.status(500).json({ error: 'Gagal memuat konfigurasi admin Bos Dunia.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS: PUT /api/world-boss/admin/config
// ═══════════════════════════════════════════════════════════════
router.put('/admin/config', authenticateToken, async (req, res) => {
  try {
    if (!isUserAdmin(req)) {
      return res.status(403).json({ error: 'Akses Ditolak: Fitur ini hanya untuk Admin.' });
    }

    const season = await getOrCreateActiveSeason();
    const { bossId, bossName, bossImageUrl, maxHp, bossStats, rewardTiers, dailyAttemptsLimit } = req.body;

    if (bossId) season.bossId = bossId;
    if (bossName) season.bossName = bossName;
    if (bossImageUrl !== undefined) season.bossImageUrl = bossImageUrl;
    if (maxHp && Number(maxHp) > 0) {
      season.maxHp = Number(maxHp);
      if (season.currentHp > season.maxHp) season.currentHp = season.maxHp;
    }
    if (bossStats) {
      season.bossStats = {
        hp: Number(bossStats.hp) || season.maxHp,
        atk: Number(bossStats.atk) || 140,
        def: Number(bossStats.def) || 70,
        spd: Number(bossStats.spd) || 25
      };
    }
    if (Array.isArray(rewardTiers) && rewardTiers.length > 0) {
      season.rewardTiers = rewardTiers;
    }
    if (dailyAttemptsLimit && Number(dailyAttemptsLimit) > 0) {
      season.dailyAttemptsLimit = Number(dailyAttemptsLimit);
    }

    season.markModified('bossStats');
    season.markModified('rewardTiers');
    await season.save();

    res.json({
      success: true,
      message: '✅ Konfigurasi Bos Dunia dan Hadiah 8-Tier berhasil diperbarui oleh Admin!',
      data: {
        bossId: season.bossId,
        bossName: season.bossName,
        maxHp: season.maxHp,
        currentHp: season.currentHp,
        rewardTiers: season.rewardTiers
      }
    });
  } catch (error) {
    console.error('[WORLD-BOSS] Admin update error:', error);
    res.status(500).json({ error: 'Gagal memperbarui konfigurasi admin Bos Dunia.' });
  }
});

module.exports = router;
