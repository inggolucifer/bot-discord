const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Command khusus Admin')

    // ITEM GROUP
    .addSubcommandGroup(group => group
      .setName('item')
      .setDescription('Manajemen Item')
      .addSubcommand(sub => sub.setName('add').setDescription('Tambah item baru (via modal)'))
      .addSubcommand(sub => sub.setName('edit').setDescription('Edit item (via modal)').addStringOption(o => o.setName('nama').setDescription('Nama item').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('delete').setDescription('Hapus item permanen').addStringOption(o => o.setName('nama').setDescription('Nama item').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('remove').setDescription('Hapus item dari pemain').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)).addStringOption(o => o.setName('nama').setDescription('Nama item').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah').setMinValue(1)))
      .addSubcommand(sub => sub.setName('set-image').setDescription('Atur gambar/image url untuk item').addStringOption(o => o.setName('nama-item').setDescription('Nama item').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('image-url').setDescription('URL Gambar').setRequired(true)))
    )

    // PET GROUP
    .addSubcommandGroup(group => group
      .setName('pet')
      .setDescription('Manajemen Pet')
      .addSubcommand(sub => sub.setName('add').setDescription('Tambah pet baru (via modal)'))
      .addSubcommand(sub => sub.setName('edit').setDescription('Edit pet (via modal)').addStringOption(o => o.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('delete').setDescription('Hapus pet permanen').addStringOption(o => o.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('remove').setDescription('Hapus pet dari pemain').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)).addStringOption(o => o.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('stats').setDescription('Edit stats pet (via modal)').addStringOption(o => o.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true)))
    )

    // ASSET GROUP
    .addSubcommandGroup(group => group
      .setName('asset')
      .setDescription('Manajemen Asset')
      .addSubcommand(sub => sub.setName('add').setDescription('Tambah aset baru (via modal)'))
      .addSubcommand(sub => sub.setName('edit').setDescription('Edit aset (via modal)').addStringOption(o => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('delete').setDescription('Hapus aset permanen').addStringOption(o => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('remove').setDescription('Hapus aset dari pemain').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)).addStringOption(o => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah').setMinValue(1)))
      .addSubcommand(sub => sub.setName('set-construction').setDescription('Atur aset jadi perlu dibangun').addStringOption(o => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jam').setDescription('Waktu bangun (jam)').setRequired(true)))
      .addSubcommand(sub => sub.setName('finish-construction').setDescription('Selesaikan pembangunan instan').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)).addStringOption(o => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('set-build-requirement').setDescription('Syarat material bangun').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('nama-item').setDescription('Item material').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah material').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove-build-requirement').setDescription('Hapus syarat bangun').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('nama-item').setDescription('Item material').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('add-recipe').setDescription('Tambah resep aset').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('nama-resep').setDescription('Nama resep').setRequired(true)).addStringOption(o => o.setName('item-hasil').setDescription('Item hasil').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah-hasil').setDescription('Jumlah hasil').setRequired(true)).addStringOption(o => o.setName('materials').setDescription('Material (Contoh: Kayu:2,Besi:1)').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove-recipe').setDescription('Hapus resep').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('nama-resep').setDescription('Nama resep').setRequired(true)))
      .addSubcommand(sub => sub.setName('set-worker').setDescription('Set pekerja NPC').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('item-hasil').setDescription('Item hasil').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah-hasil').setDescription('Jumlah per hari').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove-worker').setDescription('Hapus pekerja NPC').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true)))
    )

    // SHOP GROUP
    .addSubcommandGroup(group => group
      .setName('shop')
      .setDescription('Manajemen Shop')
      .addSubcommand(sub => sub.setName('add').setDescription('Tambah barang ke shop').addStringOption(o => o.setName('kategori').setDescription('Kategori').setRequired(true).addChoices({ name: 'Item', value: 'item' }, { name: 'Pet', value: 'pet' }, { name: 'Asset', value: 'asset' })).addStringOption(o => o.setName('nama').setDescription('Nama barang').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('harga').setDescription('Harga').setRequired(true)).addStringOption(o => o.setName('currency').setDescription('Mata uang').setRequired(true).addChoices({ name: 'Silver Tael', value: 'silver' }, { name: 'Gold Ingot', value: 'gold' }, { name: 'Spirit Jade', value: 'jade' }, { name: 'Heavenly Spirit', value: 'spirit' })).addIntegerOption(o => o.setName('stok').setDescription('Stok (-1 unli)')))
      .addSubcommand(sub => sub.setName('remove').setDescription('Hapus barang dari shop').addStringOption(o => o.setName('kategori').setDescription('Kategori').setRequired(true).addChoices({ name: 'Item', value: 'item' }, { name: 'Pet', value: 'pet' }, { name: 'Asset', value: 'asset' })).addStringOption(o => o.setName('nama').setDescription('Nama barang').setRequired(true).setAutocomplete(true)))
    )

    // PLAYER GROUP
    .addSubcommandGroup(group => group
      .setName('player')
      .setDescription('Manajemen Pemain')
      .addSubcommand(sub => sub.setName('edit').setDescription('Edit profil pemain (via modal)').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)))
      .addSubcommand(sub => sub.setName('give-currency').setDescription('Beri uang').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)).addStringOption(o => o.setName('jenis').setDescription('Jenis').setRequired(true).addChoices({ name: 'Silver', value: 'silver' }, { name: 'Gold', value: 'gold' }, { name: 'Jade', value: 'jade' }, { name: 'Spirit', value: 'spirit' })).addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah').setRequired(true)))
      .addSubcommand(sub => sub.setName('give-item').setDescription('Beri item').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)).addStringOption(o => o.setName('nama').setDescription('Nama item').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah')))
      .addSubcommand(sub => sub.setName('give-pet').setDescription('Beri pet').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)).addStringOption(o => o.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('nickname').setDescription('Nickname')))
      .addSubcommand(sub => sub.setName('give-asset').setDescription('Beri aset').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)).addStringOption(o => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah')))
      .addSubcommand(sub => sub.setName('freeze').setDescription('Bekukan').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)).addStringOption(o => o.setName('alasan').setDescription('Alasan')))
      .addSubcommand(sub => sub.setName('unfreeze').setDescription('Unfreeze').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)))
      .addSubcommand(sub => sub.setName('kill').setDescription('Bunuh').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)).addUserOption(o => o.setName('loot-untuk').setDescription('Beri loot ke').setRequired(true)))
      .addSubcommand(sub => sub.setName('force-unregister').setDescription('Hapus akun').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)))
      .addSubcommand(sub => sub.setName('set-status').setDescription('Set custom status').addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)).addStringOption(o => o.setName('status').setDescription('Status (kosong=hapus)')))
    )

    // CHANNEL GROUP
    .addSubcommandGroup(group => group
      .setName('channel')
      .setDescription('Manajemen Channel')
      .addSubcommand(sub => sub.setName('add').setDescription('Izinkan bot di channel').addChannelOption(o => o.setName('channel').setDescription('Channel')))
      .addSubcommand(sub => sub.setName('remove').setDescription('Hapus izin bot').addChannelOption(o => o.setName('channel').setDescription('Channel')))
      .addSubcommand(sub => sub.setName('list').setDescription('List channel'))
    )

    // SEKTE GROUP
    .addSubcommandGroup(group => group
      .setName('sekte')
      .setDescription('Manajemen Sekte')
      .addSubcommand(sub => sub.setName('create').setDescription('Buat sekte').addStringOption(o => o.setName('nama').setDescription('Nama').setRequired(true)))
      .addSubcommand(sub => sub.setName('delete').setDescription('Hapus sekte').addStringOption(o => o.setName('nama').setDescription('Nama').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('assign').setDescription('Set ketua').addStringOption(o => o.setName('nama').setDescription('Sekte').setRequired(true).setAutocomplete(true)).addUserOption(o => o.setName('user').setDescription('Ketua').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove-member').setDescription('Keluarkan anggota').addUserOption(o => o.setName('user').setDescription('Anggota').setRequired(true)))
      .addSubcommand(sub => sub.setName('give-asset').setDescription('Beri aset').addStringOption(o => o.setName('nama-sekte').setDescription('Sekte').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('nama-aset').setDescription('Aset').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah')))
      .addSubcommand(sub => sub.setName('give-resource').setDescription('Beri resource').addStringOption(o => o.setName('nama-sekte').setDescription('Sekte').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('nama-item').setDescription('Item').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah')))
      .addSubcommand(sub => sub.setName('war').setDescription('Perang').addStringOption(o => o.setName('penyerang').setDescription('Penyerang').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('bertahan').setDescription('Bertahan').setRequired(true).setAutocomplete(true)))
    )

    // TOURNAMENT GROUP
    .addSubcommandGroup(group => group
      .setName('tournament')
      .setDescription('Manajemen Turnamen')
      .addSubcommand(sub => sub.setName('create').setDescription('Buat').addStringOption(o => o.setName('nama').setDescription('Nama').setRequired(true)))
      .addSubcommand(sub => sub.setName('start').setDescription('Mulai').addStringOption(o => o.setName('nama-turnamen').setDescription('Turnamen').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('cancel').setDescription('Batal').addStringOption(o => o.setName('nama-turnamen').setDescription('Turnamen').setRequired(true).setAutocomplete(true)))
      .addSubcommand(sub => sub.setName('list').setDescription('List'))
      .addSubcommand(sub => sub.setName('add-player').setDescription('Tambah pemain').addStringOption(o => o.setName('nama-turnamen').setDescription('Turnamen').setRequired(true).setAutocomplete(true)).addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove-player').setDescription('Hapus pemain').addStringOption(o => o.setName('nama-turnamen').setDescription('Turnamen').setRequired(true).setAutocomplete(true)).addUserOption(o => o.setName('user').setDescription('Pemain').setRequired(true)))
      .addSubcommand(sub => sub.setName('set-winner').setDescription('Set pemenang').addStringOption(o => o.setName('nama-turnamen').setDescription('Turnamen').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('match-nomor').setDescription('Nomor Match').setRequired(true)).addUserOption(o => o.setName('pemenang').setDescription('Pemenang').setRequired(true)))
    )

    // OTHERS
    .addSubcommand(sub => sub.setName('realm-role-set').setDescription('Set role ranah').addStringOption(o => o.setName('nama-ranah').setDescription('Nama').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(sub => sub.setName('realm-role-remove').setDescription('Hapus role ranah').addStringOption(o => o.setName('nama-ranah').setDescription('Nama').setRequired(true)))
    .addSubcommand(sub => sub.setName('realm-role-list').setDescription('List role ranah'))
    .addSubcommand(sub => sub.setName('leaderboard-role').setDescription('Role rank 1/2/3').addIntegerOption(o => o.setName('peringkat').setDescription('Rank').setRequired(true).addChoices({ name: '1', value: 1 },{ name: '2', value: 2 },{ name: '3', value: 3 })).addRoleOption(o => o.setName('role').setDescription('Role')))
    .addSubcommand(sub => sub.setName('set-log').setDescription('Set channel log').addChannelOption(o => o.setName('channel').setDescription('Channel log')).addChannelOption(o => o.setName('admin-channel').setDescription('Channel admin log')))
    .addSubcommand(sub => sub.setName('set-log-retention').setDescription('Set retensi log').addIntegerOption(o => o.setName('hari').setDescription('Hari').setRequired(true)))
    .addSubcommand(sub => sub.setName('clear-logs').setDescription('Clear log manual'))
    .addSubcommand(sub => sub.setName('set-role').setDescription('Set admin role').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(sub => sub.setName('set-worker-channel').setDescription('Set worker channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))),

  async autocomplete(interaction) {
    const adminRouter = require('../../services/adminRouter');
    if (adminRouter.autocomplete) return adminRouter.autocomplete(interaction);
  },

  async execute(interaction) {
    const adminRouter = require('../../services/adminRouter');
    return adminRouter.execute(interaction);
  }
};
