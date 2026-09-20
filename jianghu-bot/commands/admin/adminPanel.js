const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-panel')
    .setDescription('[ADMIN] Buka panel admin interaktif utama'),

  async execute(interaction) {
    const url = process.env.FRONTEND_URL || "https://immortal-x.online";
    return interaction.reply({ content: `Fitur ini sudah dipindahkan ke website. Main di: ${url}`, ephemeral: true });
  },
};
