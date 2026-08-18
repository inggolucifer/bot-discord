const { SlashCommandBuilder } = require('discord.js');
const Asset = require('../../models/Asset');
const { buildAssetEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cek-asset')
    .setDescription('Lihat detail sebuah aset')
    .addStringOption((opt) => opt.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    await interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const nama = interaction.options.getString('nama');
    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${nama}" tidak ditemukan.` });
    return interaction.editReply({ embeds: [buildAssetEmbed(asset)] });
  },
};
