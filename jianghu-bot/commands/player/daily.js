const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const { isClaimedToday, isClaimedYesterday, formatDuration, msUntilNextResetWIB } = require('../../utils/timezone');
const { logTransaction } = require('../../utils/logger');

const STREAK_REWARDS = [
  { type: 'copper', amount: 10, label: '10 Copper Coins (铜币)' },
  { type: 'copper', amount: 20, label: '20 Copper Coins (铜币)' },
  { type: 'copper', amount: 40, label: '40 Copper Coins (铜币)' },
  { type: 'copper', amount: 50, label: '50 Copper Coins (铜币)' },
  { type: 'copper', amount: 60, label: '60 Copper Coins (铜币)' },
  { type: 'copper', amount: 80, label: '80 Copper Coins (铜币)' },
  { type: 'silver', amount: 1, label: '1 Silver Tael (银两)' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Klaim hadiah harian, dapatkan hadiah lebih besar dengan streak berturut-turut!'),

  async execute(interaction) {
    try {
    await interaction.deferReply();

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar. Gunakan `/daftar` dulu.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**, tidak bisa klaim.` });

    if (isClaimedToday(player.lastDailyClaim)) {
      const sisa = formatDuration(msUntilNextResetWIB());
      return interaction.editReply({ content: `⏳ Kamu sudah klaim daily hari ini. Reset dalam ${sisa} (00:00 WIB).` });
    }

    if (isClaimedYesterday(player.lastDailyClaim)) {
      player.dailyStreak += 1;
      if (player.dailyStreak > 7) {
        player.dailyStreak = 1;
      }
    } else {
      player.dailyStreak = 1;
    }

    const rewardIndex = player.dailyStreak - 1;
    const reward = STREAK_REWARDS[rewardIndex];

    player.currency[reward.type] += reward.amount;
    player.lastDailyClaim = new Date();

    await player.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId,
      type: 'daily_claim',
      toUserId: interaction.user.id,
      currency: reward.type,
      amount: reward.amount,
      balanceAfter: player.currency,
      note: `Klaim daily reward hari ke-${player.dailyStreak}`,
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🎁 Daily Claim Berhasil!')
      .setDescription(`Kamu mendapatkan **${reward.label}**.\nStreak: **Hari ke-${player.dailyStreak}** / 7\nSaldo ${reward.type === 'copper' ? 'Copper Coins' : 'Silver Tael'} sekarang: **${player.currency[reward.type]}**`);
    return interaction.editReply({ embeds: [embed] });
      } catch (error) {
      console.error(error);
      const msg = "Terjadi kesalahan sistem saat memproses command ini.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  },
};
