const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Player = require('../../../models/Player');
const Asset = require('../../../models/Asset');
const WorkerContract = require('../../../models/WorkerContract');
const { logTransaction } = require('../../../utils/logger');
const { isUnderConstruction } = require('../../../utils/crafting');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hancurkan')
    .setDescription('Hancurkan aset yang dimiliki (Biaya: 1 Gold)')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset yang ingin dihancurkan').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('assets.assetId');
    if (!player) return interaction.respond([]);

    // Filter only assets the player owns and match the focused text
    const ownedAssetNames = [...new Set(player.assets.map(a => a.assetId?.name).filter(Boolean))];
    const filtered = ownedAssetNames.filter(name => name.toLowerCase().includes(focused.toLowerCase())).slice(0, 25);

    return interaction.respond(filtered.map((name) => ({ name, value: name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const namaAset = interaction.options.getString('nama-aset');
    const guildId = interaction.guildId;

    const player = await Player.findOne({ discordId: interaction.user.id, guildId }).populate('assets.assetId');
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**.` });

    // Check if player has at least 1 Gold (100 Silver)
    const HANCURKAN_COST_SILVER = 100;
    const { hasEnoughCurrency, payCurrency } = require('../../../utils/currency');
    if (!hasEnoughCurrency(player.currency, HANCURKAN_COST_SILVER, 'silver')) {
        return interaction.editReply({ content: '❌ Saldo Wealth kamu tidak cukup. Butuh setara dengan **1 Gold** (100 Silver) untuk menghancurkan aset.' });
    }

    // Find the asset in player's assets array
    const assetIndex = player.assets.findIndex(a => a.assetId && a.assetId.name.toLowerCase() === namaAset.toLowerCase());
    if (assetIndex === -1) {
        return interaction.editReply({ content: `❌ Kamu tidak memiliki aset dengan nama **${namaAset}**.` });
    }

    const ownedAsset = player.assets[assetIndex];
    const assetRef = ownedAsset.assetId; // Fully populated Asset document

    if (isUnderConstruction(ownedAsset)) {
      return interaction.editReply({ content: `❌ Aset "**${assetRef.name}**" masih dalam tahap pembangunan dan tidak bisa dihancurkan.` });
    }

    // Free any assigned workers back to idle status
    if (ownedAsset.assignedWorkers && ownedAsset.assignedWorkers.length > 0) {
        const workerIds = ownedAsset.assignedWorkers.map(w => w.workerId);
        await WorkerContract.updateMany(
            { _id: { $in: workerIds }, guildId },
            { $set: { status: 'idle', assignedAssetId: null } }
        );
        // CRITICAL FIX: Clear the assigned workers from the player's asset array
        ownedAsset.assignedWorkers = [];
    }

    // Decrease quantity or remove entirely
    if (ownedAsset.quantity > 1) {
        ownedAsset.quantity -= 1;
    } else {
        player.assets.splice(assetIndex, 1);
    }

    // Deduct cost
    if (!payCurrency(player.currency, HANCURKAN_COST_SILVER, 'silver')) {
      return interaction.editReply(`❌ Uang tidak cukup. Butuh setara dengan **${HANCURKAN_COST_SILVER} Silver**.`);
    }

    await player.save();

    await logTransaction(interaction.client, {
      guildId,
      type: 'player_destroy_asset',
      fromUserId: interaction.user.id,
      currency: 'silver',
      amount: HANCURKAN_COST_SILVER,
      itemDescription: `Menghancurkan aset ${assetRef.name}`,
      balanceAfter: player.currency
    });

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c) // Red color for destruction
      .setTitle('💥 Aset Dihancurkan!')
      .setDescription(`Kamu telah berhasil menghancurkan **1x ${assetRef.name}**.\n\nBiaya yang dikeluarkan: **1 Gold**.`);

    return interaction.editReply({ embeds: [embed] });
  },
};
