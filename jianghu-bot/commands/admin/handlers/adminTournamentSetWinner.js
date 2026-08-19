const { SlashCommandBuilder } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const Tournament = require('../../../models/Tournament');
const { generateNextRound, isRoundComplete } = require('../../../utils/bracket');
const { buildTournamentEmbed } = require('../../../utils/embeds');
const { logAdminAction } = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-set-winner')
    .setDescription('[ADMIN] Tentukan pemenang sebuah match (bracket otomatis lanjut kalau babak selesai)')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('match-nomor').setDescription('Nomor match di babak yang sedang berjalan').setRequired(true).setMinValue(1))
    .addUserOption((o) => o.setName('pemenang').setDescription('Player yang menang di match ini').setRequired(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Tournament.find({ guildId: interaction.guildId, status: 'ongoing', name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((t) => ({ name: t.name, value: t.name })));
  },

  async execute(interaction) {
    await interaction.deferReply(); // publik -- update bracket harus terlihat semua orang
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaTurnamen = interaction.options.getString('nama-turnamen');
    const matchNomor = interaction.options.getInteger('match-nomor');
    const pemenang = interaction.options.getUser('pemenang');

    const tournament = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaTurnamen}$`, 'i') });
    if (!tournament) return interaction.editReply({ content: `❌ Turnamen "${namaTurnamen}" tidak ditemukan.` });
    if (tournament.status !== 'ongoing') return interaction.editReply({ content: `❌ Turnamen ini berstatus **${tournament.status}**, tidak bisa set pemenang.` });

    const currentRound = tournament.rounds[tournament.rounds.length - 1];
    const match = currentRound.matches.find((m) => m.matchNumber === matchNomor);
    if (!match) return interaction.editReply({ content: `❌ Match nomor ${matchNomor} tidak ditemukan di babak saat ini (${currentRound.roundLabel}).` });
    if (match.status === 'completed') return interaction.editReply({ content: `❌ Match ${matchNomor} sudah selesai. Pemenang: ${match.winnerId === match.player1Id ? match.player1Name : match.player2Name}.` });

    if (pemenang.id !== match.player1Id && pemenang.id !== match.player2Id) {
      return interaction.editReply({ content: `❌ ${pemenang.username} bukan salah satu pemain di match ini (${match.player1Name} vs ${match.player2Name}).` });
    }

    match.winnerId = pemenang.id;
    match.status = 'completed';

    // Tandai yang kalah sebagai gugur di daftar peserta keseluruhan
    const loserId = pemenang.id === match.player1Id ? match.player2Id : match.player1Id;
    if (loserId) {
      const loserParticipant = tournament.participants.find((p) => p.discordId === loserId);
      if (loserParticipant) loserParticipant.eliminated = true;
    }

    let statusNote = `Match ${matchNomor} selesai. Pemenang: ${pemenang.username}.`;

    if (isRoundComplete(currentRound)) {
      const nextRound = generateNextRound(currentRound, currentRound.roundNumber + 1, tournament.participants.length);

      if (nextRound === null) {
        // Hanya tersisa 1 pemenang -> turnamen selesai
        const championId = currentRound.matches[0].winnerId;
        const championName = championId === currentRound.matches[0].player1Id ? currentRound.matches[0].player1Name : currentRound.matches[0].player2Name;
        tournament.status = 'finished';
        tournament.winnerDiscordId = championId;
        tournament.winnerName = championName;
        statusNote += ` 🏆 TURNAMEN SELESAI! Juara: ${championName}!`;
      } else {
        tournament.rounds.push(nextRound);
        statusNote += ` Babak "${currentRound.roundLabel}" selesai, lanjut ke "${nextRound.roundLabel}".`;
      }
    }

    await tournament.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'TOURNAMENT_SET_WINNER',
      targetUserId: pemenang.id, details: `${tournament.name}: ${statusNote}`,
    });

    return interaction.editReply({ embeds: [buildTournamentEmbed(tournament)] });
  },
};

