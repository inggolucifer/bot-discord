const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Lihat semua command player'),

  async execute(interaction) {
    const url = process.env.FRONTEND_URL || "https://immortal-x.online";
    return interaction.reply({ content: `Fitur ini sudah dipindahkan ke website. Main di: ${url}`, ephemeral: true });
  },
};
