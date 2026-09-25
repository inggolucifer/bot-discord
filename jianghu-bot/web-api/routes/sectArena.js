/**
 * SECT ARENA API ROUTES V2 (ENDLESS LADDER & MONTHLY REWARDS)
 * 
 * Fitur Utama:
 * 1. Endless Ladder Bebas Divisi: Tangga peringkat tunggal 1..N berjalan 24/7/365 tanpa jeda
 * 2. Seeding Akun Lama ke Baru: Peringkat berurutan otomatis
 * 3. Tantang 1-5 Peringkat di Atas: Duel turn-based RPG melawan AI Super Cerdas
 * 4. Logika Pergeseran Kaskade: Menang naik ke rank target, target dan pemain di antaranya turun 1 tingkat
 * 5. Siklus Hadiah Bulanan: Snapshot akhir bulan 8-Tier tanpa me-reset peringkat
 * 6. Limit 3 Tantangan Harian: Reset setiap hari pukul 00:00 WIB
 * 7. Paginasi Responsif & Panel Admin Intuitif
 */

const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const ArenaLadderEntry = require('../../models/ArenaLadderEntry');
const ArenaSeasonConfig = require('../../models/ArenaSeasonConfig');
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

const DEFAULT_ARENA_TIERS = [
  { tierId: 'top1', label: '👑 Juara 1 (Kampiun Agung Jianghu)', minRank: 1, maxRank: 1, silver: 100, gold: 5, spiritStones: 2000, meritTokens: 500, items: [{ itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 5 }] },
  { tierId: 'top2', label: '🥈 Peringkat 2 (Pendekar Penguasa Sayap Perak)', minRank: 2, maxRank: 2, silver: 60, gold: 3, spiritStones: 1200, meritTokens: 300, items: [{ itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 3 }] },
  { tierId: 'top3', label: '🥉 Peringkat 3 (Pelindung Giok Es Sembilan Benua)', minRank: 3, maxRank: 3, silver: 40, gold: 2, spiritStones: 800, meritTokens: 200, items: [{ itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 2 }] },
  { tierId: 'top4_10', label: '🔥 Peringkat 4 - 10 (Sepuluh Penguasa Jianghu)', minRank: 4, maxRank: 10, silver: 25, gold: 1, spiritStones: 500, meritTokens: 150, items: [{ itemId: 'pill_breakthrough_great', name: 'Pil Terobosan Unggul', quantity: 3 }] },
  { tierId: 'top11_50', label: '🌟 Peringkat 11 - 50 (Master Bintang Sembilan Sekte)', minRank: 11, maxRank: 50, silver: 15, gold: 0, spiritStones: 300, meritTokens: 100, items: [{ itemId: 'pill_breakthrough_great', name: 'Pil Terobosan Unggul', quantity: 1 }] },
  { tierId: 'top51_200', label: '⚔️ Peringkat 51 - 200 (Pendekar Tersohor Delapan Arah)', minRank: 51, maxRank: 200, silver: 8, gold: 0, spiritStones: 150, meritTokens: 60, items: [{ itemId: 'pill_qi_condensation', name: 'Pil Pengumpul Qi', quantity: 3 }] },
  { tierId: 'top201_500', label: '📜 Peringkat 201 - 500 (Murid Inti Berbakat)', minRank: 201, maxRank: 500, silver: 3, gold: 0, spiritStones: 80, meritTokens: 30, items: [{ itemId: 'pill_qi_condensation', name: 'Pil Pengumpul Qi', quantity: 1 }] },
  { tierId: 'top501_1000', label: '🎒 Peringkat 501 - 1000+ (Pengelana Jianghu)', minRank: 501, maxRank: 1000, silver: 1, gold: 0, spiritStones: 30, meritTokens: 10, items: [] }
];

async function getOrCreateSeasonConfig() {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let config = await ArenaSeasonConfig.findOne();
  if (!config) {
    config = new ArenaSeasonConfig({
      seasonNumber: 1,
      currentMonthKey,
      nextSettlementAt: endOfMonth,
      rewardTiers: DEFAULT_ARENA_TIERS
    });
    await config.save();
  } else {
    if (!config.rewardTiers || config.rewardTiers.length === 0) {
      config.rewardTiers = DEFAULT_ARENA_TIERS;
      await config.save();
    }
  }
  return config;
}

