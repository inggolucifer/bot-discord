const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Asset = require('../../models/Asset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset-build-req-remove')
    .setDescription('[ADMIN] Hapus kemampuan bangun mandiri dari sebuah aset')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nama-item').setDescription('Item material').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name === 'nama-aset') {
      const assets = await Asset.find({ guildId: interaction.guildId, buildable: true, name: new RegExp(escapeRegex(focusedOption.value), 'i') }).limit(25);
      return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
    } else if (focusedOption.name === 'nama-item') {
      const namaAset = interaction.options.getString('nama-aset');
      if (!namaAset) return interaction.respond([]);

      const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${escapeRegex(namaAset)}$`, 'i') });
      if (!asset || !asset.buildRequirements) return interaction.respond([]);

      const items = asset.buildRequirements.filter(r => new RegExp(escapeRegex(focusedOption.value), 'i').test(r.itemName)).slice(0, 25);
      return interaction.respond(items.map((i) => ({ name: i.itemName, value: i.itemName })));
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaAset = interaction.options.getString('nama-aset');
    const namaItem = interaction.options.getString('nama-item');

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${escapeRegex(namaAset)}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    if (!asset.buildRequirements) asset.buildRequirements = [];

    const initialLength = asset.buildRequirements.length;
    asset.buildRequirements = asset.buildRequirements.filter(r => r.itemName.toLowerCase() !== namaItem.toLowerCase());

    if (asset.buildRequirements.length === initialLength) {
        return interaction.editReply({ content: `❌ Item "${namaItem}" tidak ditemukan di syarat bangun aset "${namaAset}".` });
    }

    if (asset.buildRequirements.length === 0) {
        asset.buildable = false;
    }

    await asset.save();

    if (asset.buildable) {
        const matLines = asset.buildRequirements.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('🗑️ Syarat Bangun Dihapus').setDescription(`Syarat **${namaItem}** telah dihapus.\n\nSisa syarat untuk **${asset.name}**:\n${matLines}`)] });
    } else {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Bangun Mandiri Dihapus').setDescription(`Syarat **${namaItem}** telah dihapus. Karena tidak ada syarat tersisa, **${asset.name}** tidak lagi bisa dibangun mandiri.`)] });
    }
  },
};

