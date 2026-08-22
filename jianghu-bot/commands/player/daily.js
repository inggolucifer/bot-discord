const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const { isClaimedToday, formatDuration, msUntilNextResetWIB } = require('../../utils/timezone');
const { logTransaction } = require('../../utils/logger');

const DAILY_REWARD = 2; // 2 Silver Tael

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Klaim hadiah harian (2 Silver Tael), reset tiap jam 00:00 WIB'),

  async execute(interaction) {
    await interaction.deferReply();

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar. Gunakan `/daftar` dulu.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**, tidak bisa klaim.` });

    if (isClaimedToday(player.lastDailyClaim)) {
      const sisa = formatDuration(msUntilNextResetWIB());
      return interaction.editReply({ content: `⏳ Kamu sudah klaim daily hari ini. Reset dalam ${sisa} (00:00 WIB).` });
    }

    player.currency.silver += DAILY_REWARD;
    player.lastDailyClaim = new Date();
    await player.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId,
      type: 'daily_claim',
      toUserId: interaction.user.id,
      currency: 'silver',
      amount: DAILY_REWARD,
      balanceAfter: player.currency,
      note: 'Klaim daily reward',
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🎁 Daily Claim Berhasil!')
      .setDescription(`Kamu mendapatkan **${DAILY_REWARD} Silver Tael (银两)**.\nSaldo Silver Tael sekarang: **${player.currency.silver}**`);
    return interaction.editReply({ embeds: [embed] });
  },
};
