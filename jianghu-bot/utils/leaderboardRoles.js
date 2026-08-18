// PENTING soal performa: fungsi ini TIDAK memakai polling/interval sama sekali.
// Dia hanya dipanggil sesaat setelah ada transaksi yang mengubah saldo player (lihat utils/logger.js).
// Di dalam, ada "early exit" dua lapis:
//   1. Kalau admin belum set role leaderboard sama sekali -> langsung return, tidak query apapun.
//   2. Kalau top-3 hasil hitung SAMA PERSIS dengan top-3 sebelumnya -> return, TIDAK ada 1 pun panggilan API Discord.
// Jadi di server yang rankingnya jarang berubah, fungsi ini nyaris tidak membebani bot/RAM sama sekali.

const GuildConfig = require('../models/GuildConfig');
const Player = require('../models/Player');

async function updateTop3LeaderboardRoles(client, guildId) {
  const config = await GuildConfig.findOne({ guildId });
  if (!config || !config.top3RoleIds?.some((r) => r)) return; // belum di-setup admin sama sekali

  const topPlayers = await Player.find({ guildId, status: 'active' })
    .sort({ totalWealth: -1 })
    .limit(3)
    .select('discordId totalWealth')
    .lean();

  const newHolders = [
    topPlayers[0]?.discordId || null,
    topPlayers[1]?.discordId || null,
    topPlayers[2]?.discordId || null,
  ];
  const oldHolders = config.top3RoleHolders?.length === 3 ? config.top3RoleHolders : [null, null, null];

  const unchanged = newHolders.every((v, i) => v === oldHolders[i]);
  if (unchanged) return; // tidak ada perubahan ranking -> tidak perlu sentuh Discord API sama sekali

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  for (let i = 0; i < 3; i++) {
    if (oldHolders[i] === newHolders[i]) continue;
    const roleId = config.top3RoleIds[i];
    if (!roleId) continue;

    // Copot role dari pemegang lama (kalau ada) -- ini bagian "yang disalip kehilangan role"
    if (oldHolders[i]) {
      const oldMember = await guild.members.fetch(oldHolders[i]).catch(() => null);
      if (oldMember) await oldMember.roles.remove(roleId).catch(() => {});
    }
    // Pasang role ke pemegang baru
    if (newHolders[i]) {
      const newMember = await guild.members.fetch(newHolders[i]).catch(() => null);
      if (newMember) await newMember.roles.add(roleId).catch(() => {});
    }
  }

  config.top3RoleHolders = newHolders;
  await config.save();
}

module.exports = { updateTop3LeaderboardRoles };

