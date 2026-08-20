const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../../models/Player');
const Asset = require('../../../models/Asset');
const { logTransaction } = require('../../../utils/logger');
const { isUnderConstruction, formatRemainingTime, checkMaterials, consumeMaterials } = require('../../../utils/crafting');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Buat item lewat aset crafting yang kamu miliki (mis. Tungku Tempa)')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset crafting milikmu').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nama-resep').setDescription('Nama resep yang mau dibuat').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);

    const focusedOpt = interaction.options.getFocused(true);
    if (focusedOpt.name === 'nama-aset') {
      const ownedAssetIds = player.assets.map((a) => a.assetId);
      const assets = await Asset.find({ _id: { $in: ownedAssetIds }, isCraftingStation: true, name: new RegExp(focusedOpt.value, 'i') }).limit(25);
      return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
    }

    const namaAset = interaction.options.getString('nama-aset');
    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.respond([]);
    const matches = asset.recipes.filter((r) => r.recipeName.toLowerCase().includes(focusedOpt.value.toLowerCase()));
    return interaction.respond(matches.map((r) => ({ name: r.recipeName, value: r.recipeName })).slice(0, 25));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const namaAset = interaction.options.getString('nama-aset');
    const namaResep = interaction.options.getString('nama-resep');

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**.` });

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });
    if (!asset.isCraftingStation) return interaction.editReply({ content: `❌ "${asset.name}" bukan aset crafting.` });

    const owned = player.assets.find((a) => a.assetId.equals(asset._id));
    if (!owned) return interaction.editReply({ content: `❌ Kamu tidak memiliki aset "${asset.name}".` });

    if (isUnderConstruction(owned)) {
      return interaction.editReply({ content: `🚧 "${asset.name}" masih dalam pembangunan (${formatRemainingTime(owned.constructionCompleteAt)}).` });
    }

    const recipe = asset.recipes.find((r) => r.recipeName.toLowerCase() === namaResep.toLowerCase());
    if (!recipe) return interaction.editReply({ content: `❌ Resep "${namaResep}" tidak ada di aset ini.` });

    const check = checkMaterials(player.inventory, recipe);
    if (!check.ok) {
      const missingLines = check.missing.map((m) => `**${m.itemName}**: butuh ${m.need}, kamu punya ${m.have}`).join('\n');
      return interaction.editReply({ content: `❌ Bahan tidak cukup:\n${missingLines}` });
    }

    player.inventory = consumeMaterials(player.inventory, recipe);
    const resultOwned = player.inventory.find((i) => i.itemId.equals(recipe.resultItemId));
    if (resultOwned) resultOwned.quantity += recipe.resultQuantity;
    else player.inventory.push({ itemId: recipe.resultItemId, quantity: recipe.resultQuantity });

    await player.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId,
      type: 'craft',
      fromUserId: interaction.user.id,
      itemDescription: `Craft "${recipe.recipeName}" di ${asset.name} -> ${recipe.resultQuantity}x ${recipe.resultItemName}`,
    });

    const matUsed = recipe.materials.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');
    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('⚒️ Crafting Berhasil!')
      .setDescription(`Di **${asset.name}**, kamu berhasil membuat **${recipe.resultQuantity}x ${recipe.resultItemName}**!\n\nBahan terpakai: ${matUsed}`);
    return interaction.editReply({ embeds: [embed] });
  },
};

