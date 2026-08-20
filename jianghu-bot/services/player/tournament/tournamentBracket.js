const { SlashCommandBuilder } = require('discord.js');
const Tournament = require('../../../models/Tournament');
const { buildTournamentEmbed } = require('../../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournament-bracket')
    .setDescription('Lihat bracket sebuah turnamen')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Tournament.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((t) => ({ name: `${t.name} (${t.status})`, value: t.name })));
  },

  async execute(interaction) {
    await interaction.deferReply(); // publik -- turnamen memang untuk ditonton semua orang

    const namaTurnamen = interaction.options.getString('nama-turnamen');
    const tournament = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaTurnamen}$`, 'i') });
    if (!tournament) return interaction.editReply({ content: `❌ Turnamen "${namaTurnamen}" tidak ditemukan.` });

    return interaction.editReply({ embeds: [buildTournamentEmbed(tournament)] });
  },
};

