const { SlashCommandBuilder } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const Tournament = require('../../../models/Tournament');
const { generateFirstRound } = require('../../../utils/bracket');
const { buildTournamentEmbed } = require('../../../utils/embeds');
const { logAdminAction } = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-start')
    .setDescription('[ADMIN] Mulai turnamen (bracket babak 1 dibuat otomatis & diacak)')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Tournament.find({ guildId: interaction.guildId, status: 'registration', name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((t) => ({ name: t.name, value: t.name })));
  },

  async execute(interaction) {
    await interaction.deferReply(); // publik -- pengumuman bracket harus terlihat semua orang
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaTurnamen = interaction.options.getString('nama-turnamen');
    const tournament = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaTurnamen}$`, 'i') });
    if (!tournament) return interaction.editReply({ content: `❌ Turnamen "${namaTurnamen}" tidak ditemukan.` });
    if (tournament.status !== 'registration') return interaction.editReply({ content: `❌ Turnamen ini sudah **${tournament.status}**.` });
    if (tournament.participants.length < 2) return interaction.editReply({ content: '❌ Minimal butuh 2 peserta untuk memulai turnamen.' });

    const firstRound = generateFirstRound(tournament.participants);
    tournament.rounds = [firstRound];
    tournament.status = 'ongoing';
    await tournament.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'TOURNAMENT_START',
      details: `${tournament.name} (${tournament.participants.length} peserta)`,
    });

    return interaction.editReply({ embeds: [buildTournamentEmbed(tournament)] });
  },
};

