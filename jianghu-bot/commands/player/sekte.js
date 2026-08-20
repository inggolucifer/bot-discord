const { SlashCommandBuilder } = require('discord.js');
const sekteInfoService = require('../../services/player/sekte/sekteInfo');
const sekteListService = require('../../services/player/sekte/sekteList');
const sekteLeaderboardService = require('../../services/player/sekte/sekteLeaderboard');
const sekteDonasiService = require('../../services/player/sekte/sekteDonasi');
const sekteDepositResourceService = require('../../services/player/sekte/sekteDepositResource');
const sekteBangunAssetService = require('../../services/player/sekte/sekteBangunAsset');
const sekteCraftService = require('../../services/player/sekte/sekteCraft');
const sekteClaimProfitService = require('../../services/player/sekte/sekteClaimProfit');
const sekteKelolaAnggotaService = require('../../services/player/sekte/sekteKelolaAnggota');
const sekteKickAnggotaService = require('../../services/player/sekte/sekteKickAnggota');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte')
    .setDescription('Sistem Sekte / Faksi')
    .addSubcommand(sub => sub.setName('info').setDescription('Lihat info sekte kamu atau sekte lain').addStringOption(o => o.setName('nama').setDescription('Nama sekte (kosongkan untuk sekte sendiri)').setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('Lihat daftar sekte yang ada di server ini'))
    .addSubcommand(sub => sub.setName('leaderboard').setDescription('Lihat sekte terkaya di server ini'))
    .addSubcommand(sub => sub.setName('donasi').setDescription('Donasikan currency ke sekte').addStringOption(o => o.setName('jenis').setDescription('Jenis currency').setRequired(true).addChoices({ name: 'Silver Tael', value: 'silver' }, { name: 'Gold Ingot', value: 'gold' }, { name: 'Spirit Jade', value: 'jade' }, { name: 'Heavenly Spirit', value: 'spirit' })).addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah donasi').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('deposit-resource').setDescription('Sumbangkan material ke gudang sekte').addStringOption(o => o.setName('nama-item').setDescription('Nama item yang didonasikan').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah (default: semua)').setMinValue(1)))
    .addSubcommand(sub => sub.setName('bangun-asset').setDescription('Bangun aset untuk sekte').addStringOption(o => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('craft').setDescription('Gunakan aset sekte (Crafting/Refining)').addStringOption(o => o.setName('nama-aset').setDescription('Pilih aset').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('nama-resep').setDescription('Resep yang mau dibuat').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('claim-profit').setDescription('Klaim profit harian dari aset-aset milik sekte'))
    .addSubcommand(sub => sub.setName('kelola-anggota').setDescription('[KETUA] Kelola anggota sekte').addUserOption(o => o.setName('user').setDescription('Anggota target').setRequired(true)).addStringOption(o => o.setName('aksi').setDescription('Aksi (angkat-wakil, turun-wakil, angkat-tetua, turun-tetua)').setRequired(true).addChoices({ name: 'Jadikan Wakil Ketua', value: 'angkat-wakil' }, { name: 'Turunkan Wakil Ketua', value: 'turun-wakil' }, { name: 'Jadikan Tetua', value: 'angkat-tetua' }, { name: 'Turunkan Tetua', value: 'turun-tetua' })))
    .addSubcommand(sub => sub.setName('kick-anggota').setDescription('[KETUA/WAKIL] Tendang anggota dari sekte').addUserOption(o => o.setName('user').setDescription('Anggota target').setRequired(true))),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'info' && sekteInfoService.autocomplete) return sekteInfoService.autocomplete(interaction);
    if (sub === 'deposit-resource' && sekteDepositResourceService.autocomplete) return sekteDepositResourceService.autocomplete(interaction);
    if (sub === 'bangun-asset' && sekteBangunAssetService.autocomplete) return sekteBangunAssetService.autocomplete(interaction);
    if (sub === 'craft' && sekteCraftService.autocomplete) return sekteCraftService.autocomplete(interaction);
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'info') return sekteInfoService.execute(interaction);
    if (sub === 'list') return sekteListService.execute(interaction);
    if (sub === 'leaderboard') return sekteLeaderboardService.execute(interaction);
    if (sub === 'donasi') return sekteDonasiService.execute(interaction);
    if (sub === 'deposit-resource') return sekteDepositResourceService.execute(interaction);
    if (sub === 'bangun-asset') return sekteBangunAssetService.execute(interaction);
    if (sub === 'craft') return sekteCraftService.execute(interaction);
    if (sub === 'claim-profit') return sekteClaimProfitService.execute(interaction);
    if (sub === 'kelola-anggota') return sekteKelolaAnggotaService.execute(interaction);
    if (sub === 'kick-anggota') return sekteKickAnggotaService.execute(interaction);
  }
};
