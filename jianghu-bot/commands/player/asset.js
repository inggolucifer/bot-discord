const { SlashCommandBuilder } = require('discord.js');
const cekAssetService = require('../../services/player/asset/cekAsset');
const bangunAssetService = require('../../services/player/asset/bangunAsset');
const tambahSlotAssetService = require('../../services/player/asset/tambahSlotAsset');
const listAssetService = require('../../services/player/asset/listAsset');
const hancurkanAssetService = require('../../services/player/asset/hancurkanAsset');
const perbaikiAssetService = require('../../services/player/asset/perbaikiAsset');
const guardAssetService = require('../../services/player/asset/guardAsset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('asset')
    .setDescription('Sistem Aset')
    .addSubcommand(sub => sub.setName('cek').setDescription('Lihat detail sebuah aset').addStringOption(o => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('Lihat daftar keseluruhan aset'))
    .addSubcommand(sub => sub.setName('bangun').setDescription('Bangun aset secara mandiri (butuh material)').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset yang ingin dibangun').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('tambah-slot').setDescription('Tambah slot maksimal lahan aset dengan Silver/Gold'))
    .addSubcommand(sub => sub.setName('hancurkan').setDescription('Hancurkan aset yang dimiliki (Biaya: 1 Gold)').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset yang ingin dihancurkan').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('perbaiki').setDescription('Perbaiki aset yang rusak (Biaya: 20% Base/Material)').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset yang rusak').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('guard').setDescription('Sewa guard untuk menjaga aset dari serangan bandit').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset yang dijaga').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('hari').setDescription('Lama sewa (hari)').setRequired(true).setMinValue(1).setMaxValue(30))),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'cek' && cekAssetService.autocomplete) return cekAssetService.autocomplete(interaction);
    if (sub === 'bangun' && bangunAssetService.autocomplete) return bangunAssetService.autocomplete(interaction);
    if (sub === 'hancurkan' && hancurkanAssetService.autocomplete) return hancurkanAssetService.autocomplete(interaction);
    if (sub === 'perbaiki' && perbaikiAssetService.autocomplete) return perbaikiAssetService.autocomplete(interaction);
    if (sub === 'guard' && guardAssetService.autocomplete) return guardAssetService.autocomplete(interaction);
  },

  async execute(interaction) {
    try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'cek') return await cekAssetService.execute(interaction);
    if (sub === 'list') return await listAssetService.execute(interaction);
    if (sub === 'bangun') return await bangunAssetService.execute(interaction);
    if (sub === 'tambah-slot') return await tambahSlotAssetService.execute(interaction);
    if (sub === 'hancurkan') return await hancurkanAssetService.execute(interaction);
    if (sub === 'perbaiki') return await perbaikiAssetService.execute(interaction);
    if (sub === 'guard') return await guardAssetService.execute(interaction);
      } catch (error) {
      console.error(error);
      const msg = "Terjadi kesalahan sistem saat memproses command ini.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  }
};
