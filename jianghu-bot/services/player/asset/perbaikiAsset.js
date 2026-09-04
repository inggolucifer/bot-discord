const { EmbedBuilder } = require('discord.js');
const Player = require('../../../models/Player');
const Asset = require('../../../models/Asset');
const escapeRegex = require('../../../utils/escapeRegex');
const { hasEnoughCurrency, payCurrency, formatCurrency } = require('../../../utils/currency');
const Item = require('../../../models/Item');

module.exports = {
  autocomplete: async (interaction) => {
    const focusedValue = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);

    // Only damaged assets
    const activeAssets = player.assets.filter(a => a.isDamaged);
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

    if (!ownedAsset.isDamaged) {
        return interaction.editReply(`Aset **${assetConfig.name}** tidak sedang rusak.`);
    }

    let repairCostLog = "";

    // Logic repair: 20% of build requirements OR 20% of base price
    if (assetConfig.buildable && assetConfig.buildRequirements && assetConfig.buildRequirements.length > 0) {
        // Need to pay 20% of materials
        const neededMaterials = [];
        for (const req of assetConfig.buildRequirements) {
            const repairQty = Math.max(1, Math.floor(req.quantity * 0.2));
            neededMaterials.push({ itemId: req.itemId, itemName: req.itemName, quantity: repairQty });
        }

        // Check inventory
        for (const mat of neededMaterials) {
            const owned = player.inventory.find(i => i.itemId.equals(mat.itemId));
            const available = owned ? owned.quantity : 0;
            if (available < mat.quantity) {
                return interaction.editReply(`Kamu kekurangan material **${mat.itemName}**. Butuh: **${mat.quantity}**, kamu miliki: **${available}**.`);
            }
        }

        // Deduct
        for (const mat of neededMaterials) {
            const owned = player.inventory.find(i => i.itemId.equals(mat.itemId));
            owned.quantity -= mat.quantity;
            repairCostLog += `- ${mat.quantity}x ${mat.itemName}\n`;
        }
    } else {
        // Pay 20% of base price
        const totalBasePriceInCopper = assetConfig.basePrice * (require('../../../utils/currencyNormalize').RATE_TO_COPPER[assetConfig.priceCurrency]);
        const repairCostInCopper = Math.max(1, Math.floor(totalBasePriceInCopper * 0.2));

        // Convert cost to highest possible format for log
        const { convertFromCopper } = require('../../../utils/currencyNormalize');
        const costFormat = formatCurrency(convertFromCopper(repairCostInCopper));

        if (!hasEnoughCurrency(player.currency, { copper: repairCostInCopper })) {
            return interaction.editReply(`Kamu tidak memiliki cukup uang untuk biaya perbaikan. Butuh senilai **${costFormat}** (20% dari harga dasar).`);
        }
        payCurrency(player.currency, { copper: repairCostInCopper });
        repairCostLog = `**${costFormat}**`;
    }

    ownedAsset.isDamaged = false;
    ownedAsset.isHalted = false; // Unhalt as well
    ownedAsset.damageType = null;
    ownedAsset.lastProgressUpdate = new Date(); // reset so it doesn't backlog huge chunks of time

    await player.save();

    const embed = new EmbedBuilder()
      .setTitle('🔧 Aset Diperbaiki')
      .setDescription(`Aset **${assetConfig.name}** telah berhasil diperbaiki dan dapat beroperasi kembali.`)
      .addFields({ name: 'Biaya Perbaikan', value: repairCostLog })
      .setColor('#2ecc71');

    return interaction.editReply({ embeds: [embed] });
  }
};
