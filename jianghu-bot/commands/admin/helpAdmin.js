const { SlashCommandBuilder } = require('discord.js');
const helpAdminService = require('../../services/admin/helpAdmin');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help-admin')
    .setDescription('[ADMIN] Lihat semua command admin'),

  async execute(interaction) {
    return helpAdminService.execute(interaction);
  }
};
