const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminEditPlayer = require('./handlers/adminEditPlayer.js');
const adminFreeze = require('./handlers/adminFreeze.js');
const adminUnfreeze = require('./handlers/adminUnfreeze.js');
const adminKill = require('./handlers/adminKill.js');
const adminForceUnregister = require('./handlers/adminForceUnregister.js');
const adminSetStatus = require('./handlers/adminSetStatus.js');
const adminRemoveItem = require('./handlers/adminRemoveItem.js');
const adminRemovePet = require('./handlers/adminRemovePet.js');
const adminRemoveAsset = require('./handlers/adminRemoveAsset.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-player')
    .setDescription('Manage players')
    .addSubcommand(sub => sub.setName('edit').setDescription('[ADMIN] Edit data karakter player (ranah, umur, gender, gambar) lewat form').addUserOption(opt => opt.setName('user').setDescription('Player yang mau diedit').setRequired(true)))
    .addSubcommand(sub => sub.setName('freeze').setDescription('[ADMIN] Bekukan (freeze) karakter player yang curang').addUserOption(opt => opt.setName('user').setDescription('Target player').setRequired(true)).addStringOption(opt => opt.setName('alasan').setDescription('Alasan pembekuan')))
    .addSubcommand(sub => sub.setName('unfreeze').setDescription('[ADMIN] Cabut pembekuan karakter player').addUserOption(opt => opt.setName('user').setDescription('Target player').setRequired(true)))
    .addSubcommand(sub => sub.setName('kill').setDescription('[ADMIN] Tandai karakter mati; SEBAGIAN harta (acak, seperti loot sungguhan) pindah ke loot pool').addUserOption(opt => opt.setName('user').setDescription('Karakter yang mati').setRequired(true)).addUserOption(opt => opt.setName('loot-untuk').setDescription('Player yang berhak mengambil harta peninggalan').setRequired(true)))
    .addSubcommand(sub => sub.setName('unregister').setDescription('[ADMIN] Hapus paksa pendaftaran karakter player (data akan hilang permanen)').addUserOption(opt => opt.setName('user').setDescription('Target player').setRequired(true)))
    .addSubcommand(sub => sub.setName('set-status').setDescription('[ADMIN] Ubah status karakter (custom / base status)').addUserOption(opt => opt.setName('user').setDescription('Player yang akan diubah statusnya').setRequired(true)).addStringOption(opt => opt.setName('base-status').setDescription('Status dasar karakter').setRequired(true).addChoices({name: 'Active', value: 'active'}).addChoices({name: 'Frozen', value: 'frozen'}).addChoices({name: 'Dead', value: 'dead'})).addStringOption(opt => opt.setName('custom-status').setDescription('Status kustom (contoh: Sedang Meditasi)')))
    .addSubcommand(sub => sub.setName('remove-item').setDescription('[ADMIN] Hapus item dari inventory player tertentu').addUserOption(opt => opt.setName('user').setDescription('Target player').setRequired(true)).addStringOption(opt => opt.setName('nama').setDescription('Nama item').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah yang dihapus (default: semua)').setMinValue(1)))
    .addSubcommand(sub => sub.setName('remove-pet').setDescription('[ADMIN] Hapus pet dari koleksi player tertentu').addUserOption(opt => opt.setName('user').setDescription('Target player').setRequired(true)).addStringOption(opt => opt.setName('nama').setDescription('Nama pet').setRequired(true)).addStringOption(opt => opt.setName('nickname').setDescription('Nickname spesifik (kalau player punya beberapa pet sama nama)')))
    .addSubcommand(sub => sub.setName('remove-asset').setDescription('[ADMIN] Hapus kepemilikan aset dari player tertentu').addUserOption(opt => opt.setName('user').setDescription('Target player').setRequired(true)).addStringOption(opt => opt.setName('nama').setDescription('Nama aset').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah yang dihapus (default: semua)').setMinValue(1))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'edit') return adminEditPlayer.execute(interaction);
    if (subcommand === 'freeze') return adminFreeze.execute(interaction);
    if (subcommand === 'unfreeze') return adminUnfreeze.execute(interaction);
    if (subcommand === 'kill') return adminKill.execute(interaction);
    if (subcommand === 'unregister') return adminForceUnregister.execute(interaction);
    if (subcommand === 'set-status') return adminSetStatus.execute(interaction);
    if (subcommand === 'remove-item') return adminRemoveItem.execute(interaction);
    if (subcommand === 'remove-pet') return adminRemovePet.execute(interaction);
    if (subcommand === 'remove-asset') return adminRemoveAsset.execute(interaction);
  }
};
