const { SlashCommandBuilder } = require('discord.js');
const helpAdminService = require('../../services/admin/helpAdmin');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help-admin')
    .setDescription('[ADMIN] Lihat semua command admin'),

  async execute(interaction) {
    const url = process.env.FRONTEND_URL || "https://immortal-x.online";
    return interaction.reply({ content: `Fitur ini sudah dipindahkan ke website. Main di: ${url}`, ephemeral: true });
  }
};
