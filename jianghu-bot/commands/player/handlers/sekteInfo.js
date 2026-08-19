const { SlashCommandBuilder } = require('discord.js');
const Sect = require('../../../models/Sect');
const Item = require('../../../models/Item');
const Asset = require('../../../models/Asset');
const { buildSectEmbed } = require('../../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte-info')
    .setDescription('Lihat info sebuah sekte: jabatan, aset, dan sumber daya')
    .addStringOption((o) => o.setName('nama-sekte').setDescription('Nama sekte').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Sect.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((s) => ({ name: s.name, value: s.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const namaSekte = interaction.options.getString('nama-sekte');
    const sect = await Sect.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaSekte}$`, 'i') });
    if (!sect) return interaction.editReply({ content: `❌ Sekte "${namaSekte}" tidak ditemukan.` });

    const [resourceItemDocs, assetDocsRaw] = await Promise.all([
      Item.find({ _id: { $in: sect.resources.map((r) => r.itemId) } }),
      Asset.find({ _id: { $in: sect.assets.map((a) => a.assetId) } }),
    ]);

    const resourceDocs = sect.resources.map((r) => ({
      doc: resourceItemDocs.find((d) => d._id.equals(r.itemId)),
      quantity: r.quantity,
    })).filter((x) => x.doc);

    const assetDocs = sect.assets.map((a) => ({
      doc: assetDocsRaw.find((d) => d._id.equals(a.assetId)),
      quantity: a.quantity,
      owned: a,
    })).filter((x) => x.doc);

    return interaction.editReply({ embeds: [buildSectEmbed(sect, resourceDocs, assetDocs)] });
  },
};

