const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Asset = require('../../models/Asset');
const Item = require('../../models/Item');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset-build-req-set')
    .setDescription('[ADMIN] Atur material yang dibutuhkan supaya aset ini bisa dibangun mandiri oleh player/sekte')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nama-item').setDescription('Item material').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah material').setRequired(true).setMinValue(1)),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name === 'nama-aset') {
      const assets = await Asset.find({ guildId: interaction.guildId, name: new RegExp(focusedOption.value, 'i') }).limit(25);
      return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
    } else if (focusedOption.name === 'nama-item') {
      const items = await Item.find({ guildId: interaction.guildId, name: new RegExp(focusedOption.value, 'i') }).limit(25);
      return interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaAset = interaction.options.getString('nama-aset');
    const namaItem = interaction.options.getString('nama-item');
    const jumlah = interaction.options.getInteger('jumlah');

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    const item = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaItem}$`, 'i') });
    if (!item) return interaction.editReply({ content: `❌ Item "${namaItem}" tidak ditemukan.` });

    if (!asset.buildRequirements) asset.buildRequirements = [];

    const existingReq = asset.buildRequirements.find((r) => r.itemId.toString() === item._id.toString());
    if (existingReq) {
      existingReq.quantity = jumlah;
    } else {
      asset.buildRequirements.push({ itemId: item._id, itemName: item.name, quantity: jumlah });
    }

    asset.buildable = true;
    await asset.save();

    const matLines = asset.buildRequirements.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');
    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('🔨 Syarat Bangun Mandiri Diatur')
      .setDescription(`**${asset.name}** sekarang butuh material ini untuk dibangun mandiri:\n${matLines}`);
    return interaction.editReply({ embeds: [embed] });
  },
};

