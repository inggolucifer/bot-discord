const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminSetWorkerChannel = require('./handlers/adminSetWorkerChannel.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-worker-channel')
    .setDescription('Worker channel settings')
    .addSubcommand(sub => sub.setName('set').setDescription('[ADMIN] Atur channel untuk menampilkan daftar Worker yang tersedia').addChannelOption(opt => opt.setName('channel').setDescription('Channel yang akan digunakan untuk Worker').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'set') return adminSetWorkerChannel.execute(interaction);
  }
};
