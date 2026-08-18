const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-cancel')
    .setDescription('[ADMIN] Batalkan turnamen yang sedang berjalan/pendaftaran')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Tournament.find({ guildId: interaction.guildId, status: { $in: ['registration', 'ongoing'] }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((t) => ({ name: t.name, value: t.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaTurnamen = interaction.options.getString('nama-turnamen');
    const tournament = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaTurnamen}$`, 'i') });
    if (!tournament) return interaction.editReply({ content: `❌ Turnamen "${namaTurnamen}" tidak ditemukan.` });
    if (['finished', 'cancelled'].includes(tournament.status)) return interaction.editReply({ content: `❌ Turnamen ini sudah **${tournament.status}**.` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirm_cancel_tournament_${tournament._id}`).setLabel('Ya, Batalkan Turnamen').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary),
    );

    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('⚠️ Konfirmasi Batalkan Turnamen').setDescription(`Yakin ingin membatalkan turnamen **"${tournament.name}"**? Semua progres bracket akan hilang.`)],
      components: [row],
    });
  },
};

