const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Sect = require('../../../models/Sect');
const Asset = require('../../../models/Asset');
const Player = require('../../../models/Player');
const { isClaimedToday } = require('../../../utils/timezone');
const { isUnderConstruction, formatRemainingTime } = require('../../../utils/crafting');
const { splitSectProfit } = require('../../../utils/sectProfitSplit');
const { logTransaction } = require('../../../utils/logger');
const { CURRENCY_EMOJI, CURRENCY_LABEL } = require('../../../utils/currency');
const { getPlayerSect } = require('../../../utils/sectUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte-claim-profit')
    .setDescription('Klaim profit aset sekte (currency dibagi semua anggota sesuai jabatan, material masuk stok)'),

  async execute(interaction) {
    await interaction.deferReply(); // publik -- pembagian profit sekte pantas dilihat semua anggota

    const sect = await getPlayerSect(interaction.guildId, interaction.user.id);
    if (!sect) return interaction.editReply({ content: '❌ Kamu tidak sedang bergabung dalam sekte manapun.' });

    const role = sect.getRoleOf(interaction.user.id);
    if (role !== 'Ketua' && role !== 'Wakil Ketua' && role !== 'Tetua') {
      return interaction.editReply({ content: '❌ Hanya Ketua/Wakil/Tetua Sekte yang bisa melakukan ini!' });
    }

    if (!sect.assets.length) return interaction.editReply({ content: '❌ Sekte ini belum memiliki aset apapun.' });

    const assetDocs = await Asset.find({ _id: { $in: sect.assets.map((a) => a.assetId) } });
    let totalIncomeByCurrency = {}; // { silver: 1000, ... } -- akan dibagi per jabatan
    const materialClaimed = [];
    const currencyClaimedLines = [];
    const alreadyClaimed = [];
    const underConstruction = [];

    for (const owned of sect.assets) {
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

      if (doc.dailyProfit > 0) {
        const profit = doc.dailyProfit * owned.quantity;
        totalIncomeByCurrency[doc.profitCurrency] = (totalIncomeByCurrency[doc.profitCurrency] || 0) + profit;
        currencyClaimedLines.push(`${doc.name} x${owned.quantity} → ${CURRENCY_EMOJI[doc.profitCurrency]} ${profit}`);
        claimedSomething = true;
      }

      if (doc.workerOutputItemId && doc.workerOutputQuantity > 0) {
        if (doc.workerInputMaterials && doc.workerInputMaterials.length > 0) {
            // Aset ini diproses otomatis
            underConstruction.push(`${doc.name} ⚙️ (Diproses otomatis)`);
            continue;
        }

        const hasil = doc.workerOutputQuantity * owned.quantity;
        const ownedRes = sect.resources.find((r) => r.itemId.equals(doc.workerOutputItemId));
        if (ownedRes) ownedRes.quantity += hasil;
        else if (doc.workerOutputItemId) sect.resources.push({ itemId: doc.workerOutputItemId, quantity: hasil });
        materialClaimed.push(`${doc.name} x${owned.quantity} → ⛏️ ${hasil}x ${doc.workerOutputItemName} (masuk stok sekte)`);
        claimedSomething = true;
      }

      if (claimedSomething) owned.lastClaimAt = new Date();
    }

    // ==== Bagikan income currency ke SEMUA anggota sesuai persentase jabatan ====
    const distributionSummary = [];
    for (const [currency, totalAmount] of Object.entries(totalIncomeByCurrency)) {
      const shares = splitSectProfit(sect, totalAmount);
      if (!shares.length) continue;

      // Kelompokkan per jabatan untuk ringkasan (biar tidak nge-tag semua orang satu-satu di embed)
      const byRole = {};
      for (const share of shares) {
        const p = await Player.findOne({ discordId: share.discordId, guildId: interaction.guildId });
        if (!p) continue;
        p.currency[currency] += share.amount;
        await p.save();

        if (!byRole[share.role]) byRole[share.role] = { count: 0, amountEach: share.amount };
        byRole[share.role].count += 1;
      }

      for (const [roleName, info] of Object.entries(byRole)) {
        distributionSummary.push(`${CURRENCY_EMOJI[currency]} **${roleName}**${info.count > 1 ? ` (${info.count} orang)` : ''}: ${info.amountEach} ${CURRENCY_LABEL[currency]}/orang`);
      }
    }

    await sect.save();

    if (currencyClaimedLines.length || materialClaimed.length) {
      await logTransaction(interaction.client, {
        guildId: interaction.guildId, type: 'sect_claim_profit', fromUserId: interaction.user.id,
        note: `Klaim profit sekte ${sect.name} oleh ${interaction.user.tag}: ${[...currencyClaimedLines, ...materialClaimed].join('; ')}`,
      });
    }

    const embed = new EmbedBuilder().setColor(0x27ae60).setTitle(`🏯 Klaim Profit Sekte: ${sect.name}`);
    if (currencyClaimedLines.length) embed.addFields({ name: '💰 Income Aset (Dibagi ke Semua Anggota)', value: currencyClaimedLines.join('\n') });
    if (distributionSummary.length) embed.addFields({ name: '📊 Rincian Pembagian (Ketua 30% / Wakil 25% / Tetua 25% dibagi rata / Anggota 20% dibagi rata)', value: distributionSummary.join('\n') });
    if (materialClaimed.length) embed.addFields({ name: '⛏️ Material Pekerja (Masuk Stok Sekte)', value: materialClaimed.join('\n') });
    if (alreadyClaimed.length) embed.addFields({ name: '⏳ Sudah Diklaim Hari Ini', value: alreadyClaimed.join(', ') });
    if (underConstruction.length) embed.addFields({ name: '🚧 Masih Dibangun', value: underConstruction.join('\n') });
    if (!currencyClaimedLines.length && !materialClaimed.length && !alreadyClaimed.length && !underConstruction.length) {
      embed.setDescription('Tidak ada profit yang bisa diklaim saat ini.');
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
