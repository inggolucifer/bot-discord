const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const sekteList = require('./handlers/sekteList.js');
const sekteInfo = require('./handlers/sekteInfo.js');
const sekteDonasi = require('./handlers/sekteDonasi.js');
const sekteDepositResource = require('./handlers/sekteDepositResource.js');
const sekteCraft = require('./handlers/sekteCraft.js');
const sekteBangunAsset = require('./handlers/sekteBangunAsset.js');
const sekteClaimProfit = require('./handlers/sekteClaimProfit.js');
const sekteKelolaAnggota = require('./handlers/sekteKelolaAnggota.js');
const sekteKickAnggota = require('./handlers/sekteKickAnggota.js');
const sekteLeaderboard = require('./handlers/sekteLeaderboard.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte')
    .setDescription('Sekte commands')
    .addSubcommand(sub => sub.setName('list').setDescription('Lihat daftar semua sekte di server ini'))
    .addSubcommand(sub => sub.setName('info').setDescription('Lihat info sebuah sekte: jabatan, aset, dan sumber daya').addStringOption(opt => opt.setName('nama-sekte').setDescription('Nama sekte').setRequired(true)))
    .addSubcommand(sub => sub.setName('donasi').setDescription('Donasikan currency ke kekayaan sekte (TIDAK bisa diklaim balik pribadi)').addStringOption(opt => opt.setName('jenis').setDescription('Jenis currency').setRequired(true).addChoices({name: 'Silver Tael (银两)', value: 'silver'}).addChoices({name: 'Gold Tael (金两)', value: 'gold'}).addChoices({name: 'Jade Tael (玉两)', value: 'jade'}).addChoices({name: 'Spirit Stone (灵石)', value: 'spirit'})).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah yang didonasikan').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('deposit-resource').setDescription('Setorkan item dari inventorymu ke stok sumber daya sekte').addStringOption(opt => opt.setName('nama-item').setDescription('Nama item yang mau disetor').setRequired(true)).addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('craft').setDescription('Buat item lewat aset crafting sekte, pakai sumber daya bersama sekte').addStringOption(opt => opt.setName('nama-sekte').setDescription('Nama sekte').setRequired(true)).addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset crafting sekte').setRequired(true)).addStringOption(opt => opt.setName('nama-resep').setDescription('Nama resep').setRequired(true)))
    .addSubcommand(sub => sub.setName('bangun-asset').setDescription('Bangun aset untuk sekte menggunakan sumber daya bersama sekte').addStringOption(opt => opt.setName('nama-sekte').setDescription('Nama sekte').setRequired(true)).addStringOption(opt => opt.setName('nama-aset').setDescription('Nama aset yang mau dibangun').setRequired(true)))
    .addSubcommand(sub => sub.setName('claim-profit').setDescription('Klaim profit aset sekte (currency dibagi semua anggota sesuai jabatan, material masuk stok)').addStringOption(opt => opt.setName('nama-sekte').setDescription('Nama sekte').setRequired(true)))
    .addSubcommand(sub => sub.setName('kelola-anggota').setDescription('[KETUA SEKTE] Angkat/pindahkan anggota sekte milikmu ke jabatan Wakil Ketua/Tetua/Anggota').addUserOption(opt => opt.setName('user').setDescription('Player yang diangkat').setRequired(true)).addStringOption(opt => opt.setName('posisi').setDescription('Jabatan baru').setRequired(true).addChoices({name: 'Wakil Ketua', value: 'Wakil Ketua'}).addChoices({name: 'Tetua', value: 'Tetua'}).addChoices({name: 'Anggota', value: 'Anggota'})))
    .addSubcommand(sub => sub.setName('kick').setDescription('[KETUA SEKTE] Keluarkan seorang anggota (Wakil/Tetua/Anggota) dari sekte milikmu').addUserOption(opt => opt.setName('user').setDescription('Player yang dikeluarkan').setRequired(true)))
    .addSubcommand(sub => sub.setName('leaderboard').setDescription('Lihat 10 sekte terkaya di server ini')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'list') return sekteList.execute(interaction);
    if (subcommand === 'info') return sekteInfo.execute(interaction);
    if (subcommand === 'donasi') return sekteDonasi.execute(interaction);
    if (subcommand === 'deposit-resource') return sekteDepositResource.execute(interaction);
    if (subcommand === 'craft') return sekteCraft.execute(interaction);
    if (subcommand === 'bangun-asset') return sekteBangunAsset.execute(interaction);
    if (subcommand === 'claim-profit') return sekteClaimProfit.execute(interaction);
    if (subcommand === 'kelola-anggota') return sekteKelolaAnggota.execute(interaction);
    if (subcommand === 'kick') return sekteKickAnggota.execute(interaction);
    if (subcommand === 'leaderboard') return sekteLeaderboard.execute(interaction);
  }
};
