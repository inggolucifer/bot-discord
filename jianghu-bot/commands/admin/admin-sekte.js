const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminSekteCreate = require('./handlers/adminSekteCreate.js');
const adminSekteDelete = require('./handlers/adminSekteDelete.js');
const adminSekteAssign = require('./handlers/adminSekteAssign.js');
const adminSekteRemoveMember = require('./handlers/adminSekteRemoveMember.js');
const adminSekteGiveResource = require('./handlers/adminSekteGiveResource.js');
const adminSekteGiveAsset = require('./handlers/adminSekteGiveAsset.js');
const adminSekteWar = require('./handlers/adminSekteWar.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-sekte')
    .setDescription('Manage sekte')
    .addSubcommand(sub => sub.setName('create').setDescription('[ADMIN] Buat sekte baru').addStringOption(opt => opt.setName('nama').setDescription('Nama sekte').setRequired(true)).addStringOption(opt => opt.setName('deskripsi').setDescription('Deskripsi sekte')).addStringOption(opt => opt.setName('gambar-url').setDescription('URL gambar/lambang sekte')))
    .addSubcommand(sub => sub.setName('delete').setDescription('[ADMIN] Bubarkan sebuah sekte secara permanen').addStringOption(opt => opt.setName('nama-sekte').setDescription('Nama sekte').setRequired(true)))
    .addSubcommand(sub => sub.setName('assign').setDescription('[ADMIN] Angkat/pindahkan player ke sebuah jabatan di sekte').addStringOption(opt => opt.setName('nama-sekte').setDescription('Nama sekte').setRequired(true)).addUserOption(opt => opt.setName('user').setDescription('Player yang diangkat').setRequired(true)).addStringOption(opt => opt.setName('posisi').setDescription('Jabatan di sekte').setRequired(true).addChoices({name: 'Ketua', value: 'Ketua'}).addChoices({name: 'Wakil Ketua', value: 'Wakil Ketua'}).addChoices({name: 'Tetua', value: 'Tetua'}).addChoices({name: 'Anggota', value: 'Anggota'})))
    .addSubcommand(sub => sub.setName('remove-member').setDescription('[ADMIN] Keluarkan player dari sekte (jabatan apapun)').addStringOption(opt => opt.setName('nama-sekte').setDescription('Nama sekte').setRequired(true)).addUserOption(opt => opt.setName('user').setDescription('Player yang dikeluarkan').setRequired(true)))
    .addSubcommand(sub => sub.setName('give-resource').setDescription('[ADMIN] Beri sumber daya (item bahan) ke stok sekte').addStringOption(opt => opt.setName('nama-sekte').setDescription('Nama sekte').setRequired(true)).addStringOption(opt => opt.setName('nama-item').setDescription('Nama item/bahan').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('give-asset').setDescription('[ADMIN] Beri kepemilikan aset ke sebuah sekte').addStringOption(opt => opt.setName('nama-sekte').setDescription('Nama sekte').setRequired(true)).addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah (default 1)').setMinValue(1)).addBooleanOption(opt => opt.setName('skip-pembangunan').setDescription('Lewati waktu pembangunan? Default: tidak')))
    .addSubcommand(sub => sub.setName('war').setDescription('[ADMIN] Perang sekte: pemenang loot sebagian aset sekte kalah (acak)').addStringOption(opt => opt.setName('sekte-menang').setDescription('Sekte yang menang').setRequired(true)).addStringOption(opt => opt.setName('sekte-kalah').setDescription('Sekte yang kalah (akan hancur, kembali ke 0)').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'create') return adminSekteCreate.execute(interaction);
    if (subcommand === 'delete') return adminSekteDelete.execute(interaction);
    if (subcommand === 'assign') return adminSekteAssign.execute(interaction);
    if (subcommand === 'remove-member') return adminSekteRemoveMember.execute(interaction);
    if (subcommand === 'give-resource') return adminSekteGiveResource.execute(interaction);
    if (subcommand === 'give-asset') return adminSekteGiveAsset.execute(interaction);
    if (subcommand === 'war') return adminSekteWar.execute(interaction);
  }
};
