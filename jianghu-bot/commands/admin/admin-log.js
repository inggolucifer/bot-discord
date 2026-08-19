const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminSetLog = require('./handlers/adminSetLog.js');
const adminSetLogRetention = require('./handlers/adminSetLogRetention.js');
const adminClearLogs = require('./handlers/adminClearLogs.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-log')
    .setDescription('Manage logs')
    .addSubcommand(sub => sub.setName('set').setDescription('[ADMIN] Atur channel log transaksi & log admin').addChannelOption(opt => opt.setName('channel-transaksi').setDescription('Channel untuk log transaksi player')).addChannelOption(opt => opt.setName('channel-admin').setDescription('Channel untuk log aksi admin')))
    .addSubcommand(sub => sub.setName('set-retention').setDescription('[ADMIN] Atur berapa lama log transaksi/admin disimpan sebelum dihapus otomatis').addIntegerOption(opt => opt.setName('hari').setDescription('Jumlah hari (1-3650). Default: 30').setRequired(true).setMinValue(1).setMaxValue(3650)))
    .addSubcommand(sub => sub.setName('clear').setDescription('[ADMIN] Hapus log lama SEKARANG JUGA (manual, di luar jadwal otomatis)')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'set') return adminSetLog.execute(interaction);
    if (subcommand === 'set-retention') return adminSetLogRetention.execute(interaction);
    if (subcommand === 'clear') return adminClearLogs.execute(interaction);
  }
};