// Pastikan pemain terdaftar di tangga peringkat
async function ensurePlayerInLadder(player) {
  let entry = await ArenaLadderEntry.findOne({ discordId: player.discordId });
  const todayStr = new Date().toISOString().slice(0, 10);

  const computed = getComputedStats(player, player.laws || [], player.manuals || []);
  const hp = computed.maxHp || player.stats?.baseHp || 100;
  const atk = computed.atk || player.stats?.baseAtk || 20;
  const def = computed.def || player.stats?.baseDef || 10;
  const spd = computed.spd || player.stats?.baseSpd || 10;
  const combatPower = Math.floor((atk * 2.5) + (def * 2.0) + (hp * 0.4));

  if (!entry) {
    const totalCount = await ArenaLadderEntry.countDocuments();
    const newRank = totalCount + 1;
    entry = new ArenaLadderEntry({
      discordId: player.discordId,
      guildId: player.guildId || 'global',
      characterName: player.name || player.characterName || 'Pendekar Jianghu',
      sect: player.sect || 'Pengelana Bebas',
      realm: player.realm || 'Mortal',
      realmIndex: player.realmIndex || 0,
      rank: newRank,
      peakRank: newRank,
      avatar: player.characterImage || null,
      combatPower,
      statsSnapshot: { hp, atk, def, spd },
      dailyChallengesUsed: 0,
      lastChallengeDate: todayStr,
      wins: 0,
      losses: 0,
      matchHistory: []
    });
    await entry.save();
  } else {
    // Sinkronkan nama, avatar, dan combatPower terbaru
    entry.characterName = player.name || player.characterName || entry.characterName;
    entry.avatar = player.characterImage || entry.avatar;
    entry.sect = player.sect || entry.sect;
    entry.realm = player.realm || entry.realm;
    entry.realmIndex = player.realmIndex ?? entry.realmIndex;
    entry.combatPower = combatPower;
    entry.statsSnapshot = { hp, atk, def, spd };

    // Reset harian
    if (entry.lastChallengeDate !== todayStr) {
      entry.dailyChallengesUsed = 0;
      entry.lastChallengeDate = todayStr;
    }
    await entry.save();
  }
  return entry;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/sect-arena/overview (Dashboard Peringkat, 5 Rival, Status)
// ═══════════════════════════════════════════════════════════════
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const myEntry = await ensurePlayerInLadder(player);
    const seasonConfig = await getOrCreateSeasonConfig();

    const totalParticipants = await ArenaLadderEntry.countDocuments();
    const myRank = myEntry.rank;

    // 5 Rival di atas yang dapat ditantang [max(1, myRank - 5) .. myRank - 1]
    const minRankAbove = Math.max(1, myRank - 5);
    const maxRankAbove = myRank - 1;

    let rivalsAbove = [];
    if (myRank > 1) {
      rivalsAbove = await ArenaLadderEntry.find({
        rank: { $gte: minRankAbove, $lte: maxRankAbove }
      })
        .sort({ rank: 1 })
        .lean();
    }

    // 5 Rival di bawah yang sedang mengejar [myRank + 1 .. myRank + 5]
    const rivalsBelow = await ArenaLadderEntry.find({
      rank: { $gt: myRank, $lte: myRank + 5 }
    })
      .sort({ rank: 1 })
      .lean();

    // Hitung sisa waktu snapshot bulanan
    const now = new Date();
    const msUntilSettlement = Math.max(0, new Date(seasonConfig.nextSettlementAt).getTime() - now.getTime());

    const challengesRemaining = Math.max(0, 3 - (myEntry.dailyChallengesUsed || 0));

    res.json({
      success: true,
      data: {
        myEntry: {
          discordId: myEntry.discordId,
          characterName: myEntry.characterName,
          sect: myEntry.sect,
          realm: myEntry.realm,
          realmIndex: myEntry.realmIndex,
          rank: myEntry.rank,
          peakRank: myEntry.peakRank,
          avatar: myEntry.avatar,
          combatPower: myEntry.combatPower,
          statsSnapshot: myEntry.statsSnapshot,
          wins: myEntry.wins,
          losses: myEntry.losses,
          dailyChallengesUsed: myEntry.dailyChallengesUsed,
          challengesRemaining
        },
        totalParticipants,
        rivalsAbove,
        rivalsBelow,
        msUntilSettlement,
        nextSettlementAt: seasonConfig.nextSettlementAt,
        currentMonthKey: seasonConfig.currentMonthKey,
        rewardTiers: seasonConfig.rewardTiers || DEFAULT_ARENA_TIERS,
        matchHistory: (myEntry.matchHistory || []).slice(0, 10),
        isAdmin: isUserAdmin(req)
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[SECT-ARENA] Overview error:', error);
    res.status(500).json({ error: 'Gagal memuat ringkasan gelanggang arena.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/sect-arena/ladder (Paginasi Penuh 10 Baris per Halaman)
// ═══════════════════════════════════════════════════════════════
router.get('/ladder', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(5, Math.min(50, parseInt(req.query.limit) || 10));
    const searchQuery = (req.query.search || '').trim();

    let filter = {};
    if (searchQuery) {
      filter.$or = [
        { characterName: { $regex: searchQuery, $options: 'i' } },
        { sect: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    const totalItems = await ArenaLadderEntry.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const offset = (page - 1) * limit;

    const entries = await ArenaLadderEntry.find(filter)
      .sort({ rank: 1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Dapatkan rank pemain saat ini untuk kemudahan navigasi
    const myEntry = await ArenaLadderEntry.findOne({ discordId: req.user.userId }).select('rank').lean();

    res.json({
      success: true,
      data: {
        entries,
        myRank: myEntry ? myEntry.rank : 1,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          limit
        }
      }
    });
  } catch (error) {
    console.error('[SECT-ARENA] Ladder fetch error:', error);
    res.status(500).json({ error: 'Gagal memuat tangga peringkat arena.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/sect-arena/challenge (Mulai Duel Turn-Based Melawan AI Kloningan)
// ═══════════════════════════════════════════════════════════════
router.post('/challenge', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const challengerEntry = await ensurePlayerInLadder(player);
    const { targetRank } = req.body;

    if (!targetRank || isNaN(Number(targetRank))) {
      return res.status(400).json({ error: 'Peringkat target tidak valid.' });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (challengerEntry.lastChallengeDate !== todayStr) {
      challengerEntry.dailyChallengesUsed = 0;
      challengerEntry.lastChallengeDate = todayStr;
      await challengerEntry.save();
    }

    if (challengerEntry.dailyChallengesUsed >= 3) {
      return res.status(400).json({ error: 'Kamu telah menggunakan seluruh jatah 3 tiket tantangan arena hari ini.' });
    }

    const myRank = challengerEntry.rank;
    if (myRank === 1) {
      return res.status(400).json({ error: 'Kamu adalah Juara 1! Tidak ada lawan di atasmu yang bisa ditantang.' });
    }

    const minAllowedRank = Math.max(1, myRank - 5);
    const maxAllowedRank = myRank - 1;

    if (targetRank < minAllowedRank || targetRank > maxAllowedRank) {
      return res.status(400).json({ error: `Kamu hanya bisa menantang peringkat antara #${minAllowedRank} hingga #${maxAllowedRank}.` });
    }

    const targetEntry = await ArenaLadderEntry.findOne({ rank: targetRank });
    if (!targetEntry) {
      return res.status(404).json({ error: `Pemain pada peringkat #${targetRank} tidak ditemukan.` });
    }

    const targetPlayer = await Player.findOne({ discordId: targetEntry.discordId })
      .populate('laws')
      .populate('manuals.manualId')
      .populate('inventory.itemId');

    if (!targetPlayer) {
      return res.status(404).json({ error: 'Karakter rival tidak ditemukan di basis data.' });
    }

    const computed = getComputedStats(player, player.laws || [], player.manuals || []);
    const maxHp = computed.maxHp || player.stats?.baseHp || 100;
    const currentHp = player.currentHp || maxHp;

    const tComputed = getComputedStats(targetPlayer, targetPlayer.laws || [], targetPlayer.manuals || []);
    const tMaxHp = tComputed.maxHp || targetPlayer.stats?.baseHp || 100;
    const tAtk = tComputed.atk || targetPlayer.stats?.baseAtk || 20;
    const tDef = tComputed.def || targetPlayer.stats?.baseDef || 10;
    const tSpd = tComputed.spd || targetPlayer.stats?.baseSpd || 10;

    const enemies = [{
      id: targetPlayer.discordId,
      entityId: targetPlayer.discordId,
      name: targetPlayer.name || targetPlayer.characterName || 'Pendekar Sekte',
      level: targetPlayer.realmIndex || targetPlayer.level || 1,
      imageUrl: targetPlayer.characterImage || null,
      element: 'neutral',
      tierSize: 'small',
      hp: tMaxHp,
      maxHp: tMaxHp,
      attack: tAtk,
      defense: tDef,
      speed: tSpd,
      qi: targetPlayer.currentQi || 50,
      maxQi: targetPlayer.maxQi || 100,
      stance: 100,
      skills: InteractiveBattleService.formatPlayerSkills(targetPlayer)
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
      'pvp',
      'sect_arena_stage',
      allies,
      {
        maxActiveEnemies: 1,
        eventContext: 'sect_arena',
        isProjection: true,
        initialPlayerHp: player.currentHp !== undefined && player.currentHp !== null ? player.currentHp : maxHp,
        initialPlayerVitality: player.extendedStats?.vitality ?? player.vitality ?? 100,
        targetDiscordId: targetPlayer.discordId,
        targetRank,
        challengerRank: myRank
      }
    );

    res.json({
      success: true,
      message: `⚔️ Memasuki gelanggang tanding menantang #${targetRank} ${targetEntry.characterName}!`,
      battleId: battleSession.battleId,
      session: battleSession
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[SECT-ARENA] Challenge error:', error);
    res.status(500).json({ error: 'Gagal memulai duel arena.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS: GET /api/sect-arena/admin/config
// ═══════════════════════════════════════════════════════════════
router.get('/admin/config', authenticateToken, async (req, res) => {
  try {
    if (!isUserAdmin(req)) {
      return res.status(403).json({ error: 'Akses Ditolak: Fitur ini hanya untuk Admin.' });
    }

    const config = await getOrCreateSeasonConfig();
    const itemsCatalog = await Item.find()
      .select('key name category rarity')
      .limit(100)
      .lean();

    res.json({
      success: true,
      data: {
        seasonNumber: config.seasonNumber,
        currentMonthKey: config.currentMonthKey,
        nextSettlementAt: config.nextSettlementAt,
        rewardTiers: config.rewardTiers || DEFAULT_ARENA_TIERS,
        itemsCatalog
      }
    });
  } catch (error) {
    console.error('[SECT-ARENA] Admin config error:', error);
    res.status(500).json({ error: 'Gagal memuat konfigurasi admin arena.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS: PUT /api/sect-arena/admin/config
// ═══════════════════════════════════════════════════════════════
router.put('/admin/config', authenticateToken, async (req, res) => {
  try {
    if (!isUserAdmin(req)) {
      return res.status(403).json({ error: 'Akses Ditolak: Fitur ini hanya untuk Admin.' });
    }

    const config = await getOrCreateSeasonConfig();
    const { rewardTiers, nextSettlementAt } = req.body;

    if (Array.isArray(rewardTiers) && rewardTiers.length > 0) {
      config.rewardTiers = rewardTiers;
    }
    if (nextSettlementAt) {
      config.nextSettlementAt = new Date(nextSettlementAt);
    }

    config.markModified('rewardTiers');
    await config.save();

    res.json({
      success: true,
      message: '✅ Konfigurasi Hadiah 8-Tier Arena Bulanan berhasil diperbarui oleh Admin!',
      data: {
        rewardTiers: config.rewardTiers,
        nextSettlementAt: config.nextSettlementAt
      }
    });
  } catch (error) {
    console.error('[SECT-ARENA] Admin update error:', error);
    res.status(500).json({ error: 'Gagal memperbarui konfigurasi admin arena.' });
  }
});

module.exports = router;
