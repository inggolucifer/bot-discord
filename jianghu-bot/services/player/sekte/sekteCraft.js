const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Sect = require('../../../models/Sect');
const Asset = require('../../../models/Asset');
const { isUnderConstruction, formatRemainingTime, checkMaterials, consumeMaterials } = require('../../../utils/crafting');
const { logTransaction } = require('../../../utils/logger');
const { getPlayerSect } = require('../../../utils/sectUtils');
const { escapeRegex } = require('../../../utils/escapeRegex');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte-craft')
    .setDescription('Buat item lewat aset crafting sekte, pakai sumber daya bersama sekte')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset crafting sekte').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nama-resep').setDescription('Nama resep').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah item yang akan dibuat').setMinValue(1)),

  async autocomplete(interaction) {
    const focusedOpt = interaction.options.getFocused(true);
    if (focusedOpt.name === 'nama-aset') {
      const sect = await getPlayerSect(interaction.guildId, interaction.user.id);
      if (!sect) return interaction.respond([]);
      const assets = await Asset.find({ _id: { $in: sect.assets.map((a) => a.assetId) }, isCraftingStation: true, name: new RegExp(escapeRegex(focusedOpt.value), 'i') }).limit(25);
      return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
    }
    const namaAset = interaction.options.getString('nama-aset');
    if (!namaAset) return interaction.respond([]);
    const asset = await Asset.findOne({ name: new RegExp(`^\\s*${escapeRegex(namaAset)}\\s*$`, 'i') });
    if (!asset) return interaction.respond([]);
    const matches = asset.recipes.filter((r) => r.recipeName.toLowerCase().includes(focusedOpt.value.toLowerCase()));
    return interaction.respond(matches.map((r) => ({ name: r.recipeName, value: r.recipeName })).slice(0, 25));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const namaAset = interaction.options.getString('nama-aset');
    const namaResep = interaction.options.getString('nama-resep');

    const sect = await getPlayerSect(interaction.guildId, interaction.user.id);
    if (!sect) return interaction.editReply({ content: '❌ Kamu tidak sedang bergabung dalam sekte manapun.' });

    const role = sect.getRoleOf(interaction.user.id);
    if (!role) return interaction.editReply({ content: '❌ Kamu bukan anggota sekte ini.' });

    const asset = await Asset.findOne({ name: new RegExp(`^\\s*${escapeRegex(namaAset)}\\s*$`, 'i') });
    if (!asset || !asset.isCraftingStation) return interaction.editReply({ content: `❌ "${namaAset}" bukan aset crafting yang valid.` });

    const owned = sect.assets.find((a) => a.assetId.equals(asset._id));
    if (!owned) return interaction.editReply({ content: `❌ Sekte ini tidak memiliki aset "${asset.name}".` });

    if (isUnderConstruction(owned)) {
      return interaction.editReply({ content: `🚧 "${asset.name}" masih dalam pembangunan (${formatRemainingTime(owned.constructionCompleteAt)}).` });
    }

    const recipe = asset.recipes.find((r) => r.recipeName.toLowerCase() === namaResep.toLowerCase());
    if (!recipe) return interaction.editReply({ content: `❌ Resep "${namaResep}" tidak ada di aset ini.` });

    const jumlah = interaction.options.getInteger('jumlah') || 1;

    const check = checkMaterials(sect.resources, recipe);
    if (!check.ok) {
      const missingLines = check.missing.map((m) => `**${m.itemName}**: butuh ${m.need}, stok sekte ${m.have}`).join('\n');
      return interaction.editReply({ content: `❌ Sumber daya sekte di awal tidak cukup:\n${missingLines}` });
    }

    if (!owned.activeCrafts) owned.activeCrafts = [];
    const existingCraft = owned.activeCrafts.find(c => c.recipeName === recipe.recipeName);

    if (existingCraft) {
        existingCraft.targetQuantity += jumlah;
    } else {
        owned.activeCrafts.push({
            recipeName: recipe.recipeName,
            targetQuantity: jumlah,
            progressHours: 0
        });
    }

    await sect.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: 'sect_craft', fromUserId: interaction.user.id,
      itemDescription: `Sekte ${sect.name} mulai craft "${recipe.recipeName}" (${jumlah}x) di ${asset.name}`,
    });

    const timeReq = recipe.craftingTimeHours || 1;
    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('⚒️ Crafting Sekte Dimulai')
      .setDescription(`Sekte **${sect.name}** menugaskan pembuatan **${jumlah}x ${recipe.resultQuantity} ${recipe.resultItemName}** di **${asset.name}**.\n\nSetiap item butuh ${timeReq} jam untuk selesai.\nBahan otomatis ditarik dari gudang sekte tiap jam produksi berjalan.\nPastikan ada pekerja di aset ini!`);
    return interaction.editReply({ embeds: [embed] });
  },
};
