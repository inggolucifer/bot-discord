const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminShopAdd = require('./handlers/adminShopAdd.js');
const adminShopRemove = require('./handlers/adminShopRemove.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-shop')
    .setDescription('Manage shop')
    .addSubcommand(sub => sub.setName('add').setDescription('[ADMIN] Tambahkan item/pet/asset ke shop').addStringOption(opt => opt.setName('kategori').setDescription('Kategori').setRequired(true).addChoices({name: 'Item', value: 'item'}).addChoices({name: 'Pet', value: 'pet'}).addChoices({name: 'Asset', value: 'asset'})).addStringOption(opt => opt.setName('nama').setDescription('Nama barang (harus sudah dibuat lebih dulu)').setRequired(true)).addIntegerOption(opt => opt.setName('harga').setDescription('Harga').setRequired(true).setMinValue(1)).addStringOption(opt => opt.setName('currency').setDescription('Jenis currency harga').setRequired(true).addChoices({name: 'Silver Tael (银两)', value: 'silver'}).addChoices({name: 'Gold Tael (金两)', value: 'gold'}).addChoices({name: 'Jade Tael (玉两)', value: 'jade'}).addChoices({name: 'Spirit Stone (灵石)', value: 'spirit'})).addIntegerOption(opt => opt.setName('stok').setDescription('Stok (-1 = unlimited, default unlimited)')))
    .addSubcommand(sub => sub.setName('remove').setDescription('[ADMIN] Hapus barang dari shop').addStringOption(opt => opt.setName('kategori').setDescription('Kategori').setRequired(true).addChoices({name: 'Item', value: 'item'}).addChoices({name: 'Pet', value: 'pet'}).addChoices({name: 'Asset', value: 'asset'})).addStringOption(opt => opt.setName('nama').setDescription('Nama barang').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'add') return adminShopAdd.execute(interaction);
    if (subcommand === 'remove') return adminShopRemove.execute(interaction);
  }
};
