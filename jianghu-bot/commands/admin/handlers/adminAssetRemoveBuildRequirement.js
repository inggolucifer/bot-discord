const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const Asset = require('../../../models/Asset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset-build-req-remove')
    .setDescription('[ADMIN] Hapus kemampuan bangun mandiri dari sebuah aset')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ guildId: interaction.guildId, buildable: true, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaAset = interaction.options.getString('nama-aset');
    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    asset.buildable = false;
    asset.buildRequirements = [];
    await asset.save();

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Bangun Mandiri Dihapus').setDescription(`**${asset.name}** tidak lagi bisa dibangun mandiri (hanya via shop kalau ada harga).`)] });
  },
};

