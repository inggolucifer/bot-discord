// Menentukan siapa saja yang dianggap "Admin Bot" di suatu server
const GuildConfig = require('../models/GuildConfig');

const OWNER_IDS = (process.env.OWNER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

async function isAdmin(interaction) {
  // 1. Owner bot (dari .env) selalu admin di semua server
  if (OWNER_IDS.includes(interaction.user.id)) return true;

  // 2. User dengan permission "Manage Server" di Discord otomatis dianggap admin bot
  if (interaction.memberPermissions?.has('ManageGuild')) return true;

  // 3. User yang punya salah satu role yang di-set sebagai admin role via /admin-set-log atau panel
  const config = await GuildConfig.findOne({ guildId: interaction.guildId });
  if (config?.adminRoleIds?.length) {
    const memberRoles = interaction.member?.roles?.cache;
    if (memberRoles) {
      for (const roleId of config.adminRoleIds) {
        if (memberRoles.has(roleId)) return true;
      }
    }
  }
  return false;
}

/**
 * Cek apakah bot boleh dipakai di channel ini.
 * - Kalau allowedChannelIds masih kosong (belum di-setting admin) -> bot bebas dipakai di semua channel.
 * - Kalau sudah ada isinya -> HANYA channel yang ada di daftar itu yang boleh.
 */
async function isChannelAllowed(interaction) {
  const config = await GuildConfig.findOne({ guildId: interaction.guildId });
  if (!config || !config.allowedChannelIds?.length) return true; // belum diset = terbuka semua channel
  return config.allowedChannelIds.includes(interaction.channelId);
}

module.exports = { isAdmin, isChannelAllowed, OWNER_IDS };
