const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const daftarWorker = require('./handlers/daftarWorker.js');
const batalWorker = require('./handlers/batalWorker.js');
const ubahWorker = require('./handlers/ubahWorker.js');
const pindahWorker = require('./handlers/pindahWorker.js');
const sewaWorkerSistem = require('./handlers/sewaWorkerSistem.js');
const pekerjaSaya = require('./handlers/pekerjaSaya.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('worker')
    .setDescription('Worker commands')
    .addSubcommand(sub => sub.setName('daftar').setDescription('Tawarkan jasamu sebagai Worker untuk dipekerjakan oleh player lain').addIntegerOption(opt => opt.setName('harga').setDescription('Harga per jam (minimal 2 silver)').setRequired(true).setMinValue(2)).addIntegerOption(opt => opt.setName('durasi-maks').setDescription('Durasi maksimal yang kamu tawarkan (dalam jam)').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('batal').setDescription('Membatalkan penawaran jasa sebagai Worker'))
    .addSubcommand(sub => sub.setName('ubah').setDescription('Mengubah harga dan durasi jasa Worker-mu').addIntegerOption(opt => opt.setName('harga').setDescription('Harga per jam (minimal 2 silver)').setRequired(true).setMinValue(2)).addIntegerOption(opt => opt.setName('durasi-maks').setDescription('Durasi maksimal yang kamu tawarkan (dalam jam)').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('pindah').setDescription('Pindahkan worker yang sedang kamu sewa ke aset tertentu').addUserOption(opt => opt.setName('worker').setDescription('Pilih worker (pemain) yang kamu sewa').setRequired(true)).addStringOption(opt => opt.setName('aset').setDescription('Nama aset milikmu').setRequired(true)))
    .addSubcommand(sub => sub.setName('sewa-sistem').setDescription('Sewa NPC Worker untuk menjalankan/membangun asetmu (5 Silver/jam)').addStringOption(opt => opt.setName('aset').setDescription('Nama aset milikmu').setRequired(true)).addIntegerOption(opt => opt.setName('durasi').setDescription('Durasi sewa (dalam jam)').setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub.setName('pekerja-saya').setDescription('Lihat daftar Worker yang sedang kamu sewa')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'daftar') return daftarWorker.execute(interaction);
    if (subcommand === 'batal') return batalWorker.execute(interaction);
    if (subcommand === 'ubah') return ubahWorker.execute(interaction);
    if (subcommand === 'pindah') return pindahWorker.execute(interaction);
    if (subcommand === 'sewa-sistem') return sewaWorkerSistem.execute(interaction);
    if (subcommand === 'pekerja-saya') return pekerjaSaya.execute(interaction);
  }
};
