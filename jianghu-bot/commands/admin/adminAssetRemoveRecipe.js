const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Asset = require('../../models/Asset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset-remove-recipe')
    .setDescription('[ADMIN] Hapus resep crafting dari sebuah aset')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nama-resep').setDescription('Nama resep yang mau dihapus').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    if (interaction.options.getFocused(true).name === 'nama-aset') {
      const assets = await Asset.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
      return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
    }
    const namaAset = interaction.options.getString('nama-aset');
    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.respond([]);
    const matches = asset.recipes.filter((r) => r.recipeName.toLowerCase().includes(focused.toLowerCase()));
    return interaction.respond(matches.map((r) => ({ name: r.recipeName, value: r.recipeName })).slice(0, 25));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaAset = interaction.options.getString('nama-aset');
    const namaResep = interaction.options.getString('nama-resep');

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    const before = asset.recipes.length;
    asset.recipes = asset.recipes.filter((r) => r.recipeName.toLowerCase() !== namaResep.toLowerCase());
    if (asset.recipes.length === before) return interaction.editReply({ content: `❌ Resep "${namaResep}" tidak ditemukan di aset ini.` });

    if (asset.recipes.length === 0) asset.isCraftingStation = false;
    await asset.save();

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Resep Dihapus').setDescription(`Resep **"${namaResep}"** dihapus dari aset **${asset.name}**.`)] });
  },
};

