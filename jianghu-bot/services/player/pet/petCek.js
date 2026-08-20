const { SlashCommandBuilder } = require('discord.js');
const Pet = require('../../../models/Pet');
const { buildPetEmbed } = require('../../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cek-pet')
    .setDescription('Lihat detail seekor pet')
    .addStringOption((opt) => opt.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const pets = await Pet.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    await interaction.respond(pets.map((p) => ({ name: p.name, value: p.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const nama = interaction.options.getString('nama');
    const pet = await Pet.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!pet) return interaction.editReply({ content: `❌ Pet "${nama}" tidak ditemukan.` });
    return interaction.editReply({ embeds: [buildPetEmbed(pet)] });
  },
};
