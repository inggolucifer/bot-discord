const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const cekItem = require('./handlers/cekItem.js');
const cekPet = require('./handlers/cekPet.js');
const cekAsset = require('./handlers/cekAsset.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cek')
    .setDescription('Cek item, pet, atau asset')
    .addSubcommand(sub => sub.setName('item').setDescription('Lihat detail sebuah item').addStringOption(opt => opt.setName('nama').setDescription('Nama item').setRequired(true)))
    .addSubcommand(sub => sub.setName('pet').setDescription('Lihat detail seekor pet').addStringOption(opt => opt.setName('nama').setDescription('Nama pet').setRequired(true)))
    .addSubcommand(sub => sub.setName('asset').setDescription('Lihat detail sebuah aset').addStringOption(opt => opt.setName('nama').setDescription('Nama aset').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'item') return cekItem.execute(interaction);
    if (subcommand === 'pet') return cekPet.execute(interaction);
    if (subcommand === 'asset') return cekAsset.execute(interaction);
  }
};
