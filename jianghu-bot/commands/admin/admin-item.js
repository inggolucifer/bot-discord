const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminAddItem = require('./handlers/adminAddItem.js');
const adminEditItem = require('./handlers/adminEditItem.js');
const adminDeleteItem = require('./handlers/adminDeleteItem.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-item')
    .setDescription('Manage items')
    .addSubcommand(sub => sub.setName('add').setDescription('[ADMIN] Tambah item baru lewat form (modal)'))
    .addSubcommand(sub => sub.setName('edit').setDescription('[ADMIN] Edit item lewat form (modal)').addStringOption(opt => opt.setName('nama').setDescription('Nama item yang mau diedit').setRequired(true)))
    .addSubcommand(sub => sub.setName('delete').setDescription('[ADMIN] Hapus item').addStringOption(opt => opt.setName('nama').setDescription('Nama item').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'add') return adminAddItem.execute(interaction);
    if (subcommand === 'edit') return adminEditItem.execute(interaction);
    if (subcommand === 'delete') return adminDeleteItem.execute(interaction);
  }
};
