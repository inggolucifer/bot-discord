const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const Sect = require('../../../models/Sect');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-sekte-delete')
    .setDescription('[ADMIN] Bubarkan sebuah sekte secara permanen')
    .addStringOption((o) => o.setName('nama-sekte').setDescription('Nama sekte').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Sect.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((s) => ({ name: s.name, value: s.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaSekte = interaction.options.getString('nama-sekte');
    const sect = await Sect.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaSekte}$`, 'i') });
    if (!sect) return interaction.editReply({ content: `❌ Sekte "${namaSekte}" tidak ditemukan.` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirm_delete_sect_${sect._id}`).setLabel('Ya, Bubarkan Sekte').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary),
    );

    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('⚠️ Konfirmasi Bubarkan Sekte').setDescription(`Yakin ingin membubarkan sekte **"${sect.name}"**? Semua anggota akan kehilangan afiliasi sekte ini, dan aset/sumber daya sekte akan hilang permanen.`)],
      components: [row],
    });
  },
};

