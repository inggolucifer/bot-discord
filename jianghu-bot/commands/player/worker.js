const { SlashCommandBuilder } = require('discord.js');
const daftarWorkerService = require('../../services/player/worker/daftarWorker');
const batalWorkerService = require('../../services/player/worker/batalWorker');
const ubahWorkerService = require('../../services/player/worker/ubahWorker');
const pindahWorkerService = require('../../services/player/worker/pindahWorker');
const sewaWorkerSistemService = require('../../services/player/worker/sewaWorkerSistem');
const pekerjaSayaService = require('../../services/player/worker/pekerjaSaya');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('worker')
    .setDescription('Sistem Pekerja (Worker)')
    .addSubcommand(sub => sub.setName('daftar').setDescription('Daftarkan dirimu sebagai pekerja lepas').addIntegerOption(o => o.setName('harga-per-jam').setDescription('Harga jasa per jam (Silver)').setRequired(true).setMinValue(1)).addIntegerOption(o => o.setName('maks-durasi-jam').setDescription('Maksimal lama kerja dalam satu sewa').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('batal').setDescription('Batalkan penawaran jasa pekerjamu'))
    .addSubcommand(sub => sub.setName('ubah').setDescription('Ubah harga atau batas durasi jasa pekerjamu').addIntegerOption(o => o.setName('harga-per-jam').setDescription('Harga jasa per jam (Silver)').setRequired(true).setMinValue(1)).addIntegerOption(o => o.setName('maks-durasi-jam').setDescription('Maksimal lama kerja dalam satu sewa').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('pindah').setDescription('Tugaskan pekerja untuk mengurus asetmu').addUserOption(o => o.setName('pekerja').setDescription('Pilih pekerja yang sedang kamu sewa').setRequired(true)).addStringOption(o => o.setName('aset-tujuan').setDescription('Pilih aset tujuan tempat pekerja ditugaskan').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('sewa-sistem').setDescription('Sewa pekerja NPC dari sistem untuk asetmu').addStringOption(o => o.setName('aset').setDescription('Aset tujuan').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('pekerja-saya').setDescription('Lihat status pekerja yang sedang bekerja padamu')),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'pindah' && pindahWorkerService.autocomplete) return pindahWorkerService.autocomplete(interaction);
    if (sub === 'sewa-sistem' && sewaWorkerSistemService.autocomplete) return sewaWorkerSistemService.autocomplete(interaction);
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'daftar') return daftarWorkerService.execute(interaction);
    if (sub === 'batal') return batalWorkerService.execute(interaction);
    if (sub === 'ubah') return ubahWorkerService.execute(interaction);
    if (sub === 'pindah') return pindahWorkerService.execute(interaction);
    if (sub === 'sewa-sistem') return sewaWorkerSistemService.execute(interaction);
    if (sub === 'pekerja-saya') return pekerjaSayaService.execute(interaction);
  }
};
