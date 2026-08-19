const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminRealmRoleSet = require('./handlers/adminRealmRoleSet.js');
const adminRealmRoleRemove = require('./handlers/adminRealmRoleRemove.js');
const adminRealmRoleList = require('./handlers/adminRealmRoleList.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-realm-role')
    .setDescription('Manage realm roles')
    .addSubcommand(sub => sub.setName('set').setDescription('[ADMIN] Hubungkan nama ranah tertentu dengan sebuah role (otomatis dipasang/dicopot)').addStringOption(opt => opt.setName('nama-ranah').setDescription('Nama ranah PERSIS seperti yang diisi di /admin-edit-player, contoh: Mortal').setRequired(true)).addRoleOption(opt => opt.setName('role').setDescription('Role yang dipasang otomatis untuk ranah ini').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('[ADMIN] Hapus mapping role otomatis untuk ranah tertentu').addStringOption(opt => opt.setName('nama-ranah').setDescription('Nama ranah yang mappingnya mau dihapus').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('[ADMIN] Lihat semua mapping role ranah & role leaderboard')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'set') return adminRealmRoleSet.execute(interaction);
    if (subcommand === 'remove') return adminRealmRoleRemove.execute(interaction);
    if (subcommand === 'list') return adminRealmRoleList.execute(interaction);
  }
};
