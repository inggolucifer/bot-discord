const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const Asset = require('../../../models/Asset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset-remove-worker')
    .setDescription('[ADMIN] Hapus fungsi Pekerja dari sebuah aset')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaAset = interaction.options.getString('nama-aset');
    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    asset.workerOutputItemId = null;
    asset.workerOutputItemName = null;
    asset.workerOutputQuantity = 0;
    await asset.save();

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Fungsi Pekerja Dihapus').setDescription(`**${asset.name}** tidak lagi menghasilkan material harian.`)] });
  },
};

