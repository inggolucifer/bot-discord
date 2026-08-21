const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Lihat semua command player'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setColor(0x8e5b3c)
      .setTitle('📖 Daftar Command Player — Jianghu World')
      .addFields(
        { name: '🧍 Karakter', value: '`/daftar [nama]` — Daftar karakter baru\n`/profil [@user]` — Lihat profil karakter\n`/ubah-umur [umur-baru]` — Ubah umur karaktermu\n`/restart-karakter` — Restart karakter yang sudah mati' },
        { name: '💰 Currency', value: '`/convert [dari] [ke] [jumlah]` — Konversi mata uang\n`/transfer-currency @user [jenis] [jumlah]` — Kirim currency\n`/daily` — Klaim hadiah harian\n`/claim-profit` — Klaim profit dari aset' },
        { name: '🤝 Trade & Loot', value: '`/barter-offer @user ...` — Ajukan barter\n`/loot [nama]` — Ambil harta dari mayat' },
        { name: '🎒 Aset, Pet, Item', value: '`/asset cek`, `bangun`, `tambah-slot`\n`/pet list`, `status`, `feed`, `heal`, `rename`, `release`, `battle`, `buyslot`\n`/item cek`, `cari`, `craft`' },
        { name: '⚒️ Worker', value: '`/worker daftar`, `batal`, `ubah`, `pindah`, `pekerja-saya`, `sewa-sistem`' },
        { name: '🏪 Shop, Market, Lelang', value: '`/shop lihat`, `beli`, `jual` — Toko Sistem\n`/market jual-item`, `jual-pet`, `jual-asset`, `beli`, `batal` — Market Pemain\n`/lelang bid`, `request` — Lelang Sistem & Pemain' },
        { name: '🏯 Sekte', value: '`/sekte info`, `list`, `leaderboard`, `donasi`, `deposit-resource`, `bangun-asset`, `craft`, `claim-profit`, `kelola-anggota`, `kick-anggota`' },
        { name: '🏆 Turnamen & Rank', value: '`/tournament bracket [nama]` — Lihat bracket\n`/leaderboard` — 10 player terkaya' },
      )
      .setFooter({ text: 'Admin? Gunakan /help-admin untuk melihat command khusus admin.' });

    return interaction.editReply({ embeds: [embed] });
  },
};
