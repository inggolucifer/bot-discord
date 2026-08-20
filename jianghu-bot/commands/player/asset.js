const { SlashCommandBuilder } = require('discord.js');
const cekAssetService = require('../../services/player/asset/cekAsset');
const bangunAssetService = require('../../services/player/asset/bangunAsset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('asset')
    .setDescription('Sistem Aset')
    .addSubcommand(sub => sub.setName('cek').setDescription('Lihat detail sebuah aset').addStringOption(o => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('bangun').setDescription('Bangun aset secara mandiri (butuh material)').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset yang ingin dibangun').setRequired(true).setAutocomplete(true))),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'cek' && cekAssetService.autocomplete) return cekAssetService.autocomplete(interaction);
    if (sub === 'bangun' && bangunAssetService.autocomplete) return bangunAssetService.autocomplete(interaction);
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'cek') return cekAssetService.execute(interaction);
    if (sub === 'bangun') return bangunAssetService.execute(interaction);
  }
};
