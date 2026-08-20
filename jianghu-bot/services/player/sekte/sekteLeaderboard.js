const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Sect = require('../../../models/Sect');

const MEDAL = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder().setName('sekte-leaderboard').setDescription('Lihat 10 sekte terkaya di server ini'),

  async execute(interaction) {
    await interaction.deferReply();

    const topSects = await Sect.find({ guildId: interaction.guildId }).sort({ totalWealth: -1 }).limit(10);
    if (!topSects.length) return interaction.editReply({ content: 'Belum ada sekte yang dibuat di server ini.' });

    const lines = topSects.map((s, i) => {
      const rankLabel = MEDAL[i] || `**#${i + 1}**`;
      const totalAnggota = (s.leaderId ? 1 : 0) + (s.viceLeaderId ? 1 : 0) + s.elderIds.length + s.memberIds.length;
      const detail = [
        s.currency.silver ? `${s.currency.silver} Silver` : null,
        s.currency.gold ? `${s.currency.gold} Gold` : null,
        s.currency.jade ? `${s.currency.jade} Jade` : null,
        s.currency.spirit ? `${s.currency.spirit} Spirit` : null,
      ].filter(Boolean).join(', ') || 'Belum ada kekayaan';
      return `${rankLabel} **${s.name}** _(${totalAnggota} anggota)_\n　└ ${detail}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🏆 Leaderboard — 10 Sekte Terkaya')
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: 'Kekayaan sekte hanya bertambah lewat donasi anggota (/sekte-donasi).' });

    return interaction.editReply({ embeds: [embed] });
  },
};

