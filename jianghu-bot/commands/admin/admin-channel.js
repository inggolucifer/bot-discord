const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminChannelAdd = require('./handlers/adminChannelAdd.js');
const adminChannelRemove = require('./handlers/adminChannelRemove.js');
const adminChannelList = require('./handlers/adminChannelList.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-channel')
    .setDescription('Manage channels')
    .addSubcommand(sub => sub.setName('add').setDescription('[ADMIN] Izinkan bot dipakai di channel ini (atau channel tertentu)').addChannelOption(opt => opt.setName('channel').setDescription('Channel yang diizinkan (default: channel ini)')))
    .addSubcommand(sub => sub.setName('remove').setDescription('[ADMIN] Cabut izin bot di channel tertentu').addChannelOption(opt => opt.setName('channel').setDescription('Channel yang mau dicabut izinnya (default: channel ini)')))
    .addSubcommand(sub => sub.setName('list').setDescription('[ADMIN] Lihat daftar channel yang diizinkan untuk bot')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'add') return adminChannelAdd.execute(interaction);
    if (subcommand === 'remove') return adminChannelRemove.execute(interaction);
    if (subcommand === 'list') return adminChannelList.execute(interaction);
  }
};
