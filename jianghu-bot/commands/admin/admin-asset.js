const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminAddAsset = require('./handlers/adminAddAsset.js');
const adminEditAsset = require('./handlers/adminEditAsset.js');
const adminDeleteAsset = require('./handlers/adminDeleteAsset.js');
const adminAssetSetConstruction = require('./handlers/adminAssetSetConstruction.js');
const adminAssetFinishConstruction = require('./handlers/adminAssetFinishConstruction.js');
const adminAssetSetBuildRequirement = require('./handlers/adminAssetSetBuildRequirement.js');
const adminAssetRemoveBuildRequirement = require('./handlers/adminAssetRemoveBuildRequirement.js');
const adminAssetAddRecipe = require('./handlers/adminAssetAddRecipe.js');
const adminAssetRemoveRecipe = require('./handlers/adminAssetRemoveRecipe.js');
const adminAssetSetWorker = require('./handlers/adminAssetSetWorker.js');
const adminAssetRemoveWorker = require('./handlers/adminAssetRemoveWorker.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset')
    .setDescription('Manage assets')
    .addSubcommand(sub => sub.setName('add').setDescription('[ADMIN] Buat aset baru lewat form (modal)'))
    .addSubcommand(sub => sub.setName('edit').setDescription('[ADMIN] Edit aset lewat form (modal)').addStringOption(opt => opt.setName('nama').setDescription('Nama aset').setRequired(true)))
    .addSubcommand(sub => sub.setName('delete').setDescription('[ADMIN] Hapus aset dari database').addStringOption(opt => opt.setName('nama').setDescription('Nama aset').setRequired(true)))
    .addSubcommand(sub => sub.setName('set-construction').setDescription('[ADMIN] Atur waktu pembangunan (jam) untuk sebuah jenis aset').addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset').setRequired(true)).addIntegerOption(opt => opt.setName('jam').setDescription('Waktu pembangunan dalam jam (0 = langsung jadi)').setRequired(true).setMinValue(0)))
    .addSubcommand(sub => sub.setName('finish-construction').setDescription('[ADMIN] Percepat/selesaikan langsung pembangunan aset milik seorang player').addUserOption(opt => opt.setName('user').setDescription('Pemilik aset').setRequired(true)).addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset').setRequired(true)))
    .addSubcommand(sub => sub.setName('set-build-requirement').setDescription('[ADMIN] Atur material yang dibutuhkan supaya aset ini bisa dibangun mandiri oleh player/sekte').addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset').setRequired(true)).addStringOption(opt => opt.setName('bahan-1').setDescription('Nama item bahan #1').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah-1').setDescription('Jumlah bahan #1').setRequired(true).setMinValue(1)).addStringOption(opt => opt.setName('bahan-2').setDescription('Nama item bahan #2').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah-2').setDescription('Jumlah bahan #2').setRequired(true).setMinValue(1)).addStringOption(opt => opt.setName('bahan-3').setDescription('Nama item bahan #3').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah-3').setDescription('Jumlah bahan #3').setRequired(true).setMinValue(1)).addStringOption(opt => opt.setName('bahan-4').setDescription('Nama item bahan #4').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah-4').setDescription('Jumlah bahan #4').setRequired(true).setMinValue(1)).addStringOption(opt => opt.setName('bahan-5').setDescription('Nama item bahan #5').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah-5').setDescription('Jumlah bahan #5').setRequired(true).setMinValue(1)).addStringOption(opt => opt.setName('bahan-6').setDescription('Nama item bahan #6 (opsional)')).addIntegerOption(opt => opt.setName('jumlah-6').setDescription('Jumlah bahan #6').setMinValue(1)))
    .addSubcommand(sub => sub.setName('remove-build-requirement').setDescription('[ADMIN] Hapus kemampuan bangun mandiri dari sebuah aset').addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset').setRequired(true)))
    .addSubcommand(sub => sub.setName('add-recipe').setDescription('[ADMIN] Tambah resep crafting ke sebuah aset (mis. Tungku Tempa bisa buat Pedang)').addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset (jadi stasiun crafting)').setRequired(true)).addStringOption(opt => opt.setName('nama-resep').setDescription('Nama resep, cth: Pedang Baja').setRequired(true)).addStringOption(opt => opt.setName('item-hasil').setDescription('Nama item yang dihasilkan').setRequired(true)).addStringOption(opt => opt.setName('bahan-1').setDescription('Nama item bahan #1').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah-1').setDescription('Jumlah bahan #1').setRequired(true).setMinValue(1)).addIntegerOption(opt => opt.setName('jumlah-hasil').setDescription('Jumlah item yang dihasilkan (default 1)').setMinValue(1)).addStringOption(opt => opt.setName('bahan-2').setDescription('Nama item bahan #2 (opsional)')).addIntegerOption(opt => opt.setName('jumlah-2').setDescription('Jumlah bahan #2').setMinValue(1)).addStringOption(opt => opt.setName('bahan-3').setDescription('Nama item bahan #3 (opsional)')).addIntegerOption(opt => opt.setName('jumlah-3').setDescription('Jumlah bahan #3').setMinValue(1)))
    .addSubcommand(sub => sub.setName('remove-recipe').setDescription('[ADMIN] Hapus resep crafting dari sebuah aset').addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset').setRequired(true)).addStringOption(opt => opt.setName('nama-resep').setDescription('Nama resep yang mau dihapus').setRequired(true)))
    .addSubcommand(sub => sub.setName('set-worker').setDescription('[ADMIN] Jadikan aset sebagai tipe Pekerja (hasilkan material harian, mis. lahan batu bata)').addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset').setRequired(true)).addStringOption(opt => opt.setName('item-hasil').setDescription('Nama item yang dihasilkan per hari').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah-hasil').setDescription('Jumlah dihasilkan per hari (default 1)').setMinValue(1)))
    .addSubcommand(sub => sub.setName('remove-worker').setDescription('[ADMIN] Hapus fungsi Pekerja dari sebuah aset').addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'add') return adminAddAsset.execute(interaction);
    if (subcommand === 'edit') return adminEditAsset.execute(interaction);
    if (subcommand === 'delete') return adminDeleteAsset.execute(interaction);
    if (subcommand === 'set-construction') return adminAssetSetConstruction.execute(interaction);
    if (subcommand === 'finish-construction') return adminAssetFinishConstruction.execute(interaction);
    if (subcommand === 'set-build-requirement') return adminAssetSetBuildRequirement.execute(interaction);
    if (subcommand === 'remove-build-requirement') return adminAssetRemoveBuildRequirement.execute(interaction);
    if (subcommand === 'add-recipe') return adminAssetAddRecipe.execute(interaction);
    if (subcommand === 'remove-recipe') return adminAssetRemoveRecipe.execute(interaction);
    if (subcommand === 'set-worker') return adminAssetSetWorker.execute(interaction);
    if (subcommand === 'remove-worker') return adminAssetRemoveWorker.execute(interaction);
  }
};
