const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const { CURRENCY_LABEL } = require('../../utils/currency');

const MEDAL = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder().setName('leaderboard').setDescription('Lihat 10 player terkaya di server ini'),

  async execute(interaction) {
    await interaction.deferReply(); // publik -- leaderboard memang untuk dipamerkan

    const topPlayers = await Player.find({ guildId: interaction.guildId, status: 'active' })
      .sort({ totalWealth: -1 })
      .limit(10);

    if (!topPlayers.length) {
      return interaction.editReply({ content: 'Belum ada player terdaftar di server ini.' });
    }

    const lines = topPlayers.map((p, i) => {
      const rankLabel = MEDAL[i] || `**#${i + 1}**`;
      const detail = [
        p.currency.silver ? `${p.currency.silver} ${CURRENCY_LABEL.silver}` : null,
        p.currency.gold ? `${p.currency.gold} ${CURRENCY_LABEL.gold}` : null,
        p.currency.jade ? `${p.currency.jade} ${CURRENCY_LABEL.jade}` : null,
        p.currency.spirit ? `${p.currency.spirit} ${CURRENCY_LABEL.spirit}` : null,
      ].filter(Boolean).join(', ') || 'Tidak punya currency';
      return `${rankLabel} **${p.characterName}**\n　└ ${detail}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🏆 Leaderboard — 10 Player Terkaya')
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: 'Kekayaan dihitung dari total semua currency (dikonversi ke setara Silver Tael).' });

    return interaction.editReply({ embeds: [embed] });
  },
};

