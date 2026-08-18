// Helper untuk mencatat transaksi & aksi admin ke DB + kirim ke channel log Discord
const TransactionLog = require('../models/TransactionLog');
const AdminLog = require('../models/AdminLog');
const GuildConfig = require('../models/GuildConfig');
const { EmbedBuilder } = require('discord.js');
const { updateTop3LeaderboardRoles } = require('./leaderboardRoles');

// Tipe transaksi yang benar-benar mengubah saldo player -> perlu dicek ulang untuk role leaderboard Top 1/2/3.
// Tipe di luar daftar ini (mis. hanya query/lihat) tidak akan memicu pengecekan sama sekali.
const WEALTH_AFFECTING_TYPES = new Set([
  'daily_claim', 'convert', 'transfer', 'barter', 'shop_purchase',
  'sell_to_system', 'asset_profit_claim', 'admin_grant', 'admin_revoke', 'loot_claim',
]);

async function logTransaction(client, { guildId, type, fromUserId = null, toUserId = null, currency = null, amount = 0, itemDescription = null, balanceAfter = null, note = null }) {
  const entry = await TransactionLog.create({ guildId, type, fromUserId, toUserId, currency, amount, itemDescription, balanceAfter, note });

  try {
    const config = await GuildConfig.findOne({ guildId });
    if (config?.logChannelId) {
      const channel = await client.channels.fetch(config.logChannelId).catch(() => null);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0x8e5b3c)
          .setTitle('📜 Log Transaksi')
          .addFields(
            { name: 'Tipe', value: type, inline: true },
            { name: 'Dari', value: fromUserId ? `<@${fromUserId}>` : '-', inline: true },
            { name: 'Ke', value: toUserId ? `<@${toUserId}>` : '-', inline: true },
          )
          .setTimestamp();
        if (currency && amount) embed.addFields({ name: 'Jumlah', value: `${amount} ${currency}`, inline: true });
        if (itemDescription) embed.addFields({ name: 'Detail', value: itemDescription });
        if (note) embed.addFields({ name: 'Catatan', value: note });
        await channel.send({ embeds: [embed] });
      }
    }
  } catch (e) {
    console.error('[LOGGER] Gagal kirim log transaksi ke channel:', e.message);
  }

  // Sinkronisasi role Top 1/2/3 terkaya HANYA untuk tipe transaksi yang benar-benar mengubah saldo.
  // Fungsi ini sendiri sudah punya early-exit kalau belum di-setup / ranking tidak berubah (lihat utils/leaderboardRoles.js),
  // jadi pemanggilan ini aman dan ringan, tidak membebani bot.
  if (WEALTH_AFFECTING_TYPES.has(type)) {
    updateTop3LeaderboardRoles(client, guildId).catch((e) => console.error('[LOGGER] Gagal sync role leaderboard:', e.message));
  }

  return entry;
}

async function logAdminAction(client, { guildId, adminId, action, targetUserId = null, details = null }) {
  const entry = await AdminLog.create({ guildId, adminId, action, targetUserId, details });

  try {
    const config = await GuildConfig.findOne({ guildId });
    const channelId = config?.adminLogChannelId || config?.logChannelId;
    if (channelId) {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0xc0392b)
          .setTitle('🛡️ Log Aksi Admin')
          .addFields(
            { name: 'Admin', value: `<@${adminId}>`, inline: true },
            { name: 'Aksi', value: action, inline: true },
            { name: 'Target', value: targetUserId ? `<@${targetUserId}>` : '-', inline: true },
          )
          .setTimestamp();
        if (details) embed.addFields({ name: 'Detail', value: details });
        await channel.send({ embeds: [embed] });
      }
    }
  } catch (e) {
    console.error('[LOGGER] Gagal kirim log admin ke channel:', e.message);
  }
  return entry;
}

module.exports = { logTransaction, logAdminAction };

