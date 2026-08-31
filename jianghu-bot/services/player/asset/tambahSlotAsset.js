const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Player = require('../../../models/Player');
const { logTransaction } = require('../../../utils/logger');
const { formatCurrency, parseCurrencyString, hasEnoughCurrency, payCurrency } = require('../../../utils/currency');

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

    let costSilver = 0;
    switch (currentSlots) {
        case 1: costSilver = 100; break;      // 1 Gold
        case 2: costSilver = 2000; break;     // 20 Gold
        case 3: costSilver = 8000; break;     // 80 Gold
        case 4: costSilver = 10000; break;    // 1 Jade
        default: return interaction.editReply({ content: '❌ Kamu sudah mencapai batas maksimal slot lahan (5 Slot).' });
    }

    if (!hasEnoughCurrency(player.currency, costSilver, 'silver')) {
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
    if (!payCurrency(player.currency, costSilver, 'silver')) {
       return interaction.editReply(`❌ Uang tidak cukup. Butuh setara dengan **${costSilver} Silver**.`);
    }

    player.assetSlots = currentSlots + 1;
    await player.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId,
      type: 'shop_purchase',
      fromUserId: interaction.user.id,
      currency: 'silver',
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
