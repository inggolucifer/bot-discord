const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-remove-player')
    .setDescription('[ADMIN] Keluarkan player dari turnamen (masih fase pendaftaran)')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true))
    .addUserOption((o) => o.setName('user').setDescription('Player yang dikeluarkan').setRequired(true)),

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
    if (tournament.status !== 'registration') return interaction.editReply({ content: `❌ Turnamen ini sudah **${tournament.status}**, tidak bisa ubah peserta lagi.` });

    const before = tournament.participants.length;
    tournament.participants = tournament.participants.filter((p) => p.discordId !== target.id);
    if (tournament.participants.length === before) return interaction.editReply({ content: `❌ ${target.username} tidak terdaftar di turnamen ini.` });

    await tournament.save();
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Peserta Dikeluarkan').setDescription(`${target} dikeluarkan dari turnamen **"${tournament.name}"**.`)] });
  },
};

