const { SlashCommandBuilder } = require('discord.js');
const Item = require('../../../models/Item');
const Asset = require('../../../models/Asset');
const Shop = require('../../../models/Shop');
const { buildItemEmbed } = require('../../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cek-item')
    .setDescription('Lihat detail sebuah item')
    .addStringOption((opt) => opt.setName('nama').setDescription('Nama item').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const items = await Item.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    await interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const nama = interaction.options.getString('nama');
    const item = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!item) return interaction.editReply({ content: `❌ Item "${nama}" tidak ditemukan.` });

    // Find sources
    const shopEntry = await Shop.findOne({ guildId: interaction.guildId, refId: item._id, isActive: true });

    const assetsProducing = await Asset.find({
      guildId: interaction.guildId,
      $or: [
        { workerOutputItemId: item._id },
        { 'recipes.resultItemId': item._id }
      ]
    });

    const sourceData = {
      shop: shopEntry,
      assets: assetsProducing
    };

    return interaction.editReply({ embeds: [buildItemEmbed(item, sourceData)] });
  },
};
