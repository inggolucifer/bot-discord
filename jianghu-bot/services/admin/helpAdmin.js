const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder().setName('help-admin').setDescription('[ADMIN] Lihat semua command admin'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const embed = new EmbedBuilder()
      .setColor(0xc0392b)
      .setTitle('🛡️ Daftar Command Admin — Jianghu World')
      .addFields(
        { name: '🚀 Panel Cepat', value: '`/admin-panel` — Buka panel tombol untuk aksi cepat' },
        { name: '🗡️ Item', value: '`/admin item add` — Tambah item (modal)\n`/admin item edit` — Edit item (modal)\n`/admin item delete` — Hapus item dari db\n`/admin item set-image` — Set gambar' },
        { name: '🐾 Pet', value: '`/admin pet add` — Tambah pet (modal)\n`/admin pet edit` — Edit pet (modal)\n`/admin pet delete` — Hapus pet dari db\n`/admin pet stats` — Edit stats' },
        { name: '🏠 Asset', value: '`/admin asset add` — Buat aset (modal)\n`/admin asset edit` — Edit aset (modal)\n`/admin asset delete` — Hapus aset dari db\n`/admin asset set-construction`\n`/admin asset finish-construction`\n`/admin asset add-recipe`, `remove-recipe`\n`/admin asset set-worker`, `set-worker-input`, `remove-worker`\n`/admin asset set-build-requirement`, `remove-build-requirement`' },
        { name: '🔒 Channel Whitelist', value: '`/admin channel add` — Izinkan bot\n`/admin channel remove` — Cabut izin\n`/admin channel list` — List channel' },
        { name: '🧍 Player', value: '`/admin player edit` — Edit profil (modal)\n`/admin player give-currency`, `give-item`, `give-pet`, `give-asset`\n`/admin item remove` — Hapus item dari player\n`/admin pet remove` — Hapus pet dari player\n`/admin asset remove` — Hapus aset dari player' },
        { name: '⚖️ Moderasi & Status', value: '`/admin player freeze`, `unfreeze`\n`/admin player kill` — Tandai mati\n`/admin player force-unregister`\n`/admin player set-status`' },
        { name: '🏯 Sekte', value: '`/admin sekte create`, `delete`\n`/admin sekte assign`, `remove-member`\n`/admin sekte give-resource`, `give-asset`\n`/admin sekte war`' },
        { name: '🏪 Shop & Lelang', value: '`/admin shop add` — Tambah ke shop\n`/admin shop remove` — Hapus dari shop\n`/admin lelang config` — Set channel lelang\n`/admin lelang buat` — Buat lelang sistem' },
        { name: '🏆 Turnamen Bracket', value: '`/admin tournament create`, `cancel`, `list`\n`/admin tournament add-player`, `remove-player`\n`/admin tournament start`, `set-winner`' },
        { name: '👑 Role & Config', value: '`/admin leaderboard-role`, `realm-role-set`, `realm-role-remove`, `realm-role-list`\n`/admin set-log`, `set-log-retention`, `clear-logs`\n`/admin set-role`, `set-worker-channel`' },
      )
      .setFooter({ text: 'Semua aksi admin otomatis tercatat di channel log admin.' });

    return interaction.editReply({ embeds: [embed] });
  },
};
