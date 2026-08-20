const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const WorkerContract = require('../../../models/WorkerContract');
const { refreshWorkerChannel } = require('../../../services/workerChannelService');
const WORKER_OPTIONS = require('../../../commands/player/workerOptions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ubah-worker')
    .setDescription('Mengubah harga dan durasi jasa Worker-mu')
    .addIntegerOption((o) => o.setName(WORKER_OPTIONS.HARGA_PER_JAM).setDescription('Harga per jam (minimal 2 silver)').setRequired(true).setMinValue(2))
    .addIntegerOption((o) => o.setName(WORKER_OPTIONS.MAKS_DURASI_JAM).setDescription('Durasi maksimal yang kamu tawarkan (dalam jam)').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const contract = await WorkerContract.findOne({ guildId: interaction.guildId, workerId: interaction.user.id });
    if (!contract) return interaction.editReply({ content: '❌ Kamu tidak sedang mendaftar sebagai Worker. Gunakan `/daftar-worker`.' });

    if (contract.status === 'working') {
      return interaction.editReply({ content: '❌ Kamu sedang bekerja dan tidak bisa mengubah kontrak saat ini.' });
    }

    contract.pricePerHour = interaction.options.getInteger(WORKER_OPTIONS.HARGA_PER_JAM);
    contract.maxDurationHours = interaction.options.getInteger(WORKER_OPTIONS.MAKS_DURASI_JAM);
    await contract.save();

    await refreshWorkerChannel(interaction.client, interaction.guildId);

    return interaction.editReply({ content: `✅ Kontrak diperbarui! Harga: ${contract.pricePerHour} Silver/jam, Durasi: ${contract.maxDurationHours} jam.` });
  },
};
