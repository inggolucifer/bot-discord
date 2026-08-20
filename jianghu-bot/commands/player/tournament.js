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
    const sub = interaction.options.getSubcommand();
    if (sub === 'bracket') return tournamentBracketService.execute(interaction);
  }
};
