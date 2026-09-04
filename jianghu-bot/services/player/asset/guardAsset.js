const { EmbedBuilder } = require('discord.js');
const Player = require('../../../models/Player');
const Asset = require('../../../models/Asset');
const escapeRegex = require('../../../utils/escapeRegex');
const { hasEnoughCurrency, payCurrency, formatCurrency } = require('../../../utils/currency');
const { calculateDailyGuardCost } = require('../../../utils/assetCostCalculator');

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

    const dailyCostCopper = calculateDailyGuardCost(assetConfig);
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
