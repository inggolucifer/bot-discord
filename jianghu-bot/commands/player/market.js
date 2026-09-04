const { SlashCommandBuilder } = require('discord.js');
const jualListingService = require('../../services/player/jualListingService');
const jualPetListingService = require('../../services/player/jualPetListingService');
const jualAssetListingService = require('../../services/player/jualAssetListingService');
const beliListingService = require('../../services/player/beliListingService');
const cancelListingService = require('../../services/player/cancelListingService');
const lihatJualanService = require('../../services/player/lihatJualanService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market')
    .setDescription('Pasar pemain (Player Market)')
    .addSubcommand(sub => sub
      .setName('jual-item')
      .setDescription('Jual item ke Player Market')
      .addStringOption(o => o.setName('nama-item').setDescription('Nama item yang ingin dijual').setRequired(true).setAutocomplete(true))
      .addIntegerOption(o => o.setName('jumlah').setDescription('Berapa banyak yang dijual').setRequired(true).setMinValue(1))
      .addIntegerOption(o => o.setName('harga-per-unit').setDescription('Harga satuan').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('currency').setDescription('Jenis mata uang').setRequired(true).addChoices({ name: 'Copper Tael', value: 'copper' }, { name: 'Silver Tael', value: 'silver' }, { name: 'Gold Ingot', value: 'gold' }, { name: 'Spirit Jade', value: 'jade' }, { name: 'Heavenly Spirit', value: 'spirit' }))
    )
    .addSubcommand(sub => sub
      .setName('jual-pet')
      .setDescription('Jual pet ke Player Market')
      .addStringOption(o => o.setName('nama-pet').setDescription('Nama jenis pet yang ingin dijual').setRequired(true).setAutocomplete(true))
      .addStringOption(o => o.setName('instance-id').setDescription('Instance ID pet (lihat dari profil)').setRequired(true))
      .addIntegerOption(o => o.setName('harga-total').setDescription('Harga total pet ini').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('currency').setDescription('Jenis mata uang').setRequired(true).addChoices({ name: 'Copper Tael', value: 'copper' }, { name: 'Silver Tael', value: 'silver' }, { name: 'Gold Ingot', value: 'gold' }, { name: 'Spirit Jade', value: 'jade' }, { name: 'Heavenly Spirit', value: 'spirit' }))
    )
    .addSubcommand(sub => sub
      .setName('jual-asset')
      .setDescription('Jual aset ke Player Market')
      .addStringOption(o => o.setName('nama-asset').setDescription('Nama aset yang ingin dijual').setRequired(true).setAutocomplete(true))
      .addIntegerOption(o => o.setName('jumlah').setDescription('Berapa banyak yang dijual').setRequired(true).setMinValue(1))
      .addIntegerOption(o => o.setName('harga-per-unit').setDescription('Harga satuan').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('currency').setDescription('Jenis mata uang').setRequired(true).addChoices({ name: 'Copper Tael', value: 'copper' }, { name: 'Silver Tael', value: 'silver' }, { name: 'Gold Ingot', value: 'gold' }, { name: 'Spirit Jade', value: 'jade' }, { name: 'Heavenly Spirit', value: 'spirit' }))
    )
    .addSubcommand(sub => sub
      .setName('beli')
      .setDescription('Beli barang dari Player Market')
      .addStringOption(o => o.setName('kode-listing').setDescription('Kode listing (6 huruf unik)').setRequired(true))
      .addIntegerOption(o => o.setName('jumlah').setDescription('Berapa yang dibeli (kosongkan = semua)').setMinValue(1))
    )
    .addSubcommand(sub => sub
      .setName('batal')
      .setDescription('Batalkan listing kamu yang ada di Player Market')
      .addStringOption(o => o.setName('kode-listing').setDescription('Kode listing yang mau dibatalkan').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('lihat-jualan')
      .setDescription('Lihat seluruh jualan (listing aktif) kamu di Player Market')
    ),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'jual-item' && jualListingService.autocomplete) return jualListingService.autocomplete(interaction);
    if (sub === 'jual-pet' && jualPetListingService.autocomplete) return jualPetListingService.autocomplete(interaction);
    if (sub === 'jual-asset' && jualAssetListingService.autocomplete) return jualAssetListingService.autocomplete(interaction);
  },

  async execute(interaction) {
    try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'jual-item') return await jualListingService.execute(interaction);
    if (sub === 'jual-pet') return await jualPetListingService.execute(interaction);
    if (sub === 'jual-asset') return await jualAssetListingService.execute(interaction);
    if (sub === 'beli') return await beliListingService.execute(interaction);
    if (sub === 'batal') return await cancelListingService.execute(interaction);
    if (sub === 'lihat-jualan') return await lihatJualanService.execute(interaction);
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
