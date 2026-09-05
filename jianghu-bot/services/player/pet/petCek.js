const { SlashCommandBuilder } = require('discord.js');
const Pet = require('../../../models/Pet');
const { buildPetEmbed } = require('../../../utils/embeds');
const { escapeRegex } = require('../../../utils/escapeRegex');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cek-pet')
    .setDescription('Lihat detail seekor pet')
    .addStringOption((opt) => opt.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const pets = await Pet.find({ name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    await interaction.respond(pets.map((p) => ({ name: p.name, value: p.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const nama = interaction.options.getString('nama');
    const pet = await Pet.findOne({ name: new RegExp(`^\\s*${escapeRegex(nama)}\\s*$`, 'i') });
    if (!pet) return interaction.editReply({ content: `❌ Pet "${nama}" tidak ditemukan.` });
    return interaction.editReply({ embeds: [buildPetEmbed(pet)] });
  },
};
