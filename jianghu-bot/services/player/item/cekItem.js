const { SlashCommandBuilder } = require('discord.js');
const Item = require('../../../models/Item');
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
    return interaction.editReply({ embeds: [buildItemEmbed(item)] });
  },
};
