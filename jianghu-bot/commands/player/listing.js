const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const jualListing = require('./handlers/jualListing.js');
const jualPetListing = require('./handlers/jualPetListing.js');
const jualAssetListing = require('./handlers/jualAssetListing.js');
const beliListing = require('./handlers/beliListing.js');
const cancelListing = require('./handlers/cancelListing.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listing')
    .setDescription('Listing commands')
    .addSubcommand(sub => sub.setName('jual-item').setDescription('Listing jual item ke sesama pemain (biaya 5% dipotong saat laku, maks 10 slot)').addStringOption(opt => opt.setName('nama-item').setDescription('Nama item yang mau dijual').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah yang dijual').setRequired(true).setMinValue(1)).addIntegerOption(opt => opt.setName('harga-per-unit').setDescription('Harga per 1 buah item').setRequired(true).setMinValue(1)).addStringOption(opt => opt.setName('currency').setDescription('Jenis currency').setRequired(true).addChoices({name: 'Silver Tael (银两)', value: 'silver'}).addChoices({name: 'Gold Tael (金两)', value: 'gold'}).addChoices({name: 'Jade Tael (玉两)', value: 'jade'}).addChoices({name: 'Spirit Stone (灵石)', value: 'spirit'})))
    .addSubcommand(sub => sub.setName('jual-pet').setDescription('Listing jual pet ke sesama pemain (biaya 5% dipotong saat laku)').addStringOption(opt => opt.setName('nama-pet').setDescription('Nama pet yang mau dijual').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah yang dijual').setRequired(true).setMinValue(1)).addIntegerOption(opt => opt.setName('harga-per-unit').setDescription('Harga per 1 ekor pet').setRequired(true).setMinValue(1)).addStringOption(opt => opt.setName('currency').setDescription('Jenis currency').setRequired(true).addChoices({name: 'Silver Tael (银两)', value: 'silver'}).addChoices({name: 'Gold Tael (金两)', value: 'gold'}).addChoices({name: 'Jade Tael (玉两)', value: 'jade'}).addChoices({name: 'Spirit Stone (灵石)', value: 'spirit'})))
    .addSubcommand(sub => sub.setName('jual-asset').setDescription('Listing jual aset ke sesama pemain (biaya 5% dipotong saat laku)').addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset yang mau dijual').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah yang dijual').setRequired(true).setMinValue(1)).addIntegerOption(opt => opt.setName('harga-per-unit').setDescription('Harga per 1 aset').setRequired(true).setMinValue(1)).addStringOption(opt => opt.setName('currency').setDescription('Jenis currency').setRequired(true).addChoices({name: 'Silver Tael (银两)', value: 'silver'}).addChoices({name: 'Gold Tael (金两)', value: 'gold'}).addChoices({name: 'Jade Tael (玉两)', value: 'jade'}).addChoices({name: 'Spirit Stone (灵石)', value: 'spirit'})))
    .addSubcommand(sub => sub.setName('beli').setDescription('Beli item dari listing jualan pemain lain').addStringOption(opt => opt.setName('kode-listing').setDescription('Kode listing (6 karakter)').setRequired(true)))
    .addSubcommand(sub => sub.setName('batal').setDescription('Batalkan listing jualanmu sendiri, item dikembalikan ke inventory').addStringOption(opt => opt.setName('kode-listing').setDescription('Kode listing (6 karakter)').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'jual-item') return jualListing.execute(interaction);
    if (subcommand === 'jual-pet') return jualPetListing.execute(interaction);
    if (subcommand === 'jual-asset') return jualAssetListing.execute(interaction);
    if (subcommand === 'beli') return beliListing.execute(interaction);
    if (subcommand === 'batal') return cancelListing.execute(interaction);
  }
};
