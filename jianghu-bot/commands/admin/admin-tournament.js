const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adminTournamentCreate = require('./handlers/adminTournamentCreate.js');
const adminTournamentStart = require('./handlers/adminTournamentStart.js');
const adminTournamentCancel = require('./handlers/adminTournamentCancel.js');
const adminTournamentList = require('./handlers/adminTournamentList.js');
const adminTournamentAddPlayer = require('./handlers/adminTournamentAddPlayer.js');
const adminTournamentRemovePlayer = require('./handlers/adminTournamentRemovePlayer.js');
const adminTournamentSetWinner = require('./handlers/adminTournamentSetWinner.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament')
    .setDescription('Manage tournaments')
    .addSubcommand(sub => sub.setName('create').setDescription('[ADMIN] Buat turnamen bracket baru (sistem gugur)').addStringOption(opt => opt.setName('nama').setDescription('Nama turnamen').setRequired(true)))
    .addSubcommand(sub => sub.setName('start').setDescription('[ADMIN] Mulai turnamen (bracket babak 1 dibuat otomatis & diacak)').addStringOption(opt => opt.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true)))
    .addSubcommand(sub => sub.setName('cancel').setDescription('[ADMIN] Batalkan turnamen yang sedang berjalan/pendaftaran').addStringOption(opt => opt.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('[ADMIN] Lihat semua turnamen di server ini'))
    .addSubcommand(sub => sub.setName('add-player').setDescription('[ADMIN] Daftarkan player ke turnamen (masih fase pendaftaran)').addStringOption(opt => opt.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true)).addUserOption(opt => opt.setName('user').setDescription('Player yang didaftarkan').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove-player').setDescription('[ADMIN] Keluarkan player dari turnamen (masih fase pendaftaran)').addStringOption(opt => opt.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true)).addUserOption(opt => opt.setName('user').setDescription('Player yang dikeluarkan').setRequired(true)))
    .addSubcommand(sub => sub.setName('set-winner').setDescription('[ADMIN] Tentukan pemenang sebuah match (bracket otomatis lanjut kalau babak selesai)').addStringOption(opt => opt.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true)).addIntegerOption(opt => opt.setName('match-nomor').setDescription('Nomor match di babak yang sedang berjalan').setRequired(true).setMinValue(1)).addUserOption(opt => opt.setName('pemenang').setDescription('Player yang menang di match ini').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'create') return adminTournamentCreate.execute(interaction);
    if (subcommand === 'start') return adminTournamentStart.execute(interaction);
    if (subcommand === 'cancel') return adminTournamentCancel.execute(interaction);
    if (subcommand === 'list') return adminTournamentList.execute(interaction);
    if (subcommand === 'add-player') return adminTournamentAddPlayer.execute(interaction);
    if (subcommand === 'remove-player') return adminTournamentRemovePlayer.execute(interaction);
    if (subcommand === 'set-winner') return adminTournamentSetWinner.execute(interaction);
  }
};
