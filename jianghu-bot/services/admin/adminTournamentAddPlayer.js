const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');
const Player = require('../../models/Player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-add-player')
    .setDescription('[ADMIN] Daftarkan player ke turnamen (masih fase pendaftaran)')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true))
    .addUserOption((o) => o.setName('user').setDescription('Player yang didaftarkan').setRequired(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Tournament.find({ guildId: interaction.guildId, status: 'registration', name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    return interaction.respond(list.map((t) => ({ name: t.name, value: t.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaTurnamen = interaction.options.getString('nama-turnamen');
    const target = interaction.options.getUser('user');

    const tournament = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${escapeRegex(namaTurnamen)}$`, 'i') });
    if (!tournament) return interaction.editReply({ content: `❌ Turnamen "${namaTurnamen}" tidak ditemukan.` });
    if (tournament.status !== 'registration') return interaction.editReply({ content: `❌ Turnamen ini sudah **${tournament.status}**, tidak bisa tambah peserta lagi.` });

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar sebagai karakter.` });

    if (tournament.participants.some((p) => p.discordId === target.id)) {
      return interaction.editReply({ content: `❌ ${player.characterName} sudah terdaftar di turnamen ini.` });
    }

    tournament.participants.push({ discordId: target.id, characterName: player.characterName });
    await tournament.save();

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('✅ Peserta Ditambahkan')
      .setDescription(`**${player.characterName}** bergabung ke turnamen **"${tournament.name}"**.\nTotal peserta sekarang: **${tournament.participants.length}**`);
    return interaction.editReply({ embeds: [embed] });
  },
};

