const { SlashCommandBuilder } = require('discord.js');
const daftarWorkerService = require('../../services/player/worker/daftarWorker');
const batalWorkerService = require('../../services/player/worker/batalWorker');
const ubahWorkerService = require('../../services/player/worker/ubahWorker');
const pindahWorkerService = require('../../services/player/worker/pindahWorker');
const sewaWorkerSistemService = require('../../services/player/worker/sewaWorkerSistem');
const pekerjaSayaService = require('../../services/player/worker/pekerjaSaya');
const kerjaMandiriService = require('../../services/player/worker/kerjaMandiri');
const berhentiKerjaMandiriService = require('../../services/player/worker/berhentiKerjaMandiri');
const WORKER_OPTIONS = require('./workerOptions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('worker')
    .setDescription('Sistem Pekerja (Worker)')
    .addSubcommand(sub => sub.setName('daftar').setDescription('Daftarkan dirimu sebagai pekerja lepas').addIntegerOption(o => o.setName(WORKER_OPTIONS.HARGA_PER_JAM).setDescription('Harga jasa per jam (Silver)').setRequired(true).setMinValue(2)).addIntegerOption(o => o.setName(WORKER_OPTIONS.MAKS_DURASI_JAM).setDescription('Maksimal lama kerja dalam satu sewa').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('batal').setDescription('Batalkan penawaran jasa pekerjamu'))
    .addSubcommand(sub => sub.setName('ubah').setDescription('Ubah harga atau batas durasi jasa pekerjamu').addIntegerOption(o => o.setName(WORKER_OPTIONS.HARGA_PER_JAM).setDescription('Harga jasa per jam (Silver)').setRequired(true).setMinValue(2)).addIntegerOption(o => o.setName(WORKER_OPTIONS.MAKS_DURASI_JAM).setDescription('Maksimal lama kerja dalam satu sewa').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('pindah').setDescription('Tugaskan pekerja untuk mengurus asetmu').addUserOption(o => o.setName(WORKER_OPTIONS.PEKERJA).setDescription('Pilih pekerja yang sedang kamu sewa').setRequired(true)).addStringOption(o => o.setName(WORKER_OPTIONS.ASET_TUJUAN).setDescription('Pilih aset tujuan tempat pekerja ditugaskan').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('sewa-sistem').setDescription('Sewa pekerja NPC dari sistem untuk asetmu').addStringOption(o => o.setName(WORKER_OPTIONS.ASET).setDescription('Aset tujuan').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName(WORKER_OPTIONS.DURASI).setDescription('Durasi sewa (dalam jam)').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('pekerja-saya').setDescription('Lihat status pekerja yang sedang bekerja padamu'))
    .addSubcommand(sub => sub.setName('kerja-mandiri').setDescription('Bekerja di aset milikmu sendiri untuk mempercepat produksi').addStringOption(o => o.setName(WORKER_OPTIONS.ASET).setDescription('Aset tujuan').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('berhenti-kerja-mandiri').setDescription('Berhenti bekerja dari aset milikmu')),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'pindah' && pindahWorkerService.autocomplete) return pindahWorkerService.autocomplete(interaction);
    if (sub === 'sewa-sistem' && sewaWorkerSistemService.autocomplete) return sewaWorkerSistemService.autocomplete(interaction);
    if (sub === 'kerja-mandiri' && kerjaMandiriService.autocomplete) return kerjaMandiriService.autocomplete(interaction);
  },

  async execute(interaction) {
    try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'daftar') return await daftarWorkerService.execute(interaction);
    if (sub === 'batal') return await batalWorkerService.execute(interaction);
    if (sub === 'ubah') return await ubahWorkerService.execute(interaction);
    if (sub === 'pindah') return await pindahWorkerService.execute(interaction);
    if (sub === 'sewa-sistem') return await sewaWorkerSistemService.execute(interaction);
    if (sub === 'pekerja-saya') return await pekerjaSayaService.execute(interaction);
    if (sub === 'kerja-mandiri') return await kerjaMandiriService.execute(interaction);
    if (sub === 'berhenti-kerja-mandiri') return await berhentiKerjaMandiriService.execute(interaction);
      } catch (error) {
      console.error(error);
      const msg = "Terjadi kesalahan sistem saat memproses command ini.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  }
};
