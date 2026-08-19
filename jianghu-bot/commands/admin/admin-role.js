const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminSetRole = require('./handlers/adminSetRole.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-role')
    .setDescription('Manage roles')
    .addSubcommand(sub => sub.setName('set').setDescription('[ADMIN] Tambahkan role yang dianggap sebagai Admin Bot').addRoleOption(opt => opt.setName('role').setDescription('Role yang akan dijadikan admin bot').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'set') return adminSetRole.execute(interaction);
  }
};
