const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Sect = require('../../models/Sect');

module.exports = {
  data: new SlashCommandBuilder().setName('sekte-list').setDescription('Lihat daftar semua sekte di server ini'),

  async execute(interaction) {
    await interaction.deferReply();

    const list = await Sect.find({ guildId: interaction.guildId }).sort({ createdAt: 1 });
    if (!list.length) return interaction.editReply({ content: 'Belum ada sekte yang dibuat di server ini.' });

    const lines = list.map((s) => {
      const totalAnggota = (s.leaderId ? 1 : 0) + (s.viceLeaderId ? 1 : 0) + s.elderIds.length + s.memberIds.length;
      return `🏯 **${s.name}** — ${totalAnggota} anggota${s.leaderId ? ` — Ketua: <@${s.leaderId}>` : ''}`;
    });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x2c3e50).setTitle('🏯 Daftar Sekte').setDescription(lines.join('\n'))] });
  },
};

