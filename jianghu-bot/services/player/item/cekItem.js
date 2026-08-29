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
    const items = await Item.find({ name: new RegExp(focused, 'i') }).limit(25);
    await interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const nama = interaction.options.getString('nama');
    const item = await Item.findOne({ name: new RegExp(`^${nama}$`, 'i') });
    if (!item) return interaction.editReply({ content: `❌ Item "${nama}" tidak ditemukan.` });

    // Find sources
    const shopEntry = await Shop.findOne({ refId: item._id, isActive: true });

    const assetsProducing = await Asset.find({

      $or: [
        { workerOutputItemId: item._id },
        { 'recipes.resultItemId': item._id }
      ]
    });


    const sourceData = {
      shop: shopEntry,
      assets: assetsProducing
    };

    // Find usages
    const assetsUsingAsMaterial = await Asset.find({

      'recipes.materials.itemId': item._id
    });

    const assetsUsingToBuild = await Asset.find({

      'buildRequirements.itemId': item._id
    });

    const assetsUsingAsInput = await Asset.find({

      'workerInputMaterials.itemId': item._id
    });

    const usageData = {
      asMaterial: assetsUsingAsMaterial,
      toBuild: assetsUsingToBuild,
      asInput: assetsUsingAsInput
    };

    return interaction.editReply({ embeds: [buildItemEmbed(item, sourceData, usageData)] });
  },
};
