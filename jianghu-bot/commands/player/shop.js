const { SlashCommandBuilder } = require('discord.js');
const shopService = require('../../services/player/shopService');
const beliService = require('../../services/player/beliService');
const jualService = require('../../services/player/jualService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Toko Jianghu World (Sistem & Pemain)')
    .addSubcommand(sub => sub
      .setName('lihat')
      .setDescription('Lihat daftar barang di toko')
      .addStringOption(o => o.setName('sumber').setDescription('Toko sistem atau pemain?').addChoices({ name: 'System Shop', value: 'sistem' }, { name: 'Player Shop', value: 'pemain' }))
      .addStringOption(o => o.setName('kategori').setDescription('Kategori (hanya untuk System Shop)').addChoices({ name: 'Item', value: 'item' }, { name: 'Pet', value: 'pet' }, { name: 'Asset', value: 'asset' }))
    )
    .addSubcommand(sub => sub
      .setName('beli')
      .setDescription('Beli item/pet/asset dari shop sistem')
      .addStringOption(o => o.setName('kategori').setDescription('Kategori').setRequired(true).addChoices({ name: 'Item', value: 'item' }, { name: 'Pet', value: 'pet' }, { name: 'Asset', value: 'asset' }))
      .addStringOption(o => o.setName('nama').setDescription('Nama barang').setRequired(true))
      .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah (default 1)').setMinValue(1))
    )
    .addSubcommand(sub => sub
      .setName('jual')
      .setDescription('Jual kembali item/pet/asset ke sistem (20% harga)')
      .addStringOption(o => o.setName('kategori').setDescription('Kategori').setRequired(true).addChoices({ name: 'Item', value: 'item' }, { name: 'Pet', value: 'pet' }, { name: 'Asset', value: 'asset' }))
      .addStringOption(o => o.setName('nama').setDescription('Nama barang').setRequired(true))
      .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah (default 1)').setMinValue(1))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'lihat') return shopService.execute(interaction);
    if (sub === 'beli') return beliService.execute(interaction);
    if (sub === 'jual') return jualService.execute(interaction);
  }
};
