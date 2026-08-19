const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminGiveCurrency = require('./handlers/adminGiveCurrency.js');
const adminGiveItem = require('./handlers/adminGiveItem.js');
const adminGivePet = require('./handlers/adminGivePet.js');
const adminGiveAsset = require('./handlers/adminGiveAsset.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-give')
    .setDescription('Give resources')
    .addSubcommand(sub => sub.setName('currency').setDescription('[ADMIN] Beri atau kurangi currency player').addUserOption(opt => opt.setName('user').setDescription('Target player').setRequired(true)).addStringOption(opt => opt.setName('jenis').setDescription('Jenis currency').setRequired(true).addChoices({name: 'Silver Tael (银两)', value: 'silver'}).addChoices({name: 'Gold Tael (金两)', value: 'gold'}).addChoices({name: 'Jade Tael (玉两)', value: 'jade'}).addChoices({name: 'Spirit Stone (灵石)', value: 'spirit'})).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah (boleh negatif untuk mengurangi)').setRequired(true)))
    .addSubcommand(sub => sub.setName('item').setDescription('[ADMIN] Beri item ke player').addUserOption(opt => opt.setName('user').setDescription('Target player').setRequired(true)).addStringOption(opt => opt.setName('nama').setDescription('Nama item').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah (default 1)').setMinValue(1)))
    .addSubcommand(sub => sub.setName('pet').setDescription('[ADMIN] Beri pet ke player').addUserOption(opt => opt.setName('user').setDescription('Target player').setRequired(true)).addStringOption(opt => opt.setName('nama').setDescription('Nama pet').setRequired(true)).addStringOption(opt => opt.setName('nickname').setDescription('Nickname pet (opsional)')))
    .addSubcommand(sub => sub.setName('asset').setDescription('[ADMIN] Beri kepemilikan aset ke player').addUserOption(opt => opt.setName('user').setDescription('Target player').setRequired(true)).addStringOption(opt => opt.setName('nama').setDescription('Nama aset').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah (default 1)').setMinValue(1)).addBooleanOption(opt => opt.setName('skip-pembangunan').setDescription('Lewati waktu pembangunan (langsung jadi/selesai)? Default: tidak'))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'currency') return adminGiveCurrency.execute(interaction);
    if (subcommand === 'item') return adminGiveItem.execute(interaction);
    if (subcommand === 'pet') return adminGivePet.execute(interaction);
    if (subcommand === 'asset') return adminGiveAsset.execute(interaction);
  }
};
