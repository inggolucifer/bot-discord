/**
 * seedArenaLadder.js
 * SEEDER & INISIALISASI MASTER PERINGKAT JIANGHU (SECT ARENA) & WORLD BOSS 8-TIER
 * 
 * 1. Mengurutkan seluruh akun pemain dari tertua ke terbaru (createdAt: 1)
 * 2. Mengisi ArenaLadderEntry dengan peringkat 1..N tanpa divisi (Endless Ladder)
 * 3. Menginisialisasi ArenaSeasonConfig dengan siklus bulanan & 8-Tier hadiah
 * 4. Memastikan WorldBossSeason memiliki konfigurasi 8-Tier hadiah & bossStats
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}
const mongoose = require('mongoose');

const Player = require('../models/Player');
require('../models/Law');
require('../models/Manual');
const ArenaLadderEntry = require('../models/ArenaLadderEntry');
const ArenaSeasonConfig = require('../models/ArenaSeasonConfig');
const WorldBossSeason = require('../models/WorldBossSeason');
const { getComputedStats } = require('../utils/statCalculator');

const DEFAULT_ARENA_TIERS = [
  {
    tierId: 'top1',
    label: '👑 Juara 1 (Kampiun Agung Jianghu)',
    minRank: 1,
    maxRank: 1,
    silver: 100,
    gold: 5,
    spiritStones: 2000,
    meritTokens: 500,
    items: [
      { itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 5 }
    ]
  },
  {
    tierId: 'top2',
    label: '🥈 Peringkat 2 (Pendekar Penguasa Sayap Perak)',
    minRank: 2,
    maxRank: 2,
    silver: 60,
    gold: 3,
    spiritStones: 1200,
    meritTokens: 300,
    items: [
      { itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 3 }
    ]
  },
  {
    tierId: 'top3',
    label: '🥉 Peringkat 3 (Pelindung Giok Es Sembilan Benua)',
    minRank: 3,
    maxRank: 3,
    silver: 40,
    gold: 2,
    spiritStones: 800,
    meritTokens: 200,
    items: [
      { itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 2 }
    ]
  },
  {
    tierId: 'top4_10',
    label: '🔥 Peringkat 4 - 10 (Sepuluh Penguasa Jianghu)',
    minRank: 4,
    maxRank: 10,
    silver: 25,
    gold: 1,
    spiritStones: 500,
    meritTokens: 150,
    items: [
      { itemId: 'pill_breakthrough_great', name: 'Pil Terobosan Unggul', quantity: 3 }
    ]
  },
  {
    tierId: 'top11_50',
    label: '🌟 Peringkat 11 - 50 (Master Bintang Sembilan Sekte)',
    minRank: 11,
    maxRank: 50,
    silver: 15,
    gold: 0,
    spiritStones: 300,
    meritTokens: 100,
    items: [
      { itemId: 'pill_breakthrough_great', name: 'Pil Terobosan Unggul', quantity: 1 }
    ]
  },
  {
    tierId: 'top51_200',
    label: '⚔️ Peringkat 51 - 200 (Pendekar Tersohor Delapan Arah)',
    minRank: 51,
    maxRank: 200,
    silver: 8,
    gold: 0,
    spiritStones: 150,
    meritTokens: 60,
    items: [
      { itemId: 'pill_qi_condensation', name: 'Pil Pengumpul Qi', quantity: 3 }
    ]
  },
  {
    tierId: 'top201_500',
    label: '📜 Peringkat 201 - 500 (Murid Inti Berbakat)',
    minRank: 201,
    maxRank: 500,
    silver: 3,
    gold: 0,
    spiritStones: 80,
    meritTokens: 30,
    items: [
      { itemId: 'pill_qi_condensation', name: 'Pil Pengumpul Qi', quantity: 1 }
    ]
  },
  {
    tierId: 'top501_1000',
    label: '🎒 Peringkat 501 - 1000+ (Pengelana Jianghu)',
    minRank: 501,
    maxRank: 1000,
    silver: 1,
    gold: 0,
    spiritStones: 30,
    meritTokens: 10,
    items: []
  }
];

const DEFAULT_WORLD_BOSS_TIERS = [
  {
    tierId: 'top1',
    label: '👑 Juara 1 (Kampiun Pembantai Qilin)',
    minRank: 1,
    maxRank: 1,
    silver: 50,
    gold: 2,
    spiritStones: 1000,
    exp: 50000,
    items: [
      { itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 5 }
    ]
  },
  {
    tierId: 'top2',
    label: '🥈 Peringkat 2 (Pendekar Utama)',
    minRank: 2,
    maxRank: 2,
    silver: 30,
    gold: 1,
    spiritStones: 700,
    exp: 35000,
    items: [
      { itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 3 }
    ]
  },
  {
    tierId: 'top3',
    label: '🥉 Peringkat 3 (Pendekar Tangguh)',
    minRank: 3,
    maxRank: 3,
    silver: 20,
    gold: 0,
    spiritStones: 500,
    exp: 25000,
    items: [
      { itemId: 'pill_breakthrough_divine', name: 'Pil Terobosan Ilahi', quantity: 2 }
    ]
  },
  {
    tierId: 'top4_10',
    label: '🔥 Peringkat 4 - 10 (Elit Sembilan Benua)',
    minRank: 4,
    maxRank: 10,
    silver: 12,
    gold: 0,
    spiritStones: 300,
    exp: 15000,
    items: [
      { itemId: 'pill_breakthrough_great', name: 'Pil Terobosan Unggul', quantity: 3 }
    ]
  },
  {
    tierId: 'top11_50',
    label: '🌟 Peringkat 11 - 50 (Pendekar Tersohor)',
    minRank: 11,
    maxRank: 50,
    silver: 6,
    gold: 0,
    spiritStones: 150,
    exp: 8000,
    items: [
      { itemId: 'pill_breakthrough_great', name: 'Pil Terobosan Unggul', quantity: 1 }
    ]
  },
  {
    tierId: 'top51_200',
    label: '⚔️ Peringkat 51 - 200 (Praktisi Berbakat)',
    minRank: 51,
    maxRank: 200,
    silver: 3,
    gold: 0,
    spiritStones: 80,
    exp: 4000,
    items: [
      { itemId: 'pill_qi_condensation', name: 'Pil Pengumpul Qi', quantity: 3 }
    ]
  },
  {
    tierId: 'top201_500',
    label: '📜 Peringkat 201 - 500 (Murid Sekte Tangguh)',
    minRank: 201,
    maxRank: 500,
    silver: 1,
    gold: 0,
    spiritStones: 40,
    exp: 2000,
    items: [
      { itemId: 'pill_qi_condensation', name: 'Pil Pengumpul Qi', quantity: 1 }
    ]
  },
  {
    tierId: 'top501_1000',
    label: '🎒 Peringkat 501 - 1000+ (Partisipan Jianghu)',
    minRank: 501,
    maxRank: 1000,
    silver: 0,
    gold: 0,
    spiritStones: 20,
    exp: 1000,
    items: []
  }
];

async function seedArenaAndWorldBossMaster() {
  console.log('\n=== INISIALISASI MASTER PERINGKAT JIANGHU (SECT ARENA) & WORLD BOSS ===');

  // 1. Inisialisasi ArenaSeasonConfig (Siklus Bulanan)
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // Hitung akhir bulan ini (pukul 23:59:59)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let seasonConfig = await ArenaSeasonConfig.findOne();
  if (!seasonConfig) {
    seasonConfig = new ArenaSeasonConfig({
      seasonNumber: 1,
      currentMonthKey,
      nextSettlementAt: endOfMonth,
      rewardTiers: DEFAULT_ARENA_TIERS
    });
    await seasonConfig.save();
    console.log('[ARENA-CONFIG] Inisialisasi ArenaSeasonConfig baru berhasil:', currentMonthKey);
  } else {
    if (!seasonConfig.rewardTiers || seasonConfig.rewardTiers.length === 0) {
      seasonConfig.rewardTiers = DEFAULT_ARENA_TIERS;
      await seasonConfig.save();
      console.log('[ARENA-CONFIG] Diperbarui dengan 8-Tier hadiah default.');
    }
  }

  // 2. Seeding ArenaLadderEntry (Urutkan pemain lama ke baru)
  const totalEntries = await ArenaLadderEntry.countDocuments();
  console.log(`[ARENA-LADDER] Jumlah entri tangga saat ini: ${totalEntries}`);

  const allPlayers = await Player.find()
    .sort({ createdAt: 1, registeredAt: 1 })
    .populate('laws')
    .populate('manuals.manualId');

  console.log(`[ARENA-LADDER] Memproses ${allPlayers.length} pemain untuk penyusunan peringkat...`);

  let assignedRank = 1;
  for (const player of allPlayers) {
    const computed = getComputedStats(player, player.laws || [], player.manuals || []);
    const hp = computed.maxHp || player.stats?.baseHp || 100;
    const atk = computed.atk || player.stats?.baseAtk || 20;
    const def = computed.def || player.stats?.baseDef || 10;
    const spd = computed.spd || player.stats?.baseSpd || 10;
    const combatPower = Math.floor((atk * 2.5) + (def * 2.0) + (hp * 0.4));

    const existingEntry = await ArenaLadderEntry.findOne({ discordId: player.discordId });
    if (!existingEntry) {
      await ArenaLadderEntry.create({
        discordId: player.discordId,
        guildId: player.guildId || 'global',
        characterName: player.name || player.characterName || 'Pendekar Jianghu',
        sect: player.sect || 'Pengelana Bebas',
        realm: player.realm || 'Mortal',
        realmIndex: player.realmIndex || 0,
        rank: assignedRank,
        peakRank: assignedRank,
        avatar: player.characterImage || null,
        combatPower,
        statsSnapshot: { hp, atk, def, spd },
        dailyChallengesUsed: 0,
        lastChallengeDate: '',
        wins: 0,
        losses: 0,
        matchHistory: []
      });
      console.log(`  -> Rank #${assignedRank}: ${player.name || player.characterName} (${player.discordId})`);
    } else {
      // Perbarui stats snapshot & nama terkini tanpa mengubah rank yang sudah diraih
      existingEntry.characterName = player.name || player.characterName || existingEntry.characterName;
      existingEntry.sect = player.sect || existingEntry.sect;
      existingEntry.realm = player.realm || existingEntry.realm;
      existingEntry.realmIndex = player.realmIndex ?? existingEntry.realmIndex;
      existingEntry.combatPower = combatPower;
      existingEntry.statsSnapshot = { hp, atk, def, spd };
      await existingEntry.save();
    }
    assignedRank++;
  }

  // 3. Inisialisasi / Perbarui WorldBossSeason
  let worldBoss = await WorldBossSeason.findOne({ status: 'active' }).sort({ seasonNumber: -1 });
  if (!worldBoss) {
    worldBoss = new WorldBossSeason({
      seasonNumber: 1,
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
      bossImageUrl: null,
      bossStats: {
        hp: 400000000,
        atk: 140,
        def: 70,
        spd: 25
      },
      rewardTiers: DEFAULT_WORLD_BOSS_TIERS,
      contributions: []
    });
    await worldBoss.save();
    console.log('[WORLD-BOSS] WorldBossSeason baru berhasil dibuat.');
  } else {
    let updated = false;
    if (!worldBoss.rewardTiers || worldBoss.rewardTiers.length === 0) {
      worldBoss.rewardTiers = DEFAULT_WORLD_BOSS_TIERS;
      updated = true;
    }
    if (!worldBoss.dailyAttemptsLimit) {
      worldBoss.dailyAttemptsLimit = 3;
      updated = true;
    }
    if (!worldBoss.bossStats || !worldBoss.bossStats.hp) {
      worldBoss.bossStats = {
        hp: worldBoss.maxHp || 400000000,
        atk: 140,
        def: 70,
        spd: 25
      };
      updated = true;
    }
    if (updated) {
      await worldBoss.save();
      console.log('[WORLD-BOSS] WorldBossSeason berhasil disinkronkan dengan 8-Tier & Boss Stats.');
    }
  }

  console.log('\n=== INISIALISASI MASTER PERINGKAT & WORLD BOSS SELESAI (100% SUKSES) ===\n');
}

// Eksekusi jika dijalankan langsung via terminal CLI
if (require.main === module) {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu-bot';
  mongoose.connect(uri)
    .then(async () => {
      console.log('[DB] Terhubung ke MongoDB:', uri);
      await seedArenaAndWorldBossMaster();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[DB] Gagal menghubungkan ke MongoDB:', err.message);
      process.exit(1);
    });
}

module.exports = {
  seedArenaAndWorldBossMaster,
  DEFAULT_ARENA_TIERS,
  DEFAULT_WORLD_BOSS_TIERS
};
