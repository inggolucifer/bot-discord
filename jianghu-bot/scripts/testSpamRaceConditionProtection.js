/**
 * TEST SCRIPT: Penambalan Exploit "Spam Klik" (Race Condition) pada Meditasi & Klaim Harian
 * 
 * Memvalidasi:
 * 1. Concurrency Lock pada /law/channel/stop (Spam click 20 request serentak)
 * 2. Concurrency Lock pada /law/daily-claim (Spam click 20 request serentak)
 * 3. Tidak ada kebocoran Daily Cap & pencegahan pelipatgandaan True Qi
 * 4. Konsistensi streak & pemisahan player.lastDailyClaim vs law.dailyData.lastEpiphanyClaimAt
 * 5. GET /status live preview non-mutating
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Player = require('../models/Player');
const LockManager = require('../web-api/utils/lockManager');
const {
  syncLawChanneling,
  claimDailyEpiphany,
  checkAndResetDailyCap,
  getLawStatus,
  getDailyChannelCap,
  getChannelQiRate
} = require('../utils/lawCultivationEngine');

async function runTest() {
  console.log('================================================================');
  console.log('🛡️ UJI PENAMBALAN EXPLOIT RACE CONDITION (SPAM KLIK)');
  console.log('================================================================\n');

  // Connect to DB
  const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu';
  await mongoose.connect(dbUri);
  console.log('✅ Terhubung ke database MongoDB.');

  const testDiscordId = 'test_spam_exploit_player_' + Date.now();
  const testGuildId = 'test_guild_123';

  // Bersihkan data lama jika ada
  await Player.deleteMany({ discordId: testDiscordId });

  // Buat karakter uji baru
  const player = new Player({
    discordId: testDiscordId,
    guildId: testGuildId,
    characterName: 'Pendekar Anti Exploit',
    status: 'active',
    dailyStreak: 3,
    lastDailyClaim: new Date(Date.now() - 48 * 3600 * 1000), // 2 hari lalu
    currency: { copper: 100, silver: 5, gold: 0 },
    cultivationLaw: {
      activeLawType: 'element_phoenix_fire',
      rank: 0,
      stage: 0,
      qi: 100,
      maxQi: 1260,
      isChanneling: false,
      dailyData: {
        channelMinutesToday: 0,
        dailyStreakDays: 3,
        lastDailyResetAt: new Date(),
        lastEpiphanyClaimAt: new Date(Date.now() - 48 * 3600 * 1000) // 2 hari lalu
      }
    }
  });

  await player.save();
  console.log(`👤 Karakter Uji Dibuat: ${player.characterName} (ID: ${player.discordId})\n`);

  // -------------------------------------------------------------
  // TEST 1: RACE CONDITION SPAM KLIK PADA /law/channel/stop (20 Request Serentak)
  // -------------------------------------------------------------
  console.log('--- TEST 1: SPAM KLIK /law/channel/stop (20 REQUEST SERENTAK) ---');
  
  // Set pemain sedang meditasi selama 30 menit
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  player.cultivationLaw.isChanneling = true;
  player.cultivationLaw.lastChannelSyncAt = thirtyMinutesAgo;
  player.cultivationLaw.dailyData.channelMinutesToday = 10;
  player.cultivationLaw.qi = 100;
  await player.save();

  const initialQi = player.cultivationLaw.qi;
  const initialMinutesUsed = player.cultivationLaw.dailyData.channelMinutesToday;
  console.log(`State Awal: Qi = ${initialQi}, ChannelMinutesToday = ${initialMinutesUsed}, isChanneling = true`);

  // Simulasi 20 request serentak ke endpoint /channel/stop
  const CONCURRENT_REQUESTS = 20;
  const lockKey = `law_channel_${testDiscordId}`;

  let successCount = 0;
  let lockRejectedCount = 0;
  let notChannelingCount = 0;

  const simulateStopRequest = async (requestId) => {
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
      lockRejectedCount++;
      return { requestId, status: 429, error: 'Aksi meditasi sedang diproses.' };
    }

    try {
      // Re-fetch fresh player document
      const freshPlayer = await Player.findOne({ discordId: testDiscordId });
      const law = freshPlayer.cultivationLaw;

      if (!law || !law.isChanneling) {
        notChannelingCount++;
        return { requestId, status: 400, error: 'Tidak sedang bermeditasi.' };
      }

      checkAndResetDailyCap(freshPlayer);
      const result = syncLawChanneling(freshPlayer);
      law.isChanneling = false;
      freshPlayer.markModified('cultivationLaw');
      await freshPlayer.save();

      successCount++;
      return { requestId, status: 200, result };
    } finally {
      releaseLock();
    }
  };

  console.log(`Mengirim ${CONCURRENT_REQUESTS} request /channel/stop secara simultan...`);
  const stopResponses = await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => simulateStopRequest(i + 1))
  );

  const finalPlayer1 = await Player.findOne({ discordId: testDiscordId });
  const finalQi1 = finalPlayer1.cultivationLaw.qi;
  const finalMinutes1 = finalPlayer1.cultivationLaw.dailyData.channelMinutesToday;

  console.log(`Hasil Eksekusi:`);
  console.log(`- Request Berhasil (200 OK): ${successCount}`);
  console.log(`- Request Ditolak Lock (429 Rate Limited): ${lockRejectedCount}`);
  console.log(`- Request Ditolak State (400 Not Channeling): ${notChannelingCount}`);
  console.log(`- Qi Awal: ${initialQi} -> Qi Akhir: ${finalQi1} (Delta: +${finalQi1 - initialQi})`);
  console.log(`- ChannelMinutes Awal: ${initialMinutesUsed} -> Akhir: ${finalMinutes1} (Delta: +${finalMinutes1 - initialMinutesUsed} menit)`);
  console.log(`- isChanneling: ${finalPlayer1.cultivationLaw.isChanneling}`);

  if (successCount !== 1) {
    throw new Error(`GAGAL! Seharusnya tepat 1 request yang berhasil, tetapi ada ${successCount} request!`);
  }
  if (finalPlayer1.cultivationLaw.isChanneling !== false) {
    throw new Error('GAGAL! isChanneling harus bernilai false setelah stop!');
  }
  if (finalMinutes1 > 45) { // 10 + 30 = 40 menit
    throw new Error(`GAGAL! Menit channeling membengkak di luar wajar: ${finalMinutes1}`);
  }
  console.log('✅ TEST 1 LULUS: Exploit spam klik /channel/stop berhasil diblokir total! Qi dan menit sinkron tepat 1x.\n');

  // -------------------------------------------------------------
  // TEST 2: RACE CONDITION SPAM KLIK PADA /law/daily-claim (20 Request Serentak)
  // -------------------------------------------------------------
  console.log('--- TEST 2: SPAM KLIK /law/daily-claim (20 REQUEST SERENTAK) ---');

  // Setup karakter eligible claim pencerahan harian
  finalPlayer1.cultivationLaw.dailyData.lastEpiphanyClaimAt = new Date(Date.now() - 48 * 3600 * 1000);
  finalPlayer1.currency.copper = 100;
  await finalPlayer1.save();

  const preClaimQi = finalPlayer1.cultivationLaw.qi;
  const preClaimCopper = finalPlayer1.currency.copper;
  const preClaimStreak = finalPlayer1.dailyStreak;
  const preLastDailyClaim = finalPlayer1.lastDailyClaim;
  console.log(`State Awal Claim: Qi = ${preClaimQi}, Copper = ${preClaimCopper}, Streak = ${preClaimStreak}`);

  const claimLockKey = `law_daily_claim_${testDiscordId}`;
  let claimSuccessCount = 0;
  let claimLockRejectedCount = 0;
  let claimAlreadyClaimedCount = 0;

  const simulateClaimRequest = async (requestId) => {
    const releaseLock = await LockManager.acquire(claimLockKey);
    if (!releaseLock) {
      claimLockRejectedCount++;
      return { requestId, status: 429, error: 'Klaim pencerahan harian sedang diproses.' };
    }

    try {
      const freshPlayer = await Player.findOne({ discordId: testDiscordId });
      const result = claimDailyEpiphany(freshPlayer);

      if (!result.success) {
        claimAlreadyClaimedCount++;
        return { requestId, status: 400, error: result.message };
      }

      if (freshPlayer.cultivationLaw?.dailyData) {
        freshPlayer.cultivationLaw.dailyData.dailyStreakDays = freshPlayer.dailyStreak || 1;
      }

      freshPlayer.markModified('cultivationLaw');
      if (freshPlayer.currency) freshPlayer.markModified('currency');
      await freshPlayer.save();

      claimSuccessCount++;
      return { requestId, status: 200, result };
    } finally {
      releaseLock();
    }
  };

  console.log(`Mengirim ${CONCURRENT_REQUESTS} request /daily-claim secara simultan...`);
  const claimResponses = await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => simulateClaimRequest(i + 1))
  );

  const finalPlayer2 = await Player.findOne({ discordId: testDiscordId });
  const postClaimQi = finalPlayer2.cultivationLaw.qi;
  const postClaimCopper = finalPlayer2.currency.copper;
  const postLastDailyClaim = finalPlayer2.lastDailyClaim;

  console.log(`Hasil Eksekusi:`);
  console.log(`- Claim Berhasil (200 OK): ${claimSuccessCount}`);
  console.log(`- Claim Ditolak Lock (429 Rate Limited): ${claimLockRejectedCount}`);
  console.log(`- Claim Ditolak Validasi (400 Already Claimed): ${claimAlreadyClaimedCount}`);
  console.log(`- Qi Awal: ${preClaimQi} -> Qi Akhir: ${postClaimQi} (Delta: +${postClaimQi - preClaimQi})`);
  console.log(`- Copper Awal: ${preClaimCopper} -> Copper Akhir: ${postClaimCopper} (Delta: +${postClaimCopper - preClaimCopper})`);
  console.log(`- player.lastDailyClaim Sebelum: ${preLastDailyClaim?.toISOString()} -> Sesudah: ${postLastDailyClaim?.toISOString()}`);

  if (claimSuccessCount !== 1) {
    throw new Error(`GAGAL! Seharusnya tepat 1 klaim harian yang berhasil, tetapi ada ${claimSuccessCount} klaim!`);
  }
  const expectedQiGrant = Math.floor(finalPlayer2.cultivationLaw.maxQi * 0.10);
  if (postClaimQi - preClaimQi !== expectedQiGrant) {
    throw new Error(`GAGAL! Pertambahan Qi (${postClaimQi - preClaimQi}) tidak sesuai ekspektasi 10% (${expectedQiGrant})!`);
  }
  if (postClaimCopper - preClaimCopper > 50) {
    throw new Error(`GAGAL! Hadiah tembaga melipat ganda: +${postClaimCopper - preClaimCopper} tembaga!`);
  }
  if (preLastDailyClaim?.getTime() !== postLastDailyClaim?.getTime()) {
    throw new Error('GAGAL! player.lastDailyClaim tertimpa oleh law daily-claim! Seharusnya tidak menimpa klaim umum Tianji!');
  }
  console.log('✅ TEST 2 LULUS: Exploit spam klik /daily-claim berhasil diblokir total! Qi dan tembaga tidak dapat digandakan.\n');

  // -------------------------------------------------------------
  // TEST 3: GET /status LIVE PREVIEW NON-MUTATING VERIFICATION
  // -------------------------------------------------------------
  console.log('--- TEST 3: GET /status LIVE PREVIEW & NON-MUTATING ---');
  // Nyalakan channeling
  finalPlayer2.cultivationLaw.isChanneling = true;
  finalPlayer2.cultivationLaw.lastChannelSyncAt = new Date(Date.now() - 15 * 60 * 1000); // 15 menit lalu
  await finalPlayer2.save();

  const qiBeforeStatus = finalPlayer2.cultivationLaw.qi;
  // Panggil getLawStatus
  const statusResult = getLawStatus(finalPlayer2);
  console.log(`- Qi Database Mentah: ${qiBeforeStatus}`);
  console.log(`- Qi Live Preview di Status: ${statusResult.qi} (Memperhitungkan 15 menit channeling secara real-time)`);
  console.log(`- Minutes Used di Status: ${statusResult.dailyChannelUsed} menit`);

  if (statusResult.qi <= qiBeforeStatus) {
    throw new Error('GAGAL! getLawStatus harus menampilkan live preview Qi yang lebih tinggi saat channeling aktif!');
  }

  // Cek bahwa dokumen DB tidak berubah jika hanya dipanggil getLawStatus
  const playerInDb = await Player.findOne({ discordId: testDiscordId });
  if (playerInDb.cultivationLaw.qi !== qiBeforeStatus) {
    throw new Error('GAGAL! Database termutasi secara liar saat membaca status!');
  }
  console.log('✅ TEST 3 LULUS: getLawStatus menampilkan live preview Qi tanpa merusak atau memutasi database secara liar.\n');

  // -------------------------------------------------------------
  // TEST 4: SPAM KLIK /law/channel/start (20 REQUEST SERENTAK) & AUTO-SYNC SELF-HEALING
  // -------------------------------------------------------------
  console.log('--- TEST 4: SPAM KLIK /law/channel/start & AUTO-SYNC RECOVERY ---');
  
  // Hentikan channeling terlebih dahulu
  finalPlayer2.cultivationLaw.isChanneling = false;
  finalPlayer2.cultivationLaw.dailyData.channelMinutesToday = 20;
  finalPlayer2.cultivationLaw.qi = 500;
  await finalPlayer2.save();

  let startSuccessCount = 0;
  let startLockRejectedCount = 0;

  const simulateStartRequest = async (requestId) => {
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
      startLockRejectedCount++;
      return { requestId, status: 429, error: 'Aksi meditasi sedang diproses.' };
    }

    try {
      const freshPlayer = await Player.findOne({ discordId: testDiscordId });
      const law = freshPlayer.cultivationLaw;

      if (!law?.activeLawType) {
        return { requestId, status: 400, error: 'Belum memilih Law.' };
      }

      if (law.isChanneling) {
        syncLawChanneling(freshPlayer);
        law.isChanneling = false;
        freshPlayer.markModified('cultivationLaw');
        await freshPlayer.save();
      }

      checkAndResetDailyCap(freshPlayer);
      const cap = getDailyChannelCap(law.dailyData?.dailyStreakDays || freshPlayer.dailyStreak || 0);
      const used = law.dailyData?.channelMinutesToday || 0;

      if (used >= cap) {
        return { requestId, status: 400, error: 'Batas meditasi harian tercapai.' };
      }

      if (law.qi >= law.maxQi) {
        return { requestId, status: 400, error: 'Qi sudah penuh.' };
      }

      law.isChanneling = true;
      law.lastChannelSyncAt = new Date();
      freshPlayer.markModified('cultivationLaw');
      await freshPlayer.save();

      startSuccessCount++;
      return { requestId, status: 200 };
    } finally {
      releaseLock();
    }
  };

  console.log(`Mengirim ${CONCURRENT_REQUESTS} request /channel/start secara simultan...`);
  const startResponses = await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => simulateStartRequest(i + 1))
  );

  console.log(`Hasil Eksekusi Start:`);
  console.log(`- Start Berhasil (200 OK): ${startSuccessCount}`);
  console.log(`- Start Ditolak Lock (429 Rate Limited): ${startLockRejectedCount}`);

  if (startSuccessCount !== 1) {
    throw new Error(`GAGAL! Seharusnya tepat 1 request start yang berhasil, tetapi ada ${startSuccessCount}!`);
  }

  // Uji Self-Healing: Jika player memanggil start lagi saat isChanneling: true (simulasi background session)
  console.log('\nUji Self-Healing Auto-Sync: Memulai kembali saat isChanneling=true...');
  const playerToAutoSync = await Player.findOne({ discordId: testDiscordId });
  playerToAutoSync.cultivationLaw.lastChannelSyncAt = new Date(Date.now() - 10 * 60 * 1000); // 10 menit lalu
  await playerToAutoSync.save();

  const qiBeforeAutoSync = playerToAutoSync.cultivationLaw.qi;
  // Panggil start lagi
  const autoSyncResult = await simulateStartRequest('autosync_test');
  const playerAfterAutoSync = await Player.findOne({ discordId: testDiscordId });

  console.log(`- Qi Sebelum Auto-Sync: ${qiBeforeAutoSync}`);
  console.log(`- Qi Sesudah Auto-Sync: ${playerAfterAutoSync.cultivationLaw.qi} (Qi 10 menit terselamatkan otomatis!)`);
  console.log(`- ChannelMinutesToday: ${playerAfterAutoSync.cultivationLaw.dailyData.channelMinutesToday} menit`);
  console.log(`- isChanneling: ${playerAfterAutoSync.cultivationLaw.isChanneling}`);

  if (playerAfterAutoSync.cultivationLaw.qi <= qiBeforeAutoSync) {
    throw new Error('GAGAL! Auto-sync seharusnya menyelamatkan Qi dari sesi sebelumnya!');
  }
  console.log('✅ TEST 4 LULUS: Concurrency lock /channel/start & auto-sync self-healing terbukti 100% aman.\n');

  // Bersihkan karakter uji
  await Player.deleteMany({ discordId: testDiscordId });
  await mongoose.disconnect();

  console.log('================================================================');
  console.log('🎉 SEMUA 4 PENGUJIAN PERTAHANAN RACE CONDITION LULUS SEMPURNA! 🛡️');
  console.log('================================================================');
}

runTest().catch((err) => {
  console.error('\n❌ PENGUJIAN GAGAL DENGAN ERROR:', err);
  process.exit(1);
});
