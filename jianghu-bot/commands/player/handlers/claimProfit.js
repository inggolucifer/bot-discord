const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Player = require('../../../models/Player');
const Asset = require('../../../models/Asset');
const { isClaimedToday } = require('../../../utils/timezone');
const { logTransaction } = require('../../../utils/logger');
const { CURRENCY_EMOJI } = require('../../../utils/currency');
const { isUnderConstruction, formatRemainingTime } = require('../../../utils/crafting');
const { calculateProgress } = require('../../../utils/assetProgress');
const { syncWorkerContracts } = require('../../../utils/workerManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim-profit')
    .setDescription('Klaim profit dari semua aset yang kamu miliki')
    .addStringOption((o) => o.setName('tipe').setDescription('Apa yang mau diklaim?').setRequired(false).addChoices({ name: 'Semua', value: 'all' }, { name: 'Currency Saja', value: 'currency' }, { name: 'Material Saja', value: 'item' })),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Sync pekerja dlu biar kontrak expired kecabut
    await syncWorkerContracts(interaction.client, interaction.guildId);

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

    const claimTipe = interaction.options.getString('tipe') || 'all';
    for (const owned of player.assets) {
      const doc = assetDocs.find((d) => d._id.equals(owned.assetId));
      if (!doc) continue;

      if (owned.status === 'pending') {
         underConstruction.push(`${doc.name} 🚧 (Pending - butuh worker)`);
         continue;
      }
      if (owned.status === 'building') {
         underConstruction.push(`${doc.name} 🚧 (Sedang dibangun)`);
         continue;
      }

      let hasActiveWorker = false;
      if (owned.assignedWorkers && owned.assignedWorkers.length > 0) {
         // Cek apakah ada yg belum expired
         hasActiveWorker = owned.assignedWorkers.some(w => !w.endTime || w.endTime.getTime() > Date.now());
      }

      if (!doc.isCraftingStation && !hasActiveWorker) {
         underConstruction.push(`${doc.name} ⚠️ (Tidak beroperasi, butuh worker)`);
         continue;
      }

      let claimedSomething = false;
      const progressMs = calculateProgress(owned) + (owned.progressAccumulated || 0);
      const hoursPassed = Math.floor(progressMs / (3600 * 1000));

      if (hoursPassed < 1) {
         alreadyClaimed.push(doc.name); // belum ada profit
         continue;
      }

      // Tipe Income: currency
      if (doc.dailyProfit > 0 && (claimTipe === 'all' || claimTipe === 'currency')) {
        const profit = hoursPassed * doc.dailyProfit * owned.quantity;
        currencyTotals[doc.profitCurrency] = (currencyTotals[doc.profitCurrency] || 0) + profit;
        claimedNow.push(`${doc.name} x${owned.quantity} → ${CURRENCY_EMOJI[doc.profitCurrency]} ${profit}`);
        claimedSomething = true;
      }

      // Tipe Worker: material/item
      if (doc.workerOutputItemId && doc.workerOutputQuantity > 0 && (claimTipe === 'all' || claimTipe === 'item')) {
        const hasil = hoursPassed * doc.workerOutputQuantity * owned.quantity;
        const ownedItem = player.inventory.find((i) => i.itemId.equals(doc.workerOutputItemId));
        if (ownedItem) ownedItem.quantity += hasil;
        else player.inventory.push({ itemId: doc.workerOutputItemId, quantity: hasil });
        claimedNow.push(`${doc.name} x${owned.quantity} → ⛏️ ${hasil}x ${doc.workerOutputItemName}`);
        claimedSomething = true;
      }

      if (claimedSomething) {
         // Kurangi progress yang sudah diklaim
         const leftoverMs = progressMs - (hoursPassed * 3600 * 1000);
         owned.progressAccumulated = leftoverMs;
         owned.lastProgressUpdate = new Date();
      }
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
    if (alreadyClaimed.length) embed.addFields({ name: '⏳ Belum ada output', value: alreadyClaimed.join(', ') });
    if (underConstruction.length) embed.addFields({ name: '🚧 Status Lain', value: underConstruction.join('\n') });
    if (!claimedNow.length && !alreadyClaimed.length && !underConstruction.length) {
      embed.setDescription('Tidak ada profit yang bisa diklaim saat ini.');
    }
    return interaction.editReply({ embeds: [embed] });
  },
};
