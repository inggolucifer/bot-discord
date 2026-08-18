// Player.sect adalah teks TAMPILAN saja. Sumber kebenaran ada di koleksi Sect (leaderId/viceLeaderId/elderIds/memberIds).
// Fungsi ini dipanggil setiap kali keanggotaan sekte seorang player berubah, supaya /profil selalu akurat
// tanpa perlu join/lookup Sect setiap kali /profil dipanggil (lebih hemat query untuk command yang sering dipakai).

const Player = require('../models/Player');

async function syncPlayerSectLabel(guildId, discordId, sectName /* null kalau keluar dari semua sekte */) {
  const player = await Player.findOne({ discordId, guildId });
  if (!player) return;
  player.sect = sectName || 'Tanpa Sekte (Rogue Cultivator)';
  await player.save();
}

module.exports = { syncPlayerSectLabel };

