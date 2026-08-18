const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const { isClaimedToday } = require('../../utils/timezone');
const { logTransaction } = require('../../utils/logger');
const { CURRENCY_EMOJI } = require('../../utils/currency');
const { isUnderConstruction, formatRemainingTime } = require('../../utils/crafting');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim-profit')
    .setDescription('Klaim profit harian (currency dan/atau material) dari semua aset yang kamu miliki'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar. Gunakan `/daftar` dulu.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**, tidak bisa klaim.` });

    if (!player.assets.length) {
      return interaction.editReply({ content: '❌ Kamu belum memiliki aset apapun.' });
    }

    const assetDocs = await Asset.find({ _id: { $in: player.assets.map((a) => a.assetId) } });
    const currencyTotals = {};
    const claimedNow = [];
    const alreadyClaimed = [];
    const underConstruction = [];

    for (const owned of player.assets) {
      const doc = assetDocs.find((d) => d._id.equals(owned.assetId));
      if (!doc) continue;

      if (isUnderConstruction(owned)) {
        underConstruction.push(`${doc.name} 🚧 (${formatRemainingTime(owned.constructionCompleteAt)})`);
        continue;
      }
      if (isClaimedToday(owned.lastClaimAt)) {
        alreadyClaimed.push(doc.name);
        continue;
      }

      let claimedSomething = false;

      // Tipe Income: currency
      if (doc.dailyProfit > 0) {
        const profit = doc.dailyProfit * owned.quantity;
        currencyTotals[doc.profitCurrency] = (currencyTotals[doc.profitCurrency] || 0) + profit;
        claimedNow.push(`${doc.name} x${owned.quantity} → ${CURRENCY_EMOJI[doc.profitCurrency]} ${profit}`);
        claimedSomething = true;
      }

      // Tipe Worker: material/item
      if (doc.workerOutputItemId && doc.workerOutputQuantity > 0) {
        const hasil = doc.workerOutputQuantity * owned.quantity;
        const ownedItem = player.inventory.find((i) => i.itemId.equals(doc.workerOutputItemId));
        if (ownedItem) ownedItem.quantity += hasil;
        else player.inventory.push({ itemId: doc.workerOutputItemId, quantity: hasil });
        claimedNow.push(`${doc.name} x${owned.quantity} → ⛏️ ${hasil}x ${doc.workerOutputItemName}`);
        claimedSomething = true;
      }

      if (claimedSomething) owned.lastClaimAt = new Date();
    }

    for (const [currency, amount] of Object.entries(currencyTotals)) {
      player.currency[currency] += amount;
    }
    await player.save();

    if (claimedNow.length) {
      await logTransaction(interaction.client, {
        guildId: interaction.guildId,
        type: 'asset_profit_claim',
        toUserId: interaction.user.id,
        balanceAfter: player.currency,
        note: `Klaim profit aset: ${claimedNow.join('; ')}`,
      });
    }

    const embed = new EmbedBuilder().setColor(0x27ae60).setTitle('🏠 Klaim Profit Aset');
    if (claimedNow.length) embed.addFields({ name: '✅ Berhasil diklaim', value: claimedNow.join('\n') });
    if (alreadyClaimed.length) embed.addFields({ name: '⏳ Sudah diklaim hari ini', value: alreadyClaimed.join(', ') });
    if (underConstruction.length) embed.addFields({ name: '🚧 Masih Dalam Pembangunan', value: underConstruction.join('\n') });
    if (!claimedNow.length && !alreadyClaimed.length && !underConstruction.length) {
      embed.setDescription('Tidak ada profit yang bisa diklaim saat ini.');
    }
    return interaction.editReply({ embeds: [embed] });
  },
};

