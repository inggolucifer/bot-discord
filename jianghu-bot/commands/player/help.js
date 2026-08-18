const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Lihat semua command player'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setColor(0x8e5b3c)
      .setTitle('📖 Daftar Command Player — Jianghu World')
      .addFields(
        { name: '🧍 Karakter', value: '`/daftar [nama] [jenis-kelamin] [umur]` — Daftar karakter baru\n`/profil [@user]` — Lihat profil karakter\n`/ubah-umur [umur-baru]` — Ubah umur karaktermu sendiri\n`/restart-karakter` — Restart karakter yang sudah mati' },
        { name: '💰 Currency', value: '`/convert [dari] [ke] [jumlah]` — Konversi mata uang\n`/transfer-currency @user [jenis] [jumlah]` — Kirim currency (butuh konfirmasi)\n`/daily` — Klaim hadiah harian (reset 00:00 WIB)' },
        { name: '🤝 Barter', value: '`/barter-offer @user ...` — Ajukan tukar-menukar item/currency' },
        { name: '🎒 Item, Pet, Aset', value: '`/cek-item [nama]` — Lihat detail item\n`/cek-pet [nama]` — Lihat detail pet\n`/cek-asset [nama]` — Lihat detail aset\n`/claim-profit` — Klaim profit harian dari aset (cek status pembangunan)' },
        { name: '⚒️ Crafting & Worker', value: '`/craft [nama-aset] [nama-resep]` — Buat item lewat aset crafting\n`/daftar-worker` — Daftar sebagai worker untuk disewa\n`/batal-worker` — Batal menjadi worker\n`/ubah-worker` — Ubah tarif/durasi worker\n`/pindah-worker` — Pindahkan worker yang disewa ke asetmu\n`/pekerja-saya` — Lihat pekerja yang kamu sewa\n`/sewa-worker-sistem` — Sewa NPC (5 silver/jam)' },
        { name: '🏪 System Shop', value: '`/shop sumber:System Shop [kategori]` — Lihat toko sistem\n`/beli [kategori] [nama] [jumlah]` — Beli barang\n`/jual [kategori] [nama] [jumlah]` — Jual ke sistem (20% dari harga dasar)\n`/cari-item [kata-kunci]` — Riset ketersediaan & harga item' },
        { name: '👤 Player Shop', value: '`/shop sumber:Player Shop` — Lihat listing jualan pemain\n`/jual-listing [item] [jumlah] [harga] [currency]` — Jual item\n`/jual-pet-listing` — Jual pet\n`/jual-asset-listing` — Jual asset\n`/beli-listing [kode]` — Beli listing pemain lain\n`/cancel-listing [kode]` — Batalkan listingmu' },
        { name: '🏯 Sekte', value: '`/sekte-info [nama]` — Info sekte & jabatan\n`/sekte-list` — Daftar semua sekte\n`/sekte-leaderboard` — 10 sekte terkaya\n`/sekte-donasi [jenis] [jumlah]` — Donasi ke kekayaan sekte (tidak bisa ditarik balik)\n`/sekte-deposit-resource [item] [jumlah]` — Setor sumber daya ke sekte\n`/sekte-claim-profit [nama]` — Klaim profit sekte (semua anggota, dibagi per jabatan)\n`/sekte-craft [sekte] [aset] [resep]` — Crafting pakai stok sekte\n`/sekte-bangun-asset [sekte] [aset]` — Bangun aset sekte pakai stok sekte' },
        { name: '👑 Kelola Sekte (khusus Ketua)', value: '`/sekte-kelola-anggota [user] [posisi]` — Angkat Wakil/Tetua/Anggota\n`/sekte-kick-anggota [user]` — Keluarkan anggota' },
        { name: '🔨 Bangun Aset Mandiri', value: '`/bangun-asset [nama]` — Bangun aset pribadi pakai material inventory (bukan beli pakai currency)' },
        { name: '☠️ Loot', value: '`/loot [nama]` — Ambil harta dari karakter yang meninggal (jika ditujukan padamu)' },
        { name: '🏆 Turnamen & Leaderboard', value: '`/tournament-bracket [nama]` — Lihat bracket turnamen\n`/leaderboard` — Lihat 10 player terkaya' },
      )
      .setFooter({ text: 'Admin? Gunakan /help-admin untuk melihat command khusus admin.' });

    return interaction.editReply({ embeds: [embed] });
  },
};

