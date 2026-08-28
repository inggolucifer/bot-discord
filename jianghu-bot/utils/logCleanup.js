// Auto-cleanup log lama supaya koleksi transactionlogs & adminlogs di MongoDB tidak membengkak
// tanpa batas. HANYA menghapus dokumen log (TransactionLog, AdminLog) yang
// sudah lama. TIDAK PERNAH menyentuh Player, Item, Pet, Asset, Shop, Tournament,
// atau LootPool yang belum diklaim -- data inti/gameplay 100% aman.
//
// Dijalankan lewat SATU setInterval ringan di index.js (bukan cron job terpisah / bukan library
// tambahan), jadi tidak menambah beban proses baru ke bot.

const GuildConfig = require('../models/GuildConfig');
const TransactionLog = require('../models/TransactionLog');
const AdminLog = require('../models/AdminLog');

async function cleanupOldLogsForGuild(guildId, retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const [txResult, adminResult] = await Promise.all([
    TransactionLog.deleteMany({ guildId, createdAt: { $lt: cutoff } }),
    AdminLog.deleteMany({ guildId, createdAt: { $lt: cutoff } }),
  ]);

  return {
    transactionLogs: txResult.deletedCount,
    adminLogs: adminResult.deletedCount,
  };
}

/** Dipanggil manual oleh /admin-clear-logs (immediate, untuk 1 guild saja) */
async function manualCleanup(guildId, retentionDays) {
  return cleanupOldLogsForGuild(guildId, retentionDays);
}

/** Dipanggil otomatis oleh scheduler di index.js untuk SEMUA guild yang bot ikuti */
async function runScheduledCleanup(client) {
  const configs = await GuildConfig.find({}).lean();
  let totalDeleted = 0;

  for (const config of configs) {
    try {
      const retentionDays = config.logRetentionDays || 30;
      const result = await cleanupOldLogsForGuild(config.guildId, retentionDays);
      const deleted = result.transactionLogs + result.adminLogs;
      totalDeleted += deleted;

      await GuildConfig.updateOne({ guildId: config.guildId }, { $set: { lastLogCleanupAt: new Date() } });

      if (deleted > 0) {
        console.log(`[LOG-CLEANUP] Guild ${config.guildId}: ${result.transactionLogs} transaction log, ${result.adminLogs} admin log dihapus.`);
      }
    } catch (err) {
      console.error(`[LOG-CLEANUP] Gagal cleanup untuk guild ${config.guildId}:`, err.message);
    }
  }

  if (totalDeleted > 0) console.log(`[LOG-CLEANUP] Selesai. Total ${totalDeleted} dokumen log lama dibersihkan dari semua server.`);
}

module.exports = { manualCleanup, runScheduledCleanup };

