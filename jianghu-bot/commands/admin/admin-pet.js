const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminAddPet = require('./handlers/adminAddPet.js');
const adminEditPet = require('./handlers/adminEditPet.js');
const adminDeletePet = require('./handlers/adminDeletePet.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-pet')
    .setDescription('Manage pets')
    .addSubcommand(sub => sub.setName('add').setDescription('[ADMIN] Tambah pet baru lewat form (modal)'))
    .addSubcommand(sub => sub.setName('edit').setDescription('[ADMIN] Edit pet lewat form (modal)').addStringOption(opt => opt.setName('nama').setDescription('Nama pet').setRequired(true)))
    .addSubcommand(sub => sub.setName('delete').setDescription('[ADMIN] Hapus pet dari database').addStringOption(opt => opt.setName('nama').setDescription('Nama pet').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'add') return adminAddPet.execute(interaction);
    if (subcommand === 'edit') return adminEditPet.execute(interaction);
    if (subcommand === 'delete') return adminDeletePet.execute(interaction);
  }
};
