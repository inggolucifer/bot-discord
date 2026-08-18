// Sama seperti leaderboardRoles.js: murni event-driven, dipanggil SEKALI setiap admin mengubah ranah
// seorang player (lewat /admin-edit-player) atau saat player baru /daftar. Tidak ada polling sama sekali.

const GuildConfig = require('../models/GuildConfig');

async function syncRealmRole(client, guildId, discordId, newRealmName) {
  const config = await GuildConfig.findOne({ guildId });
  if (!config || !config.realmRoles?.length) return; // belum ada mapping role ranah -> skip total

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;
  const member = await guild.members.fetch(discordId).catch(() => null);
  if (!member) return;

  const target = config.realmRoles.find((r) => r.realmName.toLowerCase() === newRealmName.trim().toLowerCase());

  // Copot semua role ranah LAIN yang mungkin masih menempel (supaya tidak dobel-dobel role ranah)
  const otherRealmRoleIds = config.realmRoles
    .map((r) => r.roleId)
    .filter((rid) => rid !== target?.roleId && member.roles.cache.has(rid));
  if (otherRealmRoleIds.length) await member.roles.remove(otherRealmRoleIds).catch(() => {});

  // Pasang role ranah yang baru (kalau ada mapping-nya dan belum dipasang)
  if (target && !member.roles.cache.has(target.roleId)) {
    await member.roles.add(target.roleId).catch(() => {});
  }
}

module.exports = { syncRealmRole };

