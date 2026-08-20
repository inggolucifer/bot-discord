const { SlashCommandBuilder } = require('discord.js');
const lelangRequestService = require('../../services/player/lelangRequestService');
const lelangBidService = require('../../services/player/lelangBidService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lelang')
    .setDescription('Sistem Rumah Lelang (Auction House)')
    .addSubcommand(sub => sub
      .setName('request')
      .setDescription('Request ke admin untuk melelang item kamu')
      .addStringOption(o => o.setName('nama-item').setDescription('Nama item yang ingin dilelang').setRequired(true).setAutocomplete(true))
      .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah item').setRequired(true).setMinValue(1))
      .addIntegerOption(o => o.setName('starting-bid').setDescription('Harga awal bid (Silver)').setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub => sub
      .setName('bid')
      .setDescription('Menawar (bid) pada lelang yang sedang aktif')
      .addStringOption(o => o.setName('id-lelang').setDescription('ID Lelang (dapat dilihat di channel lelang)').setRequired(true))
      .addIntegerOption(o => o.setName('jumlah-bid').setDescription('Jumlah tawaran kamu dalam Silver').setRequired(true).setMinValue(1))
    ),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'request' && lelangRequestService.autocomplete) {
      return lelangRequestService.autocomplete(interaction);
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'request') return lelangRequestService.execute(interaction);
    if (sub === 'bid') return lelangBidService.execute(interaction);
  }
};
