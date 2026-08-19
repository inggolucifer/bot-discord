const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const bangunAsset = require('./handlers/bangunAsset.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('asset')
    .setDescription('Asset commands')
    .addSubcommand(sub => sub.setName('bangun').setDescription('Bangun aset sendiri menggunakan material dari inventorymu (bukan beli pakai currency)').addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset yang mau dibangun').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'bangun') return bangunAsset.execute(interaction);
  }
};
