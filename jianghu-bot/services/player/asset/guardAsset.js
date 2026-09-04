const { EmbedBuilder } = require('discord.js');
const Player = require('../../../models/Player');
const Asset = require('../../../models/Asset');
const escapeRegex = require('../../../utils/escapeRegex');
const { hasEnoughCurrency, payCurrency, formatCurrency } = require('../../../utils/currency');

module.exports = {
  autocomplete: async (interaction) => {
    const focusedValue = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);

    // Suggest active, built assets
    const activeAssets = player.assets.filter(a => a.status === 'active');
    if (activeAssets.length === 0) return interaction.respond([]);

    const assetIds = activeAssets.map(a => a.assetId);
    const assets = await Asset.find({ _id: { $in: assetIds }, guildId: interaction.guildId });

    const choices = assets.map(a => a.name);
    const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase())).slice(0, 25);
    await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
  },

  execute: async (interaction) => {
    await interaction.deferReply();
    const assetName = interaction.options.getString('nama-aset');
    const hari = interaction.options.getInteger('hari');

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply("Karakter tidak ditemukan.");

    const assetConfig = await Asset.findOne({
      guildId: interaction.guildId,
      name: new RegExp("^\\s*" + escapeRegex(assetName) + "\\s*$", "i")
    });
    if (!assetConfig) return interaction.editReply(`Aset bernama **${assetName}** tidak ditemukan di server ini.`);

    const ownedAssetIndex = player.assets.findIndex(a => a.assetId.equals(assetConfig._id));
    if (ownedAssetIndex === -1) return interaction.editReply(`Kamu tidak memiliki aset **${assetConfig.name}**.`);

    const ownedAsset = player.assets[ownedAssetIndex];

    if (ownedAsset.status !== 'active') {
        return interaction.editReply(`Aset **${assetConfig.name}** belum selesai dibangun, tidak bisa dijaga.`);
    }

    // Dynamic cost based on tier table in ECOSYSTEM_RULES.md (approximation)
    // We base it on profit. If it's a Tipe 3 (item output), we estimate based on basePrice.
    let dailyCostCopper = 5; // Fallback Tier 1

    if (assetConfig.dailyProfit > 0) {
        // Evaluate based on daily profit
        const { RATE_TO_COPPER } = require('../../../utils/currencyNormalize');
        const profitCopper = assetConfig.dailyProfit * (RATE_TO_COPPER[assetConfig.profitCurrency] || 1);

        // Cost mappings from rules:
        // T1: 20-50 copper profit -> 5 copper guard
        // T2: 1-5 silver profit -> 20 copper guard
        // T3: 10-20 silver profit -> 2 silver guard (200 copper)
        // T4: 50-100 silver profit -> 10 silver guard (1000 copper)
        // T5: 1 gold profit -> 20 silver guard (2000 copper)
        // T6: 2 gold profit -> 50 silver guard (5000 copper)
        if (profitCopper >= 20000) dailyCostCopper = 5000;
        else if (profitCopper >= 10000) dailyCostCopper = 2000;
        else if (profitCopper >= 5000) dailyCostCopper = 1000;
        else if (profitCopper >= 1000) dailyCostCopper = 200;
        else if (profitCopper >= 100) dailyCostCopper = 20;
        else dailyCostCopper = 5;
    } else {
        // Non-currency asset (Tipe 2/3), evaluate based on base price or construction time
        if (assetConfig.basePrice >= 1 && assetConfig.priceCurrency === 'gold') dailyCostCopper = 2000;
        else if (assetConfig.basePrice >= 50 && assetConfig.priceCurrency === 'silver') dailyCostCopper = 1000;
        else if (assetConfig.basePrice >= 10 && assetConfig.priceCurrency === 'silver') dailyCostCopper = 200;
        else if (assetConfig.basePrice >= 1 && assetConfig.priceCurrency === 'silver') dailyCostCopper = 20;
    }

    const totalCostCopper = dailyCostCopper * hari;

    if (!hasEnoughCurrency(player.currency, { copper: totalCostCopper })) {
        const { convertFromCopper } = require('../../../utils/currencyNormalize');
        const formattedCost = formatCurrency(convertFromCopper(totalCostCopper));
        return interaction.editReply(`Kamu tidak memiliki cukup uang untuk menyewa guard selama ${hari} hari. Biaya: **${formattedCost}**.`);
    }

    payCurrency(player.currency, { copper: totalCostCopper });

    // Add time to existing guard time or start now
    const now = Date.now();
    let currentEndTime = ownedAsset.guardEndTime ? ownedAsset.guardEndTime.getTime() : now;
    if (currentEndTime < now) currentEndTime = now;

    ownedAsset.guardEndTime = new Date(currentEndTime + (hari * 24 * 3600 * 1000));

    await player.save();

    const { convertFromCopper } = require('../../../utils/currencyNormalize');
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Guard Disewa')
      .setDescription(`Penjaga bayaran telah ditempatkan di **${assetConfig.name}** selama ${hari} hari untuk melindunginya dari serangan bandit.`)
      .addFields(
          { name: 'Biaya Total', value: formatCurrency(convertFromCopper(totalCostCopper)), inline: true },
          { name: 'Penjagaan Berakhir', value: `<t:${Math.floor(ownedAsset.guardEndTime.getTime() / 1000)}:R>`, inline: true }
      )
      .setColor('#3498db');

    return interaction.editReply({ embeds: [embed] });
  }
};
