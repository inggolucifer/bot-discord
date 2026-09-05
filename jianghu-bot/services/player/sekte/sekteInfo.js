const { SlashCommandBuilder } = require('discord.js');
const Sect = require('../../../models/Sect');
const Item = require('../../../models/Item');
const Asset = require('../../../models/Asset');
const { buildSectEmbed } = require('../../../utils/embeds');
const { getPlayerSect } = require('../../../utils/sectUtils');
const { escapeRegex } = require('../../../utils/escapeRegex');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte-info')
    .setDescription('Lihat info sebuah sekte: jabatan, aset, dan sumber daya')
    .addStringOption((o) => o.setName('nama').setDescription('Nama sekte (kosongkan untuk sekte sendiri)').setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Sect.find({ guildId: interaction.guildId, name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    return interaction.respond(list.map((s) => ({ name: s.name, value: s.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    let namaSekte = interaction.options.getString('nama');
    let sect;

    if (namaSekte) {
      sect = await Sect.findOne({ guildId: interaction.guildId, name: new RegExp(`^\\s*${escapeRegex(namaSekte)}\\s*$`, 'i') });
      if (!sect) return interaction.editReply({ content: `❌ Sekte "${namaSekte}" tidak ditemukan.` });
    } else {
      sect = await getPlayerSect(interaction.guildId, interaction.user.id);
      if (!sect) return interaction.editReply({ content: '❌ Kamu tidak sedang bergabung dalam sekte manapun. Gunakan opsi `nama` untuk melihat sekte lain.' });
    }

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
