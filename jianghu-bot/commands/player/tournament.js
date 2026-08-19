const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const tournamentBracket = require('./handlers/tournamentBracket.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Tournament commands')
    .addSubcommand(sub => sub.setName('bracket').setDescription('Lihat bracket sebuah turnamen').addStringOption(opt => opt.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'bracket') return tournamentBracket.execute(interaction);
  }
};
