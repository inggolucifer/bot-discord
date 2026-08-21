const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Player = require('../../../models/Player');
const { logTransaction } = require('../../../utils/logger');
const { formatCurrency, parseCurrencyString } = require('../../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tambah-slot')
    .setDescription('Tambah slot maksimal lahan aset dengan Silver/Gold'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**.` });

    const currentSlots = player.assetSlots || 1;

    // Formula: 100 * (1.5 ^ (currentSlots - 1)) in Silver (100 Silver = 1 Gold)
    const costSilver = Math.floor(100 * Math.pow(1.5, currentSlots - 1));

    if (player.totalWealth < costSilver) {
       // Convert costSilver to readable string
       let tempCost = costSilver;
       const spirit = Math.floor(tempCost / 1000000); tempCost %= 1000000;
       const jade = Math.floor(tempCost / 10000); tempCost %= 10000;
       const gold = Math.floor(tempCost / 100);
       const silver = tempCost % 100;

       let costStr = [];
       if (spirit > 0) costStr.push(`${spirit} Spirit`);
       if (jade > 0) costStr.push(`${jade} Jade`);
       if (gold > 0) costStr.push(`${gold} Gold`);
       if (silver > 0) costStr.push(`${silver} Silver`);

       return interaction.editReply({ content: `❌ Saldo Wealth kamu tidak cukup. Butuh **${costStr.join(' ')}** untuk unlock slot aset ke-${currentSlots + 1}.` });
    }

    // Deduct wealth
    let remainingToPay = costSilver;
    if (player.currency.silver >= remainingToPay) {
      player.currency.silver -= remainingToPay;
    } else {
      // Use total wealth calculation and rebuild
      let total = player.totalWealth - remainingToPay;
      player.currency.spirit = Math.floor(total / 1000000);
      total %= 1000000;
      player.currency.jade = Math.floor(total / 10000);
      total %= 10000;
      player.currency.gold = Math.floor(total / 100);
      player.currency.silver = total % 100;
    }

    player.assetSlots = currentSlots + 1;
    await player.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId,
      type: 'shop_purchase', // Or maybe we can use generic player_build_asset type or a new one
      fromUserId: interaction.user.id,
      currency: 'silver', // We just use silver equivalent
      amount: costSilver,
      itemDescription: `Unlock Asset Slot ke-${currentSlots + 1}`,
      balanceAfter: player.currency
    });

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('📈 Slot Lahan Aset Ditambah!')
      .setDescription(`Kamu telah berhasil unlock slot aset ke-**${currentSlots + 1}**.\nKamu sekarang bisa memiliki maksimal **${currentSlots + 1}** lahan aset (total quantity).`);

    return interaction.editReply({ embeds: [embed] });
  },
};
