const { SlashCommandBuilder } = require('discord.js');
const tournamentBracketService = require('../../services/player/tournament/tournamentBracket');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Turnamen Sistem Gugur')
    .addSubcommand(sub => sub.setName('bracket').setDescription('Lihat bracket sebuah turnamen').addStringOption(o => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true))),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'bracket' && tournamentBracketService.autocomplete) return tournamentBracketService.autocomplete(interaction);
  },

  async execute(interaction) {
    try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'bracket') return await tournamentBracketService.execute(interaction);
      } catch (error) {
      console.error(error);
      const msg = "Terjadi kesalahan sistem saat memproses command ini.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  }
};
