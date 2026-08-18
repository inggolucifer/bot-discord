const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder().setName('help-admin').setDescription('[ADMIN] Lihat semua command admin'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const embed = new EmbedBuilder()
      .setColor(0xc0392b)
      .setTitle('🛡️ Daftar Command Admin — Jianghu World')
      .addFields(
        { name: '🚀 Panel Cepat', value: '`/admin-panel` — Buka panel tombol untuk aksi cepat' },
        { name: '🗡️ Item', value: '`/admin-add-item` — Tambah item + harga (modal)\n`/admin-edit-item [nama]` — Edit item (modal)\n`/admin-delete-item [nama]` — Hapus item' },
        { name: '🐾 Pet', value: '`/admin-add-pet` — Tambah pet + harga (modal)\n`/admin-edit-pet [nama]` — Edit pet (modal)\n`/admin-delete-pet [nama]` — Hapus pet' },
        { name: '🏠 Asset', value: '`/admin-add-asset` — Buat aset + harga (modal)\n`/admin-edit-asset [nama]` — Edit aset (modal)\n`/admin-delete-asset [nama]` — Hapus aset\n`/admin-asset-set-construction [nama] [jam]` — Atur waktu pembangunan\n`/admin-asset-finish-construction @user [nama]` — Percepat pembangunan milik player\n`/admin-asset-add-recipe ...` — Tambah resep crafting ke aset\n`/admin-asset-remove-recipe [aset] [resep]` — Hapus resep\n`/admin-asset-set-worker [aset] [item-hasil] [jumlah]` — Jadikan aset tipe Pekerja (hasilkan material harian)\n`/admin-asset-remove-worker [aset]`\n`/admin-asset-build-req-set [aset] [bahan...]` — Atur syarat bangun mandiri\n`/admin-asset-build-req-remove [aset]`' },
        { name: '🔒 Channel Whitelist', value: '`/admin-channel-add [channel]` — Izinkan bot di channel ini\n`/admin-channel-remove [channel]` — Cabut izin channel\n`/admin-channel-list` — Lihat semua channel yang diizinkan' },
        { name: '🧍 Player', value: '`/admin-edit-player @user` — Edit ranah/stage/umur/gender/gambar (modal)\n`/admin-give-currency @user [jenis] [jumlah]`\n`/admin-give-item @user [nama] [jumlah]`\n`/admin-give-pet @user [nama] [nickname]`\n`/admin-give-asset @user [nama] [jumlah]`\n`/admin-remove-item @user [nama] [jumlah]`\n`/admin-remove-pet @user [nama]`\n`/admin-remove-asset @user [nama] [jumlah]`' },
        { name: '🏯 Sekte', value: '`/admin-sekte-create [nama]` — Buat sekte\n`/admin-sekte-assign [sekte] @user [posisi]` — Angkat Ketua/Wakil/Tetua/Anggota\n`/admin-sekte-remove-member [sekte] @user` — Keluarkan dari sekte\n`/admin-sekte-delete [sekte]` — Bubarkan sekte (konfirmasi)\n`/admin-sekte-give-resource [sekte] [item] [jumlah]`\n`/admin-sekte-give-asset [sekte] [aset] [jumlah]`\n`/admin-sekte-war [sekte-menang] [sekte-kalah]` — Deklarasikan perang, loot acak, sekte kalah hancur ke 0 (konfirmasi)' },
        { name: '⚖️ Moderasi & Status', value: '`/admin-freeze @user [alasan]` — Bekukan karakter\n`/admin-unfreeze @user` — Cabut pembekuan\n`/admin-kill @user @loot-untuk` — Tandai mati\n`/admin-force-unregister @user` — Hapus paksa karakter\n`/admin-set-status @user [base] [custom]` — Ubah status karakter (custom/base)' },
        { name: '🏪 Shop', value: '`/admin-shop-add [kategori] [nama] [harga] [currency] [stok]`\n`/admin-shop-remove [kategori] [nama]`' },
        { name: '🏆 Turnamen Bracket', value: '`/admin-tournament-create [nama]`\n`/admin-tournament-add-player [turnamen] @user`\n`/admin-tournament-remove-player [turnamen] @user`\n`/admin-tournament-start [turnamen]`\n`/admin-tournament-set-winner [turnamen] [match] @pemenang`\n`/admin-tournament-cancel [turnamen]`\n`/admin-tournament-list`' },
        { name: '👑 Role Otomatis', value: '`/admin-leaderboard-role [peringkat] @role` — Role Top 1/2/3 terkaya\n`/admin-realm-role-set [ranah] @role` — Role otomatis per ranah\n`/admin-realm-role-remove [ranah]`\n`/admin-realm-role-list` — Lihat semua mapping role' },
        { name: '🗑️ Manajemen Log', value: '`/admin-set-log-retention [hari]` — Atur usia log sebelum auto-terhapus\n`/admin-clear-logs` — Hapus log lama manual sekarang' },
        { name: '⚙️ Konfigurasi Server', value: '`/admin-set-log [channel-transaksi] [channel-admin]`\n`/admin-set-role @role` — Jadikan role tertentu sebagai admin bot\n`/admin-set-worker-channel [channel]` — Channel worker' },
      )
      .setFooter({ text: 'Semua aksi admin otomatis tercatat di channel log admin.' });

    return interaction.editReply({ embeds: [embed] });
  },
};

