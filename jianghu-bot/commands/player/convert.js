const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const { CURRENCIES, CURRENCY_LABEL, isValidCurrency, convertAmount } = require('../../utils/currency');
const { logTransaction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('convert')
    .setDescription('Konversi currency (mis. Silver Tael -> Gold Tael)')
    .addStringOption((opt) =>
      opt.setName('dari').setDescription('Currency asal').setRequired(true)
        .addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c })))
    )
    .addStringOption((opt) =>
      opt.setName('ke').setDescription('Currency tujuan').setRequired(true)
        .addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c })))
    )
    .addIntegerOption((opt) =>
      opt.setName('jumlah').setDescription('Jumlah yang mau dikonversi').setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const from = interaction.options.getString('dari');
    const to = interaction.options.getString('ke');
    const amount = interaction.options.getInteger('jumlah');

    if (from === to) {
      return interaction.editReply({ content: '❌ Currency asal dan tujuan tidak boleh sama.' });
    }

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar. Gunakan `/daftar` dulu.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**, tidak bisa melakukan transaksi.` });

    if (player.currency[from] < amount) {
      return interaction.editReply({ content: `❌ ${CURRENCY_LABEL[from]} kamu tidak cukup. Saldo: ${player.currency[from]}.` });
    }

    const conv = convertAmount(from, to, amount);
    if (!conv.ok) return interaction.editReply({ content: `❌ ${conv.error}` });

    player.currency[from] -= amount;
    player.currency[to] += conv.resultAmount;
    await player.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId,
      type: 'convert',
      fromUserId: interaction.user.id,
      toUserId: interaction.user.id,
      currency: `${from}->${to}`,
      amount,
      balanceAfter: player.currency,
      note: `Konversi ${amount} ${from} menjadi ${conv.resultAmount} ${to}`,
    });

    const embed = new EmbedBuilder()
      .setColor(0x2980b9)
      .setTitle('🔄 Konversi Berhasil')
      .setDescription(`**${amount} ${CURRENCY_LABEL[from]}** ditukar menjadi **${conv.resultAmount} ${CURRENCY_LABEL[to]}**`);
    return interaction.editReply({ embeds: [embed] });
  },
};
